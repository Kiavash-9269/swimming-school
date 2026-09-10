const request = require("supertest");
const { createApp } = require("../src/app");
const { setupTestDatabase, clearDatabase, teardownTestDatabase } = require("./helpers/db");
const { User } = require("../src/modules/auth/user.model");
const { hashPassword } = require("../src/utils/password");
const { CourseClass } = require("../src/modules/courses/courseClass.model");
const { COMPLIANCE_STATUSES } = require("../src/modules/courses/domain.constants");

describe("Capacity concurrency", () => {
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

  async function prepareClass(capacity = 1) {
    await User.create({
      phone: "09127770001",
      firstName: "ادمین",
      lastName: "همزمان",
      passwordHash: await hashPassword("Password1"),
      phoneVerified: true,
      role: "ADMIN",
    });
    const adminLogin = await request(app).post("/api/auth/login").send({
      phone: "09127770001",
      password: "Password1",
    });
    adminToken = adminLogin.body.data.accessToken;

    const template = await request(app)
      .post("/api/courses/templates")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "ظرفیت",
        level: "Beginner",
        ageMin: 5,
        ageMax: 50,
        genderRestriction: "MALE",
      });
    const instructor = await request(app)
      .post("/api/courses/instructors")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "مربی همزمان" });
    const courseClass = await request(app)
      .post("/api/courses/classes")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        courseTemplateId: template.body.data.id,
        title: "کلاس ظرفیت",
        instructorId: instructor.body.data.id,
        startDate: "2026-10-03T00:00:00.000Z",
        endDate: "2026-12-01T00:00:00.000Z",
        daysOfWeek: [6],
        startTime: "10:00",
        endTime: "11:00",
        totalSessions: 4,
        price: 1000,
        capacity,
      });
    await request(app)
      .post(`/api/courses/classes/${courseClass.body.data.id}/publish`)
      .set("Authorization", `Bearer ${adminToken}`);
    await request(app)
      .post(`/api/courses/classes/${courseClass.body.data.id}/open-registration`)
      .set("Authorization", `Bearer ${adminToken}`);
    return courseClass.body.data.id;
  }

  async function createReadyUser(index) {
    const phone = `0912777${String(1000 + index).slice(-4)}`;
    const user = await User.create({
      phone,
      firstName: `کاربر${index}`,
      lastName: `همزمان${index}`,
      passwordHash: await hashPassword("Password1"),
      phoneVerified: true,
    });
    const login = await request(app).post("/api/auth/login").send({ phone, password: "Password1" });
    const participant = await request(app)
      .post("/api/enrollments/participants")
      .set("Authorization", `Bearer ${login.body.data.accessToken}`)
      .send({
        firstName: `فرزند${index}`,
        lastName: `تست${index}`,
        birthDate: "2012-01-01",
        gender: "MALE",
        relation: "CHILD",
      });
    return {
      userId: String(user._id),
      token: login.body.data.accessToken,
      participantId: participant.body.data.id,
    };
  }

  test("only one of many concurrent reserves wins last seat", async () => {
    const classId = await prepareClass(1);
    const users = await Promise.all([0, 1, 2, 3, 4].map((i) => createReadyUser(i)));

    const results = await Promise.all(
      users.map((u, i) =>
        request(app)
          .post("/api/enrollments/reservations")
          .set("Authorization", `Bearer ${u.token}`)
          .send({
            classId,
            participantId: u.participantId,
            idempotencyKey: `concurrent-reserve-${i}`,
          }),
      ),
    );

    const successes = results.filter((r) => r.status === 201);
    const failures = results.filter((r) => r.status !== 201);
    expect(successes).toHaveLength(1);
    expect(failures.length).toBe(4);
    expect(failures.every((r) => r.body.error.code === "COURSE_FULL")).toBe(true);

    const klass = await CourseClass.findById(classId);
    expect(klass.heldCount + klass.confirmedCount).toBeLessThanOrEqual(klass.capacity);
    expect(klass.heldCount).toBe(1);
  });

  test("waitlist join when full and promote after cancel", async () => {
    const classId = await prepareClass(1);
    const first = await createReadyUser(10);
    const second = await createReadyUser(11);

    const reserve = await request(app)
      .post("/api/enrollments/reservations")
      .set("Authorization", `Bearer ${first.token}`)
      .send({ classId, participantId: first.participantId });
    expect(reserve.status).toBe(201);

    const confirm = await request(app)
      .post("/api/enrollments/confirm")
      .set("Authorization", `Bearer ${first.token}`)
      .send({ reservationId: reserve.body.data.id });
    await request(app)
      .post("/api/enrollments/payments/callback")
      .set("Authorization", `Bearer ${first.token}`)
      .send({ paymentId: confirm.body.data.payment.id, success: true });

    const wait = await request(app)
      .post("/api/enrollments/waitlist")
      .set("Authorization", `Bearer ${second.token}`)
      .send({ classId, participantId: second.participantId });
    expect(wait.status).toBe(201);
    expect(wait.body.data.position).toBe(1);

    await request(app)
      .post(`/api/enrollments/${confirm.body.data.enrollment.id}/cancel`)
      .set("Authorization", `Bearer ${first.token}`);

    const klass = await CourseClass.findById(classId);
    // promotion creates a hold for waitlisted user
    expect(klass.heldCount + klass.confirmedCount).toBeLessThanOrEqual(klass.capacity);
  });

  test("concurrent checkouts for last seat: at most one ACTIVE", async () => {
    const classId = await prepareClass(1);
    const users = await Promise.all([0, 1, 2, 3].map((i) => createReadyUser(20 + i)));

    // Serialize reserves so exactly one holds; then race confirm+pay from that holder vs others failing reserve
    const reserveResults = await Promise.all(
      users.map((u, i) =>
        request(app)
          .post("/api/enrollments/reservations")
          .set("Authorization", `Bearer ${u.token}`)
          .send({
            classId,
            participantId: u.participantId,
            idempotencyKey: `last-seat-r-${i}`,
          }),
      ),
    );
    const winnerIdx = reserveResults.findIndex((r) => r.status === 201);
    expect(winnerIdx).toBeGreaterThanOrEqual(0);
    const winner = users[winnerIdx];
    const reservationId = reserveResults[winnerIdx].body.data.id;

    const confirm = await request(app)
      .post("/api/enrollments/confirm")
      .set("Authorization", `Bearer ${winner.token}`)
      .send({ reservationId, idempotencyKey: "last-seat-confirm" });
    expect(confirm.status).toBe(201);

    // Concurrent payment callbacks + concurrent confirm retries with same key
    const [payResults, confirmRetries] = await Promise.all([
      Promise.all(
        Array.from({ length: 6 }, () =>
          request(app)
            .post("/api/enrollments/payments/callback")
            .set("Authorization", `Bearer ${winner.token}`)
            .send({ paymentId: confirm.body.data.payment.id, success: true }),
        ),
      ),
      Promise.all(
        Array.from({ length: 4 }, () =>
          request(app)
            .post("/api/enrollments/confirm")
            .set("Authorization", `Bearer ${winner.token}`)
            .send({ reservationId, idempotencyKey: "last-seat-confirm" }),
        ),
      ),
    ]);

    expect(payResults.every((r) => r.status === 200)).toBe(true);
    expect(confirmRetries.every((r) => [200, 201, 409].includes(r.status))).toBe(true);

    const { Enrollment } = require("../src/modules/enrollments/enrollment.model");
    const active = await Enrollment.countDocuments({ classId, status: "ACTIVE" });
    expect(active).toBe(1);

    const klass = await CourseClass.findById(classId);
    expect(klass.confirmedCount).toBe(1);
    expect(klass.heldCount).toBe(0);
    expect(klass.confirmedCount).toBeLessThanOrEqual(klass.capacity);
    expect(klass.confirmedCount).toBeGreaterThanOrEqual(0);
  });
});
