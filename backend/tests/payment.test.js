const request = require("supertest");
const { createApp } = require("../src/app");
const { setupTestDatabase, clearDatabase, teardownTestDatabase } = require("./helpers/db");
const { User } = require("../src/modules/auth/user.model");
const { hashPassword } = require("../src/utils/password");
const { CourseClass } = require("../src/modules/courses/courseClass.model");
const { Discount } = require("../src/modules/billing/discount.model");
const { Payment } = require("../src/modules/billing/payment.model");
const { Enrollment } = require("../src/modules/enrollments/enrollment.model");
const { COMPLIANCE_STATUSES, DISCOUNT_TYPES, DISCOUNT_SCOPES } = require("../src/modules/courses/domain.constants");
const { applyDiscount, assertNonNegativeMoney } = require("../src/modules/billing/money");
const checkout = require("../src/modules/billing/checkout.service");

describe("Phase 3 payment / checkout hardening", () => {
  let app;
  let adminToken;
  let userToken;
  let otherToken;
  let userId;
  let otherUserId;

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

  async function bootstrap({ price = 2000000, capacity = 2 } = {}) {
    await User.create({
      phone: "09129990001",
      firstName: "ادمین",
      lastName: "پرداخت",
      passwordHash: await hashPassword("Password1"),
      phoneVerified: true,
      role: "ADMIN",
    });
    const adminLogin = await request(app).post("/api/auth/login").send({
      phone: "09129990001",
      password: "Password1",
    });
    adminToken = adminLogin.body.data.accessToken;

    const user = await User.create({
      phone: "09129990002",
      firstName: "کاربر",
      lastName: "پرداخت",
      passwordHash: await hashPassword("Password1"),
      phoneVerified: true,
    });
    userId = String(user._id);
    const userLogin = await request(app).post("/api/auth/login").send({
      phone: "09129990002",
      password: "Password1",
    });
    userToken = userLogin.body.data.accessToken;

    const other = await User.create({
      phone: "09129990003",
      firstName: "دیگر",
      lastName: "پرداخت",
      passwordHash: await hashPassword("Password1"),
      phoneVerified: true,
    });
    otherUserId = String(other._id);
    const otherLogin = await request(app).post("/api/auth/login").send({
      phone: "09129990003",
      password: "Password1",
    });
    otherToken = otherLogin.body.data.accessToken;

    const template = await request(app)
      .post("/api/courses/templates")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "شنا پرداخت",
        level: "Beginner",
        ageMin: 5,
        ageMax: 18,
        genderRestriction: "MALE",
        requiresInsurance: false,
        requiresMedicalApproval: false,
      });

    const instructor = await request(app)
      .post("/api/courses/instructors")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "مربی پرداخت" });

    const courseClass = await request(app)
      .post("/api/courses/classes")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        courseTemplateId: template.body.data.id,
        title: "کلاس پرداخت",
        instructorId: instructor.body.data.id,
        startDate: "2026-10-03T00:00:00.000Z",
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
        firstName: "فرزند",
        lastName: "پرداخت",
        birthDate: "2015-05-01",
        gender: "MALE",
        relation: "CHILD",
      });

    return {
      classId: courseClass.body.data.id,
      participantId: participant.body.data.id,
      templateId: template.body.data.id,
      price,
    };
  }

  async function reserveAndConfirm({ classId, participantId, discountCode, idempotencyKey = "pay-confirm-1" }) {
    const reserve = await request(app)
      .post("/api/enrollments/reservations")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ classId, participantId, idempotencyKey: `r-${idempotencyKey}` });
    expect(reserve.status).toBe(201);

    const confirm = await request(app)
      .post("/api/enrollments/confirm")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        reservationId: reserve.body.data.id,
        discountCode,
        idempotencyKey,
      });
    return { reserve, confirm };
  }

  test("money helpers reject negatives and clamp discounts", () => {
    expect(assertNonNegativeMoney(1000)).toBe(1000);
    expect(applyDiscount(1000, { type: DISCOUNT_TYPES.PERCENTAGE, value: 100 })).toBe(0);
    expect(applyDiscount(1000, { type: DISCOUNT_TYPES.FIXED, value: 5000 })).toBe(0);
    expect(applyDiscount(1000, { type: DISCOUNT_TYPES.PERCENTAGE, value: 10 })).toBe(900);
    expect(() => assertNonNegativeMoney(-1)).toThrow();
  });

  test("checkout rejects client amount fields (strict body)", async () => {
    const { classId, participantId, price } = await bootstrap();
    const reserve = await request(app)
      .post("/api/enrollments/reservations")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ classId, participantId, idempotencyKey: "r-amount-01" });
    expect(reserve.status).toBe(201);

    const rejected = await request(app)
      .post("/api/enrollments/confirm")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        reservationId: reserve.body.data.id,
        idempotencyKey: "confirm-amt-1",
        amount: 1,
        price: 1,
        finalAmount: 1,
        discountAmount: 999999,
      });
    expect(rejected.status).toBe(400);

    const confirm = await request(app)
      .post("/api/enrollments/confirm")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        reservationId: reserve.body.data.id,
        idempotencyKey: "confirm-amt-ok",
      });
    expect(confirm.status).toBe(201);
    expect(confirm.body.data.payment.amount).toBe(price);
    expect(confirm.body.data.quote.finalPrice).toBe(price);
  });

  test("duplicate confirm idempotency returns same payment", async () => {
    const { classId, participantId } = await bootstrap();
    const reserve = await request(app)
      .post("/api/enrollments/reservations")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ classId, participantId, idempotencyKey: "r-idem-same-1" });
    expect(reserve.status).toBe(201);

    const first = await request(app)
      .post("/api/enrollments/confirm")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        reservationId: reserve.body.data.id,
        idempotencyKey: "idem-same-1",
      });
    expect(first.status).toBe(201);

    const second = await request(app)
      .post("/api/enrollments/confirm")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        reservationId: reserve.body.data.id,
        idempotencyKey: "idem-same-1",
      });

    expect(second.status).toBe(200);
    expect(second.body.data.alreadyExists).toBe(true);
    expect(second.body.data.payment.id).toBe(first.body.data.payment.id);
  });

  test("payment failure releases held seat", async () => {
    const { classId, participantId } = await bootstrap({ capacity: 1 });
    const { confirm } = await reserveAndConfirm({
      classId,
      participantId,
      idempotencyKey: "fail-release-1",
    });
    expect(confirm.status).toBe(201);

    let klass = await CourseClass.findById(classId);
    expect(klass.heldCount).toBe(1);
    expect(klass.confirmedCount).toBe(0);

    const fail = await request(app)
      .post("/api/enrollments/payments/callback")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ paymentId: confirm.body.data.payment.id, success: false });
    expect(fail.status).toBe(402);

    klass = await CourseClass.findById(classId);
    expect(klass.heldCount).toBe(0);
    expect(klass.confirmedCount).toBe(0);

    const payment = await Payment.findById(confirm.body.data.payment.id);
    expect(payment.status).toBe("CANCELLED");
    const enrollment = await Enrollment.findById(confirm.body.data.enrollment.id);
    expect(enrollment.status).toBe("PAYMENT_FAILED");
  });

  test("callback rejects client amount manipulation", async () => {
    const { classId, participantId } = await bootstrap();
    const { confirm } = await reserveAndConfirm({
      classId,
      participantId,
      idempotencyKey: "cb-amt-1",
    });

    // Controller also rejects residual amount fields if present before validation strip.
    const res = await request(app)
      .post("/api/enrollments/payments/callback")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        paymentId: confirm.body.data.payment.id,
        success: true,
        amount: 1,
      });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  test("IDOR: user cannot read another user's payment", async () => {
    const { classId, participantId } = await bootstrap();
    const { confirm } = await reserveAndConfirm({
      classId,
      participantId,
      idempotencyKey: "idor-pay-1",
    });

    const denied = await request(app)
      .get(`/api/payments/${confirm.body.data.payment.id}`)
      .set("Authorization", `Bearer ${otherToken}`);
    expect(denied.status).toBe(403);

    const own = await request(app)
      .get(`/api/payments/${confirm.body.data.payment.id}`)
      .set("Authorization", `Bearer ${userToken}`);
    expect(own.status).toBe(200);
    expect(own.body.data.id).toBe(confirm.body.data.payment.id);

    const admin = await request(app)
      .get(`/api/payments/${confirm.body.data.payment.id}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(admin.status).toBe(200);
  });

  test("admin can list payments; non-admin cannot", async () => {
    const { classId, participantId } = await bootstrap();
    await reserveAndConfirm({ classId, participantId, idempotencyKey: "admin-list-1" });

    const denied = await request(app)
      .get("/api/payments")
      .set("Authorization", `Bearer ${userToken}`);
    expect(denied.status).toBe(403);

    const list = await request(app)
      .get("/api/payments")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(list.status).toBe(200);
    expect(list.body.data.items.length).toBeGreaterThanOrEqual(1);
  });

  test("100% discount zero-payment activates without gateway redirect", async () => {
    const { classId, participantId, price } = await bootstrap({ price: 1500000 });
    await Discount.create({
      code: "FREE100",
      type: DISCOUNT_TYPES.PERCENTAGE,
      value: 100,
      scope: DISCOUNT_SCOPES.ALL_CLASSES,
      startDate: new Date("2020-01-01"),
      endDate: new Date("2030-01-01"),
      usageLimit: 10,
      perUserLimit: 5,
      usedCount: 0,
      isActive: true,
    });

    const { confirm } = await reserveAndConfirm({
      classId,
      participantId,
      discountCode: "FREE100",
      idempotencyKey: "zero-pay-1",
    });

    expect(confirm.status).toBe(201);
    expect(confirm.body.data.payment.amount).toBe(0);
    expect(confirm.body.data.gateway.zeroAmount).toBe(true);
    expect(confirm.body.data.gateway.requiresRedirect).toBe(false);
    expect(confirm.body.data.enrollment.status).toBe("ACTIVE");
    expect(confirm.body.data.payment.status).toBe("SUCCESS");

    const discount = await Discount.findOne({ code: "FREE100" });
    expect(discount.usedCount).toBe(1);

    const klass = await CourseClass.findById(classId);
    expect(klass.confirmedCount).toBe(1);
    expect(klass.heldCount).toBe(0);
    expect(price).toBe(1500000);
  });

  test("expired / inactive / over-limit discounts are rejected", async () => {
    const { classId, participantId } = await bootstrap({ capacity: 5 });
    await Discount.create({
      code: "EXPIRED1",
      type: DISCOUNT_TYPES.FIXED,
      value: 1000,
      scope: DISCOUNT_SCOPES.ALL_CLASSES,
      startDate: new Date("2020-01-01"),
      endDate: new Date("2021-01-01"),
      isActive: true,
    });
    await Discount.create({
      code: "INACTIVE1",
      type: DISCOUNT_TYPES.FIXED,
      value: 1000,
      scope: DISCOUNT_SCOPES.ALL_CLASSES,
      startDate: new Date("2020-01-01"),
      endDate: new Date("2030-01-01"),
      isActive: false,
    });
    await Discount.create({
      code: "LIMIT1",
      type: DISCOUNT_TYPES.FIXED,
      value: 1000,
      scope: DISCOUNT_SCOPES.ALL_CLASSES,
      startDate: new Date("2020-01-01"),
      endDate: new Date("2030-01-01"),
      usageLimit: 1,
      usedCount: 1,
      isActive: true,
    });

    for (const [idx, code] of ["EXPIRED1", "INACTIVE1", "LIMIT1"].entries()) {
      const participant = await request(app)
        .post("/api/enrollments/participants")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          firstName: `فرزند${idx}`,
          lastName: `تخفیف${idx}`,
          birthDate: "2015-05-01",
          gender: "MALE",
          relation: "CHILD",
        });
      const reserve = await request(app)
        .post("/api/enrollments/reservations")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          classId,
          participantId: participant.body.data.id,
          idempotencyKey: `r-disc-${code}`,
        });
      expect(reserve.status).toBe(201);
      const confirm = await request(app)
        .post("/api/enrollments/confirm")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          reservationId: reserve.body.data.id,
          discountCode: code,
          idempotencyKey: `c-disc-${code}`,
        });
      expect(confirm.status).toBe(400);
    }
  });

  test("concurrent duplicate callbacks finalize once", async () => {
    const { classId, participantId } = await bootstrap({ capacity: 1 });
    const { confirm } = await reserveAndConfirm({
      classId,
      participantId,
      idempotencyKey: "conc-cb-1",
    });
    const paymentId = confirm.body.data.payment.id;

    const results = await Promise.all(
      Array.from({ length: 8 }, () =>
        request(app)
          .post("/api/enrollments/payments/callback")
          .set("Authorization", `Bearer ${userToken}`)
          .send({ paymentId, success: true }),
      ),
    );

    const oks = results.filter((r) => r.status === 200);
    expect(oks.length).toBe(8);
    const freshActivations = oks.filter((r) => r.body.data.alreadyProcessed === false);
    expect(freshActivations.length).toBe(1);

    const klass = await CourseClass.findById(classId);
    expect(klass.confirmedCount).toBe(1);
    expect(klass.heldCount).toBe(0);
    expect(klass.confirmedCount + klass.heldCount).toBeLessThanOrEqual(klass.capacity);

    const active = await Enrollment.countDocuments({ classId, status: "ACTIVE" });
    expect(active).toBe(1);
  });

  test("refund foundation marks refunded without inventing gateway secrets", async () => {
    const { classId, participantId } = await bootstrap();
    const { confirm } = await reserveAndConfirm({
      classId,
      participantId,
      idempotencyKey: "refund-1",
    });
    await request(app)
      .post("/api/enrollments/payments/callback")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ paymentId: confirm.body.data.payment.id, success: true });

    const denied = await request(app)
      .post(`/api/payments/${confirm.body.data.payment.id}/refund`)
      .set("Authorization", `Bearer ${userToken}`);
    expect(denied.status).toBe(403);

    const refund = await request(app)
      .post(`/api/payments/${confirm.body.data.payment.id}/refund`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(refund.status).toBe(200);
    expect(refund.body.data.payment.status).toBe("REFUNDED");

    const enrollment = await Enrollment.findById(confirm.body.data.enrollment.id);
    expect(enrollment.status).toBe("REFUNDED");
  });

  test("service-level concurrent finalize is idempotent", async () => {
    const { classId, participantId } = await bootstrap({ capacity: 1 });
    const { confirm } = await reserveAndConfirm({
      classId,
      participantId,
      idempotencyKey: "svc-conc-1",
    });
    const payment = await Payment.findById(confirm.body.data.payment.id);

    const outcomes = await Promise.all(
      Array.from({ length: 10 }, () =>
        checkout.verifyAndActivatePayment({
          paymentId: payment._id,
          userId,
          intentSuccess: true,
          authority: payment.authority,
        }),
      ),
    );

    const firstPass = outcomes.filter((o) => !o.alreadyProcessed);
    expect(firstPass.length).toBe(1);
    const active = await Enrollment.countDocuments({ classId, status: "ACTIVE" });
    expect(active).toBe(1);
  });
});
