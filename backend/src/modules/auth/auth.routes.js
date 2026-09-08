const express = require("express");
const authController = require("./auth.controller");
const { validate } = require("../../middleware/validate");
const { authenticate, authorize } = require("../../middleware/authenticate");
const {
  loginLimiter,
  otpSendLimiter,
  otpVerifyLimiter,
  passwordResetLimiter,
  refreshLimiter,
  checkPhoneLimiter,
} = require("../../middleware/rateLimit");
const {
  checkPhoneSchema,
  sendOtpSchema,
  verifyOtpSchema,
  registerSchema,
  loginSchema,
  resetPasswordSchema,
} = require("./auth.validation");
const { success } = require("../../utils/apiResponse");

const router = express.Router();

router.post(
  "/check-phone",
  checkPhoneLimiter,
  validate(checkPhoneSchema),
  authController.checkPhone,
);

router.post(
  "/register/send-otp",
  otpSendLimiter,
  validate(sendOtpSchema),
  authController.sendRegisterOtp,
);

router.post(
  "/register/verify-otp",
  otpVerifyLimiter,
  validate(verifyOtpSchema),
  authController.verifyRegisterOtp,
);

router.post("/register", validate(registerSchema), authController.register);

router.post("/login", loginLimiter, validate(loginSchema), authController.login);

router.post(
  "/password/send-otp",
  passwordResetLimiter,
  validate(sendOtpSchema),
  authController.sendPasswordOtp,
);

router.post(
  "/password/verify-otp",
  otpVerifyLimiter,
  validate(verifyOtpSchema),
  authController.verifyPasswordOtp,
);

router.post(
  "/password/reset",
  passwordResetLimiter,
  validate(resetPasswordSchema),
  authController.resetPassword,
);

router.post("/refresh", refreshLimiter, authController.refresh);
router.post("/logout", authController.logout);
router.get("/me", authenticate, authController.me);

// Authorization foundation for future Admin Dashboard (no UI yet).
router.get("/admin/ping", authenticate, authorize("ADMIN"), (req, res) =>
  success(res, { ok: true, role: req.user.role }),
);

module.exports = router;
