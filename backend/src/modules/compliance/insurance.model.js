const mongoose = require("mongoose");
const { COMPLIANCE_STATUSES } = require("../courses/domain.constants");

const insuranceRecordSchema = new mongoose.Schema(
  {
    participantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Participant",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(COMPLIANCE_STATUSES),
      default: COMPLIANCE_STATUSES.PENDING,
      index: true,
    },
    providerName: { type: String, trim: true, maxlength: 120, default: "" },
    policyRef: { type: String, trim: true, maxlength: 120, default: "" },
    startDate: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
    notes: { type: String, trim: true, maxlength: 500, default: "" },
    storageKey: { type: String, trim: true, default: "" },
    originalFilename: { type: String, trim: true, maxlength: 120, default: "" },
    mimeType: { type: String, trim: true, maxlength: 80, default: "" },
    sizeBytes: { type: Number, min: 0, default: 0 },
    checksumSha256: { type: String, trim: true, default: "" },
    persisted: { type: Boolean, default: false },
    rejectionReason: { type: String, trim: true, maxlength: 500, default: "" },
    uploadedAt: { type: Date, default: Date.now },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

insuranceRecordSchema.index({ participantId: 1, status: 1, expiresAt: -1 });
insuranceRecordSchema.index({ status: 1, createdAt: -1 });

const InsuranceRecord = mongoose.model("InsuranceRecord", insuranceRecordSchema);

module.exports = { InsuranceRecord };
