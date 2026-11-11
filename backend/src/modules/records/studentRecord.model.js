const mongoose = require("mongoose");

/** Swimming strokes a student record can be entered for. */
const STROKES = {
  FREESTYLE: "FREESTYLE",
  BACKSTROKE: "BACKSTROKE",
  BREASTSTROKE: "BREASTSTROKE",
  BUTTERFLY: "BUTTERFLY",
  MEDLEY: "MEDLEY",
};

const studentRecordSchema = new mongoose.Schema(
  {
    ownerUserId: {
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
    /** Snapshot at entry time so history survives profile edits. */
    firstName: { type: String, required: true, trim: true, maxlength: 80 },
    lastName: { type: String, required: true, trim: true, maxlength: 80 },
    birthDate: { type: Date, default: null },
    stroke: { type: String, enum: Object.values(STROKES), required: true, index: true },
    distance: { type: Number, required: true, min: 1, max: 10000 },
    /** Seconds with hundredths, e.g. 41.25 */
    timeSeconds: { type: Number, required: true, min: 0, max: 86400 },
    recordDate: { type: Date, default: Date.now, index: true },
    location: { type: String, trim: true, maxlength: 120, default: "" },
    note: { type: String, trim: true, maxlength: 500, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true, collection: "student_records" },
);

studentRecordSchema.index({ participantId: 1, recordDate: -1 });
studentRecordSchema.index({ ownerUserId: 1, recordDate: -1 });
studentRecordSchema.index({ stroke: 1, distance: 1, timeSeconds: 1 });

const StudentRecord = mongoose.model("StudentRecord", studentRecordSchema);

module.exports = { StudentRecord, STROKES };
