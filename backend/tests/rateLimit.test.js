/**
 * Dedicated rate-limit tests. Limiters skip unless TEST_RATE_LIMIT=1.
 */
process.env.TEST_RATE_LIMIT = "1";

const request = require("supertest");
const { createApp } = require("../src/app");
const { setupTestDatabase, clearDatabase, teardownTestDatabase } = require("./helpers/db");
const { User } = require("../src/modules/auth/user.model");
const { hashPassword } = require("../src/utils/password");

describe("Rate limiting", () => {
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

  test("login limiter triggers after max attempts", async () => {
    await User.create({
      phone: "09131112233",
      firstName: "لیمیت",
      lastName: "تست",
      passwordHash: await hashPassword("Password1"),
      phoneVerified: true,
    });

    let limited = null;
    for (let i = 0; i < 25; i += 1) {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ phone: "09131112233", password: "WrongPass1" });
      if (res.status === 429) {
        limited = res;
        break;
      }
    }

    expect(limited).toBeTruthy();
    expect(limited.body.error.code).toBe("RATE_LIMITED");
  }, 60000);

  test("otp send limiter triggers", async () => {
    // Cooldown is 60s, so use different phones to isolate IP rate limit.
    let limited = null;
    for (let i = 0; i < 15; i += 1) {
      const phone = `0913${String(1000000 + i).slice(0, 7)}`;
      const res = await request(app).post("/api/auth/register/send-otp").send({ phone });
      if (res.status === 429 && res.body.error.code === "RATE_LIMITED") {
        limited = res;
        break;
      }
    }
    expect(limited).toBeTruthy();
  }, 60000);
});
