const { AppError } = require("../../utils/AppError");
const { Instructor } = require("./instructor.model");
const { CourseClass } = require("./courseClass.model");

/**
 * Instructor access is scoped via Instructor.userId ↔ CourseClass.instructorId.
 * Instructors do NOT inherit admin financial/medical privileges.
 * JWT roles remain USER | ADMIN — identity is derived from Instructor.userId.
 */
async function getInstructorForUser(userId) {
  if (!userId) return null;
  return Instructor.findOne({ userId, isActive: true });
}

/** Active linked instructor or 404 INSTRUCTOR_NOT_FOUND (for /instructors/me). */
async function requireActiveInstructor(userId) {
  const instructor = await getInstructorForUser(userId);
  if (!instructor) {
    throw new AppError("مربی فعالی برای این حساب یافت نشد", {
      statusCode: 404,
      code: "INSTRUCTOR_NOT_FOUND",
    });
  }
  return instructor;
}

/** Active linked instructor or 403 (for /instructors/me/classes). */
async function requireActiveInstructorAccess(userId) {
  const instructor = await getInstructorForUser(userId);
  if (!instructor) {
    throw new AppError("دسترسی مربی یافت نشد", { statusCode: 403, code: "FORBIDDEN" });
  }
  return instructor;
}

async function assertInstructorOwnsClass(userId, classId) {
  const instructor = await getInstructorForUser(userId);
  if (!instructor) {
    throw new AppError("دسترسی مربی یافت نشد", { statusCode: 403, code: "FORBIDDEN" });
  }
  const courseClass = await CourseClass.findById(classId).select("instructorId");
  if (!courseClass) {
    throw new AppError("کلاس یافت نشد", { statusCode: 404, code: "CLASS_NOT_FOUND" });
  }
  if (String(courseClass.instructorId) !== String(instructor._id)) {
    throw new AppError("دسترسی به این کلاس مجاز نیست", { statusCode: 403, code: "FORBIDDEN" });
  }
  return { instructor, courseClass };
}

async function canMarkAttendance({ user, classId }) {
  if (user.role === "ADMIN") return { allowed: true, via: "ADMIN" };
  await assertInstructorOwnsClass(user._id, classId);
  return { allowed: true, via: "INSTRUCTOR" };
}

/**
 * Roster / class-scoped instructor reads: ADMIN or owning instructor.
 * Ownership is never taken from client-supplied instructorId.
 */
async function assertCanAccessClass({ user, classId }) {
  if (user.role === "ADMIN") {
    const courseClass = await CourseClass.findById(classId).select("instructorId");
    if (!courseClass) {
      throw new AppError("کلاس یافت نشد", { statusCode: 404, code: "CLASS_NOT_FOUND" });
    }
    return { allowed: true, via: "ADMIN", courseClass };
  }
  const owned = await assertInstructorOwnsClass(user._id, classId);
  return { allowed: true, via: "INSTRUCTOR", ...owned };
}

module.exports = {
  getInstructorForUser,
  requireActiveInstructor,
  requireActiveInstructorAccess,
  assertInstructorOwnsClass,
  canMarkAttendance,
  assertCanAccessClass,
};
