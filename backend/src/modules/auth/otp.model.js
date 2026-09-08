const mongoose = require("mongoose");

const OTP_PURPOSES = {
  REGISTER: "REGISTER",
  RESET_PASSWORD: "RESET_PASSWORD",
};

const otpSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    codeHash: {
      type: String,
      required: true,
    },
    purpose: {
      type: String,
      enum: Object.values(OTP_PURPOSES),
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      required: true,
    },
    consumedAt: {
      type: Date,
      default: null,
    },
    invalidatedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

otpSchema.index({ phone: 1, purpose: 1, createdAt: -1 });
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
// At most one usable OTP per phone+purpose (concurrency-safe issuance).
otpSchema.index(
  { phone: 1, purpose: 1 },
  {
    unique: true,
    partialFilterExpression: {
      consumedAt: null,
      invalidatedAt: null,
    },
  },
);

const Otp = mongoose.model("Otp", otpSchema);

module.exports = {
  Otp,
  OTP_PURPOSES,
};
