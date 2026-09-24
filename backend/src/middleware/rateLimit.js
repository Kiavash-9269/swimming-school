const { rateLimit } = require("express-rate-limit");
const { rateLimitHandler } = require("./errorHandler");
const { env } = require("../config/env");

function createLimiter({ windowMs, max }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler,
    // Default: skip in Jest unless TEST_RATE_LIMIT=1 for dedicated rate-limit tests.
    skip: () => env.NODE_ENV === "test" && process.env.TEST_RATE_LIMIT !== "1",
    validate: { trustProxy: false },
  });
}

const windowMs = 15 * 60 * 1000;
/** In local/dev, allow many OTP probes without blocking real phone tests. */
const isDev = env.NODE_ENV === "development";

const loginLimiter = createLimiter({ windowMs, max: isDev ? 100 : 20 });
const otpSendLimiter = createLimiter({ windowMs, max: isDev ? 100 : 10 });
const otpVerifyLimiter = createLimiter({ windowMs, max: isDev ? 100 : 30 });
const passwordResetLimiter = createLimiter({ windowMs, max: isDev ? 100 : 15 });
const refreshLimiter = createLimiter({ windowMs, max: 60 });
const checkPhoneLimiter = createLimiter({ windowMs, max: 60 });

module.exports = {
  loginLimiter,
  otpSendLimiter,
  otpVerifyLimiter,
  passwordResetLimiter,
  refreshLimiter,
  checkPhoneLimiter,
  createLimiter,
};
