const jwt = require("jsonwebtoken");
const { env } = require("../config/env");
const { AppError } = require("./AppError");
const { createGrantId } = require("./cryptoHash");

const TOKEN_PURPOSES = {
  ACCESS: "access",
  REFRESH: "refresh",
  REGISTER: "register",
  RESET_PASSWORD: "reset_password",
};

function signToken(payload, secret, expiresIn) {
  return jwt.sign(payload, secret, { expiresIn });
}

function verifyToken(token, secret, expectedPurpose) {
  try {
    const decoded = jwt.verify(token, secret);
    if (expectedPurpose && decoded.purpose !== expectedPurpose) {
      throw new AppError("Invalid token purpose", {
        statusCode: 401,
        code: "INVALID_TOKEN_PURPOSE",
      });
    }
    return decoded;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    if (error.name === "TokenExpiredError") {
      throw new AppError("Token has expired", {
        statusCode: 401,
        code: "TOKEN_EXPIRED",
      });
    }
    throw new AppError("Invalid token", {
      statusCode: 401,
      code: "INVALID_TOKEN",
    });
  }
}

function createAccessToken(user) {
  return signToken(
    {
      sub: String(user._id),
      role: user.role,
      purpose: TOKEN_PURPOSES.ACCESS,
    },
    env.JWT_ACCESS_SECRET,
    env.JWT_ACCESS_EXPIRES_IN,
  );
}

function createRegistrationToken(phone) {
  const jti = createGrantId();
  const token = signToken(
    {
      phone,
      purpose: TOKEN_PURPOSES.REGISTER,
      jti,
    },
    env.JWT_ACCESS_SECRET,
    env.JWT_REGISTRATION_EXPIRES_IN,
  );
  return { token, jti };
}

function createPasswordResetToken(userId, phone) {
  const jti = createGrantId();
  const token = signToken(
    {
      sub: String(userId),
      phone,
      purpose: TOKEN_PURPOSES.RESET_PASSWORD,
      jti,
    },
    env.JWT_ACCESS_SECRET,
    env.JWT_PASSWORD_RESET_EXPIRES_IN,
  );
  return { token, jti };
}

function verifyAccessToken(token) {
  return verifyToken(token, env.JWT_ACCESS_SECRET, TOKEN_PURPOSES.ACCESS);
}

function verifyRegistrationToken(token) {
  return verifyToken(token, env.JWT_ACCESS_SECRET, TOKEN_PURPOSES.REGISTER);
}

function verifyPasswordResetToken(token) {
  return verifyToken(token, env.JWT_ACCESS_SECRET, TOKEN_PURPOSES.RESET_PASSWORD);
}

module.exports = {
  TOKEN_PURPOSES,
  createAccessToken,
  createRegistrationToken,
  createPasswordResetToken,
  verifyAccessToken,
  verifyRegistrationToken,
  verifyPasswordResetToken,
};
