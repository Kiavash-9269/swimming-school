const { env } = require("../../config/env");
const { ROLES } = require("../auth/user.model");
const { AppError } = require("../../utils/AppError");

function isSuperAdmin(user) {
  return Boolean(user) && user.role === ROLES.ADMIN && user.phone === env.SUPER_ADMIN_PHONE;
}

function requireSuperAdmin(req, _res, next) {
  if (!isSuperAdmin(req.user)) {
    return next(
      new AppError("Only the super admin can manage admins", {
        statusCode: 403,
        code: "SUPER_ADMIN_ONLY",
      }),
    );
  }
  return next();
}

module.exports = {
  isSuperAdmin,
  requireSuperAdmin,
};
