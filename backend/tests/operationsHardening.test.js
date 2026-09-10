const request = require("supertest");
const { createApp } = require("../src/app");
const { setupTestDatabase, clearDatabase, teardownTestDatabase } = require("./helpers/db");
const { User } = require("../src/modules/auth/user.model");
const { hashPassword } = require("../src/utils/password");
const { ClassSession } = require("../src/modules/courses/classSession.model");
const { AttendanceRecord } = require("../src/modules/enrollments/attendance.model");
const { Enrollment } = require("../src/modules/enrollments/enrollment.model");
const { Participant } = require("../src/modules/enrollments/participant.model");
const {
  ENROLLMENT_STATUSES,
  CLASS_STATUSES,
} = require("../src/modules/courses/domain.constants");

/**
 * PHASE F16 — operations contract hardening.
 */
describe("Phase F16 operations hardening", () => {
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
      phone: "09121111016",
      firstName: "ادمین",
      lastName: "اف۱۶",
      passwordHash: await hashPassword("Password1"),
      phoneVerified: true,
      role: "ADMIN",
    });
    const res = await request(app).post("/api/auth/login").send({
      phone: "09121111016",
      password: "Password1",
    });
    adminToken = res.body.data.accessToken;
  }

  async function seedClassPipeline() {
    await loginAsAdmin();
    const template = await request(app)
      .post("/api/courses/templates")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "F16 Template",
        level: "Beginner",
        ageMin: 7,
        ageMax: 12,
        genderRestriction: "MALE",
      });
    const instructor = await request(app)
      .post("/api/courses/instructors")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "مربی اف۱۶", phone: "09120000116" });
    const cls = await request(app)
      .post("/api/courses/classes")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        courseTemplateId: template.body.data.id,
        title: "کلاس اف۱۶",
        instructorId: instructor.body.data.id,
        startDate: "2026-10-03T00:00:00.000Z",
        endDate: "2026-11-30T00:00:00.000Z",
        daysOfWeek: [6],
        startTime: "17:00",
        endTime: "18:00",
        totalSessions: 4,
        price: 1000000,
        capacity: 10,
      });
    expect(cls.status).toBe(201);
    return {
      templateId: template.body.data.id,
      instructorId: instructor.body.data.id,
      classId: cls.body.data.id,
    };
  }

  test("ADMIN can PATCH instructor and deactivate blocks /me", async () => {
    await loginAsAdmin();
    const user = await User.create({
      phone: "09123333016",
      firstName: "مربی",
      lastName: "لینک",
      passwordHash: await hashPassword("Password1"),
      phoneVerified: true,
      role: "USER",
    });
    const created = await request(app)
      .post("/api/courses/instructors")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "قبل", phone: "09120000117", userId: String(user._id) });
    expect(created.status).toBe(201);

    const patched = await request(app)
      .patch(`/api/courses/instructors/${created.body.data.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "بعد", bio: "به‌روز", isActive: false });
    expect(patched.status).toBe(200);
    expect(patched.body.data.name).toBe("بعد");
    expect(patched.body.data.isActive).toBe(false);

    const login = await request(app).post("/api/auth/login").send({
      phone: "09123333016",
      password: "Password1",
    });
    const me = await request(app)
      .get("/api/courses/instructors/me")
      .set("Authorization", `Bearer ${login.body.data.accessToken}`);
    expect(me.status).toBe(404);
    expect(me.body.error.code).toBe("INSTRUCTOR_NOT_FOUND");
  });

  test("duplicate active userId link rejected", async () => {
    await loginAsAdmin();
    const user = await User.create({
      phone: "09124444016",
      firstName: "یکی",
      lastName: "کاربر",
      passwordHash: await hashPassword("Password1"),
      phoneVerified: true,
      role: "USER",
    });
    await request(app)
      .post("/api/courses/instructors")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "اول", userId: String(user._id) });
    const dup = await request(app)
      .post("/api/courses/instructors")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "دوم", userId: String(user._id) });
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe("INSTRUCTOR_USER_LINKED");
  });

  test("class lifecycle start/complete/archive and invalid transitions", async () => {
    const { classId } = await seedClassPipeline();
    await request(app)
      .post(`/api/courses/classes/${classId}/publish`)
      .set("Authorization", `Bearer ${adminToken}`);
    await request(app)
      .post(`/api/courses/classes/${classId}/open-registration`)
      .set("Authorization", `Bearer ${adminToken}`);

    const badStart = await request(app)
      .post(`/api/courses/classes/${classId}/start`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(badStart.status).toBe(409);

    await request(app)
      .post(`/api/courses/classes/${classId}/close-registration`)
      .set("Authorization", `Bearer ${adminToken}`);

    const started = await request(app)
      .post(`/api/courses/classes/${classId}/start`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(started.status).toBe(200);
    expect(started.body.data.status).toBe(CLASS_STATUSES.IN_PROGRESS);

    const completed = await request(app)
      .post(`/api/courses/classes/${classId}/complete`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(completed.status).toBe(200);
    expect(completed.body.data.status).toBe(CLASS_STATUSES.COMPLETED);

    const archived = await request(app)
      .post(`/api/courses/classes/${classId}/archive`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(archived.status).toBe(200);
    expect(archived.body.data.status).toBe(CLASS_STATUSES.ARCHIVED);

    const badAgain = await request(app)
      .post(`/api/courses/classes/${classId}/complete`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(badAgain.status).toBe(409);
  });

  test("cancel blocked when active enrollments exist", async () => {
    const { classId } = await seedClassPipeline();
    const admin = await User.findOne({ phone: "09121111016" });
    const participant = await Participant.create({
      ownerUserId: admin._id,
      firstName: "شاگرد",
      lastName: "تست",
      birthDate: new Date("2015-01-01"),
      gender: "MALE",
      phone: "09125555016",
    });
    await Enrollment.create({
      userId: admin._id,
      participantId: participant._id,
      classId,
      status: ENROLLMENT_STATUSES.ACTIVE,
      priceCharged: 1000000,
      basePrice: 1000000,
      finalAmount: 1000000,
    });

    const res = await request(app)
      .post(`/api/courses/classes/${classId}/cancel`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CLASS_HAS_ACTIVE_ENROLLMENTS");
  });

  test("generate-sessions blocked when attendance exists; allowed without", async () => {
    const { classId } = await seedClassPipeline();
    const gen1 = await request(app)
      .post(`/api/courses/classes/${classId}/generate-sessions`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(gen1.status).toBe(200);
    expect(gen1.body.data.items.length).toBe(4);

    const gen2 = await request(app)
      .post(`/api/courses/classes/${classId}/generate-sessions`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(gen2.status).toBe(200);

    const session = await ClassSession.findOne({ classId });
    const admin = await User.findOne({ phone: "09121111016" });
    const participant = await Participant.create({
      ownerUserId: admin._id,
      firstName: "حاضر",
      lastName: "تست",
      birthDate: new Date("2015-01-01"),
      gender: "MALE",
      phone: "09126666016",
    });
    const enrollment = await Enrollment.create({
      userId: admin._id,
      participantId: participant._id,
      classId,
      status: ENROLLMENT_STATUSES.ACTIVE,
      priceCharged: 1000000,
      basePrice: 1000000,
      finalAmount: 1000000,
    });
    await AttendanceRecord.create({
      classId,
      sessionId: session._id,
      participantId: participant._id,
      enrollmentId: enrollment._id,
      status: "PRESENT",
      markedBy: admin._id,
      markedAt: new Date(),
    });

    const blocked = await request(app)
      .post(`/api/courses/classes/${classId}/generate-sessions`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(blocked.status).toBe(409);
    expect(blocked.body.error.code).toBe("SESSIONS_HAVE_ATTENDANCE");

    const stillThere = await ClassSession.countDocuments({ classId });
    expect(stillThere).toBe(4);
  });
});
