const mongoose = require("mongoose");
const { GENDERS } = require("../courses/domain.constants");

const CLINIC_STATUSES = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  CANCELLED: "CANCELLED",
  DONE: "DONE",
};

const CLINIC_PAYMENT_STATUSES = {
  UNPAID: "UNPAID",
  AWAITING_REVIEW: "AWAITING_REVIEW",
  PAID: "PAID",
};

const clinicRegistrationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    firstName: { type: String, required: true, trim: true, maxlength: 80 },
    lastName: { type: String, required: true, trim: true, maxlength: 80 },
    phone: {
      type: String,
      required: true,
      trim: true,
      maxlength: 11,
      match: [/^09\d{9}$/, "Invalid Iranian mobile number"],
    },
    birthDate: { type: Date, required: true },
    gender: { type: String, enum: Object.values(GENDERS), default: null },
    note: { type: String, trim: true, maxlength: 500, default: "" },

    status: {
      type: String,
      enum: Object.values(CLINIC_STATUSES),
      default: CLINIC_STATUSES.PENDING,
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: Object.values(CLINIC_PAYMENT_STATUSES),
      default: CLINIC_PAYMENT_STATUSES.UNPAID,
      index: true,
    },
    /** Card-to-card reference the family typed in the panel. */
    trackingCode: { type: String, trim: true, maxlength: 60, default: "" },
    paymentNote: { type: String, trim: true, maxlength: 300, default: "" },
    reportedPaidAt: { type: Date, default: null },
    reviewedAt: { type: Date, default: null },
    adminNote: { type: String, trim: true, maxlength: 500, default: "" },

    /** The clinic this registration belongs to (null for legacy rows). */
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Clinic",
      default: null,
      index: true,
    },

    /** Snapshot of the program price at registration time. */
    priceToman: { type: Number, min: 0, default: 0 },
    clinicTitle: { type: String, trim: true, maxlength: 120, default: "" },
  },
  { timestamps: true, collection: "clinic_registrations" },
);

clinicRegistrationSchema.index({ createdAt: -1 });
clinicRegistrationSchema.index({ status: 1, paymentStatus: 1 });
clinicRegistrationSchema.index({ userId: 1, phone: 1, firstName: 1, lastName: 1 });

const ClinicRegistration = mongoose.model("ClinicRegistration", clinicRegistrationSchema);

module.exports = { ClinicRegistration, CLINIC_STATUSES, CLINIC_PAYMENT_STATUSES };
