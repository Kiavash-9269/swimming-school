const request = require("supertest");
const { createApp } = require("../src/app");
const { setupTestDatabase, clearDatabase, teardownTestDatabase } = require("./helpers/db");
const { User } = require("../src/modules/auth/user.model");
const { hashPassword } = require("../src/utils/password");
const { Participant } = require("../src/modules/enrollments/participant.model");
const { GENDERS } = require("../src/modules/courses/domain.constants");
const { Notification } = require("../src/modules/notifications/notification.model");
const {
  NOTIFICATION_TYPES,
  NOTIFICATION_STATUSES,
} = require("../src/modules/notifications/notification.constants");

const PASSWORD = "Password1";

describe("Clinic, student records, admin SMS and card-to-card settings", () => {
  let app;
  let adminToken;
  let userToken;
  let otherToken;
  let userId;
  let otherUserId;
  let participantId;

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

  async function login(phone) {
    const res = await request(app).post("/api/auth/login").send({ phone, password: PASSWORD });
    expect(res.status).toBe(200);
    return res.body.data.accessToken;
  }

  async function bootstrap() {
    const hash = await hashPassword(PASSWORD);
    await User.create({
      phone: "09121110001",
      firstName: "مدیر",
      lastName: "مدرسه",
      passwordHash: hash,
      phoneVerified: true,
      role: "ADMIN",
    });
    const user = await User.create({
      phone: "09121110002",
      firstName: "سارا",
      lastName: "احمدی",
      passwordHash: hash,
      phoneVerified: true,
    });
    const other = await User.create({
      phone: "09121110003",
      firstName: "رضا",
      lastName: "کریمی",
      passwordHash: hash,
      phoneVerified: true,
    });

    adminToken = await login("09121110001");
    userToken = await login("09121110002");
    otherToken = await login("09121110003");
    userId = String(user._id);
    otherUserId = String(other._id);

    const participant = await Participant.create({
      ownerUserId: user._id,
      firstName: "سارا",
      lastName: "احمدی",
      birthDate: new Date("2014-04-12"),
      gender: GENDERS.FEMALE,
    });
    participantId = String(participant._id);
  }

  test("public settings are readable and clinic starts disabled", async () => {
    await bootstrap();
    const res = await request(app).get("/api/site/public");
    expect(res.status).toBe(200);
    expect(res.body.data.clinic.enabled).toBe(false);
    expect(res.body.data.cardToCard).toHaveProperty("cardNumber");
  });

  test("only admins can change clinic and card settings", async () => {
    await bootstrap();

    const userRes = await request(app)
      .put("/api/site/admin/clinic")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ enabled: true });
    expect(userRes.status).toBe(403);

    const adminRes = await request(app)
      .put("/api/site/admin/clinic")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        enabled: true,
        title: "کلینیک مهر",
        priceToman: 1200000,
        startDate: "۱۴۰۵/۰۹/۰۱",
        capacity: 10,
      });
    expect(adminRes.status).toBe(200);
    expect(adminRes.body.data.priceToman).toBe(1200000);

    const publicRes = await request(app).get("/api/site/public");
    expect(publicRes.body.data.clinic.enabled).toBe(true);
    expect(publicRes.body.data.clinic.title).toBe("کلینیک مهر");
  });

  test("payment QR is 404 until a card number is saved, then a real PNG", async () => {
    await bootstrap();

    const before = await request(app).get("/api/site/payment-qr.png");
    expect(before.status).toBe(404);

    await request(app)
      .put("/api/site/admin/card-to-card")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        enabled: true,
        cardNumber: "6037-0000-1111-2222",
        cardHolder: "مدرسه شنا",
        bankName: "ملی",
      });

    const after = await request(app).get("/api/site/payment-qr.png").buffer(true);
    expect(after.status).toBe(200);
    expect(after.headers["content-type"]).toMatch(/image\/png/);
    expect(after.body.length).toBeGreaterThan(500);
    expect(after.body.slice(1, 4).toString("latin1")).toBe("PNG");
  });

  test("clinic registration, tick, admin review and isolation", async () => {
    await bootstrap();

    const disabled = await request(app)
      .post("/api/clinic/register")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        firstName: "سارا",
        lastName: "احمدی",
        phone: "09121110002",
        birthDate: "2014-04-12",
      });
    expect(disabled.status).toBe(400);
    expect(disabled.body.error.code).toBe("CLINIC_DISABLED");

    await request(app)
      .put("/api/site/admin/clinic")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ enabled: true, priceToman: 1500000, capacity: 5, title: "کلینیک شنا" });

    const created = await request(app)
      .post("/api/clinic/register")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        firstName: "سارا",
        lastName: "احمدی",
        phone: "09121110002",
        birthDate: "2014-04-12",
      });
    expect(created.status).toBe(201);
    expect(created.body.data.paymentStatus).toBe("UNPAID");
    expect(created.body.data.priceToman).toBe(1500000);

    const duplicate = await request(app)
      .post("/api/clinic/register")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        firstName: "سارا",
        lastName: "احمدی",
        phone: "09121110002",
        birthDate: "2014-04-12",
      });
    expect(duplicate.status).toBe(409);

    const registrationId = created.body.data.id;

    const foreignTick = await request(app)
      .post(`/api/clinic/me/${registrationId}/paid`)
      .set("Authorization", `Bearer ${otherToken}`)
      .send({});
    expect(foreignTick.status).toBe(403);

    const tick = await request(app)
      .post(`/api/clinic/me/${registrationId}/paid`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({ trackingCode: "123456" });
    expect(tick.status).toBe(200);
    expect(tick.body.data.registration.paymentStatus).toBe("AWAITING_REVIEW");

    const mine = await request(app)
      .get("/api/clinic/me")
      .set("Authorization", `Bearer ${userToken}`);
    expect(mine.body.data.items).toHaveLength(1);

    const others = await request(app)
      .get("/api/clinic/me")
      .set("Authorization", `Bearer ${otherToken}`);
    expect(others.body.data.items).toHaveLength(0);

    const adminList = await request(app)
      .get("/api/clinic/admin")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(adminList.status).toBe(200);
    expect(adminList.body.data.items).toHaveLength(1);
    expect(adminList.body.data.counts.awaitingReview).toBe(1);

    const approve = await request(app)
      .patch(`/api/clinic/admin/${registrationId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ paymentStatus: "PAID" });
    expect(approve.status).toBe(200);
    expect(approve.body.data.status).toBe("CONFIRMED");
    expect(approve.body.data.paymentStatus).toBe("PAID");

    const forbidden = await request(app)
      .get("/api/clinic/admin")
      .set("Authorization", `Bearer ${userToken}`);
    expect(forbidden.status).toBe(403);
  });

  test("student records: admin enters, the right family sees them", async () => {
    await bootstrap();

    const forbidden = await request(app)
      .post("/api/records/admin")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ participantId, stroke: "FREESTYLE", distance: 25, timeSeconds: 18.4 });
    expect(forbidden.status).toBe(403);

    const created = await request(app)
      .post("/api/records/admin")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        participantId,
        stroke: "BUTTERFLY",
        distance: 50,
        timeSeconds: 41.25,
        location: "استخر سجاد",
        note: "مسابقه داخلی",
      });
    expect(created.status).toBe(201);
    expect(created.body.data.timeLabel).toBe("41.25");
    expect(created.body.data.age).toBeGreaterThan(5);

    const mine = await request(app)
      .get("/api/records/me")
      .set("Authorization", `Bearer ${userToken}`);
    expect(mine.status).toBe(200);
    expect(mine.body.data.items).toHaveLength(1);
    expect(mine.body.data.items[0].stroke).toBe("BUTTERFLY");
    expect(mine.body.data.items[0].firstName).toBe("سارا");

    const others = await request(app)
      .get("/api/records/me")
      .set("Authorization", `Bearer ${otherToken}`);
    expect(others.body.data.items).toHaveLength(0);

    const adminList = await request(app)
      .get("/api/records/admin?q=احمدی")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(adminList.status).toBe(200);
    expect(adminList.body.data.items).toHaveLength(1);

    const search = await request(app)
      .get("/api/records/admin/participants?q=سارا")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(search.status).toBe(200);
    expect(search.body.data.items[0].id).toBe(participantId);

    const deleted = await request(app)
      .delete(`/api/records/admin/${created.body.data.id}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(deleted.status).toBe(200);

    const afterDelete = await request(app)
      .get("/api/records/me")
      .set("Authorization", `Bearer ${userToken}`);
    expect(afterDelete.body.data.items).toHaveLength(0);
  });

  test("admin sends a single SMS and a clinic group SMS", async () => {
    await bootstrap();

    await request(app)
      .put("/api/site/admin/clinic")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ enabled: true, priceToman: 1000000 });

    await request(app)
      .post("/api/clinic/register")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        firstName: "سارا",
        lastName: "احمدی",
        phone: "09121110002",
        birthDate: "2014-04-12",
      });

    const forbidden = await request(app)
      .post("/api/notifications/admin-sms")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ audience: "clinic", message: "تست" });
    expect(forbidden.status).toBe(403);

    const single = await request(app)
      .post("/api/notifications/admin-sms")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ audience: "user", phone: "09121110002", message: "سلام، جلسه فردا برگزار می‌شود." });
    expect(single.status).toBe(201);
    expect(single.body.data.queued).toBe(1);

    const clinicSms = await request(app)
      .post("/api/notifications/admin-sms")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ audience: "clinic", message: "کلینیک هفته آینده شروع می‌شود." });
    expect(clinicSms.status).toBe(201);
    expect(clinicSms.body.data.queued).toBe(1);

    const queued = await Notification.find({ type: NOTIFICATION_TYPES.ADMIN_MESSAGE }).lean();
    expect(queued.length).toBe(2);
    expect(
      queued.every((doc) => [NOTIFICATION_STATUSES.SENT, NOTIFICATION_STATUSES.PENDING].includes(doc.status)),
    ).toBe(true);
    expect(queued.some((doc) => doc.status === NOTIFICATION_STATUSES.SENT)).toBe(true);
    expect(queued[0].destination).toMatch(/^09\d{9}$/);
  });

  test("card-to-card payment: member reports, member cannot approve", async () => {
    const { startCardToCardPayment } = require("../src/modules/billing/checkout.service");
    const { Enrollment } = require("../src/modules/enrollments/enrollment.model");
    const { ENROLLMENT_STATUSES } = require("../src/modules/courses/domain.constants");

    await bootstrap();

    const enrollment = await Enrollment.create({
      userId,
      participantId,
      classId: "66f000000000000000000001",
      status: ENROLLMENT_STATUSES.PAYMENT_PENDING,
      finalAmount: 900000,
      priceCharged: 900000,
    });

    const payment = await startCardToCardPayment({
      enrollmentId: enrollment._id,
      userId,
      trackingCode: "987654",
    });
    expect(payment.provider).toBe("card_to_card");
    expect(payment.status).toBe("PENDING");
    expect(payment.trackingCode).toBe("987654");

    const unauth = await request(app).post(`/api/payments/${payment.id}/confirm`).send({});
    expect(unauth.status).toBe(401);

    const notAdmin = await request(app)
      .post(`/api/payments/${payment.id}/confirm`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({});
    expect(notAdmin.status).toBe(403);

    const otherReport = await request(app)
      .post("/api/payments/card-to-card")
      .set("Authorization", `Bearer ${otherToken}`)
      .send({ enrollmentId: String(enrollment._id) });
    expect(otherReport.status).toBe(403);
  });
});
