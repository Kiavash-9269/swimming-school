const request = require("supertest");
const { createApp } = require("../src/app");
const { setupTestDatabase, clearDatabase, teardownTestDatabase } = require("./helpers/db");
const { User } = require("../src/modules/auth/user.model");
const { Otp } = require("../src/modules/auth/otp.model");
const { Session } = require("../src/modules/auth/session.model");
const { AuthGrant } = require("../src/modules/auth/authGrant.model");
const { hashPassword } = require("../src/utils/password");

describe("Auth security & concurrency", () => {
  let app;

  beforeAll(async () => {
    await setupTestDatabase();
    app = createApp();
  }, 120000);

  afterEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  function cookiesFrom(res) {
    const raw = res.headers["set-cookie"];
    if (!raw) return "";
    return Array.isArray(raw) ? raw.map((c) => c.split(";")[0]).join("; ") : String(raw).split(";")[0];
  }

  async function getRegistrationToken(phone) {
    const send = await request(app).post("/api/auth/register/send-otp").send({ phone });
    const verify = await request(app)
      .post("/api/auth/register/verify-otp")
      .send({ phone, code: send.body.data.devOtp });
    return verify.body.data.registrationToken;
  }

  describe("Registration token single-use", () => {
    test("rejects reused registration token after success", async () => {
      const phone = "09130000001";
      const registrationToken = await getRegistrationToken(phone);

      const first = await request(app).post("/api/auth/register").send({
        registrationToken,
        firstName: "یک",
        lastName: "کاربر",
        password: "Password1",
        confirmPassword: "Password1",
      });
      expect(first.status).toBe(201);

      const second = await request(app).post("/api/auth/register").send({
        registrationToken,
        firstName: "دو",
        lastName: "کاربر",
        password: "Password1",
        confirmPassword: "Password1",
      });
      expect(second.status).toBe(401);
      expect(second.body.error.code).toBe("TOKEN_REUSED_OR_EXPIRED");
      expect(await User.countDocuments({ phone })).toBe(1);
    });

    test("concurrent registration with same token creates at most one user", async () => {
      const phone = "09130000002";
      const registrationToken = await getRegistrationToken(phone);
      const payload = {
        registrationToken,
        firstName: "همزمان",
        lastName: "تست",
        password: "Password1",
        confirmPassword: "Password1",
      };

      const results = await Promise.all([
        request(app).post("/api/auth/register").send(payload),
        request(app).post("/api/auth/register").send(payload),
        request(app).post("/api/auth/register").send(payload),
      ]);

      const successes = results.filter((r) => r.status === 201);
      const failures = results.filter((r) => r.status !== 201);
      expect(successes).toHaveLength(1);
      expect(failures.length).toBe(2);
      expect(await User.countDocuments({ phone })).toBe(1);
      expect(await AuthGrant.countDocuments({ phone, consumedAt: { $ne: null } })).toBe(1);
    });
  });

  describe("Reset token single-use", () => {
    async function seedAndGetResetToken(phone) {
      await User.create({
        phone,
        firstName: "ریست",
        lastName: "کاربر",
        passwordHash: await hashPassword("OldPass12"),
        phoneVerified: true,
      });
      const send = await request(app).post("/api/auth/password/send-otp").send({ phone });
      const verify = await request(app)
        .post("/api/auth/password/verify-otp")
        .send({ phone, code: send.body.data.devOtp });
      return verify.body.data.resetToken;
    }

    test("rejects reused reset token", async () => {
      const phone = "09130000003";
      const resetToken = await seedAndGetResetToken(phone);

      const first = await request(app).post("/api/auth/password/reset").send({
        resetToken,
        password: "NewPass12",
        confirmPassword: "NewPass12",
      });
      expect(first.status).toBe(200);

      const second = await request(app).post("/api/auth/password/reset").send({
        resetToken,
        password: "Another99",
        confirmPassword: "Another99",
      });
      expect(second.status).toBe(401);
      expect(second.body.error.code).toBe("TOKEN_REUSED_OR_EXPIRED");

      const oldLogin = await request(app)
        .post("/api/auth/login")
        .send({ phone, password: "Another99" });
      expect(oldLogin.status).toBe(401);

      const okLogin = await request(app)
        .post("/api/auth/login")
        .send({ phone, password: "NewPass12" });
      expect(okLogin.status).toBe(200);
    });

    test("concurrent reset with same token succeeds once", async () => {
      const phone = "09130000004";
      const resetToken = await seedAndGetResetToken(phone);
      const payload = {
        resetToken,
        password: "NewPass34",
        confirmPassword: "NewPass34",
      };

      const results = await Promise.all([
        request(app).post("/api/auth/password/reset").send(payload),
        request(app).post("/api/auth/password/reset").send(payload),
      ]);

      expect(results.filter((r) => r.status === 200)).toHaveLength(1);
      expect(results.filter((r) => r.status !== 200)).toHaveLength(1);
    });
  });

  describe("OTP concurrency", () => {
    test("concurrent correct OTP verification succeeds once", async () => {
      const phone = "09130000005";
      const send = await request(app).post("/api/auth/register/send-otp").send({ phone });
      const code = send.body.data.devOtp;

      const results = await Promise.all([
        request(app).post("/api/auth/register/verify-otp").send({ phone, code }),
        request(app).post("/api/auth/register/verify-otp").send({ phone, code }),
        request(app).post("/api/auth/register/verify-otp").send({ phone, code }),
      ]);

      expect(results.filter((r) => r.status === 200)).toHaveLength(1);
      expect(results.filter((r) => r.status === 400)).toHaveLength(2);
      expect(await Otp.countDocuments({ phone, consumedAt: { $ne: null } })).toBe(1);
    });

    test("concurrent wrong OTP attempts cannot bypass max attempts", async () => {
      const phone = "09130000006";
      await request(app).post("/api/auth/register/send-otp").send({ phone });

      const waves = [];
      for (let i = 0; i < 8; i += 1) {
        waves.push(
          request(app)
            .post("/api/auth/register/verify-otp")
            .send({ phone, code: "00000" }),
        );
      }
      const results = await Promise.all(waves);
      const otp = await Otp.findOne({ phone }).sort({ createdAt: -1 });
      expect(otp.attempts).toBeLessThanOrEqual(otp.maxAttempts);
      expect(results.some((r) => r.body?.error?.code === "OTP_ATTEMPTS_EXCEEDED" || r.status === 429 || r.status === 400)).toBe(true);
      expect(otp.attempts).toBe(otp.maxAttempts);
    });

    test("expired OTP rejected by application logic", async () => {
      const phone = "09130000007";
      const send = await request(app).post("/api/auth/register/send-otp").send({ phone });
      await Otp.updateMany({ phone }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
      const res = await request(app)
        .post("/api/auth/register/verify-otp")
        .send({ phone, code: send.body.data.devOtp });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("INVALID_OTP");
    });
  });

  describe("Refresh rotation & concurrency", () => {
    async function loginCookies(phone = "09130000008") {
      await User.create({
        phone,
        firstName: "سشن",
        lastName: "تست",
        passwordHash: await hashPassword("Password1"),
        phoneVerified: true,
      });
      const login = await request(app)
        .post("/api/auth/login")
        .send({ phone, password: "Password1" });
      return { cookies: cookiesFrom(login), phone };
    }

    test("rotated refresh token cannot be reused", async () => {
      const { cookies } = await loginCookies("09130000008");
      const first = await request(app).post("/api/auth/refresh").set("Cookie", cookies);
      expect(first.status).toBe(200);
      const reuse = await request(app).post("/api/auth/refresh").set("Cookie", cookies);
      expect(reuse.status).toBe(401);
      expect(reuse.body.error.code).toBe("SESSION_INVALID");
    });

    test("concurrent refresh with same cookie yields one success", async () => {
      const { cookies } = await loginCookies("09130000009");
      const results = await Promise.all([
        request(app).post("/api/auth/refresh").set("Cookie", cookies),
        request(app).post("/api/auth/refresh").set("Cookie", cookies),
        request(app).post("/api/auth/refresh").set("Cookie", cookies),
      ]);
      expect(results.filter((r) => r.status === 200)).toHaveLength(1);
      expect(results.filter((r) => r.status === 401)).toHaveLength(2);
      expect(await Session.countDocuments({ revokedAt: null })).toBe(1);
    });

    test("expired session rejected even if document still present", async () => {
      const { cookies, phone } = await loginCookies("09130000010");
      await Session.updateMany(
        {},
        { $set: { expiresAt: new Date(Date.now() - 1000) } },
      );
      const res = await request(app).post("/api/auth/refresh").set("Cookie", cookies);
      expect(res.status).toBe(401);
      expect(await User.findOne({ phone })).toBeTruthy();
    });

    test("logout is idempotent", async () => {
      const { cookies } = await loginCookies("09130000011");
      const first = await request(app).post("/api/auth/logout").set("Cookie", cookies);
      const second = await request(app).post("/api/auth/logout").set("Cookie", cookies);
      const third = await request(app).post("/api/auth/logout");
      expect(first.status).toBe(200);
      expect(second.status).toBe(200);
      expect(third.status).toBe(200);
    });
  });

  describe("Health", () => {
    test("returns degraded when database disconnected", async () => {
      await mongooseDisconnectSafe();
      const res = await request(app).get("/api/health");
      expect(res.status).toBe(503);
      expect(res.body.data.database.connected).toBe(false);
      // reconnect for remaining suites/teardown
      await setupTestDatabase();
      app = createApp();
    });
  });
});

async function mongooseDisconnectSafe() {
  const mongoose = require("mongoose");
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
}
