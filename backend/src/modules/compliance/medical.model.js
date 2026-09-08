const mongoose = require("mongoose");
const { COMPLIANCE_STATUSES } = require("../courses/domain.constants");

/**
 * Medical document lifecycle foundation.
 * storageKey is opaque — never expose filesystem paths.
 * File bytes are NOT stored in Mongo (see documentStorage.js).
 */
const medicalDocumentSchema = new mongoose.Schema(
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
    documentType: { type: String, trim: true, maxlength: 80, default: "MEDICAL_CLEARANCE" },
    storageKey: { type: String, trim: true, default: "" },
    originalFilename: { type: String, trim: true, maxlength: 120, default: "" },
    mimeType: { type: String, trim: true, maxlength: 80, default: "" },
    sizeBytes: { type: Number, min: 0, default: 0 },
    checksumSha256: { type: String, trim: true, default: "" },
    persisted: { type: Boolean, default: false },
    rejectionReason: { type: String, trim: true, maxlength: 500, default: "" },
    expiresAt: { type: Date, default: null },
    uploadedAt: { type: Date, default: Date.now },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

medicalDocumentSchema.index({ participantId: 1, status: 1, expiresAt: -1 });
medicalDocumentSchema.index({ status: 1, createdAt: -1 });

const MedicalDocument = mongoose.model("MedicalDocument", medicalDocumentSchema);

module.exports = { MedicalDocument };
