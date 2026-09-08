const { env } = require("../../config/env");
const { AppError } = require("../../utils/AppError");
const { logEvent } = require("../../services/logging");
const {
  CLASS_STATUSES,
  ENROLLMENT_STATUSES,
  RESERVATION_STATUSES,
  WAITLIST_STATUSES,
} = require("../courses/domain.constants");
const { CourseClass } = require("../courses/courseClass.model");
const { CourseTemplate } = require("../courses/courseTemplate.model");
const { schedulesConflict } = require("../courses/schedule");
const { Participant } = require("./participant.model");
const { Reservation } = require("./reservation.model");
const { Enrollment } = require("./enrollment.model");
const { WaitlistEntry } = require("./waitlist.model");
const { checkEligibility } = require("./eligibility.service");
const participantService = require("./participant.service");

const ACTIVE_ENROLLMENT_STATUSES = [
  ENROLLMENT_STATUSES.PENDING,
  ENROLLMENT_STATUSES.PAYMENT_PENDING,
  ENROLLMENT_STATUSES.PAID,
  ENROLLMENT_STATUSES.ACTIVE,
  ENROLLMENT_STATUSES.PENDING_COMPLIANCE,
];

async function assertParticipantOwned(userId, participantId) {
  return participantService.assertParticipantOwned(userId, participantId);
}

async function expireHeldReservations(classId = null) {
  const filter = {
    status: RESERVATION_STATUSES.HELD,
    expiresAt: { $lte: new Date() },
  };
  if (classId) filter.classId = classId;

  const expired = await Reservation.find(filter).limit(200);
  for (const reservation of expired) {
    const released = await Reservation.findOneAndUpdate(
      { _id: reservation._id, status: RESERVATION_STATUSES.HELD },
      { $set: { status: RESERVATION_STATUSES.EXPIRED } },
      { returnDocument: "after" },
    );
    if (!released) continue;

    await CourseClass.updateOne(
      { _id: reservation.classId, heldCount: { $gt: 0 } },
      { $inc: { heldCount: -1 } },
    );
    logEvent("RESERVATION_EXPIRED", {
      reservationId: String(reservation._id),
      classId: String(reservation.classId),
    });
  }
}

function getCapacitySnapshot(courseClass) {
  const available = Math.max(0, courseClass.capacity - courseClass.confirmedCount - courseClass.heldCount);
  return {
    capacity: courseClass.capacity,
    confirmed: courseClass.confirmedCount,
    held: courseClass.heldCount,
    available,
    isFull: available <= 0,
  };
}

async function checkScheduleConflict(participantId, candidateClass) {
  const enrollments = await Enrollment.find({
    participantId,
    status: { $in: [...ACTIVE_ENROLLMENT_STATUSES, ENROLLMENT_STATUSES.WAITLISTED] },
  }).select("classId");

  if (!enrollments.length) return;

  const classIds = enrollments.map((e) => e.classId);
  const existingClasses = await CourseClass.find({
    _id: { $in: classIds },
    status: {
      $nin: [CLASS_STATUSES.CANCELLED, CLASS_STATUSES.ARCHIVED, CLASS_STATUSES.COMPLETED],
    },
  });

  for (const existing of existingClasses) {
    if (schedulesConflict(existing, candidateClass)) {
      throw new AppError("تداخل زمانی با کلاس فعال دیگر", {
        statusCode: 409,
        code: "SCHEDULE_CONFLICT",
        details: { conflictingClassId: String(existing._id) },
      });
    }
  }
}

async function getClassOrThrow(classId) {
  const courseClass = await CourseClass.findById(classId);
  if (!courseClass) {
    throw new AppError("کلاس یافت نشد", { statusCode: 404, code: "CLASS_NOT_FOUND" });
  }
  return courseClass;
}

async function checkAvailability(classId) {
  await expireHeldReservations(classId);
  const courseClass = await getClassOrThrow(classId);
  return {
    classId: String(courseClass._id),
    status: courseClass.status,
    ...getCapacitySnapshot(courseClass),
    registrationOpen: courseClass.status === CLASS_STATUSES.REGISTRATION_OPEN,
  };
}

async function createReservation({
  userId,
  classId,
  participantId,
  idempotencyKey,
}) {
  await expireHeldReservations(classId);

  if (idempotencyKey) {
    const existing = await Reservation.findOne({ idempotencyKey });
    if (existing) {
      return existing;
    }
  }

  const participant = await assertParticipantOwned(userId, participantId);
  const courseClass = await getClassOrThrow(classId);

  if (courseClass.status !== CLASS_STATUSES.REGISTRATION_OPEN) {
    throw new AppError("ثبت‌نام این کلاس باز نیست", {
      statusCode: 409,
      code: "REGISTRATION_CLOSED",
    });
  }

  const existingEnrollment = await Enrollment.findOne({
    classId,
    participantId,
    status: { $in: [...ACTIVE_ENROLLMENT_STATUSES, ENROLLMENT_STATUSES.WAITLISTED] },
  });
  if (existingEnrollment) {
    throw new AppError("ثبت‌نام قبلی برای این شرکت‌کننده وجود دارد", {
      statusCode: 409,
      code: "ENROLLMENT_ALREADY_EXISTS",
    });
  }

  const template = await CourseTemplate.findById(courseClass.courseTemplateId);
  const eligibility = await checkEligibility(participant, courseClass, template);
  if (!eligibility.eligible) {
    throw new AppError("شرایط ثبت‌نام برقرار نیست", {
      statusCode: 400,
      code: "ELIGIBILITY_FAILED",
      details: { reasons: eligibility.reasons },
    });
  }

  await checkScheduleConflict(participantId, courseClass);

  const seat = await CourseClass.findOneAndUpdate(
    {
      _id: classId,
      status: CLASS_STATUSES.REGISTRATION_OPEN,
      $expr: { $lt: [{ $add: ["$confirmedCount", "$heldCount"] }, "$capacity"] },
    },
    { $inc: { heldCount: 1 } },
    { returnDocument: "after" },
  );

  if (!seat) {
    throw new AppError("ظرفیت کلاس تکمیل است", {
      statusCode: 409,
      code: "COURSE_FULL",
    });
  }

  try {
    const reservation = await Reservation.create({
      classId,
      userId,
      participantId,
      status: RESERVATION_STATUSES.HELD,
      expiresAt: new Date(Date.now() + env.RESERVATION_HOLD_SECONDS * 1000),
      idempotencyKey: idempotencyKey || null,
    });

    logEvent("RESERVATION_CREATED", {
      reservationId: String(reservation._id),
      classId: String(classId),
      userId: String(userId),
      participantId: String(participantId),
    });

    return reservation;
  } catch (error) {
    await CourseClass.updateOne(
      { _id: classId, heldCount: { $gt: 0 } },
      { $inc: { heldCount: -1 } },
    );
    if (error?.code === 11000) {
      throw new AppError("رزرو تکراری", {
        statusCode: 409,
        code: "ENROLLMENT_ALREADY_EXISTS",
      });
    }
    throw error;
  }
}

async function joinWaitlist({ userId, classId, participantId }) {
  await expireHeldReservations(classId);
  const participant = await assertParticipantOwned(userId, participantId);
  const courseClass = await getClassOrThrow(classId);

  if (courseClass.status !== CLASS_STATUSES.REGISTRATION_OPEN) {
    throw new AppError("ثبت‌نام این کلاس باز نیست", {
      statusCode: 409,
      code: "REGISTRATION_CLOSED",
    });
  }

  const capacity = getCapacitySnapshot(courseClass);
  if (!capacity.isFull) {
    throw new AppError("هنوز ظرفیت خالی وجود دارد؛ ابتدا رزرو کنید", {
      statusCode: 400,
      code: "COURSE_NOT_FULL",
    });
  }

  const template = await CourseTemplate.findById(courseClass.courseTemplateId);
  const eligibility = await checkEligibility(participant, courseClass, template);
  if (!eligibility.eligible) {
    throw new AppError("شرایط ثبت‌نام برقرار نیست", {
      statusCode: 400,
      code: "ELIGIBILITY_FAILED",
      details: { reasons: eligibility.reasons },
    });
  }

  await checkScheduleConflict(participantId, courseClass);

  // Unique (classId, position) + retry absorbs concurrent max(position)+1 races.
  let entry = null;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const last = await WaitlistEntry.findOne({ classId }).sort({ position: -1 }).select("position").lean();
    const position = (last?.position || 0) + 1;
    try {
      entry = await WaitlistEntry.create({
        classId,
        userId,
        participantId,
        position,
        status: WAITLIST_STATUSES.WAITING,
      });
      break;
    } catch (error) {
      if (error?.code === 11000) {
        const key = error?.keyPattern || {};
        if (key.participantId) {
          throw new AppError("قبلاً در لیست انتظار هستید", {
            statusCode: 409,
            code: "ENROLLMENT_ALREADY_EXISTS",
          });
        }
        continue;
      }
      throw error;
    }
  }
  if (!entry) {
    throw new AppError("پیوستن به لیست انتظار ناموفق بود", {
      statusCode: 409,
      code: "WAITLIST_CONFLICT",
    });
  }

  try {
    await Enrollment.create({
      userId,
      participantId,
      classId,
      status: ENROLLMENT_STATUSES.WAITLISTED,
    });
  } catch (error) {
    if (error?.code !== 11000) throw error;
  }

  logEvent("WAITLIST_JOINED", {
    waitlistId: String(entry._id),
    classId: String(classId),
    position: entry.position,
  });

  return entry;
}

async function promoteWaitlist(classId) {
  await expireHeldReservations(classId);
  const capacity = await checkAvailability(classId);
  if (capacity.available <= 0 || !capacity.registrationOpen) {
    return null;
  }

  const next = await WaitlistEntry.findOneAndUpdate(
    { classId, status: WAITLIST_STATUSES.WAITING },
    {
      $set: {
        status: WAITLIST_STATUSES.OFFERED,
        notifiedAt: new Date(),
        expiresAt: new Date(Date.now() + env.WAITLIST_OFFER_SECONDS * 1000),
      },
    },
    { sort: { position: 1 }, returnDocument: "after" },
  );

  if (!next) return null;

  try {
    const reservation = await createReservation({
      userId: next.userId,
      classId,
      participantId: next.participantId,
    });
    next.reservationId = reservation._id;
    await next.save();
    logEvent("WAITLIST_PROMOTED", {
      waitlistId: String(next._id),
      classId: String(classId),
      reservationId: String(reservation._id),
    });
    try {
      const { onWaitlistPromoted } = require("../notifications/dispatcher");
      await onWaitlistPromoted({ waitlist: next });
    } catch {
      // notification must never break promotion
    }
    return { waitlist: next, reservation };
  } catch (error) {
    await WaitlistEntry.updateOne(
      { _id: next._id, status: WAITLIST_STATUSES.OFFERED },
      { $set: { status: WAITLIST_STATUSES.WAITING, notifiedAt: null, expiresAt: null } },
    );
    throw error;
  }
}

async function confirmEnrollmentFromReservation({
  userId,
  reservationId,
  discountCode,
  idempotencyKey,
}) {
  const checkout = require("../billing/checkout.service");
  return checkout.initiateCheckout({
    userId,
    reservationId,
    discountCode,
    idempotencyKey,
  });
}

/**
 * Payment verification is authoritative. Idempotent. Delegates to checkout service.
 */
async function verifyPaymentAndActivate({
  paymentId,
  providerRef,
  success = true,
  userId,
  isAdmin = false,
  authority,
  reportedAmount,
  callbackSecret,
}) {
  const checkout = require("../billing/checkout.service");
  return checkout.verifyAndActivatePayment({
    paymentId,
    userId,
    isAdmin,
    authority: authority || providerRef,
    providerRef: providerRef || authority,
    reportedAmount,
    intentSuccess: success,
    callbackSecret,
  });
}

async function cancelEnrollment({ userId, enrollmentId, isAdmin = false }) {
  const enrollment = await Enrollment.findById(enrollmentId);
  if (!enrollment) {
    throw new AppError("ثبت‌نام یافت نشد", { statusCode: 404, code: "ENROLLMENT_NOT_FOUND" });
  }
  if (!isAdmin && String(enrollment.userId) !== String(userId)) {
    throw new AppError("دسترسی مجاز نیست", { statusCode: 403, code: "FORBIDDEN" });
  }

  if (
    [ENROLLMENT_STATUSES.CANCELLED, ENROLLMENT_STATUSES.COMPLETED, ENROLLMENT_STATUSES.REFUNDED].includes(
      enrollment.status,
    )
  ) {
    return enrollment;
  }

  // Terminalize open payments first so a late callback cannot SUCCESS after cancel.
  const { Payment } = require("../billing/payment.model");
  const { PAYMENT_STATUSES } = require("../courses/domain.constants");
  const openPaymentStatuses = [
    PAYMENT_STATUSES.CREATED,
    PAYMENT_STATUSES.INITIATED,
    PAYMENT_STATUSES.PENDING,
  ];
  const openPayments = await Payment.find({
    enrollmentId: enrollment._id,
    status: { $in: openPaymentStatuses },
  }).limit(20);
  for (const payment of openPayments) {
    await Payment.findOneAndUpdate(
      { _id: payment._id, status: { $in: openPaymentStatuses } },
      {
        $set: {
          status: PAYMENT_STATUSES.CANCELLED,
          failedAt: new Date(),
          failureCode: "ENROLLMENT_CANCELLED",
          failureReason: "Enrollment cancelled before payment completion",
        },
      },
    );
  }

  // Claim-first cancel — concurrent cancels release capacity exactly once.
  const previousDoc = await Enrollment.findOneAndUpdate(
    {
      _id: enrollment._id,
      status: {
        $nin: [
          ENROLLMENT_STATUSES.CANCELLED,
          ENROLLMENT_STATUSES.COMPLETED,
          ENROLLMENT_STATUSES.REFUNDED,
        ],
      },
    },
    { $set: { status: ENROLLMENT_STATUSES.CANCELLED, cancelledAt: new Date() } },
    { returnDocument: "before" },
  );

  if (!previousDoc) {
    return Enrollment.findById(enrollment._id);
  }

  const previous = previousDoc.status;
  if (
    [ENROLLMENT_STATUSES.ACTIVE, ENROLLMENT_STATUSES.PAID, ENROLLMENT_STATUSES.PENDING_COMPLIANCE].includes(
      previous,
    )
  ) {
    await CourseClass.updateOne(
      { _id: previousDoc.classId, confirmedCount: { $gt: 0 } },
      { $inc: { confirmedCount: -1 } },
    );
  }

  if (previousDoc.reservationId) {
    const released = await Reservation.findOneAndUpdate(
      { _id: previousDoc.reservationId, status: RESERVATION_STATUSES.HELD },
      { $set: { status: RESERVATION_STATUSES.RELEASED } },
      { returnDocument: "after" },
    );
    if (released) {
      await CourseClass.updateOne(
        { _id: previousDoc.classId, heldCount: { $gt: 0 } },
        { $inc: { heldCount: -1 } },
      );
    }
  }

  const cancelled = await Enrollment.findById(enrollment._id);

  logEvent("ENROLLMENT_CANCELLED", {
    enrollmentId: String(cancelled._id),
    classId: String(cancelled.classId),
    userId: String(cancelled.userId),
  });

  try {
    const { onEnrollmentCancelled } = require("../notifications/dispatcher");
    await onEnrollmentCancelled(cancelled);
  } catch {
    // ignore
  }

  await promoteWaitlist(cancelled.classId);
  return cancelled;
}

module.exports = {
  assertParticipantOwned,
  expireHeldReservations,
  getCapacitySnapshot,
  checkAvailability,
  checkScheduleConflict,
  createReservation,
  joinWaitlist,
  promoteWaitlist,
  confirmEnrollmentFromReservation,
  verifyPaymentAndActivate,
  cancelEnrollment,
  ACTIVE_ENROLLMENT_STATUSES,
};
