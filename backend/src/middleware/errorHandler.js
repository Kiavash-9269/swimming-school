const { fail } = require("../utils/apiResponse");
const { AppError } = require("../utils/AppError");
const { env } = require("../config/env");
const { logError, logEvent } = require("../services/logging");

function notFoundHandler(req, res) {
  return fail(res, {
    statusCode: 404,
    code: "NOT_FOUND",
    message: "Route not found",
  });
}

function errorHandler(err, req, res, _next) {
  if (err instanceof AppError) {
    return fail(res, {
      statusCode: err.statusCode,
      code: err.code,
      message: err.message,
      details: err.details,
    });
  }

  if (err?.name === "ZodError") {
    return fail(res, {
      statusCode: 400,
      code: "VALIDATION_ERROR",
      message: "Invalid request data",
      details: err.issues?.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  if (err?.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || "field";
    return fail(res, {
      statusCode: 409,
      code: "DUPLICATE_KEY",
      message: `${field} already exists`,
    });
  }

  if (err?.type === "entity.parse.failed") {
    return fail(res, {
      statusCode: 400,
      code: "INVALID_JSON",
      message: "Malformed JSON body",
    });
  }

  logError("UNEXPECTED_ERROR", err, {
    path: req.originalUrl,
    method: req.method,
  });

  return fail(res, {
    statusCode: 500,
    code: "INTERNAL_ERROR",
    message:
      env.NODE_ENV === "production"
        ? "An unexpected error occurred"
        : err.message || "An unexpected error occurred",
  });
}

function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

function rateLimitHandler(req, res) {
  logEvent("RATE_LIMIT_TRIGGERED", {
    path: req.originalUrl,
    ip: req.ip,
  });

  return fail(res, {
    statusCode: 429,
    code: "RATE_LIMITED",
    message: "Too many requests. Please try again later.",
  });
}

module.exports = {
  notFoundHandler,
  errorHandler,
  asyncHandler,
  rateLimitHandler,
};
