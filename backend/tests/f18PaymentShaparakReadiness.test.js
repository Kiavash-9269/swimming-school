const request = require("supertest");
const { createApp } = require("../src/app");
const { setupTestDatabase, clearDatabase, teardownTestDatabase } = require("./helpers/db");
const { User } = require("../src/modules/auth/user.model");
const { hashPassword } = require("../src/utils/password");
const { Payment } = require("../src/modules/billing/payment.model");
const { Enrollment } = require("../src/modules/enrollments/enrollment.model");
const { CourseClass } = require("../src/modules/courses/courseClass.model");
const { ZarinpalPaymentProvider } = require("../src/modules/billing/providers/zarinpalProvider");
const checkout = require("../src/modules/billing/checkout.service");
const {
  PAYMENT_STATUSES,
  ENROLLMENT_STATUSES,
} = require("../src/modules/courses/domain.constants");

describe("F18 payment Shaparak readiness", () => {
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

  async function bootstrap({ price = 1500000, capacity = 1 } = {}) {
    await User.create({
      phone: "09126660001",
      firstName: "ادمین",
      lastName: "اف۱۸",
      passwordHash: await hashPassword("Password1"),
      phoneVerified: true,
      role: "ADMIN",
    });
    adminToken = (
      await request(app).post("/api/auth/login").send({ phone: "09126660001", password: "Password1" })
    ).body.data.accessToken;

    await User.create({
      phone: "09126660002",
      firstName: "کاربر",
      lastName: "اف۱۸",
      passwordHash: await hashPassword("Password1"),
      phoneVerified: true,
    });
    userToken = (
      await request(app).post("/api/auth/login").send({ phone: "09126660002", password: "Password1" })
    ).body.data.accessToken;

    const template = await request(app)
      .post("/api/courses/templates")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "شنا اف۱۸",
        level: "Beginner",
        ageMin: 5,
        ageMax: 60,
        genderRestriction: "MALE",
        requiresInsurance: false,
        requiresMedicalApproval: false,
      });
    expect(template.status).toBe(201);
    const instructor = await request(app)
      .post("/api/courses/instructors")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "مربی اف۱۸" });
    const courseClass = await request(app)
      .post("/api/courses/classes")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        courseTemplateId: template.body.data.id,
        title: "کلاس اف۱۸",
        instructorId: instructor.body.data.id,
        startDate: "2026-10-01T00:00:00.000Z",
        endDate: "2026-12-01T00:00:00.000Z",
        daysOfWeek: [6],
        startTime: "10:00",
        endTime: "11:00",
        totalSessions: 4,
        price,
        capacity,
      });
    expect(courseClass.status).toBe(201);
    return { classId: courseClass.body.data.id, price };
  }

  test("SUCCESS is not downgraded to FAILED when capacity missing after claim", async () => {
    const { classId, price } = await bootstrap({ capacity: 1 });
    const user = await User.findOne({ phone: "09126660002" });

    const participant = await request(app)
      .post("/api/enrollments/participants")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        firstName: "شاگرد",
        lastName: "اف۱۸",
        birthDate: "2010-01-01",
        gender: "MALE",
        relation: "CHILD",
      });
    expect(participant.status).toBe(201);

    await CourseClass.updateOne({ _id: classId }, { $set: { confirmedCount: 1, heldCount: 0 } });

    const enrollment = await Enrollment.create({
      userId: user._id,
      participantId: participant.body.data.id,
      classId,
      status: ENROLLMENT_STATUSES.PAYMENT_PENDING,
      priceCharged: price,
      finalAmount: price,
    });

    const payment = await Payment.create({
      userId: user._id,
      participantId: participant.body.data.id,
      enrollmentId: enrollment._id,
      classId,
      amount: price,
      currency: "IRR",
      status: PAYMENT_STATUSES.PENDING,
      provider: "mock",
      providerRef: "mock_auth_f18_cap",
      authority: "mock_auth_f18_cap",
      idempotencyKey: `f18_cap_${enrollment._id}`,
    });

    await expect(
      checkout.finalizeSuccessfulPayment(payment, { providerRef: payment.providerRef }),
    ).rejects.toMatchObject({ code: "COURSE_FULL" });

    const fresh = await Payment.findById(payment._id);
    expect(fresh.status).toBe(PAYMENT_STATUSES.SUCCESS);
    expect(fresh.metadata?.reconciliationRequired).toBe(true);
    expect(fresh.metadata?.reconciliationReason).toBe("CAPACITY_UNAVAILABLE_AFTER_SUCCESS");
  });

  test("zarinpal verify rejects authority mismatch without calling provider", async () => {
    const provider = new ZarinpalPaymentProvider({
      ZARINPAL_MERCHANT_ID: "test-merchant",
      ZARINPAL_SANDBOX: "true",
      PAYMENT_CALLBACK_URL: "https://example.test/callback",
      PAYMENT_TIMEOUT_MS: 5000,
    });

    const result = await provider.verifyPayment({
      payment: {
        amount: 1000,
        authority: "A000000000000000000000000000000000000",
        providerRef: "A000000000000000000000000000000000000",
      },
      authority: "B111111111111111111111111111111111111",
      intentSuccess: true,
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("AUTHORITY_MISMATCH");
    expect(result.code).toBe("INVALID_AUTHORITY");
  });

  test("deferred provider refund stays REFUND_REQUESTED without 502", async () => {
    await bootstrap();
    const user = await User.findOne({ phone: "09126660002" });
    const admin = await User.findOne({ phone: "09126660001" });
    const enrollment = await Enrollment.create({
      userId: user._id,
      participantId: user._id,
      classId: user._id,
      status: ENROLLMENT_STATUSES.ACTIVE,
      priceCharged: 1000,
      finalAmount: 1000,
    });
    const payment = await Payment.create({
      userId: user._id,
      enrollmentId: enrollment._id,
      amount: 1000,
      status: PAYMENT_STATUSES.SUCCESS,
      provider: "zarinpal",
      providerRef: "A000000000000000000000000000000000001",
      authority: "A000000000000000000000000000000000001",
      idempotencyKey: `f18_refund_${Date.now()}`,
    });

    const originalRefund = checkout.paymentProvider.refund.bind(checkout.paymentProvider);
    checkout.paymentProvider.refund = async () => ({
      ok: false,
      deferred: true,
      reason: "ZARINPAL_REFUND_NOT_WIRED",
    });

    try {
      const result = await checkout.requestRefund({
        paymentId: payment._id,
        adminUserId: admin._id,
      });
      expect(result.deferred).toBe(true);
      expect(result.classification).toBe("INTERNAL_REFUND_REQUESTED_AWAITING_PROVIDER");
      const fresh = await Payment.findById(payment._id);
      expect(fresh.status).toBe(PAYMENT_STATUSES.REFUND_REQUESTED);
    } finally {
      checkout.paymentProvider.refund = originalRefund;
    }
  });

  test("public payment exposes reconciliation flag only", async () => {
    await bootstrap();
    const user = await User.findOne({ phone: "09126660002" });
    const enrollment = await Enrollment.create({
      userId: user._id,
      participantId: user._id,
      classId: user._id,
      status: ENROLLMENT_STATUSES.PAYMENT_PENDING,
      priceCharged: 500,
      finalAmount: 500,
    });
    const payment = await Payment.create({
      userId: user._id,
      enrollmentId: enrollment._id,
      amount: 500,
      status: PAYMENT_STATUSES.SUCCESS,
      provider: "mock",
      idempotencyKey: `f18_pub_${Date.now()}`,
      metadata: {
        reconciliationRequired: true,
        reconciliationReason: "CAPACITY_UNAVAILABLE_AFTER_SUCCESS",
        rawSecret: "should-not-leak",
      },
    });

    const pub = checkout.toPublicPayment(payment);
    expect(pub.reconciliationRequired).toBe(true);
    expect(pub.reconciliationReason).toBe("CAPACITY_UNAVAILABLE_AFTER_SUCCESS");
    expect(pub).not.toHaveProperty("metadata");
    expect(JSON.stringify(pub)).not.toContain("should-not-leak");
  });

  test("reconcile reports RECONCILIATION_FLAGGED detect-only", async () => {
    await bootstrap();
    const user = await User.findOne({ phone: "09126660002" });
    const enrollment = await Enrollment.create({
      userId: user._id,
      participantId: user._id,
      classId: user._id,
      status: ENROLLMENT_STATUSES.PAYMENT_PENDING,
      priceCharged: 500,
      finalAmount: 500,
    });
    await Payment.create({
      userId: user._id,
      enrollmentId: enrollment._id,
      amount: 500,
      status: PAYMENT_STATUSES.SUCCESS,
      provider: "mock",
      idempotencyKey: `f18_rec_${Date.now()}`,
      metadata: {
        reconciliationRequired: true,
        reconciliationReason: "CAPACITY_UNAVAILABLE_AFTER_SUCCESS",
      },
    });

    const scan = await checkout.reconcilePayments({ limit: 50 });
    expect(scan.policy).toBe("DETECT_ONLY_NO_AUTO_MUTATION");
    expect(scan.findings.some((f) => f.type === "RECONCILIATION_FLAGGED")).toBe(true);
  });

  test("server callback works without JWT when secret is valid", async () => {
    const { classId, price } = await bootstrap({ capacity: 3 });
    const participant = await request(app)
      .post("/api/enrollments/participants")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        firstName: "کالبک",
        lastName: "اف۱۸",
        birthDate: "2011-01-01",
        gender: "MALE",
        relation: "CHILD",
      });
    expect(participant.status).toBe(201);

    await request(app)
      .post(`/api/courses/classes/${classId}/publish`)
      .set("Authorization", `Bearer ${adminToken}`);
    await request(app)
      .post(`/api/courses/classes/${classId}/open-registration`)
      .set("Authorization", `Bearer ${adminToken}`);

    const reserve = await request(app)
      .post("/api/enrollments/reservations")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        classId,
        participantId: participant.body.data.id,
        idempotencyKey: "r-f18-cb-1",
      });
    expect(reserve.status).toBe(201);
    const confirm = await request(app)
      .post("/api/enrollments/confirm")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ reservationId: reserve.body.data.id, idempotencyKey: "f18-cb-1" });
    expect([200, 201]).toContain(confirm.status);
    const paymentId = confirm.body.data.payment.id;
    const authority = confirm.body.data.payment.authority || confirm.body.data.gateway?.authority;

    const noSecret = await request(app)
      .post("/api/payments/callback")
      .send({ paymentId, success: true, authority });
    expect(noSecret.status).toBe(403);

    const withSecret = await request(app)
      .post("/api/payments/callback")
      .set("x-payment-callback-secret", "test-payment-callback-secret")
      .send({ paymentId, success: true, authority });
    expect(withSecret.status).toBe(200);
    expect(withSecret.body.data.payment.status).toBe(PAYMENT_STATUSES.SUCCESS);

    const replay = await request(app)
      .post("/api/payments/callback")
      .set("x-payment-callback-secret", "test-payment-callback-secret")
      .send({ paymentId, success: true, authority });
    expect(replay.status).toBe(200);
    expect(replay.body.data.alreadyProcessed).toBe(true);
  });

  test("verifyAndActivate rejects anonymous call without secret", async () => {
    await bootstrap();
    const user = await User.findOne({ phone: "09126660002" });
    const enrollment = await Enrollment.create({
      userId: user._id,
      participantId: user._id,
      classId: user._id,
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
      providerRef: "mock_anon_f18",
      authority: "mock_anon_f18",
      idempotencyKey: `f18_anon_${Date.now()}`,
    });

    await expect(
      checkout.verifyAndActivatePayment({
        paymentId: payment._id,
        userId: null,
        authority: "mock_anon_f18",
        intentSuccess: true,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
