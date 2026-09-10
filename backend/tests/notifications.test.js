const request = require("supertest");
const mongoose = require("mongoose");
const { createApp } = require("../src/app");
const { setupTestDatabase, clearDatabase, teardownTestDatabase } = require("./helpers/db");
const { User } = require("../src/modules/auth/user.model");
const { hashPassword } = require("../src/utils/password");
const { Notification } = require("../src/modules/notifications/notification.model");
const {
  enqueueNotification,
  claimNextNotification,
  processClaimedNotification,
  processNotificationBatch,
  recoverStaleProcessing,
} = require("../src/modules/notifications/notification.service");
const {
  NOTIFICATION_TYPES,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_STATUSES,
} = require("../src/modules/notifications/notification.constants");
const { onPaymentFinalized } = require("../src/modules/notifications/dispatcher");
const { tryAcquireJobLock, releaseJobLock } = require("../src/modules/ops/schedulerLock.model");
const { jobExpireReservations, jobExpirePayments } = require("../src/modules/ops/jobs");
const { Reservation } = require("../src/modules/enrollments/reservation.model");
const { CourseClass } = require("../src/modules/courses/courseClass.model");
const { Payment } = require("../src/modules/billing/payment.model");
const { Enrollment } = require("../src/modules/enrollments/enrollment.model");
const { RESERVATION_STATUSES } = require("../src/modules/courses/domain.constants");

describe("Phase 5 notifications & scheduling", () => {
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
      phone: "09125550001",
      firstName: "ادمین",
      lastName: "اعلان",
      passwordHash: await hashPassword("Password1"),
      phoneVerified: true,
      role: "ADMIN",
    });
    adminToken = (
      await request(app).post("/api/auth/login").send({ phone: "09125550001", password: "Password1" })
    ).body.data.accessToken;

    const user = await User.create({
      phone: "09125550002",
      firstName: "کاربر",
      lastName: "اعلان",
      passwordHash: await hashPassword("Password1"),
      phoneVerified: true,
    });
    userId = user._id;
    userToken = (
      await request(app).post("/api/auth/login").send({ phone: "09125550002", password: "Password1" })
    ).body.data.accessToken;
  }

  test("notification enqueue is idempotent", async () => {
    await bootstrap();
    const a = await enqueueNotification({
      userId,
      type: NOTIFICATION_TYPES.PAYMENT_SUCCESS,
      channel: NOTIFICATION_CHANNELS.SMS,
      idempotencyKey: "PAYMENT_SUCCESS:abc",
    });
    const b = await enqueueNotification({
      userId,
      type: NOTIFICATION_TYPES.PAYMENT_SUCCESS,
      channel: NOTIFICATION_CHANNELS.SMS,
      idempotencyKey: "PAYMENT_SUCCESS:abc",
    });
    expect(a.created).toBe(true);
    expect(b.created).toBe(false);
    expect(String(a.notification._id)).toBe(String(b.notification._id));
    expect(await Notification.countDocuments({})).toBe(1);
  });

  test("two workers claim same notification: only one wins", async () => {
    await bootstrap();
    await enqueueNotification({
      userId,
      type: NOTIFICATION_TYPES.ENROLLMENT_CONFIRMED,
      channel: NOTIFICATION_CHANNELS.SMS,
      idempotencyKey: "ENROLLMENT_CONFIRMED:claim-race",
    });

    const [c1, c2] = await Promise.all([claimNextNotification(), claimNextNotification()]);
    const claimed = [c1, c2].filter(Boolean);
    expect(claimed).toHaveLength(1);

    await processClaimedNotification(claimed[0]);
    const doc = await Notification.findById(claimed[0]._id);
    expect(doc.status).toBe(NOTIFICATION_STATUSES.SENT);
  });

  test("stale PROCESSING recovers to PENDING", async () => {
    await bootstrap();
    const { notification } = await enqueueNotification({
      userId,
      type: NOTIFICATION_TYPES.PAYMENT_FAILED,
      channel: NOTIFICATION_CHANNELS.SMS,
      idempotencyKey: "PAYMENT_FAILED:stale-1",
    });
    await Notification.updateOne(
      { _id: notification._id },
      {
        $set: {
          status: NOTIFICATION_STATUSES.PROCESSING,
          leaseUntil: new Date(Date.now() - 1000),
          processingStartedAt: new Date(Date.now() - 10_000),
        },
      },
    );
    const recovered = await recoverStaleProcessing();
    expect(recovered).toBe(1);
    const doc = await Notification.findById(notification._id);
    expect(doc.status).toBe(NOTIFICATION_STATUSES.PENDING);
  });

  test("repeated payment success event enqueues one notification", async () => {
    await bootstrap();
    const paymentId = new mongoose.Types.ObjectId();
    const enrollmentId = new mongoose.Types.ObjectId();
    const payment = {
      _id: paymentId,
      userId,
      status: "SUCCESS",
      enrollmentId,
      classId: null,
      participantId: null,
    };
    const enrollment = {
      _id: enrollmentId,
      userId,
      status: "ACTIVE",
      classId: null,
      participantId: null,
    };
    await onPaymentFinalized(payment, enrollment);
    await onPaymentFinalized(payment, enrollment);
    expect(await Notification.countDocuments({ type: NOTIFICATION_TYPES.PAYMENT_SUCCESS })).toBe(1);
    expect(await Notification.countDocuments({ type: NOTIFICATION_TYPES.ENROLLMENT_CONFIRMED })).toBe(1);
  });

  test("two schedulers cannot both hold same job lock", async () => {
    const a = await tryAcquireJobLock("test-job", 30_000, "worker-a");
    const b = await tryAcquireJobLock("test-job", 30_000, "worker-b");
    expect(a).toBeTruthy();
    expect(b).toBeNull();
    await releaseJobLock("test-job", "worker-a");
    const c = await tryAcquireJobLock("test-job", 30_000, "worker-b");
    expect(c).toBeTruthy();
  });

  test("reservation expiration is double-safe", async () => {
    await bootstrap();
    const klass = await CourseClass.create({
      courseTemplateId: new mongoose.Types.ObjectId(),
      title: "کلاس انقضا",
      instructorId: new mongoose.Types.ObjectId(),
      startDate: new Date("2026-10-01"),
      endDate: new Date("2026-12-01"),
      daysOfWeek: [6],
      startTime: "10:00",
      endTime: "11:00",
      timezone: "Asia/Tehran",
      totalSessions: 2,
      price: 1000,
      capacity: 5,
      confirmedCount: 0,
      heldCount: 1,
      status: "REGISTRATION_OPEN",
    });
    await Reservation.create({
      userId,
      participantId: new mongoose.Types.ObjectId(),
      classId: klass._id,
      status: RESERVATION_STATUSES.HELD,
      expiresAt: new Date(Date.now() - 1000),
    });

    await Promise.all([jobExpireReservations(), jobExpireReservations()]);
    const after = await CourseClass.findById(klass._id);
    expect(after.heldCount).toBe(0);
    const held = await Reservation.countDocuments({
      classId: klass._id,
      status: RESERVATION_STATUSES.HELD,
    });
    expect(held).toBe(0);
  });

  test("payment expiration CAS is single-transition", async () => {
    await bootstrap();
    const enrollment = await Enrollment.create({
      userId,
      participantId: new mongoose.Types.ObjectId(),
      classId: new mongoose.Types.ObjectId(),
      status: "PAYMENT_PENDING",
      priceCharged: 1000,
      finalAmount: 1000,
    });
    const payment = await Payment.create({
      userId,
      enrollmentId: enrollment._id,
      amount: 1000,
      status: "PENDING",
      provider: "mock",
      idempotencyKey: "pay_expire_test_1",
      expiresAt: new Date(Date.now() - 1000),
    });

    await Promise.all([jobExpirePayments(), jobExpirePayments()]);
    const fresh = await Payment.findById(payment._id);
    expect(fresh.status).toBe("EXPIRED");
    expect(await Notification.countDocuments({ type: NOTIFICATION_TYPES.PAYMENT_EXPIRED })).toBe(1);
  });

  test("session reminder idempotent keys", async () => {
    await bootstrap();
    const key = "SESSION_REMINDER:cccccccccccccccccccccccc:dddddddddddddddddddddddd:24h";
    await enqueueNotification({
      userId,
      type: NOTIFICATION_TYPES.SESSION_REMINDER,
      channel: NOTIFICATION_CHANNELS.SMS,
      idempotencyKey: key,
      templateVars: { whenLabel: "24h" },
    });
    await enqueueNotification({
      userId,
      type: NOTIFICATION_TYPES.SESSION_REMINDER,
      channel: NOTIFICATION_CHANNELS.SMS,
      idempotencyKey: key,
      templateVars: { whenLabel: "24h" },
    });
    expect(await Notification.countDocuments({ type: NOTIFICATION_TYPES.SESSION_REMINDER })).toBe(1);
  });

  test("admin notification APIs protected; process batch sends", async () => {
    await bootstrap();
    await enqueueNotification({
      userId,
      type: NOTIFICATION_TYPES.DOCUMENT_APPROVED,
      channel: NOTIFICATION_CHANNELS.SMS,
      idempotencyKey: "DOCUMENT_APPROVED:doc1:APPROVED",
    });

    const denied = await request(app)
      .get("/api/notifications")
      .set("Authorization", `Bearer ${userToken}`);
    expect(denied.status).toBe(403);

    const list = await request(app)
      .get("/api/notifications")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(list.status).toBe(200);
    expect(list.body.data.items.length).toBeGreaterThanOrEqual(1);

    const batch = await processNotificationBatch({ limit: 10 });
    expect(batch.processed).toBeGreaterThanOrEqual(1);
    expect(batch.sent).toBeGreaterThanOrEqual(1);

    const id = list.body.data.items[0].id;
    const retry = await request(app)
      .post(`/api/notifications/${id}/retry`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect([200, 409]).toContain(retry.status);
  });

  test("invalid notification id returns 400 not 500", async () => {
    await bootstrap();
    const badGet = await request(app)
      .get("/api/notifications/not-an-object-id")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(badGet.status).toBe(400);

    const badRetry = await request(app)
      .post("/api/notifications/not-an-object-id/retry")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(badRetry.status).toBe(400);

    const missing = await request(app)
      .get(`/api/notifications/${new mongoose.Types.ObjectId()}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(missing.status).toBe(404);
  });

  test("notification failure does not corrupt payment success state", async () => {
    await bootstrap();
    const enrollment = await Enrollment.create({
      userId,
      participantId: new mongoose.Types.ObjectId(),
      classId: new mongoose.Types.ObjectId(),
      status: "ACTIVE",
      priceCharged: 10,
      finalAmount: 10,
    });
    const payment = await Payment.create({
      userId,
      enrollmentId: enrollment._id,
      amount: 10,
      status: "SUCCESS",
      provider: "mock",
      idempotencyKey: "pay_ok_notify_fail",
      verifiedAt: new Date(),
    });

    await onPaymentFinalized(payment, enrollment);
    const p = await Payment.findById(payment._id);
    const e = await Enrollment.findById(enrollment._id);
    expect(p.status).toBe("SUCCESS");
    expect(e.status).toBe("ACTIVE");
  });

  test("attendance absent SMS template and idempotent enqueue", async () => {
    await bootstrap();
    const { renderTemplate } = require("../src/modules/notifications/templates");
    const { onAttendanceAbsent } = require("../src/modules/notifications/dispatcher");

    const rendered = renderTemplate(NOTIFICATION_TYPES.ATTENDANCE_ABSENT, "fa", {
      classTitle: "مقدماتی",
      dayLabel: "۱۴۰۴/۰۱/۰۱",
      timeLabel: "10:00 تا 11:00",
    });
    expect(rendered.body).toContain("غایب");
    expect(rendered.body).toContain("مقدماتی");
    expect(rendered.body).toContain("10:00 تا 11:00");
    expect(rendered.body).toContain("۱۴۰۴/۰۱/۰۱");

    const participantId = new mongoose.Types.ObjectId();
    const sessionId = new mongoose.Types.ObjectId();
    const enrollment = {
      _id: new mongoose.Types.ObjectId(),
      userId,
      participantId,
      classId: new mongoose.Types.ObjectId(),
    };
    const session = {
      _id: sessionId,
      date: new Date("2026-03-21T00:00:00.000Z"),
      startTime: "10:00",
      endTime: "11:00",
    };

    await onAttendanceAbsent({
      enrollment,
      courseClass: { title: "مقدماتی" },
      session,
      attendanceId: new mongoose.Types.ObjectId(),
    });
    await onAttendanceAbsent({
      enrollment,
      courseClass: { title: "مقدماتی" },
      session,
      attendanceId: new mongoose.Types.ObjectId(),
    });

    expect(
      await Notification.countDocuments({
        type: NOTIFICATION_TYPES.ATTENDANCE_ABSENT,
        userId,
      }),
    ).toBe(1);
  });
});
