const request = require("supertest");
const { createApp } = require("../src/app");
const { setupTestDatabase, clearDatabase, teardownTestDatabase } = require("./helpers/db");
const { User } = require("../src/modules/auth/user.model");
const { hashPassword } = require("../src/utils/password");
const { Instructor } = require("../src/modules/courses/instructor.model");
const { Enrollment } = require("../src/modules/enrollments/enrollment.model");
const { ENROLLMENT_STATUSES } = require("../src/modules/courses/domain.constants");

/**
 * PHASE B-T — secure instructor contracts ownership isolation.
 */
describe("Phase B-T instructor contracts", () => {
  let app;
  let adminToken;
  let instructorAToken;
  let instructorBToken;
  let unlinkedToken;
  let instructorAId;
  let instructorBId;
  let classAId;
  let classBId;
  let participantAId;

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

  async function login(phone, password = "Password1") {
    return (await request(app).post("/api/auth/login").send({ phone, password })).body.data.accessToken;
  }

  async function bootstrap() {
    await User.create({
      phone: "09127770001",
      firstName: "ادمین",
      lastName: "بی‌تی",
      passwordHash: await hashPassword("Password1"),
      phoneVerified: true,
      role: "ADMIN",
    });
    adminToken = await login("09127770001");

    const userA = await User.create({
      phone: "09127770002",
      firstName: "مربی",
      lastName: "الف",
      passwordHash: await hashPassword("Password1"),
      phoneVerified: true,
    });
    instructorAToken = await login("09127770002");

    const userB = await User.create({
      phone: "09127770003",
      firstName: "مربی",
      lastName: "ب",
      passwordHash: await hashPassword("Password1"),
      phoneVerified: true,
    });
    instructorBToken = await login("09127770003");

    await User.create({
      phone: "09127770004",
      firstName: "کاربر",
      lastName: "عادی",
      passwordHash: await hashPassword("Password1"),
      phoneVerified: true,
    });
    unlinkedToken = await login("09127770004");

    const instrA = await request(app)
      .post("/api/courses/instructors")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "مربی الف", userId: String(userA._id) });
    instructorAId = instrA.body.data.id;

    const instrB = await request(app)
      .post("/api/courses/instructors")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "مربی ب", userId: String(userB._id) });
    instructorBId = instrB.body.data.id;

    const template = await request(app)
      .post("/api/courses/templates")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "دوره بی تی",
        level: "Beginner",
        ageMin: 5,
        ageMax: 18,
        genderRestriction: "MALE",
      });

    const start = new Date();
    start.setUTCDate(start.getUTCDate() + 7);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 60);

    const classA = await request(app)
      .post("/api/courses/classes")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        courseTemplateId: template.body.data.id,
        title: "کلاس الف",
        instructorId: instructorAId,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        daysOfWeek: [1, 3],
        startTime: "16:00",
        endTime: "17:00",
        totalSessions: 8,
        price: 100000,
        capacity: 10,
      });
    classAId = classA.body.data.id;

    const classB = await request(app)
      .post("/api/courses/classes")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        courseTemplateId: template.body.data.id,
        title: "کلاس ب",
        instructorId: instructorBId,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        daysOfWeek: [2, 4],
        startTime: "18:00",
        endTime: "19:00",
        totalSessions: 8,
        price: 120000,
        capacity: 10,
      });
    classBId = classB.body.data.id;

    const parent = await User.create({
      phone: "09127770005",
      firstName: "ولی",
      lastName: "روستر",
      passwordHash: await hashPassword("Password1"),
      phoneVerified: true,
    });
    const parentToken = await login("09127770005");
    const participant = await request(app)
      .post("/api/enrollments/participants")
      .set("Authorization", `Bearer ${parentToken}`)
      .send({
        firstName: "شناگر",
        lastName: "الف",
        birthDate: "2014-05-01",
        gender: "MALE",
        relation: "CHILD",
      });
    participantAId = participant.body.data.id;

    await Enrollment.create({
      userId: parent._id,
      participantId: participantAId,
      classId: classAId,
      status: ENROLLMENT_STATUSES.ACTIVE,
      basePrice: 100000,
      discountAmount: 0,
      finalAmount: 100000,
      priceCharged: 100000,
    });
  }

  test("GET /instructors/me — linked instructor", async () => {
    await bootstrap();
    const res = await request(app)
      .get("/api/courses/instructors/me")
      .set("Authorization", `Bearer ${instructorAToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(instructorAId);
    expect(res.body.data.name).toBe("مربی الف");
    expect(res.body.data.isActive).toBe(true);
  });

  test("GET /instructors/me — unlinked USER → 404 INSTRUCTOR_NOT_FOUND", async () => {
    await bootstrap();
    const res = await request(app)
      .get("/api/courses/instructors/me")
      .set("Authorization", `Bearer ${unlinkedToken}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("INSTRUCTOR_NOT_FOUND");
  });

  test("GET /instructors/me — inactive instructor → 404", async () => {
    await bootstrap();
    await Instructor.updateOne({ _id: instructorAId }, { $set: { isActive: false } });
    const res = await request(app)
      .get("/api/courses/instructors/me")
      .set("Authorization", `Bearer ${instructorAToken}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("INSTRUCTOR_NOT_FOUND");
  });

  test("GET /instructors/me/classes — only owned classes", async () => {
    await bootstrap();
    const res = await request(app)
      .get("/api/courses/instructors/me/classes")
      .set("Authorization", `Bearer ${instructorAToken}`);
    expect(res.status).toBe(200);
    const ids = res.body.data.items.map((c) => c.id);
    expect(ids).toContain(classAId);
    expect(ids).not.toContain(classBId);
    expect(res.body.data.items.every((c) => c.instructorId === instructorAId)).toBe(true);
  });

  test("GET /instructors/me/classes — unlinked USER → 403", async () => {
    await bootstrap();
    const res = await request(app)
      .get("/api/courses/instructors/me/classes")
      .set("Authorization", `Bearer ${unlinkedToken}`);
    expect(res.status).toBe(403);
  });

  test("GET /instructors/me/classes — status filter stays scoped", async () => {
    await bootstrap();
    const res = await request(app)
      .get("/api/courses/instructors/me/classes?status=DRAFT")
      .set("Authorization", `Bearer ${instructorAToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.items.every((c) => c.status === "DRAFT")).toBe(true);
    expect(res.body.data.items.every((c) => c.instructorId === instructorAId)).toBe(true);
  });

  test("roster — owner instructor sees participants", async () => {
    await bootstrap();
    const res = await request(app)
      .get(`/api/enrollments/classes/${classAId}/roster`)
      .set("Authorization", `Bearer ${instructorAToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBe(1);
    expect(res.body.data.items[0].participantId).toBe(participantAId);
    expect(res.body.data.items[0].firstName).toBe("شناگر");
    expect(res.body.data.items[0].enrollmentStatus).toBe("ACTIVE");
  });

  test("roster — cross instructor denied", async () => {
    await bootstrap();
    const res = await request(app)
      .get(`/api/enrollments/classes/${classAId}/roster`)
      .set("Authorization", `Bearer ${instructorBToken}`);
    expect(res.status).toBe(403);
  });

  test("roster — unlinked USER denied", async () => {
    await bootstrap();
    const res = await request(app)
      .get(`/api/enrollments/classes/${classAId}/roster`)
      .set("Authorization", `Bearer ${unlinkedToken}`);
    expect(res.status).toBe(403);
  });

  test("roster — ADMIN allowed", async () => {
    await bootstrap();
    const res = await request(app)
      .get(`/api/enrollments/classes/${classAId}/roster`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBe(1);
  });

  test("roster — invalid class → 404", async () => {
    await bootstrap();
    const res = await request(app)
      .get("/api/enrollments/classes/aaaaaaaaaaaaaaaaaaaaaaaa/roster")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("CLASS_NOT_FOUND");
  });

  test("roster — empty when no enrollments", async () => {
    await bootstrap();
    const res = await request(app)
      .get(`/api/enrollments/classes/${classBId}/roster`)
      .set("Authorization", `Bearer ${instructorBToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.items).toEqual([]);
  });

  test("attendance ownership still isolates instructors", async () => {
    await bootstrap();
    const denied = await request(app)
      .get(`/api/enrollments/classes/${classAId}/attendance`)
      .set("Authorization", `Bearer ${instructorBToken}`);
    expect(denied.status).toBe(403);

    const allowed = await request(app)
      .get(`/api/enrollments/classes/${classAId}/attendance`)
      .set("Authorization", `Bearer ${instructorAToken}`);
    expect(allowed.status).toBe(200);
  });

  test("phone-only instructor auto-links on login with same mobile", async () => {
    await User.create({
      phone: "09127770001",
      firstName: "ادمین",
      lastName: "لینک",
      passwordHash: await hashPassword("Password1"),
      phoneVerified: true,
      role: "ADMIN",
    });
    adminToken = await login("09127770001");

    const created = await request(app)
      .post("/api/courses/instructors")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "مربی شماره", phone: "09127770099" });
    expect(created.status).toBe(201);
    expect(created.body.data.userId).toBeNull();

    await User.create({
      phone: "09127770099",
      firstName: "مربی",
      lastName: "شماره",
      passwordHash: await hashPassword("Password1"),
      phoneVerified: true,
    });

    const before = await request(app)
      .post("/api/auth/login")
      .send({ phone: "09127770099", password: "Password1" });
    expect(before.status).toBe(200);
    const token = before.body.data.accessToken;

    const me = await request(app)
      .get("/api/courses/instructors/me")
      .set("Authorization", `Bearer ${token}`);
    expect(me.status).toBe(200);
    expect(me.body.data.name).toBe("مربی شماره");
    expect(me.body.data.phone).toBe("09127770099");
  });

  test("admin save phone links existing user immediately", async () => {
    await User.create({
      phone: "09127770001",
      firstName: "ادمین",
      lastName: "فوری",
      passwordHash: await hashPassword("Password1"),
      phoneVerified: true,
      role: "ADMIN",
    });
    adminToken = await login("09127770001");

    const user = await User.create({
      phone: "09127770088",
      firstName: "حساب",
      lastName: "آماده",
      passwordHash: await hashPassword("Password1"),
      phoneVerified: true,
    });

    const created = await request(app)
      .post("/api/courses/instructors")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "مربی آماده", phone: "09127770088" });
    expect(created.status).toBe(201);
    expect(created.body.data.userId).toBe(String(user._id));
  });
});
