const request = require("supertest");
const { createApp } = require("../src/app");
const { setupTestDatabase, clearDatabase, teardownTestDatabase } = require("./helpers/db");
const { User } = require("../src/modules/auth/user.model");
const { hashPassword } = require("../src/utils/password");
const { Payment } = require("../src/modules/billing/payment.model");
const { Enrollment } = require("../src/modules/enrollments/enrollment.model");
const { CourseClass } = require("../src/modules/courses/courseClass.model");
const { WaitlistEntry } = require("../src/modules/enrollments/waitlist.model");
const { MedicalDocument } = require("../src/modules/compliance/medical.model");
const checkout = require("../src/modules/billing/checkout.service");
const {
  PAYMENT_STATUSES,
  ENROLLMENT_STATUSES,
  COMPLIANCE_STATUSES,
} = require("../src/modules/courses/domain.constants");

describe("Phase 9 cross-phase audit invariants", () => {
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

  async function bootstrap({ price = 1000000, capacity = 2 } = {}) {
    await User.create({
      phone: "09126660001",
      firstName: "ادمین",
      lastName: "فاز۹",
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
      lastName: "فاز۹",
      passwordHash: await hashPassword("Password1"),
      phoneVerified: true,
    });
    userToken = (
      await request(app).post("/api/auth/login").send({ phone: "09126660002", password: "Password1" })
    ).body.data.accessToken;

    await User.create({
      phone: "09126660003",
      firstName: "دیگر",
      lastName: "فاز۹",
      passwordHash: await hashPassword("Password1"),
      phoneVerified: true,
    });
    otherToken = (
      await request(app).post("/api/auth/login").send({ phone: "09126660003", password: "Password1" })
    ).body.data.accessToken;

    const template = await request(app)
      .post("/api/courses/templates")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "شنا فاز۹",
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
      .send({ name: "مربی فاز۹" });
    const courseClass = await request(app)
      .post("/api/courses/classes")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        courseTemplateId: template.body.data.id,
        title: "کلاس فاز۹",
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
        lastName: "فاز۹",
        birthDate: "2012-01-01",
        gender: "MALE",
        relation: "CHILD",
      });

    return {
      classId: courseClass.body.data.id,
      participantId: participant.body.data.id,
    };
  }

  async function reserveAndCheckout(classId, participantId, token, key) {
    const reserve = await request(app)
      .post("/api/enrollments/reservations")
      .set("Authorization", `Bearer ${token}`)
      .send({ classId, participantId, idempotencyKey: key });
    expect(reserve.status).toBe(201);
    const confirm = await request(app)
      .post("/api/enrollments/confirm")
      .set("Authorization", `Bearer ${token}`)
      .send({ reservationId: reserve.body.data.id, idempotencyKey: `${key}-pay` });
    expect(confirm.status).toBe(201);
    return confirm.body.data;
  }

  test("cancel terminalizes open payment so callback cannot SUCCESS", async () => {
    const { classId, participantId } = await bootstrap({ capacity: 2 });
    const checkoutData = await reserveAndCheckout(classId, participantId, userToken, "p9-cancel-pay-1");

    const cancel = await request(app)
      .post(`/api/enrollments/${checkoutData.enrollment.id}/cancel`)
      .set("Authorization", `Bearer ${userToken}`);
    expect(cancel.status).toBe(200);
    expect(cancel.body.data.status).toBe(ENROLLMENT_STATUSES.CANCELLED);

    const payment = await Payment.findById(checkoutData.payment.id);
    expect(payment.status).toBe(PAYMENT_STATUSES.CANCELLED);

    const callback = await request(app)
      .post("/api/enrollments/payments/callback")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ paymentId: checkoutData.payment.id, success: true });
    expect(callback.status).toBeGreaterThanOrEqual(400);

    const enrollment = await Enrollment.findById(checkoutData.enrollment.id);
    expect(enrollment.status).toBe(ENROLLMENT_STATUSES.CANCELLED);
    const again = await Payment.findById(checkoutData.payment.id);
    expect(again.status).not.toBe(PAYMENT_STATUSES.SUCCESS);

    const courseClass = await CourseClass.findById(classId);
    expect(courseClass.confirmedCount).toBe(0);
    expect(courseClass.heldCount).toBe(0);
  });

  test("concurrent cancel releases confirmed seat exactly once", async () => {
    const { classId, participantId } = await bootstrap({ capacity: 2 });
    const checkoutData = await reserveAndCheckout(classId, participantId, userToken, "p9-conc-cancel-1");
    const pay = await request(app)
      .post("/api/enrollments/payments/callback")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ paymentId: checkoutData.payment.id, success: true });
    expect(pay.body.data.enrollment.status).toBe(ENROLLMENT_STATUSES.ACTIVE);

    const before = await CourseClass.findById(classId);
    expect(before.confirmedCount).toBe(1);

    const [a, b] = await Promise.all([
      request(app)
        .post(`/api/enrollments/${checkoutData.enrollment.id}/cancel`)
        .set("Authorization", `Bearer ${userToken}`),
      request(app)
        .post(`/api/enrollments/${checkoutData.enrollment.id}/cancel`)
        .set("Authorization", `Bearer ${adminToken}`),
    ]);
    expect([a.status, b.status].every((s) => s === 200)).toBe(true);

    const after = await CourseClass.findById(classId);
    expect(after.confirmedCount).toBe(0);
  });

  test("refund after cancel does not double-decrement confirmedCount", async () => {
    const { classId, participantId } = await bootstrap({ capacity: 2 });
    const checkoutData = await reserveAndCheckout(classId, participantId, userToken, "p9-refund-cancel-1");
    await request(app)
      .post("/api/enrollments/payments/callback")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ paymentId: checkoutData.payment.id, success: true });

    await request(app)
      .post(`/api/enrollments/${checkoutData.enrollment.id}/cancel`)
      .set("Authorization", `Bearer ${userToken}`);

    const mid = await CourseClass.findById(classId);
    expect(mid.confirmedCount).toBe(0);

    const refund = await request(app)
      .post(`/api/payments/${checkoutData.payment.id}/refund`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(refund.status).toBe(200);
    expect(refund.body.data.payment.status).toBe(PAYMENT_STATUSES.REFUNDED);

    const after = await CourseClass.findById(classId);
    expect(after.confirmedCount).toBe(0);

    const enrollment = await Enrollment.findById(checkoutData.enrollment.id);
    expect(enrollment.status).toBe(ENROLLMENT_STATUSES.REFUNDED);
  });

  test("waitlist positions stay unique under concurrent joins", async () => {
    const { classId } = await bootstrap({ capacity: 1 });

    const p1 = await request(app)
      .post("/api/enrollments/participants")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        firstName: "الف",
        lastName: "انتظار",
        birthDate: "2011-01-01",
        gender: "MALE",
        relation: "CHILD",
      });
    const filler = await reserveAndCheckout(classId, p1.body.data.id, userToken, "p9-fill-seat-1");
    await request(app)
      .post("/api/enrollments/payments/callback")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ paymentId: filler.payment.id, success: true });

    const otherParticipants = [];
    for (let i = 0; i < 4; i += 1) {
      const p = await request(app)
        .post("/api/enrollments/participants")
        .set("Authorization", `Bearer ${otherToken}`)
        .send({
          firstName: `و${i}`,
          lastName: "انتظار",
          birthDate: "2010-01-01",
          gender: "MALE",
          relation: "CHILD",
        });
      otherParticipants.push(p.body.data.id);
    }

    const results = await Promise.all(
      otherParticipants.map((participantId, i) =>
        request(app)
          .post("/api/enrollments/waitlist")
          .set("Authorization", `Bearer ${otherToken}`)
          .send({ classId, participantId, idempotencyKey: `wl-${i}` }),
      ),
    );

    const ok = results.filter((r) => r.status === 201 || r.status === 200);
    expect(ok.length).toBeGreaterThanOrEqual(3);

    const entries = await WaitlistEntry.find({ classId }).sort({ position: 1 });
    const positions = entries.map((e) => e.position);
    expect(new Set(positions).size).toBe(positions.length);
  });

  test("legacy metadata-only document cannot be approved or grant eligibility", async () => {
    const { classId, participantId } = await bootstrap();

    const medical = await request(app)
      .post(`/api/enrollments/participants/${participantId}/medical`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        originalFilename: "clearance.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1200,
      });
    expect(medical.status).toBe(201);
    expect(medical.body.data.persisted).toBe(false);
    expect(medical.body.data.hasDocument).toBe(true);
    expect(medical.body.data.storageKey).toBeUndefined();

    const review = await request(app)
      .post(`/api/enrollments/admin/documents/medical/${medical.body.data.id}/review`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ decision: "APPROVED" });
    expect(review.status).toBe(409);
    expect(review.body.error.code).toBe("DOCUMENT_NOT_PERSISTED");

    // Direct DB implant of APPROVED + non-persisted storageKey must not pass eligibility.
    await MedicalDocument.create({
      participantId,
      status: COMPLIANCE_STATUSES.APPROVED,
      storageKey: "doc_fake_legacy_key",
      persisted: false,
      expiresAt: new Date("2030-01-01"),
    });

    const { Participant } = require("../src/modules/enrollments/participant.model");
    const { CourseClass: CC } = require("../src/modules/courses/courseClass.model");
    const { CourseTemplate } = require("../src/modules/courses/courseTemplate.model");
    const eligibility = require("../src/modules/enrollments/eligibility.service");
    const participant = await Participant.findById(participantId);
    const courseClass = await CC.findById(classId);
    const template = await CourseTemplate.findById(courseClass.courseTemplateId);
    template.requiresMedicalApproval = true;
    await template.save();
    const result = await eligibility.checkEligibility(participant, courseClass, template);
    expect(result.eligible).toBe(false);
    expect(result.reasons).toContain("MEDICAL_APPROVAL_REQUIRED");
  });

  test("refund without prior cancel decrements confirmedCount once", async () => {
    const { classId, participantId } = await bootstrap();
    const checkoutData = await reserveAndCheckout(classId, participantId, userToken, "p9-refund-only-1");
    await request(app)
      .post("/api/enrollments/payments/callback")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ paymentId: checkoutData.payment.id, success: true });

    const refund = await checkout.requestRefund({
      paymentId: checkoutData.payment.id,
      adminUserId: (await User.findOne({ phone: "09126660001" }))._id,
    });
    expect(refund.payment.status).toBe(PAYMENT_STATUSES.REFUNDED);

    const courseClass = await CourseClass.findById(classId);
    expect(courseClass.confirmedCount).toBe(0);
  });
});
