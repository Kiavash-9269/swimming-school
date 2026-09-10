const request = require("supertest");
const mongoose = require("mongoose");
const { createApp } = require("../src/app");
const { setupTestDatabase, clearDatabase, teardownTestDatabase } = require("./helpers/db");
const { User } = require("../src/modules/auth/user.model");
const { hashPassword } = require("../src/utils/password");
const { Payment } = require("../src/modules/billing/payment.model");
const { Enrollment } = require("../src/modules/enrollments/enrollment.model");
const { Reservation } = require("../src/modules/enrollments/reservation.model");
const { CourseClass } = require("../src/modules/courses/courseClass.model");
const { Instructor } = require("../src/modules/courses/instructor.model");
const enrollmentService = require("../src/modules/enrollments/enrollment.service");
const {
  PAYMENT_STATUSES,
  ENROLLMENT_STATUSES,
  RESERVATION_STATUSES,
  CLASS_STATUSES,
} = require("../src/modules/courses/domain.constants");

describe("F19 production readiness regressions", () => {
  let app;
  let adminToken;
  let userToken;

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
      phone: "09127770001",
      firstName: "ادمین",
      lastName: "اف۱۹",
      passwordHash: await hashPassword("Password1"),
      phoneVerified: true,
      role: "ADMIN",
    });
    adminToken = (
      await request(app).post("/api/auth/login").send({ phone: "09127770001", password: "Password1" })
    ).body.data.accessToken;

    await User.create({
      phone: "09127770002",
      firstName: "کاربر",
      lastName: "اف۱۹",
      passwordHash: await hashPassword("Password1"),
      phoneVerified: true,
    });
    userToken = (
      await request(app).post("/api/auth/login").send({ phone: "09127770002", password: "Password1" })
    ).body.data.accessToken;

    const template = await request(app)
      .post("/api/courses/templates")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "شنا اف۱۹",
        level: "Beginner",
        ageMin: 5,
        ageMax: 60,
        genderRestriction: "MALE",
        requiresInsurance: false,
        requiresMedicalApproval: false,
      });
    const instructor = await request(app)
      .post("/api/courses/instructors")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "مربی اف۱۹" });
    const courseClass = await request(app)
      .post("/api/courses/classes")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        courseTemplateId: template.body.data.id,
        title: "کلاس اف۱۹",
        instructorId: instructor.body.data.id,
        startDate: "2026-10-01T00:00:00.000Z",
        endDate: "2026-12-01T00:00:00.000Z",
        daysOfWeek: [6],
        startTime: "10:00",
        endTime: "11:00",
        totalSessions: 4,
        price: 1000000,
        capacity: 5,
      });
    return {
      classId: courseClass.body.data.id,
      instructorId: instructor.body.data.id,
      templateId: template.body.data.id,
    };
  }

  test("cancel after CONFIRMED reservation while PAYMENT_PENDING releases confirmedCount", async () => {
    const { classId } = await bootstrap();
    const user = await User.findOne({ phone: "09127770002" });
    const participant = await request(app)
      .post("/api/enrollments/participants")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        firstName: "شاگرد",
        lastName: "اف۱۹",
        birthDate: "2010-01-01",
        gender: "MALE",
        relation: "CHILD",
      });

    const reservation = await Reservation.create({
      userId: user._id,
      participantId: participant.body.data.id,
      classId,
      status: RESERVATION_STATUSES.CONFIRMED,
      expiresAt: new Date(Date.now() + 3600000),
      idempotencyKey: `f19_res_${Date.now()}`,
    });
    await CourseClass.updateOne({ _id: classId }, { $set: { confirmedCount: 1, heldCount: 0 } });

    const enrollment = await Enrollment.create({
      userId: user._id,
      participantId: participant.body.data.id,
      classId,
      reservationId: reservation._id,
      status: ENROLLMENT_STATUSES.PAYMENT_PENDING,
      priceCharged: 1000000,
      finalAmount: 1000000,
    });

    await enrollmentService.cancelEnrollment({
      userId: user._id,
      enrollmentId: enrollment._id,
    });

    const klass = await CourseClass.findById(classId);
    expect(klass.confirmedCount).toBe(0);
    const res = await Reservation.findById(reservation._id);
    expect(res.status).toBe(RESERVATION_STATUSES.RELEASED);
  });

  test("anonymous catalog hides DRAFT; admin with token still sees DRAFT", async () => {
    const { classId } = await bootstrap();
    await CourseClass.updateOne({ _id: classId }, { $set: { status: CLASS_STATUSES.DRAFT } });

    const anon = await request(app).get("/api/courses/classes");
    expect(anon.status).toBe(200);
    expect(anon.body.data.items.some((c) => c.id === classId)).toBe(false);

    const anonGet = await request(app).get(`/api/courses/classes/${classId}`);
    expect(anonGet.status).toBe(404);

    const admin = await request(app)
      .get("/api/courses/classes")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(admin.status).toBe(200);
    expect(admin.body.data.items.some((c) => c.id === classId)).toBe(true);
  });

  test("Instructor.userId unique index rejects duplicate active links", async () => {
    await bootstrap();
    const user = await User.findOne({ phone: "09127770002" });
    await Instructor.create({
      name: "اول",
      userId: user._id,
      isActive: true,
    });
    await expect(
      Instructor.create({
        name: "دوم",
        userId: user._id,
        isActive: true,
      }),
    ).rejects.toMatchObject({ code: 11000 });
  });

  test("callback secret compare rejects wrong length without throw", async () => {
    const { classId } = await bootstrap();
    const user = await User.findOne({ phone: "09127770002" });
    const enrollment = await Enrollment.create({
      userId: user._id,
      participantId: user._id,
      classId,
      status: ENROLLMENT_STATUSES.PAYMENT_PENDING,
      priceCharged: 1000,
      finalAmount: 1000,
    });
    const payment = await Payment.create({
      userId: user._id,
      enrollmentId: enrollment._id,
      amount: 1000,
      status: PAYMENT_STATUSES.PENDING,
      provider: "mock",
      providerRef: "mock_f19_secret",
      authority: "mock_f19_secret",
      idempotencyKey: `f19_secret_${Date.now()}`,
    });

    const bad = await request(app)
      .post("/api/payments/callback")
      .set("x-payment-callback-secret", "wrong")
      .send({ paymentId: String(payment._id), success: true, authority: "mock_f19_secret" });
    expect(bad.status).toBe(403);
  });

  test("late terminal callback persists reconciliationRequired metadata", async () => {
    await bootstrap();
    const user = await User.findOne({ phone: "09127770002" });
    const enrollment = await Enrollment.create({
      userId: user._id,
      participantId: user._id,
      classId: new mongoose.Types.ObjectId(),
      status: ENROLLMENT_STATUSES.CANCELLED,
      priceCharged: 1000,
      finalAmount: 1000,
    });
    const payment = await Payment.create({
      userId: user._id,
      enrollmentId: enrollment._id,
      amount: 1000,
      status: PAYMENT_STATUSES.EXPIRED,
      provider: "mock",
      providerRef: "mock_f19_late",
      authority: "mock_f19_late",
      idempotencyKey: `f19_late_${Date.now()}`,
    });

    const res = await request(app)
      .post("/api/payments/callback")
      .set("x-payment-callback-secret", "test-payment-callback-secret")
      .send({ paymentId: String(payment._id), success: true, authority: "mock_f19_late" });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("PAYMENT_TERMINAL");
    const fresh = await Payment.findById(payment._id);
    expect(fresh.metadata?.reconciliationRequired).toBe(true);
    expect(fresh.metadata?.reconciliationReason).toBe("LATE_OR_TERMINAL_CALLBACK");
  });
});
