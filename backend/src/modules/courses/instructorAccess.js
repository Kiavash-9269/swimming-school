const { AppError } = require("../../utils/AppError");
const { Instructor } = require("./instructor.model");
const { CourseClass } = require("./courseClass.model");

/**
 * Instructor access is scoped via Instructor.userId ↔ CourseClass.instructorId.
 * Instructors do NOT inherit admin financial/medical privileges.
 */
async function getInstructorForUser(userId) {
  if (!userId) return null;
  return Instructor.findOne({ userId, isActive: true });
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

module.exports = {
  getInstructorForUser,
  assertInstructorOwnsClass,
  canMarkAttendance,
};
