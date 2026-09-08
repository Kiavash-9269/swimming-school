const mongoose = require("mongoose");
const {
  NOTIFICATION_TYPES,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_STATUSES,
  LOCALES,
} = require("./notification.constants");

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: {
      type: String,
      enum: Object.values(NOTIFICATION_TYPES),
      required: true,
      index: true,
    },
    channel: {
      type: String,
      enum: Object.values(NOTIFICATION_CHANNELS),
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(NOTIFICATION_STATUSES),
      default: NOTIFICATION_STATUSES.PENDING,
      index: true,
    },
    locale: {
      type: String,
      enum: Object.values(LOCALES),
      default: LOCALES.FA,
    },
    /** Destination phone/email — never OTP codes */
    destination: { type: String, trim: true, maxlength: 160, default: "" },
    /** Safe rendered body snapshot (no medical content) */
    body: { type: String, trim: true, maxlength: 1000, default: "" },
    /** Reference IDs only — no sensitive payloads */
    refs: {
      participantId: { type: mongoose.Schema.Types.ObjectId, default: null },
      enrollmentId: { type: mongoose.Schema.Types.ObjectId, default: null },
      paymentId: { type: mongoose.Schema.Types.ObjectId, default: null },
      classId: { type: mongoose.Schema.Types.ObjectId, default: null },
      sessionId: { type: mongoose.Schema.Types.ObjectId, default: null },
      documentId: { type: mongoose.Schema.Types.ObjectId, default: null },
      waitlistId: { type: mongoose.Schema.Types.ObjectId, default: null },
    },
    idempotencyKey: { type: String, required: true, unique: true },
    attempts: { type: Number, default: 0, min: 0 },
    maxAttempts: { type: Number, default: 3, min: 1 },
    nextAttemptAt: { type: Date, default: Date.now, index: true },
    processingStartedAt: { type: Date, default: null },
    leaseUntil: { type: Date, default: null, index: true },
    sentAt: { type: Date, default: null },
    failedAt: { type: Date, default: null },
    providerMessageId: { type: String, trim: true, default: "" },
    errorCode: { type: String, trim: true, default: "" },
    lastError: { type: String, trim: true, maxlength: 240, default: "" },
    templateVersion: { type: String, default: "v1" },
  },
  { timestamps: true },
);

notificationSchema.index({ status: 1, nextAttemptAt: 1 });
notificationSchema.index({ status: 1, leaseUntil: 1 });
notificationSchema.index({ type: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, createdAt: -1 });

const Notification = mongoose.model("Notification", notificationSchema);

module.exports = { Notification };
