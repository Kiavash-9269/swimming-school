const mongoose = require("mongoose");
const { ENROLLMENT_STATUSES } = require("../courses/domain.constants");

const enrollmentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    participantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Participant",
      required: true,
      index: true,
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CourseClass",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(ENROLLMENT_STATUSES),
      default: ENROLLMENT_STATUSES.PENDING,
      index: true,
    },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: "Payment", default: null },
    discountId: { type: mongoose.Schema.Types.ObjectId, ref: "Discount", default: null },
    reservationId: { type: mongoose.Schema.Types.ObjectId, ref: "Reservation", default: null },
    priceCharged: { type: Number, min: 0, default: 0 },
    /** Financial snapshot at registration — immutable after create */
    basePrice: { type: Number, min: 0, default: 0 },
    discountAmount: { type: Number, min: 0, default: 0 },
    finalAmount: { type: Number, min: 0, default: 0 },
    eligibilitySnapshot: {
      eligible: { type: Boolean, default: null },
      reasons: { type: [String], default: undefined },
      age: { type: Number, default: null },
      evaluatedAt: { type: Date, default: null },
      ruleVersion: { type: String, default: "eligibility-v1" },
    },
    reservedAt: { type: Date, default: null },
    confirmedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    idempotencyKey: { type: String, trim: true, default: null },
  },
  { timestamps: true },
);

enrollmentSchema.index({ classId: 1, status: 1 });
enrollmentSchema.index({ participantId: 1, status: 1 });
enrollmentSchema.index({ userId: 1, status: 1 });
enrollmentSchema.index({ createdAt: -1 });
enrollmentSchema.index(
  { classId: 1, participantId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: {
        $in: [
          ENROLLMENT_STATUSES.PENDING,
          ENROLLMENT_STATUSES.PAYMENT_PENDING,
          ENROLLMENT_STATUSES.PAID,
          ENROLLMENT_STATUSES.ACTIVE,
          ENROLLMENT_STATUSES.PENDING_COMPLIANCE,
          ENROLLMENT_STATUSES.WAITLISTED,
        ],
      },
    },
  },
);
enrollmentSchema.index(
  { idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: "string" } } },
);

const Enrollment = mongoose.model("Enrollment", enrollmentSchema);

module.exports = { Enrollment };
