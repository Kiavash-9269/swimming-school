const crypto = require("crypto");
const argon2 = require("argon2");

async function hashValue(value) {
  return argon2.hash(String(value), {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
}

async function verifyHash(hash, value) {
  try {
    return await argon2.verify(hash, String(value));
  } catch {
    return false;
  }
}

function generateOtpCode(length = 5) {
  const max = 10 ** length;
  const num = crypto.randomInt(0, max);
  return String(num).padStart(length, "0");
}

function generateOpaqueToken() {
  return crypto.randomBytes(48).toString("base64url");
}

function createGrantId() {
  return crypto.randomBytes(24).toString("base64url");
}

function sha256(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

module.exports = {
  hashValue,
  verifyHash,
  generateOtpCode,
  generateOpaqueToken,
  createGrantId,
  sha256,
};
