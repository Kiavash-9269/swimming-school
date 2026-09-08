const { AppError } = require("../../utils/AppError");
const { logEvent } = require("../../services/logging");
const { AttendanceRecord } = require("./attendance.model");
const { Enrollment } = require("./enrollment.model");
const { ClassSession } = require("../courses/classSession.model");
const { ENROLLMENT_STATUSES } = require("../courses/domain.constants");
const { canMarkAttendance } = require("../courses/instructorAccess");

const ATTENDANCE_STATUSES = ["PRESENT", "ABSENT", "LATE", "EXCUSED", "UNKNOWN"];

async function markAttendance({
  user,
  classId,
  sessionId,
  participantId,
  status,
}) {
  if (!ATTENDANCE_STATUSES.includes(status)) {
    throw new AppError("وضعیت حضور نامعتبر است", { statusCode: 400, code: "VALIDATION_ERROR" });
  }

  await canMarkAttendance({ user, classId });

  const session = await ClassSession.findOne({ _id: sessionId, classId });
  if (!session) {
    throw new AppError("جلسه یافت نشد", { statusCode: 404, code: "SESSION_NOT_FOUND" });
  }

  const enrollment = await Enrollment.findOne({
    classId,
    participantId,
    status: {
      $in: [ENROLLMENT_STATUSES.ACTIVE, ENROLLMENT_STATUSES.COMPLETED, ENROLLMENT_STATUSES.PENDING_COMPLIANCE],
    },
  });
  if (!enrollment) {
    throw new AppError("ثبت‌نام فعال برای این شرکت‌کننده یافت نشد", {
      statusCode: 404,
      code: "ENROLLMENT_NOT_FOUND",
    });
  }

  const record = await AttendanceRecord.findOneAndUpdate(
    { sessionId, participantId },
    {
      $set: {
        classId,
        enrollmentId: enrollment._id,
        status,
        markedBy: user._id,
        markedAt: new Date(),
      },
      $setOnInsert: { sessionId, participantId },
    },
    { upsert: true, returnDocument: "after" },
  );

  logEvent("ATTENDANCE_MARKED", {
    attendanceId: String(record._id),
    classId: String(classId),
    sessionId: String(sessionId),
    participantId: String(participantId),
    status,
    actorId: String(user._id),
  });

  return {
    id: String(record._id),
    classId: String(record.classId),
    sessionId: String(record.sessionId),
    participantId: String(record.participantId),
    enrollmentId: String(record.enrollmentId),
    status: record.status,
    markedAt: record.markedAt,
  };
}

async function listClassAttendance({ user, classId, limit = 100 }) {
  await canMarkAttendance({ user, classId });
  const safeLimit = Math.min(200, Math.max(1, Number(limit) || 100));
  const rows = await AttendanceRecord.find({ classId }).sort({ updatedAt: -1 }).limit(safeLimit);
  return rows.map((r) => ({
    id: String(r._id),
    classId: String(r.classId),
    sessionId: String(r.sessionId),
    participantId: String(r.participantId),
    status: r.status,
    markedAt: r.markedAt,
  }));
}

module.exports = {
  markAttendance,
  listClassAttendance,
  ATTENDANCE_STATUSES,
};
