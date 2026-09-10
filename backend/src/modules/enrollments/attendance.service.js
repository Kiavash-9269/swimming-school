const { AppError } = require("../../utils/AppError");
const { logEvent } = require("../../services/logging");
const { AttendanceRecord } = require("./attendance.model");
const { Enrollment } = require("./enrollment.model");
const { ClassSession } = require("../courses/classSession.model");
const { CourseClass } = require("../courses/courseClass.model");
const { ENROLLMENT_STATUSES } = require("../courses/domain.constants");
const { canMarkAttendance } = require("../courses/instructorAccess");

const ATTENDANCE_STATUSES = ["PRESENT", "ABSENT", "LATE", "EXCUSED", "UNKNOWN"];
const MARKABLE_STATUSES = ["PRESENT", "ABSENT", "LATE", "EXCUSED"];

async function notifyAbsentIfNeeded({ enrollment, courseClass, session, attendanceId, previousStatus, status }) {
  if (status !== "ABSENT" || previousStatus === "ABSENT") return false;
  try {
    const { onAttendanceAbsent } = require("../notifications/dispatcher");
    await onAttendanceAbsent({
      enrollment,
      courseClass,
      session,
      attendanceId,
    });
    return true;
  } catch {
    return false;
  }
}

async function markAttendance({
  user,
  classId,
  sessionId,
  participantId,
  status,
  notifyAbsent = true,
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

  const previous = await AttendanceRecord.findOne({ sessionId, participantId }).select("status").lean();

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

  let absentNotified = false;
  if (notifyAbsent) {
    const courseClass = await CourseClass.findById(classId).select("title").lean();
    absentNotified = await notifyAbsentIfNeeded({
      enrollment,
      courseClass,
      session,
      attendanceId: record._id,
      previousStatus: previous?.status,
      status,
    });
  }

  return {
    id: String(record._id),
    classId: String(record.classId),
    sessionId: String(record.sessionId),
    participantId: String(record.participantId),
    enrollmentId: String(record.enrollmentId),
    status: record.status,
    markedAt: record.markedAt,
    absentNotified,
  };
}

/**
 * Batch save for one session day — SMS for newly ABSENT only after all marks are written.
 */
async function submitSessionAttendance({ user, classId, sessionId, marks }) {
  if (!Array.isArray(marks) || marks.length === 0) {
    throw new AppError("لیست وضعیت حضور خالی است", { statusCode: 400, code: "VALIDATION_ERROR" });
  }
  if (marks.length > 200) {
    throw new AppError("تعداد ردیف‌ها بیش از حد مجاز است", { statusCode: 400, code: "VALIDATION_ERROR" });
  }

  await canMarkAttendance({ user, classId });

  const session = await ClassSession.findOne({ _id: sessionId, classId });
  if (!session) {
    throw new AppError("جلسه یافت نشد", { statusCode: 404, code: "SESSION_NOT_FOUND" });
  }

  const courseClass = await CourseClass.findById(classId).select("title").lean();
  if (!courseClass) {
    throw new AppError("کلاس یافت نشد", { statusCode: 404, code: "CLASS_NOT_FOUND" });
  }

  const seen = new Set();
  const normalized = [];
  for (const row of marks) {
    const participantId = String(row.participantId || "");
    const status = row.status;
    if (!participantId || seen.has(participantId)) {
      throw new AppError("شناسه شرکت‌کننده تکراری یا نامعتبر است", {
        statusCode: 400,
        code: "VALIDATION_ERROR",
      });
    }
    if (!MARKABLE_STATUSES.includes(status)) {
      throw new AppError("وضعیت حضور نامعتبر است", { statusCode: 400, code: "VALIDATION_ERROR" });
    }
    seen.add(participantId);
    normalized.push({ participantId, status });
  }

  const participantIds = normalized.map((m) => m.participantId);
  const enrollments = await Enrollment.find({
    classId,
    participantId: { $in: participantIds },
    status: {
      $in: [ENROLLMENT_STATUSES.ACTIVE, ENROLLMENT_STATUSES.COMPLETED, ENROLLMENT_STATUSES.PENDING_COMPLIANCE],
    },
  }).lean();
  const enrollmentByParticipant = new Map(enrollments.map((e) => [String(e.participantId), e]));

  for (const m of normalized) {
    if (!enrollmentByParticipant.has(m.participantId)) {
      throw new AppError("ثبت‌نام فعال برای این شرکت‌کننده یافت نشد", {
        statusCode: 404,
        code: "ENROLLMENT_NOT_FOUND",
        details: { participantId: m.participantId },
      });
    }
  }

  const previousRows = await AttendanceRecord.find({
    sessionId,
    participantId: { $in: participantIds },
  })
    .select("participantId status")
    .lean();
  const previousByParticipant = new Map(previousRows.map((r) => [String(r.participantId), r.status]));

  const now = new Date();
  const items = [];
  const newlyAbsent = [];

  for (const m of normalized) {
    const enrollment = enrollmentByParticipant.get(m.participantId);
    const previousStatus = previousByParticipant.get(m.participantId);
    const record = await AttendanceRecord.findOneAndUpdate(
      { sessionId, participantId: m.participantId },
      {
        $set: {
          classId,
          enrollmentId: enrollment._id,
          status: m.status,
          markedBy: user._id,
          markedAt: now,
        },
        $setOnInsert: { sessionId, participantId: m.participantId },
      },
      { upsert: true, returnDocument: "after" },
    );

    items.push({
      id: String(record._id),
      classId: String(record.classId),
      sessionId: String(record.sessionId),
      participantId: String(record.participantId),
      enrollmentId: String(record.enrollmentId),
      status: record.status,
      markedAt: record.markedAt,
    });

    if (m.status === "ABSENT" && previousStatus !== "ABSENT") {
      newlyAbsent.push({ enrollment, attendanceId: record._id, previousStatus });
    }
  }

  logEvent("ATTENDANCE_SESSION_SUBMITTED", {
    classId: String(classId),
    sessionId: String(sessionId),
    actorId: String(user._id),
    markedCount: items.length,
    newlyAbsentCount: newlyAbsent.length,
  });

  let absentNotified = 0;
  for (const row of newlyAbsent) {
    const ok = await notifyAbsentIfNeeded({
      enrollment: row.enrollment,
      courseClass,
      session,
      attendanceId: row.attendanceId,
      previousStatus: row.previousStatus,
      status: "ABSENT",
    });
    if (ok) absentNotified += 1;
  }

  return {
    items,
    markedCount: items.length,
    newlyAbsentCount: newlyAbsent.length,
    absentNotified,
  };
}

async function listClassAttendance({ user, classId, limit = 100 }) {
  await canMarkAttendance({ user, classId });
  const safeLimit = Math.min(200, Math.max(1, Number(limit) || 100));
  const rows = await AttendanceRecord.find({ classId })
    .sort({ markedAt: -1 })
    .limit(safeLimit)
    .lean();

  return {
    items: rows.map((r) => ({
      id: String(r._id),
      classId: String(r.classId),
      sessionId: String(r.sessionId),
      participantId: String(r.participantId),
      enrollmentId: r.enrollmentId ? String(r.enrollmentId) : null,
      status: r.status,
      markedAt: r.markedAt,
    })),
  };
}

module.exports = {
  markAttendance,
  submitSessionAttendance,
  listClassAttendance,
  ATTENDANCE_STATUSES,
};
