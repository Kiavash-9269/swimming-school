const mongoose = require("mongoose");
const { env } = require("../../config/env");
const { User, ROLES } = require("../auth/user.model");
const { Session } = require("../auth/session.model");
const { AppError } = require("../../utils/AppError");
const { hashPassword } = require("../../utils/password");

function toAdminView(user) {
  return {
    id: String(user._id),
    phone: user.phone,
    firstName: user.firstName,
    lastName: user.lastName,
    isActive: user.isActive,
    isSuperAdmin: user.phone === env.SUPER_ADMIN_PHONE,
    createdAt: user.createdAt,
  };
}

async function listAdmins() {
  const users = await User.find({ role: ROLES.ADMIN }).sort({ createdAt: 1 }).lean();
  return users.map(toAdminView);
}

/**
 * Existing account → promoted to ADMIN (keeps its own password).
 * New account → created as ADMIN with password = phone number.
 */
async function addAdmin({ phone, firstName, lastName }) {
  const existing = await User.findOne({ phone }).lean();
  if (existing) {
    if (existing.role === ROLES.ADMIN && existing.isActive) {
      throw new AppError("این شماره از قبل ادمین است", { statusCode: 409, code: "ALREADY_ADMIN" });
    }
    const updated = await User.findByIdAndUpdate(
      existing._id,
      { $set: { role: ROLES.ADMIN, isActive: true } },
      { new: true },
    ).lean();
    return { admin: toAdminView(updated), created: false };
  }

  if (!firstName || !lastName) {
    throw new AppError("برای شماره‌ای که حساب ندارد، نام و نام خانوادگی لازم است", {
      statusCode: 400,
      code: "NAME_REQUIRED",
    });
  }

  try {
    const user = await User.create({
      phone,
      firstName,
      lastName,
      passwordHash: await hashPassword(phone),
      phoneVerified: true,
      role: ROLES.ADMIN,
      isActive: true,
    });
    return { admin: toAdminView(user), created: true };
  } catch (error) {
    if (error?.code === 11000) {
      if (error.keyPattern?.firstName || error.keyPattern?.lastName) {
        throw new AppError("کاربری با همین نام و نام خانوادگی وجود دارد", {
          statusCode: 409,
          code: "NAME_EXISTS",
        });
      }
      throw new AppError("این شماره قبلاً ثبت شده است", { statusCode: 409, code: "USER_EXISTS" });
    }
    throw error;
  }
}

async function revokeAdmin(id) {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError("ادمین پیدا نشد", { statusCode: 404, code: "ADMIN_NOT_FOUND" });
  }
  const user = await User.findById(id).lean();
  if (!user || user.role !== ROLES.ADMIN) {
    throw new AppError("ادمین پیدا نشد", { statusCode: 404, code: "ADMIN_NOT_FOUND" });
  }
  if (user.phone === env.SUPER_ADMIN_PHONE) {
    throw new AppError("دسترسی ادمین اصلی قابل حذف نیست", {
      statusCode: 409,
      code: "CANNOT_REVOKE_SUPER_ADMIN",
    });
  }
  await User.updateOne({ _id: user._id }, { $set: { role: ROLES.USER } });
  await Session.updateMany({ userId: user._id, revokedAt: null }, { $set: { revokedAt: new Date() } });
  return { id: String(user._id), revoked: true };
}

module.exports = {
  listAdmins,
  addAdmin,
  revokeAdmin,
};
