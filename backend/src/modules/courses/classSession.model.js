const mongoose = require("mongoose");
const { SESSION_STATUSES } = require("./domain.constants");

/**
 * Named ClassSession to avoid collision with auth Session (refresh tokens).
 */
const classSessionSchema = new mongoose.Schema(
  {
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CourseClass",
      required: true,
      index: true,
    },
    sessionNumber: { type: Number, required: true, min: 1 },
    date: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    status: {
      type: String,
      enum: Object.values(SESSION_STATUSES),
      default: SESSION_STATUSES.SCHEDULED,
    },
  },
  { timestamps: true, collection: "class_sessions" },
);

classSessionSchema.index({ classId: 1, sessionNumber: 1 }, { unique: true });
classSessionSchema.index({ classId: 1, date: 1 });

const ClassSession = mongoose.model("ClassSession", classSessionSchema);

module.exports = { ClassSession };
