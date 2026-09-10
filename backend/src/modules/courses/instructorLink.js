const { Instructor } = require("./instructor.model");
const { User } = require("../auth/user.model");
const { normalizePhone, isValidIranianMobile } = require("../../utils/phone");
const { logEvent } = require("../../services/logging");
const { AppError } = require("../../utils/AppError");

/**
 * Find an active instructor whose stored phone normalizes to the same mobile,
 * and who is not yet linked to a user.
 */
async function findUnlinkedInstructorByPhone(phone) {
  const normalized = normalizePhone(phone);
  if (!normalized || !isValidIranianMobile(normalized)) return null;

  const exact = await Instructor.findOne({
    isActive: true,
    phone: normalized,
    $or: [{ userId: null }, { userId: { $exists: false } }],
  }).sort({ createdAt: 1 });
  if (exact) return exact;

  const candidates = await Instructor.find({
    isActive: true,
    phone: { $nin: [null, ""] },
    $or: [{ userId: null }, { userId: { $exists: false } }],
  }).limit(200);

  return (
    candidates.find((row) => normalizePhone(row.phone) === normalized) || null
  );
}

async function assertUserFreeForLink(userId, excludeInstructorId) {
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
 * After register/login: if an active instructor profile has this phone and no user link,
 * attach the current user so /instructor workspace opens.
 * Never invents access — only matches admin-created instructor phone.
 */
async function tryLinkInstructorByPhone(userId, phone) {
  if (!userId || !phone) return null;

  const already = await Instructor.findOne({ userId, isActive: true }).select("_id");
  if (already) return already;

  const instructor = await findUnlinkedInstructorByPhone(phone);
  if (!instructor) return null;

  try {
    await assertUserFreeForLink(userId, instructor._id);
  } catch (err) {
    if (err?.code === "INSTRUCTOR_USER_LINKED") return null;
    throw err;
  }

  const normalized = normalizePhone(phone);
  instructor.userId = userId;
  if (normalized && isValidIranianMobile(normalized)) {
    instructor.phone = normalized;
  }
  await instructor.save();

  logEvent("INSTRUCTOR_AUTO_LINKED_BY_PHONE", {
    instructorId: String(instructor._id),
    userId: String(userId),
  });
  return instructor;
}

/**
 * When admin saves an instructor phone (and userId is empty), link to existing User if present.
 */
async function tryLinkUserToInstructorByStoredPhone(instructor) {
  if (!instructor || instructor.userId || !instructor.isActive) return instructor;
  const normalized = normalizePhone(instructor.phone);
  if (!normalized || !isValidIranianMobile(normalized)) return instructor;

  const user = await User.findOne({ phone: normalized, isActive: true }).select("_id");
  if (!user) return instructor;

  try {
    await assertUserFreeForLink(user._id, instructor._id);
  } catch (err) {
    if (err?.code === "INSTRUCTOR_USER_LINKED") return instructor;
    throw err;
  }

  instructor.userId = user._id;
  instructor.phone = normalized;
  await instructor.save();

  logEvent("INSTRUCTOR_AUTO_LINKED_BY_PHONE", {
    instructorId: String(instructor._id),
    userId: String(user._id),
    source: "admin_save",
  });
  return instructor;
}

function normalizeInstructorPhone(phone) {
  if (phone == null || phone === "") return "";
  const normalized = normalizePhone(phone);
  return isValidIranianMobile(normalized) ? normalized : String(phone).trim();
}

module.exports = {
  tryLinkInstructorByPhone,
  tryLinkUserToInstructorByStoredPhone,
  normalizeInstructorPhone,
  findUnlinkedInstructorByPhone,
};
