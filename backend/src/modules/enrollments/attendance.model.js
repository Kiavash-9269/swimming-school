const mongoose = require("mongoose");

/**
 * Attendance foundation — PRESENT | ABSENT | LATE | EXCUSED | UNKNOWN
 */
const attendanceSchema = new mongoose.Schema(
  {
    classId: { type: mongoose.Schema.Types.ObjectId, ref: "CourseClass", required: true, index: true },
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "ClassSession", required: true },
    participantId: { type: mongoose.Schema.Types.ObjectId, ref: "Participant", required: true, index: true },
    enrollmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Enrollment", required: true },
    status: {
      type: String,
      enum: ["PRESENT", "ABSENT", "LATE", "EXCUSED", "UNKNOWN"],
      default: "UNKNOWN",
    },
    markedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    markedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

attendanceSchema.index({ sessionId: 1, participantId: 1 }, { unique: true });
attendanceSchema.index({ classId: 1, participantId: 1 });

const AttendanceRecord = mongoose.model("AttendanceRecord", attendanceSchema);

module.exports = { AttendanceRecord };
