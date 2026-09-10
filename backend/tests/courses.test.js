const request = require("supertest");
const { createApp } = require("../src/app");
const { setupTestDatabase, clearDatabase, teardownTestDatabase } = require("./helpers/db");
const { User } = require("../src/modules/auth/user.model");
const { hashPassword } = require("../src/utils/password");
const { computeDiscountedAmount } = require("../src/modules/billing/discount.service");
const { DISCOUNT_TYPES } = require("../src/modules/courses/domain.constants");

describe("Courses domain API", () => {
  let app;
  let adminToken;

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

  async function loginAsAdmin() {
    await User.create({
      phone: "09120000099",
      firstName: "ادمین",
      lastName: "سیستم",
      passwordHash: await hashPassword("Password1"),
      phoneVerified: true,
      role: "ADMIN",
    });
    const res = await request(app).post("/api/auth/login").send({
      phone: "09120000099",
      password: "Password1",
    });
    adminToken = res.body.data.accessToken;
  }

  async function seedOpenClass(overrides = {}) {
    await loginAsAdmin();
    const template = await request(app)
      .post("/api/courses/templates")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "شنا مقدماتی",
        level: "Beginner",
        ageMin: 7,
        ageMax: 12,
        genderRestriction: "MALE",
        requiresInsurance: false,
        requiresMedicalApproval: false,
      });
    expect(template.status).toBe(201);

    const instructor = await request(app)
      .post("/api/courses/instructors")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "مربی یک", phone: "09121110000" });
    expect(instructor.status).toBe(201);

    const created = await request(app)
      .post("/api/courses/classes")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        courseTemplateId: template.body.data.id,
        title: "شنا مقدماتی - مهر",
        instructorId: instructor.body.data.id,
        startDate: "2026-10-03T00:00:00.000Z",
        endDate: "2026-11-30T00:00:00.000Z",
        daysOfWeek: [6],
        startTime: "17:00",
        endTime: "18:00",
        totalSessions: 4,
        price: 1000000,
        capacity: 20,
        ...overrides,
      });
    expect(created.status).toBe(201);

    await request(app)
      .post(`/api/courses/classes/${created.body.data.id}/publish`)
      .set("Authorization", `Bearer ${adminToken}`);
    await request(app)
      .post(`/api/courses/classes/${created.body.data.id}/open-registration`)
      .set("Authorization", `Bearer ${adminToken}`);
    await request(app)
      .post(`/api/courses/classes/${created.body.data.id}/generate-sessions`)
      .set("Authorization", `Bearer ${adminToken}`);

    return created.body.data;
  }

  test("admin can create/list/update course template", async () => {
    await loginAsAdmin();
    const created = await request(app)
      .post("/api/courses/templates")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "شنا متوسط",
        level: "Intermediate",
        ageMin: 10,
        ageMax: 16,
      });
    expect(created.status).toBe(201);

    const listed = await request(app).get("/api/courses/templates");
    expect(listed.status).toBe(200);
    expect(listed.body.data.items.length).toBe(1);

    const updated = await request(app)
      .patch(`/api/courses/templates/${created.body.data.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ description: "به‌روز" });
    expect(updated.status).toBe(200);
    expect(updated.body.data.description).toBe("به‌روز");
  });

  test("rejects non-admin template create", async () => {
    await User.create({
      phone: "09120000011",
      firstName: "کاربر",
      lastName: "عادی",
      passwordHash: await hashPassword("Password1"),
      phoneVerified: true,
    });
    const login = await request(app).post("/api/auth/login").send({
      phone: "09120000011",
      password: "Password1",
    });
    const res = await request(app)
      .post("/api/courses/templates")
      .set("Authorization", `Bearer ${login.body.data.accessToken}`)
      .send({ title: "x", level: "A", ageMin: 1, ageMax: 2 });
    expect(res.status).toBe(403);
  });

  test("publish/open/close/cancel class lifecycle and sessions", async () => {
    const courseClass = await seedOpenClass();
    expect(courseClass.capacity).toBe(20);

    const sessions = await request(app).get(`/api/courses/classes/${courseClass.id}/sessions`);
    expect(sessions.status).toBe(200);
    expect(sessions.body.data.items).toHaveLength(4);

    const capacity = await request(app).get(`/api/courses/classes/${courseClass.id}/capacity`);
    expect(capacity.body.data.available).toBe(20);

    const closed = await request(app)
      .post(`/api/courses/classes/${courseClass.id}/close-registration`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(closed.status).toBe(200);
    expect(closed.body.data.status).toBe("REGISTRATION_CLOSED");

    const cancelled = await request(app)
      .post(`/api/courses/classes/${courseClass.id}/cancel`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.data.status).toBe("CANCELLED");
  });

  test("discount calculation never goes negative", () => {
    expect(
      computeDiscountedAmount(1000, { type: DISCOUNT_TYPES.FIXED, value: 5000 }),
    ).toBe(0);
    expect(
      computeDiscountedAmount(1000, { type: DISCOUNT_TYPES.PERCENTAGE, value: 50 }),
    ).toBe(500);
  });
});
