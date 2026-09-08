const request = require("supertest");
const { createApp } = require("../src/app");
const { setupTestDatabase, clearDatabase, teardownTestDatabase } = require("./helpers/db");
const { User } = require("../src/modules/auth/user.model");
const { hashPassword } = require("../src/utils/password");
const { Payment } = require("../src/modules/billing/payment.model");
const { Enrollment } = require("../src/modules/enrollments/enrollment.model");
const { CourseClass } = require("../src/modules/courses/courseClass.model");
const checkout = require("../src/modules/billing/checkout.service");
const {
  PAYMENT_STATUSES,
  ENROLLMENT_STATUSES,
} = require("../src/modules/courses/domain.constants");

describe("Phase 8 payment hardening", () => {
  let app;
  let adminToken;
  let userToken;
  let otherToken;

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

  async function bootstrap({ price = 1500000, capacity = 3 } = {}) {
    await User.create({
      phone: "09125550001",
      firstName: "ادمین",
      lastName: "فاز۸",
      passwordHash: await hashPassword("Password1"),
      phoneVerified: true,
      role: "ADMIN",
    });
    adminToken = (
      await request(app).post("/api/auth/login").send({ phone: "09125550001", password: "Password1" })
    ).body.data.accessToken;

    await User.create({
      phone: "09125550002",
      firstName: "کاربر",
      lastName: "فاز۸",
      passwordHash: await hashPassword("Password1"),
      phoneVerified: true,
    });
    userToken = (
      await request(app).post("/api/auth/login").send({ phone: "09125550002", password: "Password1" })
    ).body.data.accessToken;

    await User.create({
      phone: "09125550003",
      firstName: "دیگر",
      lastName: "فاز۸",
      passwordHash: await hashPassword("Password1"),
      phoneVerified: true,
    });
    otherToken = (
      await request(app).post("/api/auth/login").send({ phone: "09125550003", password: "Password1" })
    ).body.data.accessToken;

    const template = await request(app)
      .post("/api/courses/templates")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "شنا فاز۸",
        level: "Beginner",
        ageMin: 5,
        ageMax: 60,
        genderRestriction: "ANY",
        requiresInsurance: false,
        requiresMedicalApproval: false,
      });
    const instructor = await request(app)
      .post("/api/courses/instructors")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "مربی فاز۸" });
    const courseClass = await request(app)
      .post("/api/courses/classes")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        courseTemplateId: template.body.data.id,
        title: "کلاس فاز۸",
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
    await request(app)
      .post(`/api/courses/classes/${courseClass.body.data.id}/publish`)
      .set("Authorization", `Bearer ${adminToken}`);
    await request(app)
      .post(`/api/courses/classes/${courseClass.body.data.id}/open-registration`)
      .set("Authorization", `Bearer ${adminToken}`);

    const participant = await request(app)
      .post("/api/enrollments/participants")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        firstName: "شناگر",
        lastName: "فاز۸",
        birthDate: "2012-01-01",
        gender: "FEMALE",
        relation: "CHILD",
      });

    return {
      classId: courseClass.body.data.id,
      participantId: participant.body.data.id,
      price,
    };
  }

  async function confirmOpen({ classId, participantId, idempotencyKey }) {
    const reserve = await request(app)
      .post("/api/enrollments/reservations")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ classId, participantId, idempotencyKey: `r-${idempotencyKey}` });
    expect(reserve.status).toBe(201);
    const confirm = await request(app)
      .post("/api/enrollments/confirm")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ reservationId: reserve.body.data.id, idempotencyKey });
    expect([200, 201]).toContain(confirm.status);
    return { reserve, confirm };
  }

  test("idempotency key reused with different reservation is rejected", async () => {
    const { classId, participantId } = await bootstrap({ capacity: 5 });
    const first = await confirmOpen({ classId, participantId, idempotencyKey: "idem-reuse-1" });
    expect(first.confirm.status).toBe(201);

    const otherParticipant = await request(app)
      .post("/api/enrollments/participants")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        firstName: "دوم",
        lastName: "فاز۸ب",
        birthDate: "2011-01-01",
        gender: "MALE",
        relation: "CHILD",
      });
    const reserve2 = await request(app)
      .post("/api/enrollments/reservations")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        classId,
        participantId: otherParticipant.body.data.id,
        idempotencyKey: "r-idem-reuse-2",
      });
    const conflict = await request(app)
      .post("/api/enrollments/confirm")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        reservationId: reserve2.body.data.id,
        idempotencyKey: "idem-reuse-1",
      });
    expect(conflict.status).toBe(409);
    expect(conflict.body.error.code).toBe("IDEMPOTENCY_KEY_REUSE");
  });

  test("amount mismatch via mock injection does not activate enrollment", async () => {
    const { classId, participantId, price } = await bootstrap();
    const { confirm } = await confirmOpen({
      classId,
      participantId,
      idempotencyKey: "amt-mismatch-1",
    });
    const paymentId = confirm.body.data.payment.id;
    await Payment.findByIdAndUpdate(paymentId, {
      $set: { "metadata.simulateAmountMismatch": true },
    });

    const cb = await request(app)
      .post("/api/enrollments/payments/callback")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ paymentId, success: true });
    expect(cb.status).toBe(402);
    const payment = await Payment.findById(paymentId);
    expect(payment.status).toBe(PAYMENT_STATUSES.FAILED);
    expect(payment.failureCode).toBe("AMOUNT_MISMATCH");
    const enrollment = await Enrollment.findById(confirm.body.data.enrollment.id);
    expect(enrollment.status).toBe(ENROLLMENT_STATUSES.PAYMENT_FAILED);
    expect(payment.amount).toBe(price);
  });

  test("wrong authority fails; late callback after expire is rejected", async () => {
    const { classId, participantId } = await bootstrap();
    const { confirm } = await confirmOpen({
      classId,
      participantId,
      idempotencyKey: "late-cb-1",
    });
    const paymentId = confirm.body.data.payment.id;

    const badAuth = await request(app)
      .post("/api/enrollments/payments/callback")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ paymentId, success: true, authority: "forged-authority-xyz" });
    expect(badAuth.status).toBe(402);

    // reopen a fresh payment for expire race
    const p2 = await confirmOpen({
      classId,
      participantId: (
        await request(app)
          .post("/api/enrollments/participants")
          .set("Authorization", `Bearer ${userToken}`)
          .send({
            firstName: "انقضا",
            lastName: "فاز۸",
            birthDate: "2010-01-01",
            gender: "FEMALE",
            relation: "CHILD",
          })
      ).body.data.id,
      idempotencyKey: "late-cb-2",
    });
    const paymentId2 = p2.confirm.body.data.payment.id;
    await Payment.findByIdAndUpdate(paymentId2, { expiresAt: new Date(Date.now() - 1000) });
    await checkout.expireOpenPayments();
    const expired = await Payment.findById(paymentId2);
    expect(expired.status).toBe(PAYMENT_STATUSES.EXPIRED);

    const late = await request(app)
      .post("/api/enrollments/payments/callback")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ paymentId: paymentId2, success: true });
    expect(late.status).toBe(409);
    expect(late.body.error.code).toBe("PAYMENT_TERMINAL");
    expect((await Payment.findById(paymentId2)).status).toBe(PAYMENT_STATUSES.EXPIRED);
  });

  test("user cancel maps to CANCELLED; IDOR callback denied", async () => {
    const { classId, participantId } = await bootstrap();
    const { confirm } = await confirmOpen({
      classId,
      participantId,
      idempotencyKey: "cancel-1",
    });
    const paymentId = confirm.body.data.payment.id;

    const idor = await request(app)
      .post("/api/enrollments/payments/callback")
      .set("Authorization", `Bearer ${otherToken}`)
      .send({ paymentId, success: true });
    expect(idor.status).toBe(403);

    const cancel = await request(app)
      .post("/api/enrollments/payments/callback")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ paymentId, success: false });
    expect(cancel.status).toBe(402);
    const payment = await Payment.findById(paymentId);
    expect(payment.status).toBe(PAYMENT_STATUSES.CANCELLED);
  });

  test("concurrent refunds finalize once; user cannot refund", async () => {
    const { classId, participantId } = await bootstrap();
    const { confirm } = await confirmOpen({
      classId,
      participantId,
      idempotencyKey: "refund-race-1",
    });
    const paymentId = confirm.body.data.payment.id;
    await request(app)
      .post("/api/enrollments/payments/callback")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ paymentId, success: true });

    const userRefund = await request(app)
      .post(`/api/payments/${paymentId}/refund`)
      .set("Authorization", `Bearer ${userToken}`);
    expect(userRefund.status).toBe(403);

    const results = await Promise.all([
      request(app)
        .post(`/api/payments/${paymentId}/refund`)
        .set("Authorization", `Bearer ${adminToken}`),
      request(app)
        .post(`/api/payments/${paymentId}/refund`)
        .set("Authorization", `Bearer ${adminToken}`),
    ]);
    expect(results.every((r) => r.status === 200)).toBe(true);
    const refundedCount = results.filter((r) => r.body.data.payment.status === "REFUNDED").length;
    expect(refundedCount).toBe(2); // one fresh + one alreadyProcessed both report REFUNDED
    expect(await Payment.countDocuments({ _id: paymentId, status: PAYMENT_STATUSES.REFUNDED })).toBe(
      1,
    );
    const enrollment = await Enrollment.findById(confirm.body.data.enrollment.id);
    expect(enrollment.status).toBe(ENROLLMENT_STATUSES.REFUNDED);
  });

  test("reconciliation detect-only endpoint", async () => {
    const { classId, participantId } = await bootstrap();
    const { confirm } = await confirmOpen({
      classId,
      participantId,
      idempotencyKey: "recon-scan-1",
    });
    await Payment.findByIdAndUpdate(confirm.body.data.payment.id, {
      expiresAt: new Date(Date.now() - 5000),
    });

    const denied = await request(app)
      .get("/api/payments/jobs/reconcile")
      .set("Authorization", `Bearer ${userToken}`);
    expect(denied.status).toBe(403);

    const recon = await request(app)
      .get("/api/payments/jobs/reconcile")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(recon.status).toBe(200);
    expect(recon.body.data.policy).toBe("DETECT_ONLY_NO_AUTO_MUTATION");
    expect(recon.body.data.findingCount).toBeGreaterThanOrEqual(1);
    expect(recon.body.data.findings.some((f) => f.type === "STALE_OPEN_PAYMENT")).toBe(true);
  });

  test("provider timeout injection surfaces safely", async () => {
    const { classId, participantId } = await bootstrap();
    const { confirm } = await confirmOpen({
      classId,
      participantId,
      idempotencyKey: "timeout-1",
    });
    const paymentId = confirm.body.data.payment.id;
    await Payment.findByIdAndUpdate(paymentId, {
      $set: { "metadata.simulateTimeout": true },
    });
    const cb = await request(app)
      .post("/api/enrollments/payments/callback")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ paymentId, success: true });
    expect([502, 504, 500]).toContain(cb.status);
    const payment = await Payment.findById(paymentId);
    expect(OPEN_OR_FAILED(payment.status)).toBe(true);
  });
});

function OPEN_OR_FAILED(status) {
  return [
    PAYMENT_STATUSES.CREATED,
    PAYMENT_STATUSES.INITIATED,
    PAYMENT_STATUSES.PENDING,
    PAYMENT_STATUSES.FAILED,
  ].includes(status);
}
