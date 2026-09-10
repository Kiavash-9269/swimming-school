const { User } = require("../modules/auth/user.model");
const { verifyAccessToken } = require("../utils/jwt");
const { AppError } = require("../utils/AppError");
const { asyncHandler } = require("./errorHandler");

function extractBearerToken(req) {
  const header = req.headers.authorization;
  if (!header || typeof header !== "string") {
    return null;
  }
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    return null;
  }
  return token;
}

const authenticate = asyncHandler(async (req, _res, next) => {
  const token = extractBearerToken(req);
  if (!token) {
    throw new AppError("Authentication required", {
      statusCode: 401,
      code: "UNAUTHORIZED",
    });
  }

  const decoded = verifyAccessToken(token);
  const user = await User.findById(decoded.sub);

  if (!user || !user.isActive) {
    throw new AppError("Authentication required", {
      statusCode: 401,
      code: "UNAUTHORIZED",
    });
  }

  req.user = user;
  req.auth = {
    userId: String(user._id),
    role: user.role,
  };

  return next();
});

/**
 * Attach user when Bearer token present; otherwise continue anonymously.
 * Used for public catalog routes that reveal more data to ADMIN.
 */
const optionalAuthenticate = asyncHandler(async (req, _res, next) => {
  const token = extractBearerToken(req);
  if (!token) return next();

  try {
    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.sub);
    if (user && user.isActive) {
      req.user = user;
      req.auth = {
        userId: String(user._id),
        role: user.role,
      };
    }
  } catch {
    // Invalid/expired token on optional path → treat as anonymous
  }
  return next();
});

/**
 * Future dashboard foundation:
 * router.get("/admin/stats", authenticate, authorize("ADMIN"), handler)
 */
function authorize(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(
        new AppError("Authentication required", {
          statusCode: 401,
          code: "UNAUTHORIZED",
        }),
      );
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError("Insufficient permissions", {
          statusCode: 403,
          code: "FORBIDDEN",
        }),
      );
    }

    return next();
  };
}

module.exports = {
  authenticate,
  optionalAuthenticate,
  authorize,
  extractBearerToken,
};
