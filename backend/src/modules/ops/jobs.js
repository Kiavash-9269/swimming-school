const { env } = require("../../config/env");
const { logEvent, logError } = require("../../services/logging");
const { tryAcquireJobLock, releaseJobLock } = require("./schedulerLock.model");
const { expireHeldReservations, promoteWaitlist } = require("../enrollments/enrollment.service");
const { expireOpenPayments } = require("../billing/checkout.service");
const { processNotificationBatch } = require("../notifications/notification.service");
const { onWaitlistPromoted } = require("../notifications/dispatcher");
const { WaitlistEntry } = require("../enrollments/waitlist.model");
const { WAITLIST_STATUSES, ENROLLMENT_STATUSES, RESERVATION_STATUSES } = require("../courses/domain.constants");
const { Reservation } = require("../enrollments/reservation.model");
const { CourseClass } = require("../courses/courseClass.model");
const { ClassSession } = require("../courses/classSession.model");
const { Enrollment } = require("../enrollments/enrollment.model");
const { safeEnqueue } = require("../notifications/dispatcher");
const { NOTIFICATION_TYPES, NOTIFICATION_CHANNELS } = require("../notifications/notification.constants");
const { randomUUID } = require("crypto");

const workerId = `w_${process.pid}_${randomUUID().slice(0, 8)}`;

async function withJobLock(jobName, ttlMs, fn) {
  const lock = await tryAcquireJobLock(jobName, ttlMs, workerId);
  if (!lock) {
    logEvent("JOB_SKIPPED_LOCKED", { jobName, workerId });
    return { skipped: true };
  }
  logEvent("JOB_STARTED", { jobName, workerId });
  try {
    const result = await fn();
    await releaseJobLock(jobName, workerId);
    logEvent("JOB_COMPLETED", { jobName, workerId, result });
    return { skipped: false, result };
  } catch (error) {
    await releaseJobLock(jobName, workerId, error.message);
    logError("JOB_FAILED", error, { jobName, workerId });
    throw error;
  }
}

async function jobExpireReservations() {
  return withJobLock("expire-reservations", 30_000, async () => {
    const before = await Reservation.find({
      status: RESERVATION_STATUSES.HELD,
      expiresAt: { $lte: new Date() },
    })
      .select("classId")
      .limit(env.JOB_BATCH_SIZE)
      .lean();

    await expireHeldReservations();

    const classIds = [...new Set(before.map((r) => String(r.classId)))];
    let promoted = 0;
    for (const classId of classIds) {
      const result = await promoteWaitlist(classId);
      if (result?.waitlist) {
        await onWaitlistPromoted({ waitlist: result.waitlist });
        promoted += 1;
      }
    }
    return { expiredCandidates: before.length, promoted };
  });
}

async function jobExpirePayments() {
  return withJobLock("expire-payments", 30_000, async () => {
    await expireOpenPayments();
    // After payment expiry, seats may free — promote waitlists for affected classes is best-effort
    // expireOpenPayments already releases holds; promote via a light scan of recently expired is complex —
    // rely on expire-reservations / cancel paths. Optionally promote all open classes with availability:
    const classes = await CourseClass.find({
      status: "REGISTRATION_OPEN",
      $expr: { $lt: [{ $add: ["$confirmedCount", "$heldCount"] }, "$capacity"] },
    })
      .select("_id")
      .limit(20);
    let promoted = 0;
    for (const c of classes) {
      const result = await promoteWaitlist(c._id);
      if (result?.waitlist) {
        await onWaitlistPromoted({ waitlist: result.waitlist });
        promoted += 1;
      }
    }
    return { promoted };
  });
}

async function jobExpireWaitlistOffers() {
  return withJobLock("expire-waitlist-offers", 30_000, async () => {
    const now = new Date();
    const expired = await WaitlistEntry.find({
      status: WAITLIST_STATUSES.OFFERED,
      expiresAt: { $lte: now },
    }).limit(env.JOB_BATCH_SIZE);

    let count = 0;
    for (const entry of expired) {
      const claimed = await WaitlistEntry.findOneAndUpdate(
        { _id: entry._id, status: WAITLIST_STATUSES.OFFERED },
        { $set: { status: WAITLIST_STATUSES.EXPIRED } },
        { returnDocument: "after" },
      );
      if (!claimed) continue;
      count += 1;

      if (claimed.reservationId) {
        const released = await Reservation.findOneAndUpdate(
          { _id: claimed.reservationId, status: RESERVATION_STATUSES.HELD },
          { $set: { status: RESERVATION_STATUSES.RELEASED } },
        );
        if (released) {
          await CourseClass.updateOne(
            { _id: claimed.classId, heldCount: { $gt: 0 } },
            { $inc: { heldCount: -1 } },
          );
        }
      }

      const next = await promoteWaitlist(claimed.classId);
      if (next?.waitlist) {
        await onWaitlistPromoted({ waitlist: next.waitlist });
      }
    }
    return { expiredOffers: count };
  });
}

async function jobProcessNotifications() {
  return withJobLock("process-notifications", 45_000, async () => {
    return processNotificationBatch({ limit: env.JOB_BATCH_SIZE });
  });
}

/**
 * Build session start Date from session.date (UTC date) + startTime HH:mm in APP_TIMEZONE approximation.
 * Uses explicit UTC composition of date parts + clock — documented deterministic strategy.
 */
function sessionStartUtc(session) {
  const d = new Date(session.date);
  const [hh, mm] = String(session.startTime || "00:00").split(":").map((x) => Number(x));
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), hh || 0, mm || 0, 0, 0),
  );
}

async function jobCreateSessionReminders() {
  return withJobLock("create-session-reminders", 60_000, async () => {
    const hoursList = [Number(env.CLASS_REMINDER_HOURS) || 24, Number(env.SESSION_REMINDER_HOURS) || 1];
    const uniqueHours = [...new Set(hoursList.filter((h) => h > 0))];
    const now = Date.now();
    let created = 0;

    for (const hours of uniqueHours) {
      const windowStart = new Date(now + (hours * 3600 - 15 * 60) * 1000);
      const windowEnd = new Date(now + (hours * 3600 + 15 * 60) * 1000);

      // Load upcoming scheduled sessions in a coarse date range
      const dayPad = Math.ceil(hours / 24) + 1;
      const fromDate = new Date(now - 24 * 3600 * 1000);
      const toDate = new Date(now + (dayPad + 1) * 24 * 3600 * 1000);

      const sessions = await ClassSession.find({
        status: "SCHEDULED",
        date: { $gte: fromDate, $lte: toDate },
      }).limit(200);

      for (const session of sessions) {
        const startAt = sessionStartUtc(session);
        if (startAt < windowStart || startAt > windowEnd) continue;

        const enrollments = await Enrollment.find({
          classId: session.classId,
          status: { $in: [ENROLLMENT_STATUSES.ACTIVE, ENROLLMENT_STATUSES.PENDING_COMPLIANCE] },
        })
          .select("_id userId participantId classId")
          .limit(500);

        for (const enrollment of enrollments) {
          const result = await safeEnqueue({
            userId: enrollment.userId,
            type: NOTIFICATION_TYPES.SESSION_REMINDER,
            channel: NOTIFICATION_CHANNELS.SMS,
            idempotencyKey: `SESSION_REMINDER:${session._id}:${enrollment._id}:${hours}h`,
            refs: {
              enrollmentId: enrollment._id,
              classId: enrollment.classId,
              sessionId: session._id,
              participantId: enrollment.participantId,
            },
            templateVars: { whenLabel: `${hours}h` },
          });
          if (result?.created) created += 1;
        }
      }
    }

    logEvent("REMINDERS_CREATED", { created });
    return { created };
  });
}

async function runAllJobs() {
  const results = {};
  for (const [name, fn] of [
    ["expire-reservations", jobExpireReservations],
    ["expire-payments", jobExpirePayments],
    ["expire-waitlist-offers", jobExpireWaitlistOffers],
    ["create-session-reminders", jobCreateSessionReminders],
    ["process-notifications", jobProcessNotifications],
  ]) {
    try {
      results[name] = await fn();
    } catch (error) {
      results[name] = { error: error.message };
    }
  }
  return results;
}

module.exports = {
  workerId,
  jobExpireReservations,
  jobExpirePayments,
  jobExpireWaitlistOffers,
  jobProcessNotifications,
  jobCreateSessionReminders,
  runAllJobs,
  sessionStartUtc,
};
