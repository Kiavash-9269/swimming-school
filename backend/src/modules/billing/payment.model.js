const mongoose = require("mongoose");
const { PAYMENT_STATUSES } = require("../courses/domain.constants");

const paymentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    participantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Participant",
      default: null,
      index: true,
    },
    enrollmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Enrollment",
      required: true,
      index: true,
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CourseClass",
      default: null,
      index: true,
    },
    reservationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Reservation",
      default: null,
      index: true,
    },
    discountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Discount",
      default: null,
      index: true,
    },
    /** Integer IRR amount — server-authoritative */
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "IRR" },
    status: {
      type: String,
      enum: Object.values(PAYMENT_STATUSES),
      default: PAYMENT_STATUSES.CREATED,
      index: true,
    },
    provider: { type: String, required: true, default: "mock" },
    providerRef: { type: String, trim: true, default: "" },
    authority: { type: String, trim: true, default: "" },
    idempotencyKey: { type: String, required: true, unique: true },
    initiatedAt: { type: Date, default: null },
    verifiedAt: { type: Date, default: null },
    failedAt: { type: Date, default: null },
    expiredAt: { type: Date, default: null },
    refundRequestedAt: { type: Date, default: null },
    refundedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
    failureCode: { type: String, trim: true, default: "" },
    failureReason: { type: String, trim: true, default: "" },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

paymentSchema.index({ enrollmentId: 1, status: 1 });
paymentSchema.index({ status: 1, createdAt: -1 });
paymentSchema.index(
  { providerRef: 1 },
  { unique: true, partialFilterExpression: { providerRef: { $type: "string", $gt: "" } } },
);
paymentSchema.index({ authority: 1 }, { sparse: true });
paymentSchema.index({ expiresAt: 1, status: 1 });

const Payment = mongoose.model("Payment", paymentSchema);

module.exports = { Payment };
