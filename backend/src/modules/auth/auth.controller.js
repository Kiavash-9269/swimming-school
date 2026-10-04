const authService = require("./auth.service");
const { success } = require("../../utils/apiResponse");
const { env } = require("../../config/env");
const { asyncHandler } = require("../../middleware/errorHandler");

const REFRESH_COOKIE_NAME = "refreshToken";

function requestMeta(req) {
  return {
    userAgent: req.get("user-agent") || null,
    ip: req.ip,
  };
}

function refreshCookieOptions() {
  // Secure + SameSite=None only works over HTTPS. On plain HTTP (IP before DNS/SSL), use Lax.
  const secure = Boolean(env.COOKIE_SECURE);
  return {
    httpOnly: true,
    secure,
    sameSite: secure ? "none" : "lax",
    path: "/api/auth",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

function setRefreshCookie(res, refreshToken) {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions());
}

function clearRefreshCookie(res) {
  const { maxAge: _maxAge, ...clearOpts } = refreshCookieOptions();
  res.clearCookie(REFRESH_COOKIE_NAME, clearOpts);
}

function authSuccessPayload(authResult) {
  return {
    accessToken: authResult.accessToken,
    user: authResult.user,
  };
}

const checkPhone = asyncHandler(async (req, res) => {
  const result = await authService.checkPhone(req.body.phone);
  return success(res, result);
});

const sendRegisterOtp = asyncHandler(async (req, res) => {
  const result = await authService.sendRegisterOtp(req.body.phone);
  return success(res, result);
});

const verifyRegisterOtp = asyncHandler(async (req, res) => {
  const result = await authService.verifyRegisterOtp(req.body.phone, req.body.code);
  return success(res, result);
});

const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body, requestMeta(req));
  setRefreshCookie(res, result.refreshToken);
  return success(res, authSuccessPayload(result), 201);
});

const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body, requestMeta(req));
  setRefreshCookie(res, result.refreshToken);
  return success(res, authSuccessPayload(result));
});

const sendPasswordOtp = asyncHandler(async (req, res) => {
  const result = await authService.sendPasswordResetOtp(req.body.phone);
  return success(res, result);
});

const verifyPasswordOtp = asyncHandler(async (req, res) => {
  const result = await authService.verifyPasswordResetOtp(req.body.phone, req.body.code);
  return success(res, result);
});

const resetPassword = asyncHandler(async (req, res) => {
  const result = await authService.resetPassword(req.body, requestMeta(req));
  setRefreshCookie(res, result.refreshToken);
  return success(res, authSuccessPayload(result));
});

const refresh = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
  const result = await authService.refreshSession(refreshToken, requestMeta(req));
  setRefreshCookie(res, result.refreshToken);
  return success(res, authSuccessPayload(result));
});

const logout = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
  await authService.revokeSessionByRefreshToken(refreshToken);
  clearRefreshCookie(res);
  return success(res, { loggedOut: true });
});

const me = asyncHandler(async (req, res) => {
  const user = await authService.getMe(req.auth.userId);
  return success(res, { user });
});

module.exports = {
  checkPhone,
  sendRegisterOtp,
  verifyRegisterOtp,
  register,
  login,
  sendPasswordOtp,
  verifyPasswordOtp,
  resetPassword,
  refresh,
  logout,
  me,
  REFRESH_COOKIE_NAME,
  setRefreshCookie,
  clearRefreshCookie,
};
