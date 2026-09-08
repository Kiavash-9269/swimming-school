const request = require("supertest");
const { createApp } = require("../src/app");
const { setupTestDatabase, clearDatabase, teardownTestDatabase } = require("./helpers/db");
const { User } = require("../src/modules/auth/user.model");
const { hashPassword } = require("../src/utils/password");
const { CourseClass } = require("../src/modules/courses/courseClass.model");
const { Enrollment } = require("../src/modules/enrollments/enrollment.model");
const { COMPLIANCE_STATUSES } = require("../src/modules/courses/domain.constants");

describe("Enrollment domain API", () => {
  let app;
  let adminToken;
  let userToken;
  let userId;

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

  async function bootstrap() {
    await User.create({
      phone: "09128880001",
      firstName: "ادمین",
      lastName: "دوره",
      passwordHash: await hashPassword("Password1"),
      phoneVerified: true,
      role: "ADMIN",
    });
    const adminLogin = await request(app).post("/api/auth/login").send({
      phone: "09128880001",
      password: "Password1",
    });
    adminToken = adminLogin.body.data.accessToken;

    const user = await User.create({
      phone: "09128880002",
      firstName: "ولی",
      lastName: "دانش‌آموز",
      passwordHash: await hashPassword("Password1"),
      phoneVerified: true,
    });
    userId = String(user._id);
    const userLogin = await request(app).post("/api/auth/login").send({
      phone: "09128880002",
      password: "Password1",
    });
    userToken = userLogin.body.data.accessToken;

    const template = await request(app)
      .post("/api/courses/templates")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "شنا پیشرفته",
        level: "Advanced",
        ageMin: 8,
        ageMax: 14,
        genderRestriction: "FEMALE",
        requiresInsurance: true,
        requiresMedicalApproval: true,
      });

    const instructor = await request(app)
      .post("/api/courses/instructors")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "مربی دو" });

    const courseClass = await request(app)
      .post("/api/courses/classes")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        courseTemplateId: template.body.data.id,
        title: "شنا پیشرفته - آبان",
        instructorId: instructor.body.data.id,
        startDate: "2026-10-03T00:00:00.000Z",
        endDate: "2026-12-01T00:00:00.000Z",
        daysOfWeek: [6],
        startTime: "17:00",
        endTime: "18:00",
        totalSessions: 4,
        price: 2000000,
        capacity: 2,
      });

    await request(app)
      .post(`/api/courses/classes/${courseClass.body.data.id}/publish`)
      .set("Authorization", `Bearer ${adminToken}`);
    await request(app)
      .post(`/api/courses/classes/${courseClass.body.data.id}/open-registration`)
      .set("Authorization", `Bearer ${adminToken}`);

    return {
      classId: courseClass.body.data.id,
      templateId: template.body.data.id,
    };
  }

  test("eligibility fails for age/gender/insurance/medical", async () => {
    const { classId } = await bootstrap();
    const participant = await request(app)
      .post("/api/enrollments/participants")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        firstName: "سارا",
        lastName: "تستی",
        birthDate: "2010-01-01",
        gender: "MALE",
        relation: "CHILD",
      });
    expect(participant.status).toBe(201);

    const elig = await request(app)
      .post("/api/enrollments/eligibility/check")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ classId, participantId: participant.body.data.id });
    expect(elig.status).toBe(200);
    expect(elig.body.data.eligible).toBe(false);
    expect(elig.body.data.reasons).toEqual(
      expect.arrayContaining([
        "GENDER_NOT_ALLOWED",
        "INSURANCE_REQUIRED",
        "MEDICAL_APPROVAL_REQUIRED",
      ]),
    );
  });

  test("full enrollment flow with payment idempotency", async () => {
    const { classId } = await bootstrap();

    // Relax template restrictions for happy path by creating eligible participant + approvals
    const participant = await request(app)
      .post("/api/enrollments/participants")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        firstName: "مینا",
        lastName: "شناگر",
        birthDate: "2015-05-01",
        gender: "FEMALE",
        relation: "CHILD",
      });

    await request(app)
      .post(`/api/enrollments/participants/${participant.body.data.id}/insurance`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: COMPLIANCE_STATUSES.APPROVED, expiresAt: "2030-01-01" });
    await request(app)
      .post(`/api/enrollments/participants/${participant.body.data.id}/medical`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: COMPLIANCE_STATUSES.APPROVED, expiresAt: "2030-01-01" });

    const reserve = await request(app)
      .post("/api/enrollments/reservations")
      .set("Authorization", `Bearer ${userToken}`)
      .set("Idempotency-Key", "reserve-key-1")
      .send({ classId, participantId: participant.body.data.id, idempotencyKey: "reserve-key-1" });
    expect(reserve.status).toBe(201);

    const reserveDup = await request(app)
      .post("/api/enrollments/reservations")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ classId, participantId: participant.body.data.id, idempotencyKey: "reserve-key-1" });
    expect(reserveDup.status).toBe(201);
    expect(reserveDup.body.data.id).toBe(reserve.body.data.id);

    const confirm = await request(app)
      .post("/api/enrollments/confirm")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        reservationId: reserve.body.data.id,
        idempotencyKey: "confirm-key-1",
      });
    expect(confirm.status).toBe(201);
    expect(confirm.body.data.enrollment.status).toBe("PAYMENT_PENDING");

    const pay1 = await request(app)
      .post("/api/enrollments/payments/callback")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ paymentId: confirm.body.data.payment.id, success: true });
    expect(pay1.status).toBe(200);
    expect(pay1.body.data.enrollment.status).toBe("ACTIVE");

    const pay2 = await request(app)
      .post("/api/enrollments/payments/callback")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ paymentId: confirm.body.data.payment.id, success: true });
    expect(pay2.status).toBe(200);
    expect(pay2.body.data.alreadyProcessed).toBe(true);

    const klass = await CourseClass.findById(classId);
    expect(klass.confirmedCount).toBe(1);
    expect(klass.heldCount).toBe(0);

    const cancel = await request(app)
      .post(`/api/enrollments/${confirm.body.data.enrollment.id}/cancel`)
      .set("Authorization", `Bearer ${userToken}`);
    expect(cancel.status).toBe(200);
    expect(cancel.body.data.status).toBe("CANCELLED");

    const after = await CourseClass.findById(classId);
    expect(after.confirmedCount).toBe(0);
  });

  test("IDOR: user cannot access another enrollment", async () => {
    const { classId } = await bootstrap();
    const { Participant } = require("../src/modules/enrollments/participant.model");
    const participant = await Participant.create({
      ownerUserId: userId,
      firstName: "مالک",
      lastName: "ثبت",
      birthDate: "2014-01-01",
      gender: "FEMALE",
      relation: "CHILD",
    });

    await User.create({
      phone: "09128880003",
      firstName: "دیگر",
      lastName: "کاربر",
      passwordHash: await hashPassword("Password1"),
      phoneVerified: true,
    });
    const otherLogin = await request(app).post("/api/auth/login").send({
      phone: "09128880003",
      password: "Password1",
    });

    const enrollment = await Enrollment.create({
      userId,
      participantId: participant._id,
      classId,
      status: "ACTIVE",
      priceCharged: 1,
    });

    const res = await request(app)
      .get(`/api/enrollments/${enrollment._id}`)
      .set("Authorization", `Bearer ${otherLogin.body.data.accessToken}`);
    expect(res.status).toBe(403);
  });

  test("user 360 returns aggregated foundation payload", async () => {
    await bootstrap();
    const res = await request(app)
      .get("/api/enrollments/users/me/360")
      .set("Authorization", `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.userId).toBe(userId);
    expect(res.body.data).toHaveProperty("participants");
    expect(res.body.data).toHaveProperty("enrollments");
    expect(res.body.data).toHaveProperty("payments");
    expect(res.body.data).toHaveProperty("insurance");
    expect(res.body.data).toHaveProperty("medical");
    expect(res.body.data).toHaveProperty("attendance");
  });
});
