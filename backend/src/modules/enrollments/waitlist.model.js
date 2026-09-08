const mongoose = require("mongoose");
const { WAITLIST_STATUSES } = require("../courses/domain.constants");

const waitlistSchema = new mongoose.Schema(
  {
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CourseClass",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    participantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Participant",
      required: true,
    },
    position: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      enum: Object.values(WAITLIST_STATUSES),
      default: WAITLIST_STATUSES.WAITING,
      index: true,
    },
    notifiedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
    reservationId: { type: mongoose.Schema.Types.ObjectId, ref: "Reservation", default: null },
  },
  { timestamps: true },
);

waitlistSchema.index({ classId: 1, position: 1 }, { unique: true });
waitlistSchema.index(
  { classId: 1, participantId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: [WAITLIST_STATUSES.WAITING, WAITLIST_STATUSES.OFFERED] },
    },
  },
);
waitlistSchema.index({ classId: 1, status: 1, position: 1 });

const WaitlistEntry = mongoose.model("WaitlistEntry", waitlistSchema);

module.exports = { WaitlistEntry };
