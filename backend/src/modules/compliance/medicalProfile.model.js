const mongoose = require("mongoose");

/**
 * Minimal medical profile — separate from MedicalDocument lifecycle.
 * Content is never logged; exposed only via dedicated endpoints.
 */
const medicalProfileSchema = new mongoose.Schema(
  {
    participantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Participant",
      required: true,
      unique: true,
      index: true,
    },
    hasMedicalCondition: { type: Boolean, default: false },
    allergies: { type: String, trim: true, maxlength: 500, default: "" },
    medications: { type: String, trim: true, maxlength: 500, default: "" },
    notes: { type: String, trim: true, maxlength: 1000, default: "" },
    approvalStatus: {
      type: String,
      enum: ["NONE", "PENDING", "APPROVED", "REJECTED", "EXPIRED"],
      default: "NONE",
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

const MedicalProfile = mongoose.model("MedicalProfile", medicalProfileSchema);

module.exports = { MedicalProfile };
