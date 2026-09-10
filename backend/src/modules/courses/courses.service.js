const { env } = require("../../config/env");
const { AppError } = require("../../utils/AppError");
const { logEvent } = require("../../services/logging");
const { CLASS_STATUSES, SESSION_STATUSES, ENROLLMENT_STATUSES, GENDERS } = require("./domain.constants");
const { CourseTemplate } = require("./courseTemplate.model");
const { Instructor } = require("./instructor.model");
const { CourseClass } = require("./courseClass.model");
const { ClassSession } = require("./classSession.model");
const { generateSessionDates, parseTimeToMinutes } = require("./schedule");

/** Enrollments that block casual class cancel (must resolve financially/compliance first). */
const CANCEL_BLOCKING_ENROLLMENT_STATUSES = [
  ENROLLMENT_STATUSES.PENDING,
  ENROLLMENT_STATUSES.PAYMENT_PENDING,
  ENROLLMENT_STATUSES.PAID,
  ENROLLMENT_STATUSES.ACTIVE,
  ENROLLMENT_STATUSES.PENDING_COMPLIANCE,
];

function toPublicTemplate(doc) {
  return {
    id: String(doc._id),
    title: doc.title,
    description: doc.description,
    level: doc.level,
    ageMin: doc.ageMin,
    ageMax: doc.ageMax,
    genderRestriction: doc.genderRestriction,
    prerequisites: (doc.prerequisites || []).map((id) => String(id)),
    requiresInsurance: doc.requiresInsurance,
    requiresMedicalApproval: doc.requiresMedicalApproval,
    isActive: doc.isActive,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function toPublicClass(doc, { genderRestriction } = {}) {
  const available = Math.max(0, doc.capacity - doc.confirmedCount - doc.heldCount);
  return {
    id: String(doc._id),
    courseTemplateId: String(doc.courseTemplateId),
    title: doc.title,
    instructorId: String(doc.instructorId),
    startDate: doc.startDate,
    endDate: doc.endDate,
    daysOfWeek: doc.daysOfWeek,
    startTime: doc.startTime,
    endTime: doc.endTime,
    timezone: doc.timezone,
    totalSessions: doc.totalSessions,
    price: doc.price,
    capacity: doc.capacity,
    confirmedCount: doc.confirmedCount,
    heldCount: doc.heldCount,
    availableSeats: available,
    status: doc.status,
    genderRestriction: genderRestriction || null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

async function genderByTemplateIds(templateIds) {
  const ids = [...new Set((templateIds || []).map(String).filter(Boolean))];
  if (!ids.length) return new Map();
  const templates = await CourseTemplate.find({ _id: { $in: ids } })
    .select("genderRestriction")
    .lean();
  return new Map(templates.map((t) => [String(t._id), t.genderRestriction || GENDERS.ANY]));
}

async function toPublicClassEnriched(doc) {
  if (!doc) return null;
  const map = await genderByTemplateIds([doc.courseTemplateId]);
  return toPublicClass(doc, {
    genderRestriction: map.get(String(doc.courseTemplateId)) || GENDERS.ANY,
  });
}

function toPublicInstructor(doc) {
  return {
    id: String(doc._id),
    userId: doc.userId ? String(doc.userId) : null,
    name: doc.name,
    phone: doc.phone,
    bio: doc.bio,
    isActive: doc.isActive,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function toPublicSession(doc) {
  return {
    id: String(doc._id),
    classId: String(doc.classId),
    sessionNumber: doc.sessionNumber,
    date: doc.date,
    startTime: doc.startTime,
    endTime: doc.endTime,
    status: doc.status,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

async function createCourseTemplate(payload) {
  const template = await CourseTemplate.create(payload);
  logEvent("COURSE_CREATED", { courseTemplateId: String(template._id) });
  return toPublicTemplate(template);
}

async function updateCourseTemplate(id, payload) {
  const template = await CourseTemplate.findByIdAndUpdate(id, { $set: payload }, { returnDocument: "after", runValidators: true });
  if (!template) {
    throw new AppError("Course template not found", { statusCode: 404, code: "COURSE_NOT_FOUND" });
  }
  logEvent("COURSE_UPDATED", { courseTemplateId: String(template._id) });
  return toPublicTemplate(template);
}

async function getCourseTemplate(id, { isAdmin = false } = {}) {
  const template = await CourseTemplate.findById(id);
  if (!template) {
    throw new AppError("Course template not found", { statusCode: 404, code: "COURSE_NOT_FOUND" });
  }
  if (!isAdmin && !template.isActive) {
    throw new AppError("Course template not found", { statusCode: 404, code: "COURSE_NOT_FOUND" });
  }
  return toPublicTemplate(template);
}

async function listCourseTemplates({ activeOnly = false } = {}) {
  const filter = activeOnly ? { isActive: true } : {};
  const rows = await CourseTemplate.find(filter).sort({ createdAt: -1 });
  return rows.map(toPublicTemplate);
}

async function createInstructor(payload) {
  const {
    normalizeInstructorPhone,
    tryLinkUserToInstructorByStoredPhone,
  } = require("./instructorLink");

  const body = { ...payload };
  if (body.phone != null) body.phone = normalizeInstructorPhone(body.phone);

  if (body.userId) {
    await assertUserIdAvailableForInstructor(body.userId, null);
  }
  let instructor = await Instructor.create(body);
  if (!instructor.userId && instructor.phone) {
    instructor = await tryLinkUserToInstructorByStoredPhone(instructor);
  }
  logEvent("INSTRUCTOR_CREATED", {
    instructorId: String(instructor._id),
    userLinked: Boolean(instructor.userId),
  });
  return toPublicInstructor(instructor);
}

async function assertUserIdAvailableForInstructor(userId, excludeInstructorId) {
  if (!userId) return;
  const filter = { userId, isActive: true };
  if (excludeInstructorId) filter._id = { $ne: excludeInstructorId };
  const existing = await Instructor.findOne(filter).select("_id");
  if (existing) {
    throw new AppError("این کاربر قبلاً به یک مربی فعال لینک شده است", {
      statusCode: 409,
      code: "INSTRUCTOR_USER_LINKED",
    });
  }
}

/**
 * ADMIN update instructor profile / active flag / optional userId link.
 * Soft-deactivate via isActive=false — no hard DELETE.
 */
async function updateInstructor(id, payload) {
  const {
    normalizeInstructorPhone,
    tryLinkUserToInstructorByStoredPhone,
  } = require("./instructorLink");

  const instructor = await Instructor.findById(id);
  if (!instructor) {
    throw new AppError("مربی یافت نشد", { statusCode: 404, code: "INSTRUCTOR_NOT_FOUND" });
  }

  const next = { ...payload };
  if (Object.prototype.hasOwnProperty.call(next, "userId")) {
    const linkId = next.userId || null;
    if (linkId) {
      await assertUserIdAvailableForInstructor(linkId, instructor._id);
    }
    instructor.userId = linkId;
  }
  if (next.name != null) instructor.name = next.name;
  if (next.phone != null) instructor.phone = normalizeInstructorPhone(next.phone);
  if (next.bio != null) instructor.bio = next.bio;
  if (next.isActive != null) instructor.isActive = next.isActive;

  await instructor.save();

  if (!instructor.userId && instructor.phone && instructor.isActive) {
    await tryLinkUserToInstructorByStoredPhone(instructor);
  }

  logEvent("INSTRUCTOR_UPDATED", {
    instructorId: String(instructor._id),
    isActive: instructor.isActive,
    userLinked: Boolean(instructor.userId),
  });
  return toPublicInstructor(instructor);
}

async function listInstructors({ activeOnly = true } = {}) {
  const filter = activeOnly ? { isActive: true } : {};
  const rows = await Instructor.find(filter).sort({ name: 1 });
  return rows.map(toPublicInstructor);
}

function assertScheduleTimes(startTime, endTime) {
  if (parseTimeToMinutes(endTime) <= parseTimeToMinutes(startTime)) {
    throw new AppError("endTime must be after startTime", {
      statusCode: 400,
      code: "VALIDATION_ERROR",
    });
  }
}

async function createClass(payload) {
  const template = await CourseTemplate.findById(payload.courseTemplateId);
  if (!template || !template.isActive) {
    throw new AppError("Course template not found", { statusCode: 404, code: "COURSE_NOT_FOUND" });
  }
  const instructor = await Instructor.findById(payload.instructorId);
  if (!instructor || !instructor.isActive) {
    throw new AppError("Instructor not found", { statusCode: 404, code: "INSTRUCTOR_NOT_FOUND" });
  }

  assertScheduleTimes(payload.startTime, payload.endTime);
  if (new Date(payload.endDate) < new Date(payload.startDate)) {
    throw new AppError("endDate must be on/after startDate", {
      statusCode: 400,
      code: "VALIDATION_ERROR",
    });
  }

  const courseClass = await CourseClass.create({
    ...payload,
    timezone: payload.timezone || env.APP_TIMEZONE,
    status: CLASS_STATUSES.DRAFT,
    confirmedCount: 0,
    heldCount: 0,
  });

  logEvent("CLASS_CREATED", { classId: String(courseClass._id) });
  return toPublicClassEnriched(courseClass);
}

async function updateClass(id, payload) {
  const existing = await CourseClass.findById(id);
  if (!existing) {
    throw new AppError("Class not found", { statusCode: 404, code: "CLASS_NOT_FOUND" });
  }

  if (payload.capacity != null && payload.capacity < existing.confirmedCount + existing.heldCount) {
    throw new AppError("ظرفیت نمی‌تواند کمتر از صندلی‌های رزرو/تأیید شده باشد", {
      statusCode: 400,
      code: "VALIDATION_ERROR",
    });
  }

  if (payload.startTime && payload.endTime) {
    assertScheduleTimes(payload.startTime, payload.endTime);
  }

  const updates = { ...payload };
  if (existing.status !== CLASS_STATUSES.DRAFT) {
    delete updates.price;
    delete updates.courseTemplateId;
  }
  delete updates.confirmedCount;
  delete updates.heldCount;
  delete updates.status;

  if (updates.capacity != null && updates.capacity !== existing.capacity) {
    logEvent("CAPACITY_CHANGED", {
      classId: String(id),
      from: existing.capacity,
      to: updates.capacity,
    });
  }

  const courseClass = await CourseClass.findByIdAndUpdate(id, { $set: updates }, { returnDocument: "after", runValidators: true });
  logEvent("CLASS_UPDATED", { classId: String(id) });
  return toPublicClassEnriched(courseClass);
}

async function getClass(id, { isAdmin = false } = {}) {
  const courseClass = await CourseClass.findById(id);
  if (!courseClass) {
    throw new AppError("Class not found", { statusCode: 404, code: "CLASS_NOT_FOUND" });
  }
  const nonPublic = [
    CLASS_STATUSES.DRAFT,
    CLASS_STATUSES.CANCELLED,
    CLASS_STATUSES.ARCHIVED,
  ];
  if (!isAdmin && nonPublic.includes(courseClass.status)) {
    throw new AppError("Class not found", { statusCode: 404, code: "CLASS_NOT_FOUND" });
  }
  return toPublicClassEnriched(courseClass);
}

async function listClasses({ status, courseTemplateId, isAdmin = false } = {}) {
  const filter = {};
  if (status) {
    // Non-admins may not request DRAFT/CANCELLED/ARCHIVED explicitly
    if (
      !isAdmin &&
      [CLASS_STATUSES.DRAFT, CLASS_STATUSES.CANCELLED, CLASS_STATUSES.ARCHIVED].includes(status)
    ) {
      return [];
    }
    filter.status = status;
  } else if (!isAdmin) {
    filter.status = {
      $nin: [CLASS_STATUSES.DRAFT, CLASS_STATUSES.CANCELLED, CLASS_STATUSES.ARCHIVED],
    };
  }
  if (courseTemplateId) filter.courseTemplateId = courseTemplateId;
  const rows = await CourseClass.find(filter).sort({ startDate: 1 });
  const genderMap = await genderByTemplateIds(rows.map((r) => r.courseTemplateId));
  return rows.map((doc) =>
    toPublicClass(doc, {
      genderRestriction: genderMap.get(String(doc.courseTemplateId)) || GENDERS.ANY,
    }),
  );
}

async function transitionClassStatus(id, nextStatus, allowedFrom) {
  const courseClass = await CourseClass.findOneAndUpdate(
    { _id: id, status: { $in: allowedFrom } },
    { $set: { status: nextStatus } },
    { returnDocument: "after" },
  );
  if (!courseClass) {
    throw new AppError("تغییر وضعیت کلاس مجاز نیست", {
      statusCode: 409,
      code: "INVALID_CLASS_STATUS",
    });
  }
  return courseClass;
}

async function publishClass(id) {
  const courseClass = await transitionClassStatus(id, CLASS_STATUSES.PUBLISHED, [CLASS_STATUSES.DRAFT]);
  logEvent("CLASS_PUBLISHED", { classId: String(id) });
  return toPublicClassEnriched(courseClass);
}

async function openRegistration(id) {
  const courseClass = await transitionClassStatus(id, CLASS_STATUSES.REGISTRATION_OPEN, [
    CLASS_STATUSES.PUBLISHED,
    CLASS_STATUSES.REGISTRATION_CLOSED,
  ]);
  logEvent("REGISTRATION_OPENED", { classId: String(id) });
  return toPublicClassEnriched(courseClass);
}

async function closeRegistration(id) {
  const courseClass = await transitionClassStatus(id, CLASS_STATUSES.REGISTRATION_CLOSED, [
    CLASS_STATUSES.REGISTRATION_OPEN,
  ]);
  logEvent("REGISTRATION_CLOSED", { classId: String(id) });
  return toPublicClassEnriched(courseClass);
}

async function cancelClass(id) {
  const { Enrollment } = require("../enrollments/enrollment.model");
  const blocking = await Enrollment.countDocuments({
    classId: id,
    status: { $in: CANCEL_BLOCKING_ENROLLMENT_STATUSES },
  });
  if (blocking > 0) {
    throw new AppError("کلاس دارای ثبت‌نام فعال/در جریان است و قابل لغو نیست", {
      statusCode: 409,
      code: "CLASS_HAS_ACTIVE_ENROLLMENTS",
      details: { count: blocking },
    });
  }

  const courseClass = await transitionClassStatus(id, CLASS_STATUSES.CANCELLED, [
    CLASS_STATUSES.DRAFT,
    CLASS_STATUSES.PUBLISHED,
    CLASS_STATUSES.REGISTRATION_OPEN,
    CLASS_STATUSES.REGISTRATION_CLOSED,
    CLASS_STATUSES.IN_PROGRESS,
  ]);
  logEvent("CLASS_CANCELLED", { classId: String(id) });
  return toPublicClassEnriched(courseClass);
}

/** REGISTRATION_CLOSED → IN_PROGRESS */
async function startClass(id) {
  const courseClass = await transitionClassStatus(id, CLASS_STATUSES.IN_PROGRESS, [
    CLASS_STATUSES.REGISTRATION_CLOSED,
  ]);
  logEvent("CLASS_STARTED", { classId: String(id) });
  return toPublicClassEnriched(courseClass);
}

/** IN_PROGRESS → COMPLETED */
async function completeClass(id) {
  const courseClass = await transitionClassStatus(id, CLASS_STATUSES.COMPLETED, [
    CLASS_STATUSES.IN_PROGRESS,
  ]);
  logEvent("CLASS_COMPLETED", { classId: String(id) });
  return toPublicClassEnriched(courseClass);
}

/** COMPLETED | CANCELLED → ARCHIVED */
async function archiveClass(id) {
  const courseClass = await transitionClassStatus(id, CLASS_STATUSES.ARCHIVED, [
    CLASS_STATUSES.COMPLETED,
    CLASS_STATUSES.CANCELLED,
  ]);
  logEvent("CLASS_ARCHIVED", { classId: String(id) });
  return toPublicClassEnriched(courseClass);
}

async function generateSessionsForClass(classId) {
  const courseClass = await CourseClass.findById(classId);
  if (!courseClass) {
    throw new AppError("Class not found", { statusCode: 404, code: "CLASS_NOT_FOUND" });
  }

  const dates = generateSessionDates({
    startDate: courseClass.startDate,
    endDate: courseClass.endDate,
    daysOfWeek: courseClass.daysOfWeek,
    totalSessions: courseClass.totalSessions,
  });

  if (dates.length !== courseClass.totalSessions) {
    throw new AppError("تعداد جلسات قابل تولید با totalSessions برابر نیست", {
      statusCode: 400,
      code: "SESSION_GENERATION_FAILED",
      details: { generated: dates.length, expected: courseClass.totalSessions },
    });
  }

  const existingSessions = await ClassSession.find({ classId }).select("_id").lean();
  if (existingSessions.length > 0) {
    const { AttendanceRecord } = require("../enrollments/attendance.model");
    const sessionIds = existingSessions.map((s) => s._id);
    const attendanceCount = await AttendanceRecord.countDocuments({
      sessionId: { $in: sessionIds },
    });
    if (attendanceCount > 0) {
      throw new AppError(
        "تولید مجدد جلسات مجاز نیست چون برای جلسات فعلی رکورد حضور ثبت شده است",
        {
          statusCode: 409,
          code: "SESSIONS_HAVE_ATTENDANCE",
          details: { sessionCount: existingSessions.length, attendanceCount },
        },
      );
    }
  }

  await ClassSession.deleteMany({ classId });
  const docs = dates.map((date, index) => ({
    classId,
    sessionNumber: index + 1,
    date,
    startTime: courseClass.startTime,
    endTime: courseClass.endTime,
    status: SESSION_STATUSES.SCHEDULED,
  }));
  await ClassSession.insertMany(docs);
  logEvent("SESSIONS_GENERATED", { classId: String(classId), count: docs.length });
  return listSessions(classId);
}

async function listSessions(classId) {
  const rows = await ClassSession.find({ classId }).sort({ sessionNumber: 1 });
  return rows.map(toPublicSession);
}

async function getClassSchedule(classId) {
  const courseClass = await getClass(classId);
  return {
    classId: courseClass.id,
    startDate: courseClass.startDate,
    endDate: courseClass.endDate,
    daysOfWeek: courseClass.daysOfWeek,
    startTime: courseClass.startTime,
    endTime: courseClass.endTime,
    timezone: courseClass.timezone,
    totalSessions: courseClass.totalSessions,
  };
}

async function getMyInstructor(userId) {
  const { requireActiveInstructor } = require("./instructorAccess");
  const instructor = await requireActiveInstructor(userId);
  return toPublicInstructor(instructor);
}

async function listMyClasses(userId, { status } = {}) {
  const { requireActiveInstructorAccess } = require("./instructorAccess");
  const instructor = await requireActiveInstructorAccess(userId);
  const filter = { instructorId: instructor._id };
  if (status) filter.status = status;
  const rows = await CourseClass.find(filter).sort({ startDate: 1 });
  const genderMap = await genderByTemplateIds(rows.map((r) => r.courseTemplateId));
  return rows.map((doc) =>
    toPublicClass(doc, {
      genderRestriction: genderMap.get(String(doc.courseTemplateId)) || GENDERS.ANY,
    }),
  );
}

module.exports = {
  toPublicTemplate,
  toPublicClass,
  toPublicInstructor,
  toPublicSession,
  createCourseTemplate,
  updateCourseTemplate,
  getCourseTemplate,
  listCourseTemplates,
  createInstructor,
  updateInstructor,
  listInstructors,
  createClass,
  updateClass,
  getClass,
  listClasses,
  publishClass,
  openRegistration,
  closeRegistration,
  cancelClass,
  startClass,
  completeClass,
  archiveClass,
  generateSessionsForClass,
  listSessions,
  getClassSchedule,
  getMyInstructor,
  listMyClasses,
};
