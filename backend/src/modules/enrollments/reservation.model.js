const mongoose = require("mongoose");
const { RESERVATION_STATUSES } = require("../courses/domain.constants");

const reservationSchema = new mongoose.Schema(
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
      index: true,
    },
    participantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Participant",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(RESERVATION_STATUSES),
      default: RESERVATION_STATUSES.HELD,
      index: true,
    },
    expiresAt: { type: Date, required: true },
    idempotencyKey: { type: String, trim: true, default: null },
  },
  { timestamps: true },
);

reservationSchema.index({ classId: 1, status: 1, expiresAt: 1 });
reservationSchema.index(
  { classId: 1, participantId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: RESERVATION_STATUSES.HELD },
  },
);
reservationSchema.index(
  { idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: "string" } } },
);
reservationSchema.index({ expiresAt: 1, status: 1 });

const Reservation = mongoose.model("Reservation", reservationSchema);

module.exports = { Reservation };
