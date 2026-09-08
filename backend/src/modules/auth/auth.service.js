const { env } = require("../../config/env");
const { User, ROLES } = require("./user.model");
const { Otp, OTP_PURPOSES } = require("./otp.model");
const { Session } = require("./session.model");
const { AuthGrant, GRANT_TYPES } = require("./authGrant.model");
const { AppError } = require("../../utils/AppError");
const { hashPassword, verifyPassword } = require("../../utils/password");
const {
  generateOtpCode,
  generateOpaqueToken,
  hashValue,
  verifyHash,
  sha256,
} = require("../../utils/cryptoHash");
const {
  createAccessToken,
  createRegistrationToken,
  createPasswordResetToken,
  verifyRegistrationToken,
  verifyPasswordResetToken,
} = require("../../utils/jwt");
const { otpDeliveryService, SmsProviderError } = require("../../services/otpDelivery");
const { logEvent } = require("../../services/logging");
const { maskPhone } = require("../../utils/mask");

const REFRESH_REUSE_GRACE_MS = 5000;

function parseDurationToMs(value) {
  const match = String(value).trim().match(/^(\d+)([smhd])$/i);
  if (!match) {
    return 7 * 24 * 60 * 60 * 1000;
  }
  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const map = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };
  return amount * map[unit];
}

function toPublicUser(user) {
  return {
    id: String(user._id),
    phone: user.phone,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    phoneVerified: user.phoneVerified,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

async function createSession(user, meta = {}) {
  const refreshToken = generateOpaqueToken();
  const refreshTokenHash = sha256(refreshToken);
  const expiresAt = new Date(Date.now() + parseDurationToMs(env.JWT_REFRESH_EXPIRES_IN));

  const session = await Session.create({
    userId: user._id,
    refreshTokenHash,
    expiresAt,
    lastUsedAt: new Date(),
    userAgent: meta.userAgent || null,
    ip: meta.ip || null,
  });

  logEvent("SESSION_CREATED", {
    userId: String(user._id),
    sessionId: String(session._id),
  });

  const accessToken = createAccessToken(user);

  return {
    accessToken,
    refreshToken,
    session,
    user: toPublicUser(user),
  };
}

async function revokeSessionByRefreshToken(refreshToken) {
  if (!refreshToken) {
    return false;
  }

  const refreshTokenHash = sha256(refreshToken);
  const session = await Session.findOneAndUpdate(
    { refreshTokenHash, revokedAt: null },
    { $set: { revokedAt: new Date() } },
    { returnDocument: 'after' },
  );

  if (!session) {
    return false;
  }

  logEvent("SESSION_REVOKED", {
    userId: String(session.userId),
    sessionId: String(session._id),
    reason: "logout",
  });
  return true;
}

async function revokeAllUserSessions(userId, reason = "password_reset", exceptSessionId = null) {
  const filter = { userId, revokedAt: null };
  if (exceptSessionId) {
    filter._id = { $ne: exceptSessionId };
  }

  const result = await Session.updateMany(filter, { $set: { revokedAt: new Date() } });

  logEvent("SESSION_REVOKED", {
    userId: String(userId),
    reason,
    count: result.modifiedCount,
  });
}

async function findActiveOtp(phone, purpose) {
  return Otp.findOne({
    phone,
    purpose,
    consumedAt: null,
    invalidatedAt: null,
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });
}

async function invalidateActiveOtps(phone, purpose) {
  await Otp.updateMany(
    {
      phone,
      purpose,
      consumedAt: null,
      invalidatedAt: null,
    },
    { $set: { invalidatedAt: new Date() } },
  );
}

async function assertPhoneOtpRateLimit(phone) {
  const since = new Date(Date.now() - env.OTP_RATE_LIMIT_WINDOW_SEC * 1000);
  const count = await Otp.countDocuments({ phone, createdAt: { $gte: since } });
  if (count >= env.OTP_RATE_LIMIT_PER_PHONE) {
    throw new AppError("تعداد درخواست‌های کد برای این شماره بیش از حد مجاز است", {
      statusCode: 429,
      code: "OTP_PHONE_RATE_LIMIT",
      details: {
        retryAfterSeconds: env.OTP_RATE_LIMIT_WINDOW_SEC,
      },
    });
  }
}

/**
 * OTP issue flow:
 * cooldown → phone rate-limit → invalidate prior → persist → deliver SMS
 * On provider failure: invalidate the just-created OTP and return error (no false success).
 * Invalidated OTPs do not trigger cooldown, so the user may retry after a delivery failure.
 */
async function issueOtp({ phone, purpose }) {
  const active = await findActiveOtp(phone, purpose);
  if (active) {
    const elapsedMs = Date.now() - new Date(active.createdAt).getTime();
    const cooldownMs = env.OTP_RESEND_COOLDOWN_SECONDS * 1000;
    if (elapsedMs < cooldownMs) {
      const retryAfterSeconds = Math.ceil((cooldownMs - elapsedMs) / 1000);
      throw new AppError("لطفاً قبل از درخواست مجدد کد صبر کنید", {
        statusCode: 429,
        code: "OTP_COOLDOWN",
        details: { retryAfterSeconds },
      });
    }
  }

  await assertPhoneOtpRateLimit(phone);
  await invalidateActiveOtps(phone, purpose);

  const code = generateOtpCode(env.OTP_CODE_LENGTH);
  const codeHash = await hashValue(code);
  const expiresAt = new Date(Date.now() + env.OTP_TTL_SECONDS * 1000);

  let otpDoc;
  try {
    otpDoc = await Otp.create({
      phone,
      codeHash,
      purpose,
      expiresAt,
      maxAttempts: env.OTP_MAX_ATTEMPTS,
    });
  } catch (error) {
    if (error?.code === 11000) {
      // Concurrent send lost the unique active-OTP race.
      throw new AppError("لطفاً قبل از درخواست مجدد کد صبر کنید", {
        statusCode: 429,
        code: "OTP_COOLDOWN",
      });
    }
    throw error;
  }

  logEvent("OTP_REQUESTED", { phoneMasked: maskPhone(phone), purpose });

  try {
    const delivery = await otpDeliveryService.deliver({ phone, code, purpose });
    const payload = {
      sent: true,
      expiresInSeconds: env.OTP_TTL_SECONDS,
      cooldownSeconds: env.OTP_RESEND_COOLDOWN_SECONDS,
    };

    const devOtp = otpDeliveryService.maybeExposeDevOtp(delivery.code);
    if (devOtp) {
      payload.devOtp = devOtp;
    }

    return payload;
  } catch (error) {
    await Otp.updateOne(
      { _id: otpDoc._id, consumedAt: null },
      { $set: { invalidatedAt: new Date() } },
    );

    if (error instanceof SmsProviderError || error instanceof AppError) {
      throw error;
    }

    throw new AppError("ارسال پیامک ناموفق بود. لطفاً دوباره تلاش کنید", {
      statusCode: 502,
      code: "SMS_DELIVERY_FAILED",
    });
  }
}

async function verifyOtp({ phone, code, purpose }) {
  const otp = await findActiveOtp(phone, purpose);

  if (!otp) {
    logEvent("OTP_VERIFICATION_FAILED", { phone, purpose, reason: "not_found_or_expired" });
    throw new AppError("کد تأیید نامعتبر یا منقضی شده است", {
      statusCode: 400,
      code: "INVALID_OTP",
    });
  }

  if (otp.attempts >= otp.maxAttempts) {
    await Otp.updateOne({ _id: otp._id, invalidatedAt: null }, { $set: { invalidatedAt: new Date() } });
    logEvent("OTP_VERIFICATION_FAILED", { phone, purpose, reason: "max_attempts" });
    throw new AppError("تعداد تلاش‌های مجاز برای این کد به پایان رسیده است", {
      statusCode: 429,
      code: "OTP_ATTEMPTS_EXCEEDED",
    });
  }

  const matches = await verifyHash(otp.codeHash, code);
  if (!matches) {
    const updated = await Otp.findOneAndUpdate(
      {
        _id: otp._id,
        consumedAt: null,
        invalidatedAt: null,
        expiresAt: { $gt: new Date() },
        attempts: { $lt: otp.maxAttempts },
      },
      { $inc: { attempts: 1 } },
      { returnDocument: 'after' },
    );

    if (!updated) {
      logEvent("OTP_VERIFICATION_FAILED", { phone, purpose, reason: "race_or_exhausted" });
      throw new AppError("کد تأیید نامعتبر یا منقضی شده است", {
        statusCode: 400,
        code: "INVALID_OTP",
      });
    }

    if (updated.attempts >= updated.maxAttempts) {
      await Otp.updateOne({ _id: updated._id }, { $set: { invalidatedAt: new Date() } });
      logEvent("OTP_VERIFICATION_FAILED", {
        phone,
        purpose,
        reason: "max_attempts",
        attempts: updated.attempts,
      });
      throw new AppError("تعداد تلاش‌های مجاز برای این کد به پایان رسیده است", {
        statusCode: 429,
        code: "OTP_ATTEMPTS_EXCEEDED",
      });
    }

    logEvent("OTP_VERIFICATION_FAILED", {
      phone,
      purpose,
      reason: "mismatch",
      attempts: updated.attempts,
    });
    throw new AppError("کد تأیید نادرست است", {
      statusCode: 400,
      code: "INVALID_OTP",
    });
  }

  // Atomic consume — only one concurrent correct verification wins.
  const consumed = await Otp.findOneAndUpdate(
    {
      _id: otp._id,
      consumedAt: null,
      invalidatedAt: null,
      expiresAt: { $gt: new Date() },
    },
    { $set: { consumedAt: new Date() } },
    { returnDocument: 'after' },
  );

  if (!consumed) {
    logEvent("OTP_VERIFICATION_FAILED", { phone, purpose, reason: "already_consumed" });
    throw new AppError("کد تأیید نامعتبر یا منقضی شده است", {
      statusCode: 400,
      code: "INVALID_OTP",
    });
  }

  logEvent("OTP_VERIFIED", { phone, purpose });
  return consumed;
}

async function createAuthGrant({ jti, type, phone, userId = null, expiresInMs }) {
  await AuthGrant.create({
    jti,
    type,
    phone,
    userId,
    expiresAt: new Date(Date.now() + expiresInMs),
  });
}

async function consumeAuthGrant({ jti, type, phone, userId = null }) {
  if (!jti) {
    throw new AppError("Invalid token", {
      statusCode: 401,
      code: "INVALID_TOKEN",
    });
  }

  const filter = {
    jti,
    type,
    phone,
    consumedAt: null,
    expiresAt: { $gt: new Date() },
  };
  if (userId) {
    filter.userId = userId;
  }

  const grant = await AuthGrant.findOneAndUpdate(
    filter,
    { $set: { consumedAt: new Date() } },
    { returnDocument: 'after' },
  );

  if (!grant) {
    throw new AppError("توکن دیگر معتبر نیست", {
      statusCode: 401,
      code: "TOKEN_REUSED_OR_EXPIRED",
    });
  }

  return grant;
}

async function checkPhone(phone) {
  const user = await User.findOne({ phone }).select("_id");
  return { exists: Boolean(user) };
}

async function sendRegisterOtp(phone) {
  const existing = await User.findOne({ phone }).select("_id");
  if (existing) {
    throw new AppError("این شماره قبلاً ثبت شده است. لطفاً وارد شوید", {
      statusCode: 409,
      code: "USER_EXISTS",
    });
  }

  return issueOtp({ phone, purpose: OTP_PURPOSES.REGISTER });
}

async function verifyRegisterOtp(phone, code) {
  const existing = await User.findOne({ phone }).select("_id");
  if (existing) {
    throw new AppError("این شماره قبلاً ثبت شده است. لطفاً وارد شوید", {
      statusCode: 409,
      code: "USER_EXISTS",
    });
  }

  await verifyOtp({ phone, code, purpose: OTP_PURPOSES.REGISTER });
  const { token, jti } = createRegistrationToken(phone);
  await createAuthGrant({
    jti,
    type: GRANT_TYPES.REGISTER,
    phone,
    expiresInMs: parseDurationToMs(env.JWT_REGISTRATION_EXPIRES_IN),
  });

  return {
    registrationToken: token,
    expiresIn: env.JWT_REGISTRATION_EXPIRES_IN,
  };
}

async function register({ registrationToken, firstName, lastName, password }, meta = {}) {
  const decoded = verifyRegistrationToken(registrationToken);
  const phone = decoded.phone;

  // Check before consuming the one-time grant so the user can correct the name and retry.
  const existingByName = await User.findOne({ firstName, lastName }).select("_id phone");
  if (existingByName) {
    throw new AppError("این کاربر با شماره دیگری وارد شده است", {
      statusCode: 409,
      code: "NAME_EXISTS",
    });
  }

  await consumeAuthGrant({
    jti: decoded.jti,
    type: GRANT_TYPES.REGISTER,
    phone,
  });

  const passwordHash = await hashPassword(password);

  let user;
  try {
    user = await User.create({
      phone,
      firstName,
      lastName,
      passwordHash,
      phoneVerified: true,
      role: ROLES.USER,
      isActive: true,
    });
  } catch (error) {
    if (error?.code === 11000) {
      if (error.keyPattern?.firstName || error.keyPattern?.lastName) {
        throw new AppError("این کاربر با شماره دیگری وارد شده است", {
          statusCode: 409,
          code: "NAME_EXISTS",
        });
      }
      throw new AppError("این شماره قبلاً ثبت شده است", {
        statusCode: 409,
        code: "USER_EXISTS",
      });
    }
    throw error;
  }

  logEvent("REGISTRATION_COMPLETED", { userId: String(user._id), phone });

  return createSession(user, meta);
}

async function login({ phone, password }, meta = {}) {
  const user = await User.findOne({ phone }).select("+passwordHash");

  const invalidCredentials = () =>
    new AppError("شماره موبایل یا رمز عبور نادرست است", {
      statusCode: 401,
      code: "INVALID_CREDENTIALS",
    });

  if (!user) {
    logEvent("LOGIN_FAILED", { phone, reason: "not_found" });
    throw invalidCredentials();
  }

  if (!user.isActive) {
    logEvent("LOGIN_FAILED", { phone, reason: "inactive" });
    throw new AppError("حساب کاربری غیرفعال است", {
      statusCode: 403,
      code: "USER_INACTIVE",
    });
  }

  if (!user.phoneVerified) {
    logEvent("LOGIN_FAILED", { phone, reason: "unverified" });
    throw new AppError("شماره موبایل تأیید نشده است", {
      statusCode: 403,
      code: "PHONE_NOT_VERIFIED",
    });
  }

  const valid = await verifyPassword(user.passwordHash, password);
  if (!valid) {
    logEvent("LOGIN_FAILED", { phone, reason: "bad_password" });
    throw invalidCredentials();
  }

  logEvent("LOGIN_SUCCESS", { userId: String(user._id), phone });
  return createSession(user, meta);
}

/**
 * Forgot-password policy:
 * Response shape is identical for known/unknown phones (no `eligible` flag).
 * OTP is only created for active verified users. Timing differences may remain.
 */
async function sendPasswordResetOtp(phone) {
  const user = await User.findOne({ phone }).select("_id isActive phoneVerified");
  const generic = {
    sent: true,
    message: "اگر حسابی با این شماره وجود داشته باشد، کد بازیابی ارسال می‌شود",
    expiresInSeconds: env.OTP_TTL_SECONDS,
    cooldownSeconds: env.OTP_RESEND_COOLDOWN_SECONDS,
  };

  if (!user || !user.isActive || !user.phoneVerified) {
    logEvent("OTP_REQUESTED", {
      phoneMasked: maskPhone(phone),
      purpose: OTP_PURPOSES.RESET_PASSWORD,
      skipped: true,
      reason: !user ? "unknown_phone" : "ineligible",
    });
    return generic;
  }

  const result = await issueOtp({ phone, purpose: OTP_PURPOSES.RESET_PASSWORD });
  return {
    ...generic,
    ...result,
    message: generic.message,
  };
}

async function verifyPasswordResetOtp(phone, code) {
  const user = await User.findOne({ phone }).select("_id isActive phoneVerified");
  if (!user || !user.isActive || !user.phoneVerified) {
    throw new AppError("کد تأیید نامعتبر یا منقضی شده است", {
      statusCode: 400,
      code: "INVALID_OTP",
    });
  }

  await verifyOtp({ phone, code, purpose: OTP_PURPOSES.RESET_PASSWORD });
  const { token, jti } = createPasswordResetToken(user._id, phone);
  await createAuthGrant({
    jti,
    type: GRANT_TYPES.RESET_PASSWORD,
    phone,
    userId: user._id,
    expiresInMs: parseDurationToMs(env.JWT_PASSWORD_RESET_EXPIRES_IN),
  });

  return {
    resetToken: token,
    expiresIn: env.JWT_PASSWORD_RESET_EXPIRES_IN,
  };
}

async function resetPassword({ resetToken, password }, meta = {}) {
  const decoded = verifyPasswordResetToken(resetToken);

  await consumeAuthGrant({
    jti: decoded.jti,
    type: GRANT_TYPES.RESET_PASSWORD,
    phone: decoded.phone,
    userId: decoded.sub,
  });

  const user = await User.findById(decoded.sub).select("+passwordHash");

  if (!user || user.phone !== decoded.phone || !user.isActive) {
    throw new AppError("توکن بازیابی نامعتبر است", {
      statusCode: 401,
      code: "INVALID_TOKEN",
    });
  }

  user.passwordHash = await hashPassword(password);
  await user.save();

  await revokeAllUserSessions(user._id, "password_reset");
  logEvent("PASSWORD_RESET_COMPLETED", { userId: String(user._id), phone: user.phone });

  return createSession(user, meta);
}

async function refreshSession(refreshToken, meta = {}) {
  if (!refreshToken) {
    throw new AppError("Refresh token required", {
      statusCode: 401,
      code: "UNAUTHORIZED",
    });
  }

  const refreshTokenHash = sha256(refreshToken);

  // Atomic claim/rotate — only one concurrent refresh wins.
  const session = await Session.findOneAndUpdate(
    {
      refreshTokenHash,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    },
    { $set: { revokedAt: new Date() } },
    { returnDocument: 'before' },
  );

  if (!session) {
    const existing = await Session.findOne({ refreshTokenHash });
    if (existing?.revokedAt) {
      const ageMs = Date.now() - new Date(existing.revokedAt).getTime();
      // Outside grace window: treat as token reuse / theft → revoke all sessions.
      if (ageMs > REFRESH_REUSE_GRACE_MS) {
        await revokeAllUserSessions(existing.userId, "refresh_reuse");
      }
    }
    throw new AppError("Session is invalid or expired", {
      statusCode: 401,
      code: "SESSION_INVALID",
    });
  }

  const user = await User.findById(session.userId);
  if (!user || !user.isActive) {
    throw new AppError("Session is invalid or expired", {
      statusCode: 401,
      code: "SESSION_INVALID",
    });
  }

  logEvent("SESSION_REVOKED", {
    userId: String(user._id),
    sessionId: String(session._id),
    reason: "refresh_rotation",
  });

  return createSession(user, meta);
}

async function getMe(userId) {
  const user = await User.findById(userId);
  if (!user || !user.isActive) {
    throw new AppError("Authentication required", {
      statusCode: 401,
      code: "UNAUTHORIZED",
    });
  }
  return toPublicUser(user);
}

module.exports = {
  checkPhone,
  sendRegisterOtp,
  verifyRegisterOtp,
  register,
  login,
  sendPasswordResetOtp,
  verifyPasswordResetOtp,
  resetPassword,
  refreshSession,
  revokeSessionByRefreshToken,
  getMe,
  toPublicUser,
  createSession,
};
