const mongoose = require("mongoose");
const { GENDERS, PARTICIPANT_RELATIONS } = require("../courses/domain.constants");

const emergencyContactSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, maxlength: 120, default: "" },
    phone: {
      type: String,
      trim: true,
      maxlength: 11,
      default: "",
      validate: {
        validator(v) {
          return !v || /^09\d{9}$/.test(v);
        },
        message: "Invalid Iranian mobile number",
      },
    },
    relationship: { type: String, trim: true, maxlength: 60, default: "" },
  },
  { _id: false },
);

const participantSchema = new mongoose.Schema(
  {
    ownerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    firstName: { type: String, required: true, trim: true, maxlength: 80 },
    lastName: { type: String, required: true, trim: true, maxlength: 80 },
    birthDate: { type: Date, required: true, index: true },
    gender: {
      type: String,
      enum: [GENDERS.MALE, GENDERS.FEMALE],
      required: true,
    },
    relation: {
      type: String,
      enum: Object.values(PARTICIPANT_RELATIONS),
      default: PARTICIPANT_RELATIONS.SELF,
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 11,
      default: "",
      validate: {
        validator(v) {
          return !v || /^09\d{9}$/.test(v);
        },
        message: "Invalid Iranian mobile number",
      },
    },
    fatherOccupation: { type: String, trim: true, maxlength: 80, default: "" },
    fatherName: { type: String, trim: true, maxlength: 80, default: "" },
    nationalCode: {
      type: String,
      trim: true,
      maxlength: 10,
      default: "",
      validate: {
        validator(v) {
          return !v || /^\d{10}$/.test(v);
        },
        message: "Invalid Iranian national code",
      },
    },
    contactPhone: { type: String, trim: true, maxlength: 20, default: "" },
    schoolName: { type: String, trim: true, maxlength: 120, default: "" },
    referralSource: { type: String, trim: true, maxlength: 120, default: "" },
    address: { type: String, trim: true, maxlength: 300, default: "" },
    sportsHistory: { type: String, trim: true, maxlength: 300, default: "" },
    illnessHistory: { type: String, trim: true, maxlength: 300, default: "" },
    // Registration-terms acceptance (school rules, waivers, refund policy).
    termsAcceptedAt: { type: Date, default: null },
    // Self-declared sports-insurance card instead of a blocking insurance document.
    insuranceConfirmed: { type: Boolean, default: false },
    insuranceConfirmedAt: { type: Date, default: null },
    // User attestation instead of a mandatory medical file upload (ENAMAD-era flow).
    medicalConfirmed: { type: Boolean, default: false },
    medicalConfirmedAt: { type: Date, default: null },
    emergencyContact: { type: emergencyContactSchema, default: () => ({}) },
    // When the student joined the school; admins backdate this for pre-existing students.
    registeredAt: { type: Date, default: Date.now, index: true },
    createdByAdmin: { type: Boolean, default: false },
    notes: { type: String, trim: true, maxlength: 1000, default: "" },
    // Biometrics / device IDs (e.g. from Access attendance DBs) — stored as text/base64.
    fingerprint: { type: String, default: "", maxlength: 500000 },
    faceData: { type: String, default: "", maxlength: 500000 },
    cardNumber: { type: String, trim: true, maxlength: 64, default: "" },
    externalId: { type: String, trim: true, maxlength: 120, default: "", index: true },
    /** Leftover Access/Excel columns that are not mapped to first-class fields. */
    importedFields: { type: mongoose.Schema.Types.Mixed, default: null },
    isActive: { type: Boolean, default: true, index: true },
    deactivatedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

participantSchema.index({ ownerUserId: 1, firstName: 1, lastName: 1, birthDate: 1 });
participantSchema.index({ ownerUserId: 1, isActive: 1 });
participantSchema.index({ lastName: 1, firstName: 1 });
participantSchema.index({ cardNumber: 1 }, { sparse: true });

const Participant = mongoose.model("Participant", participantSchema);

module.exports = { Participant };
