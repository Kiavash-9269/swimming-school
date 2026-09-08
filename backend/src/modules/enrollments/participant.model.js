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
    emergencyContact: { type: emergencyContactSchema, default: () => ({}) },
    isActive: { type: Boolean, default: true, index: true },
    deactivatedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

participantSchema.index({ ownerUserId: 1, firstName: 1, lastName: 1, birthDate: 1 });
participantSchema.index({ ownerUserId: 1, isActive: 1 });
participantSchema.index({ lastName: 1, firstName: 1 });

const Participant = mongoose.model("Participant", participantSchema);

module.exports = { Participant };
