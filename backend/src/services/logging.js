const pino = require("pino");
const { env } = require("../config/env");

const logger = pino({
  level: env.LOG_LEVEL,
  base: {
    service: "swimming-school-api",
    env: env.NODE_ENV,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      "password",
      "confirmPassword",
      "passwordHash",
      "code",
      "otp",
      "devOtp",
      "token",
      "accessToken",
      "refreshToken",
      "registrationToken",
      "resetToken",
      "authorization",
      "headers.authorization",
      "headers.cookie",
      "req.headers.authorization",
      "req.headers.cookie",
      "apiKey",
      "ApiKey",
      "SMS_WEBSERVICE_API_KEY",
      "KAVENEGAR_API_KEY",
      "JWT_ACCESS_SECRET",
      "JWT_REFRESH_SECRET",
    ],
    censor: "[REDACTED]",
  },
});

function logEvent(event, meta = {}) {
  logger.info({ event, ...meta }, event);
}

function logError(event, error, meta = {}) {
  logger.error(
    {
      event,
      err: {
        message: error?.message,
        name: error?.name,
        code: error?.code,
        stack: env.NODE_ENV === "production" ? undefined : error?.stack,
      },
      ...meta,
    },
    event,
  );
}

module.exports = {
  logger,
  logEvent,
  logError,
};
