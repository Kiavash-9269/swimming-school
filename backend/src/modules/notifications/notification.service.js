const { env } = require("../../config/env");
const { AppError } = require("../../utils/AppError");
const { logEvent, logError } = require("../../services/logging");
const { createSmsProvider } = require("../../services/sms/createProvider");
const { SMS_ERROR_CODES } = require("../../services/sms/errors");
const { User } = require("../auth/user.model");
const { Notification } = require("./notification.model");
const { renderTemplate } = require("./templates");
const {
  NOTIFICATION_CHANNELS,
  NOTIFICATION_STATUSES,
  LOCALES,
} = require("./notification.constants");
const { createEmailProvider } = require("./channels/emailChannel");

const smsProvider = createSmsProvider(env);
const emailProvider = createEmailProvider(env);

const NON_RETRYABLE = new Set([
  SMS_ERROR_CODES.SMS_CONFIGURATION_ERROR,
  SMS_ERROR_CODES.INVALID_PHONE_FOR_PROVIDER,
  "INVALID_DESTINATION",
  "UNSUPPORTED_CHANNEL",
]);

function isRetryableError(error) {
  const code = error?.code || "";
  if (NON_RETRYABLE.has(code)) return false;
  if (code === SMS_ERROR_CODES.SMS_PROVIDER_TIMEOUT) return true;
  if (code === SMS_ERROR_CODES.SMS_PROVIDER_UNAVAILABLE) return true;
  if (error?.statusCode === 408 || error?.statusCode === 429 || error?.statusCode === 503) return true;
  return true; // default retryable for transient delivery failures
}

function backoffMs(attempt) {
  // attempt is 1-based after claim increment
  return Math.min(15 * 60 * 1000, 1000 * 2 ** Math.max(0, attempt - 1));
}

function toPublicNotification(doc) {
  return {
    id: String(doc._id),
    userId: String(doc.userId),
    type: doc.type,
    channel: doc.channel,
    status: doc.status,
    locale: doc.locale,
    attempts: doc.attempts,
    maxAttempts: doc.maxAttempts,
    nextAttemptAt: doc.nextAttemptAt,
    sentAt: doc.sentAt,
    failedAt: doc.failedAt,
    errorCode: doc.errorCode || "",
    providerMessageId: doc.providerMessageId || "",
    refs: {
      participantId: doc.refs?.participantId ? String(doc.refs.participantId) : null,
      enrollmentId: doc.refs?.enrollmentId ? String(doc.refs.enrollmentId) : null,
      paymentId: doc.refs?.paymentId ? String(doc.refs.paymentId) : null,
      classId: doc.refs?.classId ? String(doc.refs.classId) : null,
      sessionId: doc.refs?.sessionId ? String(doc.refs.sessionId) : null,
      documentId: doc.refs?.documentId ? String(doc.refs.documentId) : null,
      waitlistId: doc.refs?.waitlistId ? String(doc.refs.waitlistId) : null,
    },
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    // never: body with medical, destination secrets beyond masked admin view
  };
}

/**
 * Idempotent enqueue. Duplicate key → return existing.
 * Never throws to callers in a way that rolls back business transactions when used via dispatcher.safeEnqueue.
 */
async function enqueueNotification({
  userId,
  type,
  channel = NOTIFICATION_CHANNELS.SMS,
  idempotencyKey,
  refs = {},
  locale,
  templateVars = {},
  destination,
}) {
  if (!userId || !type || !idempotencyKey) {
    throw new AppError("notification enqueue invalid", { statusCode: 400, code: "VALIDATION_ERROR" });
  }

  const user = await User.findById(userId).select("phone");
  if (!user) {
    throw new AppError("کاربر یافت نشد", { statusCode: 404, code: "USER_NOT_FOUND" });
  }

  const resolvedLocale = locale || env.NOTIFICATION_DEFAULT_LOCALE || LOCALES.FA;
  const rendered = renderTemplate(type, resolvedLocale, templateVars);
  const dest =
    destination ||
    (channel === NOTIFICATION_CHANNELS.SMS ? user.phone : channel === NOTIFICATION_CHANNELS.EMAIL ? "" : "");

  const existing = await Notification.findOne({ idempotencyKey });
  if (existing) {
    logEvent("NOTIFICATION_IDEMPOTENCY_HIT", {
      type,
      idempotencyKey,
      notificationId: String(existing._id),
    });
    return { notification: existing, created: false };
  }

  try {
    const doc = await Notification.create({
      userId,
      type,
      channel,
      locale: resolvedLocale,
      destination: dest,
      body: rendered.body,
      refs,
      idempotencyKey,
      maxAttempts: env.NOTIFICATION_MAX_ATTEMPTS,
      nextAttemptAt: new Date(),
      templateVersion: rendered.version,
      status: NOTIFICATION_STATUSES.PENDING,
    });
    logEvent("NOTIFICATION_ENQUEUED", {
      notificationId: String(doc._id),
      type,
      channel,
      userId: String(userId),
    });
    return { notification: doc, created: true };
  } catch (error) {
    if (error?.code === 11000) {
      const again = await Notification.findOne({ idempotencyKey });
      logEvent("NOTIFICATION_IDEMPOTENCY_HIT", {
        type,
        idempotencyKey,
        notificationId: again ? String(again._id) : null,
      });
      return { notification: again, created: false };
    }
    throw error;
  }
}

async function recoverStaleProcessing({ limit = 50 } = {}) {
  const now = new Date();
  const result = await Notification.updateMany(
    {
      status: NOTIFICATION_STATUSES.PROCESSING,
      leaseUntil: { $lte: now },
    },
    {
      $set: {
        status: NOTIFICATION_STATUSES.PENDING,
        nextAttemptAt: now,
        leaseUntil: null,
      },
    },
  );
  if (result.modifiedCount > 0) {
    logEvent("NOTIFICATION_STALE_RECOVERED", { count: result.modifiedCount });
  }
  return result.modifiedCount || 0;
}

/**
 * Atomically claim one pending notification.
 */
async function claimNextNotification() {
  const now = new Date();
  const leaseMs = (env.NOTIFICATION_LEASE_SECONDS || 60) * 1000;
  const leaseUntil = new Date(now.getTime() + leaseMs);

  return Notification.findOneAndUpdate(
    {
      status: NOTIFICATION_STATUSES.PENDING,
      nextAttemptAt: { $lte: now },
    },
    {
      $set: {
        status: NOTIFICATION_STATUSES.PROCESSING,
        processingStartedAt: now,
        leaseUntil,
      },
      $inc: { attempts: 1 },
    },
    { sort: { nextAttemptAt: 1, createdAt: 1 }, returnDocument: "after" },
  );
}

async function deliverViaChannel(notification) {
  if (notification.channel === NOTIFICATION_CHANNELS.SMS) {
    if (!notification.destination || !/^09\d{9}$/.test(notification.destination)) {
      const err = new Error("Invalid SMS destination");
      err.code = "INVALID_DESTINATION";
      throw err;
    }
    if (typeof smsProvider.sendText !== "function") {
      const err = new Error("SMS provider does not support sendText");
      err.code = SMS_ERROR_CODES.SMS_CONFIGURATION_ERROR;
      throw err;
    }
    const result = await smsProvider.sendText({
      phone: notification.destination,
      message: notification.body,
      purpose: notification.type,
    });
    if (!result?.delivered) {
      const err = new Error("SMS not delivered");
      err.code = SMS_ERROR_CODES.SMS_DELIVERY_FAILED;
      throw err;
    }
    return result;
  }

  if (notification.channel === NOTIFICATION_CHANNELS.EMAIL) {
    return emailProvider.send({
      to: notification.destination || "noreply@localhost",
      subject: notification.type,
      body: notification.body,
    });
  }

  if (notification.channel === NOTIFICATION_CHANNELS.LOG) {
    logEvent("NOTIFICATION_LOG_DELIVERED", {
      notificationId: String(notification._id),
      type: notification.type,
    });
    return { delivered: true, channel: "log", provider: "log", messageId: `log_${notification._id}` };
  }

  const err = new Error("Unsupported channel");
  err.code = "UNSUPPORTED_CHANNEL";
  throw err;
}

async function processClaimedNotification(notification) {
  logEvent("NOTIFICATION_CLAIMED", {
    notificationId: String(notification._id),
    type: notification.type,
    attempt: notification.attempts,
  });

  try {
    const result = await deliverViaChannel(notification);
    const sent = await Notification.findOneAndUpdate(
      { _id: notification._id, status: NOTIFICATION_STATUSES.PROCESSING },
      {
        $set: {
          status: NOTIFICATION_STATUSES.SENT,
          sentAt: new Date(),
          leaseUntil: null,
          providerMessageId: result.messageId || "",
          errorCode: "",
          lastError: "",
        },
      },
      { returnDocument: "after" },
    );
    logEvent("NOTIFICATION_SENT", {
      notificationId: String(notification._id),
      type: notification.type,
      channel: notification.channel,
    });
    return sent;
  } catch (error) {
    const retryable = isRetryableError(error);
    const attempts = notification.attempts;
    const maxAttempts = notification.maxAttempts || env.NOTIFICATION_MAX_ATTEMPTS;
    const giveUp = !retryable || attempts >= maxAttempts;

    const update = {
      leaseUntil: null,
      errorCode: String(error?.code || "DELIVERY_FAILED").slice(0, 80),
      lastError: String(error?.message || "delivery failed").slice(0, 240),
    };

    if (giveUp) {
      update.status = NOTIFICATION_STATUSES.FAILED;
      update.failedAt = new Date();
    } else {
      update.status = NOTIFICATION_STATUSES.PENDING;
      update.nextAttemptAt = new Date(Date.now() + backoffMs(attempts));
    }

    await Notification.updateOne(
      { _id: notification._id, status: NOTIFICATION_STATUSES.PROCESSING },
      { $set: update },
    );

    logEvent(giveUp ? "NOTIFICATION_FAILED" : "NOTIFICATION_RETRY_SCHEDULED", {
      notificationId: String(notification._id),
      type: notification.type,
      attempt: attempts,
      errorCode: update.errorCode,
      retryable,
    });
    logError("NOTIFICATION_DELIVERY_ERROR", error, {
      notificationId: String(notification._id),
      code: error?.code,
    });
    return null;
  }
}

async function processNotificationBatch({ limit } = {}) {
  await recoverStaleProcessing({ limit: limit || env.JOB_BATCH_SIZE });
  const batch = Math.min(env.JOB_BATCH_SIZE || 50, Number(limit) || env.JOB_BATCH_SIZE || 50);
  let processed = 0;
  let sent = 0;

  for (let i = 0; i < batch; i += 1) {
    const claimed = await claimNextNotification();
    if (!claimed) break;
    processed += 1;
    const result = await processClaimedNotification(claimed);
    if (result?.status === NOTIFICATION_STATUSES.SENT) sent += 1;
  }

  return { processed, sent };
}

async function adminRetryNotification({ notificationId, adminUserId }) {
  const doc = await Notification.findById(notificationId);
  if (!doc) {
    throw new AppError("اعلان یافت نشد", { statusCode: 404, code: "NOTIFICATION_NOT_FOUND" });
  }
  if (doc.status === NOTIFICATION_STATUSES.SENT) {
    return { notification: toPublicNotification(doc), alreadySent: true };
  }
  if (![NOTIFICATION_STATUSES.FAILED, NOTIFICATION_STATUSES.PENDING].includes(doc.status)) {
    throw new AppError("وضعیت اعلان قابل تلاش مجدد نیست", {
      statusCode: 409,
      code: "INVALID_NOTIFICATION_STATUS",
    });
  }

  const updated = await Notification.findOneAndUpdate(
    {
      _id: doc._id,
      status: { $in: [NOTIFICATION_STATUSES.FAILED, NOTIFICATION_STATUSES.PENDING] },
    },
    {
      $set: {
        status: NOTIFICATION_STATUSES.PENDING,
        nextAttemptAt: new Date(),
        failedAt: null,
        leaseUntil: null,
        // keep attempts; do not reset — still bounded by maxAttempts
        maxAttempts: Math.max(doc.maxAttempts, doc.attempts + 1),
      },
    },
    { returnDocument: "after" },
  );

  logEvent("NOTIFICATION_ADMIN_RETRY", {
    notificationId: String(doc._id),
    actorId: String(adminUserId),
  });

  return { notification: toPublicNotification(updated), alreadySent: false };
}

async function listNotificationsAdmin({ status, type, channel, userId, page = 1, limit = 20 } = {}) {
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
  const safePage = Math.max(1, Number(page) || 1);
  const filter = {};
  if (status) filter.status = status;
  if (type) filter.type = type;
  if (channel) filter.channel = channel;
  if (userId) filter.userId = userId;

  const [items, total] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit),
    Notification.countDocuments(filter),
  ]);

  return {
    page: safePage,
    limit: safeLimit,
    total,
    items: items.map(toPublicNotification),
  };
}

async function getNotificationAdmin(notificationId) {
  const doc = await Notification.findById(notificationId);
  if (!doc) {
    throw new AppError("اعلان یافت نشد", { statusCode: 404, code: "NOTIFICATION_NOT_FOUND" });
  }
  return toPublicNotification(doc);
}

module.exports = {
  enqueueNotification,
  recoverStaleProcessing,
  claimNextNotification,
  processClaimedNotification,
  processNotificationBatch,
  adminRetryNotification,
  listNotificationsAdmin,
  getNotificationAdmin,
  toPublicNotification,
  isRetryableError,
  backoffMs,
};
