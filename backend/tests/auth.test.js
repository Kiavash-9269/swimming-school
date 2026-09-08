const request = require("supertest");
const { createApp } = require("../src/app");
const { setupTestDatabase, clearDatabase, teardownTestDatabase } = require("./helpers/db");
const { User } = require("../src/modules/auth/user.model");
const { Otp } = require("../src/modules/auth/otp.model");
const { Session } = require("../src/modules/auth/session.model");
const { hashPassword } = require("../src/utils/password");

describe("Auth API", () => {
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

  function cookieFrom(res) {
    const raw = res.headers["set-cookie"];
    if (!raw) return "";
    return Array.isArray(raw) ? raw.map((c) => c.split(";")[0]).join("; ") : raw.split(";")[0];
  }

  describe("GET /api/health", () => {
    test("returns healthy when database is connected", async () => {
      const res = await request(app).get("/api/health");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.database.connected).toBe(true);
      expect(res.body.data.environment).toBe("test");
    });
  });

  describe("POST /api/auth/check-phone", () => {
    test("returns exists=false for new phone", async () => {
      const res = await request(app)
        .post("/api/auth/check-phone")
        .send({ phone: "09121234567" });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, data: { exists: false } });
    });

    test("returns exists=true for existing phone without leaking profile", async () => {
      await User.create({
        phone: "09121234567",
        firstName: "علی",
        lastName: "تست",
        passwordHash: await hashPassword("Password1"),
        phoneVerified: true,
      });

      const res = await request(app)
        .post("/api/auth/check-phone")
        .send({ phone: "09121234567" });

      expect(res.status).toBe(200);
      expect(res.body.data.exists).toBe(true);
      expect(res.body.data.firstName).toBeUndefined();
      expect(res.body.data.role).toBeUndefined();
    });

    test("rejects invalid phone", async () => {
      const res = await request(app)
        .post("/api/auth/check-phone")
        .send({ phone: "123" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("Registration OTP flow", () => {
    test("sends OTP for new phone and returns devOtp in test", async () => {
      const res = await request(app)
        .post("/api/auth/register/send-otp")
        .send({ phone: "09120000001" });

      expect(res.status).toBe(200);
      expect(res.body.data.sent).toBe(true);
      expect(res.body.data.devOtp).toMatch(/^\d{5}$/);

      const otpCount = await Otp.countDocuments({ phone: "09120000001" });
      expect(otpCount).toBe(1);
    });

    test("rejects OTP send for existing user", async () => {
      await User.create({
        phone: "09120000002",
        firstName: "علی",
        lastName: "تست",
        passwordHash: await hashPassword("Password1"),
        phoneVerified: true,
      });

      const res = await request(app)
        .post("/api/auth/register/send-otp")
        .send({ phone: "09120000002" });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("USER_EXISTS");
    });

    test("enforces OTP cooldown", async () => {
      const first = await request(app)
        .post("/api/auth/register/send-otp")
        .send({ phone: "09120000003" });
      expect(first.status).toBe(200);

      const second = await request(app)
        .post("/api/auth/register/send-otp")
        .send({ phone: "09120000003" });

      expect(second.status).toBe(429);
      expect(second.body.error.code).toBe("OTP_COOLDOWN");
    });

    test("verifies correct OTP and rejects wrong/reused OTP", async () => {
      const send = await request(app)
        .post("/api/auth/register/send-otp")
        .send({ phone: "09120000004" });
      const code = send.body.data.devOtp;

      const wrong = await request(app)
        .post("/api/auth/register/verify-otp")
        .send({ phone: "09120000004", code: "00000" });
      expect(wrong.status).toBe(400);
      expect(wrong.body.error.code).toBe("INVALID_OTP");

      const ok = await request(app)
        .post("/api/auth/register/verify-otp")
        .send({ phone: "09120000004", code });
      expect(ok.status).toBe(200);
      expect(ok.body.data.registrationToken).toBeTruthy();

      const reuse = await request(app)
        .post("/api/auth/register/verify-otp")
        .send({ phone: "09120000004", code });
      expect(reuse.status).toBe(400);
      expect(reuse.body.error.code).toBe("INVALID_OTP");
    });

    test("rejects expired OTP", async () => {
      const send = await request(app)
        .post("/api/auth/register/send-otp")
        .send({ phone: "09120000005" });
      const code = send.body.data.devOtp;

      await Otp.updateMany(
        { phone: "09120000005" },
        { $set: { expiresAt: new Date(Date.now() - 1000) } },
      );

      const res = await request(app)
        .post("/api/auth/register/verify-otp")
        .send({ phone: "09120000005", code });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("INVALID_OTP");
    });

    test("rejects OTP after max attempts", async () => {
      await request(app)
        .post("/api/auth/register/send-otp")
        .send({ phone: "09120000006" });

      let last;
      for (let i = 0; i < 5; i += 1) {
        last = await request(app)
          .post("/api/auth/register/verify-otp")
          .send({ phone: "09120000006", code: "11111" });
      }

      expect(last.status).toBe(429);
      expect(last.body.error.code).toBe("OTP_ATTEMPTS_EXCEEDED");
    });

    test("rejects cross-purpose OTP reuse", async () => {
      const send = await request(app)
        .post("/api/auth/register/send-otp")
        .send({ phone: "09120000007" });
      const code = send.body.data.devOtp;

      const res = await request(app)
        .post("/api/auth/password/verify-otp")
        .send({ phone: "09120000007", code });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("INVALID_OTP");
    });
  });

  describe("Registration", () => {
    async function getRegistrationToken(phone = "09121112233") {
      const send = await request(app).post("/api/auth/register/send-otp").send({ phone });
      const verify = await request(app)
        .post("/api/auth/register/verify-otp")
        .send({ phone, code: send.body.data.devOtp });
      return verify.body.data.registrationToken;
    }

    test("completes valid registration and creates hashed password USER", async () => {
      const registrationToken = await getRegistrationToken("09121112233");

      const res = await request(app).post("/api/auth/register").send({
        registrationToken,
        firstName: "سارا",
        lastName: "احمدی",
        password: "Password1",
        confirmPassword: "Password1",
      });

      expect(res.status).toBe(201);
      expect(res.body.data.accessToken).toBeTruthy();
      expect(res.body.data.user.role).toBe("USER");
      expect(res.body.data.user.phoneVerified).toBe(true);
      expect(res.body.data.user.passwordHash).toBeUndefined();
      expect(cookieFrom(res)).toContain("refreshToken=");

      const user = await User.findOne({ phone: "09121112233" }).select("+passwordHash");
      expect(user).toBeTruthy();
      expect(user.passwordHash).not.toBe("Password1");
      expect(user.passwordHash.startsWith("$argon2")).toBe(true);
    });

    test("rejects password mismatch", async () => {
      const registrationToken = await getRegistrationToken("09121112234");
      const res = await request(app).post("/api/auth/register").send({
        registrationToken,
        firstName: "سارا",
        lastName: "احمدی",
        password: "Password1",
        confirmPassword: "Password2",
      });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("rejects invalid registration token", async () => {
      const res = await request(app).post("/api/auth/register").send({
        registrationToken: "not-a-token",
        firstName: "سارا",
        lastName: "احمدی",
        password: "Password1",
        confirmPassword: "Password1",
      });
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("INVALID_TOKEN");
    });

    test("handles duplicate phone race with unique index", async () => {
      const registrationToken = await getRegistrationToken("09121112235");

      await User.create({
        phone: "09121112235",
        firstName: "قبلی",
        lastName: "کاربر",
        passwordHash: await hashPassword("Password1"),
        phoneVerified: true,
      });

      const res = await request(app).post("/api/auth/register").send({
        registrationToken,
        firstName: "سارا",
        lastName: "احمدی",
        password: "Password1",
        confirmPassword: "Password1",
      });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("USER_EXISTS");
    });

    test("rejects duplicate firstName+lastName used by another phone", async () => {
      await User.create({
        phone: "09121112236",
        firstName: "سارا",
        lastName: "احمدی",
        passwordHash: await hashPassword("Password1"),
        phoneVerified: true,
      });

      const registrationToken = await getRegistrationToken("09121112237");
      const res = await request(app).post("/api/auth/register").send({
        registrationToken,
        firstName: "سارا",
        lastName: "احمدی",
        password: "Password1",
        confirmPassword: "Password1",
      });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("NAME_EXISTS");
      expect(res.body.error.message).toBe("این کاربر با شماره دیگری وارد شده است");
      // Grant must remain usable so the user can retry with a different name.
      const retry = await request(app).post("/api/auth/register").send({
        registrationToken,
        firstName: "سارا",
        lastName: "محمدی",
        password: "Password1",
        confirmPassword: "Password1",
      });
      expect(retry.status).toBe(201);
      expect(retry.body.data.user.phone).toBe("09121112237");
    });
  });

  describe("Login / me / refresh / logout", () => {
    async function seedUser(phone = "09123334455", password = "Password1") {
      const user = await User.create({
        phone,
        firstName: "رضا",
        lastName: "محمدی",
        passwordHash: await hashPassword(password),
        phoneVerified: true,
        role: "USER",
        isActive: true,
      });
      return user;
    }

    test("logs in with correct credentials", async () => {
      await seedUser();
      const res = await request(app)
        .post("/api/auth/login")
        .send({ phone: "09123334455", password: "Password1" });

      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBeTruthy();
      expect(res.body.data.user.phone).toBe("09123334455");
    });

    test("rejects wrong password and unknown phone", async () => {
      await seedUser();

      const wrong = await request(app)
        .post("/api/auth/login")
        .send({ phone: "09123334455", password: "WrongPass1" });
      expect(wrong.status).toBe(401);
      expect(wrong.body.error.code).toBe("INVALID_CREDENTIALS");

      const unknown = await request(app)
        .post("/api/auth/login")
        .send({ phone: "09129999999", password: "Password1" });
      expect(unknown.status).toBe(401);
      expect(unknown.body.error.code).toBe("INVALID_CREDENTIALS");
    });

    test("rejects inactive user", async () => {
      const user = await seedUser("09123334456");
      user.isActive = false;
      await user.save();

      const res = await request(app)
        .post("/api/auth/login")
        .send({ phone: "09123334456", password: "Password1" });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("USER_INACTIVE");
    });

    test("me requires valid access token", async () => {
      await seedUser("09123334457");
      const login = await request(app)
        .post("/api/auth/login")
        .send({ phone: "09123334457", password: "Password1" });

      const me = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${login.body.data.accessToken}`);

      expect(me.status).toBe(200);
      expect(me.body.data.user.phone).toBe("09123334457");

      const bad = await request(app)
        .get("/api/auth/me")
        .set("Authorization", "Bearer invalid");
      expect(bad.status).toBe(401);
    });

    test("refresh rotates session and logout revokes it", async () => {
      await seedUser("09123334458");
      const login = await request(app)
        .post("/api/auth/login")
        .send({ phone: "09123334458", password: "Password1" });

      const cookies = cookieFrom(login);
      const refreshed = await request(app).post("/api/auth/refresh").set("Cookie", cookies);
      expect(refreshed.status).toBe(200);
      expect(refreshed.body.data.accessToken).toBeTruthy();

      const newCookies = cookieFrom(refreshed);
      const logout = await request(app).post("/api/auth/logout").set("Cookie", newCookies);
      expect(logout.status).toBe(200);

      const afterLogout = await request(app).post("/api/auth/refresh").set("Cookie", newCookies);
      expect(afterLogout.status).toBe(401);
      expect(afterLogout.body.error.code).toBe("SESSION_INVALID");

      const activeSessions = await Session.countDocuments({
        revokedAt: null,
      });
      expect(activeSessions).toBe(0);
    });
  });

  describe("Password reset", () => {
    test("resets password, revokes old sessions, and allows new login", async () => {
      await User.create({
        phone: "09124445566",
        firstName: "مینا",
        lastName: "کریمی",
        passwordHash: await hashPassword("OldPass12"),
        phoneVerified: true,
      });

      const loginOld = await request(app)
        .post("/api/auth/login")
        .send({ phone: "09124445566", password: "OldPass12" });
      expect(loginOld.status).toBe(200);
      const oldCookie = cookieFrom(loginOld);

      const send = await request(app)
        .post("/api/auth/password/send-otp")
        .send({ phone: "09124445566" });
      expect(send.status).toBe(200);
      expect(send.body.data.eligible).toBeUndefined();
      expect(send.body.data.devOtp).toMatch(/^\d{5}$/);

      const verify = await request(app)
        .post("/api/auth/password/verify-otp")
        .send({ phone: "09124445566", code: send.body.data.devOtp });
      expect(verify.status).toBe(200);

      const reset = await request(app).post("/api/auth/password/reset").send({
        resetToken: verify.body.data.resetToken,
        password: "NewPass12",
        confirmPassword: "NewPass12",
      });
      expect(reset.status).toBe(200);
      expect(reset.body.data.accessToken).toBeTruthy();

      const oldSessionRefresh = await request(app)
        .post("/api/auth/refresh")
        .set("Cookie", oldCookie);
      expect(oldSessionRefresh.status).toBe(401);

      const oldLogin = await request(app)
        .post("/api/auth/login")
        .send({ phone: "09124445566", password: "OldPass12" });
      expect(oldLogin.status).toBe(401);

      const newLogin = await request(app)
        .post("/api/auth/login")
        .send({ phone: "09124445566", password: "NewPass12" });
      expect(newLogin.status).toBe(200);
    });

    test("unknown phone password OTP does not leak eligibility", async () => {
      const res = await request(app)
        .post("/api/auth/password/send-otp")
        .send({ phone: "09127778899" });

      expect(res.status).toBe(200);
      expect(res.body.data.sent).toBe(true);
      expect(res.body.data.eligible).toBeUndefined();
      expect(res.body.data.devOtp).toBeUndefined();
      expect(res.body.data.message).toMatch(/اگر حسابی/);
    });
  });

  describe("Authorization foundation", () => {
    test("USER cannot access ADMIN ping", async () => {
      await User.create({
        phone: "09126667788",
        firstName: "کاربر",
        lastName: "عادی",
        passwordHash: await hashPassword("Password1"),
        phoneVerified: true,
        role: "USER",
      });

      const login = await request(app)
        .post("/api/auth/login")
        .send({ phone: "09126667788", password: "Password1" });

      const res = await request(app)
        .get("/api/auth/admin/ping")
        .set("Authorization", `Bearer ${login.body.data.accessToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    test("ADMIN can access ADMIN ping", async () => {
      await User.create({
        phone: "09126667789",
        firstName: "ادمین",
        lastName: "سیستم",
        passwordHash: await hashPassword("Password1"),
        phoneVerified: true,
        role: "ADMIN",
      });

      const login = await request(app)
        .post("/api/auth/login")
        .send({ phone: "09126667789", password: "Password1" });

      const res = await request(app)
        .get("/api/auth/admin/ping")
        .set("Authorization", `Bearer ${login.body.data.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.ok).toBe(true);
    });
  });
});
