const argon2 = require("argon2");
const { AppError } = require("./AppError");

const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

async function hashPassword(password) {
  return argon2.hash(password, ARGON2_OPTIONS);
}

async function verifyPassword(passwordHash, password) {
  try {
    return await argon2.verify(passwordHash, password);
  } catch {
    throw new AppError("Password verification failed", {
      statusCode: 500,
      code: "PASSWORD_VERIFY_FAILED",
    });
  }
}

module.exports = {
  hashPassword,
  verifyPassword,
};
