const crypto = require("crypto");
const { env } = require("../../config/env");
const { AppError } = require("../../utils/AppError");
const { User } = require("../auth/user.model");
const { Enrollment } = require("../enrollments/enrollment.model");
const { ENROLLMENT_STATUSES } = require("../courses/domain.constants");
const { ClinicRegistration } = require("../clinic/clinicRegistration.model");
const { Notification } = require("./notification.model");
const {
  NOTIFICATION_TYPES,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_STATUSES,
  LOCALES,
} = require("./notification.constants");

const PHONE_RE = /^09\d{9}$/;

const ACTIVE_ENROLLMENT_STATUSES = [
  ENROLLMENT_STATUSES.PAID,
  ENROLLMENT_STATUSES.ACTIVE,
  ENROLLMENT_STATUSES.PENDING_COMPLIANCE,
];

/**
 * Resolve who receives the message.
 * Returns `{ targets: [{ userId, phone }], skipped }` — one entry per recipient.
 */
async function resolveTargets({ audience, phone, userIds = [], classId, clinicId }) {
  if (audience === "user") {
    const user = phone
      ? await User.findOne({ phone, isActive: true }).lean()
      : await User.findById(userIds[0]).lean();
    if (!user) {
      throw new AppError("کاربری با این مشخصات پیدا نشد", {
        statusCode: 404,
        code: "SMS_USER_NOT_FOUND",
      });
    }
    return { targets: [{ userId: String(user._id), phone: user.phone }], skipped: 0 };
  }

  if (audience === "users") {
    const users = await User.find({ _id: { $in: userIds }, isActive: true }).lean();
    return {
      targets: users.map((u) => ({ userId: String(u._id), phone: u.phone })),
      skipped: Math.max(0, userIds.length - users.length),
    };
  }

  if (audience === "clinic") {
    // No clinicId means every clinic; otherwise only that clinic's registrations.
    const filter = { status: { $ne: "CANCELLED" } };
    if (clinicId) filter.clinicId = clinicId;
    const docs = await ClinicRegistration.find(filter).select("userId phone").lean();
    const unique = new Map();
    for (const doc of docs) {
      if (!doc.phone) continue;
      unique.set(`${String(doc.userId)}:${doc.phone}`, {
        userId: String(doc.userId),
        phone: doc.phone,
      });
    }
    return { targets: [...unique.values()], skipped: 0 };
  }

  if (audience === "class") {
    const enrollments = await Enrollment.find({
      classId,
      status: { $in: ACTIVE_ENROLLMENT_STATUSES },
    })
      .select("userId")
      .lean();
    const ids = [...new Set(enrollments.map((e) => String(e.userId)))];
    const users = await User.find({ _id: { $in: ids }, isActive: true }).lean();
    return {
      targets: users.map((u) => ({ userId: String(u._id), phone: u.phone })),
      skipped: Math.max(0, ids.length - users.length),
    };
  }

  // audience === "all"
  const users = await User.find({ isActive: true, role: "USER" }).select("phone").lean();
  return { targets: users.map((u) => ({ userId: String(u._id), phone: u.phone })), skipped: 0 };
}

/**
 * Queue the message for every valid recipient.
 * Delivery happens through the existing notification worker (retries + delivery log).
 */
async function queueAdminSms({ audience, phone, userIds, classId, clinicId, message, actorId = null }) {
  const body = String(message || "").trim();
  if (!body) {
    throw new AppError("متن پیام خالی است", { statusCode: 400, code: "VALIDATION_ERROR" });
  }

  const { targets, skipped } = await resolveTargets({ audience, phone, userIds, classId, clinicId });
  const valid = targets.filter((t) => PHONE_RE.test(t.phone || ""));
  const invalid = targets.length - valid.length;

  if (!valid.length) {
    throw new AppError("گیرنده‌ای با شماره موبایل معتبر پیدا نشد", {
      statusCode: 404,
      code: "SMS_NO_RECIPIENTS",
    });
  }

  const batchId = `adminsms-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
  const docs = valid.map((target, index) => ({
    userId: target.userId,
    type: NOTIFICATION_TYPES.ADMIN_MESSAGE,
    channel: NOTIFICATION_CHANNELS.SMS,
    status: NOTIFICATION_STATUSES.PENDING,
    locale: LOCALES.FA,
    destination: target.phone,
    body: body.slice(0, 1000),
    idempotencyKey: `${batchId}:${index}`,
    maxAttempts: env.NOTIFICATION_MAX_ATTEMPTS,
    nextAttemptAt: new Date(),
  }));

  const inserted = await Notification.insertMany(docs, { ordered: false });

  return {
    batchId,
    notificationIds: Object.values(inserted).map((doc) => doc._id),
    audience,
    queued: docs.length,
    skipped: skipped + invalid,
    actorId: actorId ? String(actorId) : null,
  };
}

module.exports = { queueAdminSms, resolveTargets };
