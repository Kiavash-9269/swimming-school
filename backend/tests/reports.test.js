const request = require("supertest");
const ExcelJS = require("exceljs");
const { createApp } = require("../src/app");
const { setupTestDatabase, clearDatabase, teardownTestDatabase } = require("./helpers/db");
const { User } = require("../src/modules/auth/user.model");
const { hashPassword } = require("../src/utils/password");
const { Participant } = require("../src/modules/enrollments/participant.model");
const { Enrollment } = require("../src/modules/enrollments/enrollment.model");
const { Payment } = require("../src/modules/billing/payment.model");
const { CourseClass } = require("../src/modules/courses/courseClass.model");
const { AttendanceRecord } = require("../src/modules/enrollments/attendance.model");
const { WaitlistEntry } = require("../src/modules/enrollments/waitlist.model");
const { Discount } = require("../src/modules/billing/discount.model");
const { InsuranceRecord } = require("../src/modules/compliance/insurance.model");
const { MedicalDocument } = require("../src/modules/compliance/medical.model");
const { sanitizeCell } = require("../src/modules/reports/excel");
const { env } = require("../src/config/env");
const {
  ENROLLMENT_STATUSES,
  PAYMENT_STATUSES,
  CLASS_STATUSES,
  WAITLIST_STATUSES,
  COMPLIANCE_STATUSES,
} = require("../src/modules/courses/domain.constants");

describe("Phase 6 admin reports & exports", () => {
  let app;
  let adminToken;
  let userToken;
  let adminId;
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

  async function loginAs(phone, role = "USER") {
    await User.create({
      phone,
      firstName: `نام${phone.slice(-4)}`,
      lastName: `فامیل${phone.slice(-4)}`,
      passwordHash: await hashPassword("Password1"),
      phoneVerified: true,
      role,
    });
    const res = await request(app).post("/api/auth/login").send({ phone, password: "Password1" });
    return res.body.data.accessToken;
  }

  async function bootstrap() {
    adminToken = await loginAs("09121110001", "ADMIN");
    userToken = await loginAs("09121110002", "USER");
    const admin = await User.findOne({ phone: "09121110001" });
    const user = await User.findOne({ phone: "09121110002" });
    adminId = String(admin._id);
    userId = String(user._id);

    const template = await request(app)
      .post("/api/courses/templates")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "گزارش دوره",
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
      .send({ name: "مربی گزارش" });

    const courseClass = await request(app)
      .post("/api/courses/classes")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        courseTemplateId: template.body.data.id,
        title: "کلاس گزارش",
        instructorId: instructor.body.data.id,
        startDate: "2026-10-01T00:00:00.000Z",
        endDate: "2026-12-01T00:00:00.000Z",
        daysOfWeek: [6],
        startTime: "10:00",
        endTime: "11:00",
        totalSessions: 4,
        price: 1500000,
        capacity: 10,
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
        firstName: "علی",
        lastName: "تستی",
        birthDate: "2000-09-08",
        gender: "MALE",
        relation: "SELF",
        phone: "09123334455",
      });

    return {
      classId: courseClass.body.data.id,
      templateId: template.body.data.id,
      instructorId: instructor.body.data.id,
      participantId: participant.body.data.id,
      price: 1500000,
    };
  }

  test("authorization: unauthenticated 401, user 403, admin 200", async () => {
    await bootstrap();
    const unauth = await request(app).get("/api/admin/reports/dashboard");
    expect(unauth.status).toBe(401);

    const forbidden = await request(app)
      .get("/api/admin/reports/dashboard")
      .set("Authorization", `Bearer ${userToken}`);
    expect(forbidden.status).toBe(403);

    const ok = await request(app)
      .get("/api/admin/reports/dashboard")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(ok.status).toBe(200);
    expect(ok.body.success).toBe(true);
    expect(ok.body.data.users).toBeGreaterThanOrEqual(2);
    expect(ok.body.data.participants).toBeGreaterThanOrEqual(1);
    expect(ok.body.data.currency).toBe("IRR");
  });

  test("participant report age/gender filters + pagination + sort allowlist", async () => {
    const { participantId } = await bootstrap();
    await Participant.create({
      ownerUserId: userId,
      firstName: "نوجوان",
      lastName: "جوان",
      birthDate: new Date(Date.UTC(2015, 0, 1)),
      gender: "FEMALE",
      relation: "CHILD",
      isActive: true,
    });

    const ageFiltered = await request(app)
      .get("/api/admin/reports/participants")
      .query({ ageMin: 18, ageMax: 30, gender: "MALE" })
      .set("Authorization", `Bearer ${adminToken}`);
    expect(ageFiltered.status).toBe(200);
    expect(ageFiltered.body.data.items.some((i) => i.id === participantId)).toBe(true);
    expect(ageFiltered.body.data.items.every((i) => i.age >= 18 && i.age <= 30)).toBe(true);
    expect(ageFiltered.body.data.pagination).toMatchObject({
      page: 1,
      limit: 20,
    });

    const badSort = await request(app)
      .get("/api/admin/reports/participants")
      .query({ sortBy: "passwordHash" })
      .set("Authorization", `Bearer ${adminToken}`);
    expect(badSort.status).toBe(400);

    const inject = await request(app)
      .get("/api/admin/reports/participants")
      .query({ sortBy: { $ne: null } })
      .set("Authorization", `Bearer ${adminToken}`);
    expect(inject.status).toBe(400);

    const badAge = await request(app)
      .get("/api/admin/reports/participants")
      .query({ ageMin: -1 })
      .set("Authorization", `Bearer ${adminToken}`);
    expect(badAge.status).toBe(400);

    const reversed = await request(app)
      .get("/api/admin/reports/participants")
      .query({ fromDate: "2026-12-01", toDate: "2026-01-01" })
      .set("Authorization", `Bearer ${adminToken}`);
    expect(reversed.status).toBe(400);

    const badOid = await request(app)
      .get("/api/admin/reports/participants")
      .query({ ownerUserId: "not-an-id" })
      .set("Authorization", `Bearer ${adminToken}`);
    expect(badOid.status).toBe(400);

    const overLimit = await request(app)
      .get("/api/admin/reports/participants")
      .query({ limit: 9999 })
      .set("Authorization", `Bearer ${adminToken}`);
    expect(overLimit.status).toBe(400);
  });

  test("enrollment report respects financial snapshot after class price change", async () => {
    const { classId, participantId, price } = await bootstrap();

    const reservation = await request(app)
      .post("/api/enrollments/reservations")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ classId, participantId, idempotencyKey: "r-snap-1" });
    expect(reservation.status).toBe(201);

    const confirm = await request(app)
      .post("/api/enrollments/confirm")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        reservationId: reservation.body.data.id,
        idempotencyKey: `snap-${Date.now()}`,
      });
    expect([200, 201]).toContain(confirm.status);

    const enrollmentId = confirm.body.data.enrollment.id;
    expect(enrollmentId).toBeTruthy();
    expect(confirm.body.data.quote.finalPrice).toBe(price);

    await CourseClass.findByIdAndUpdate(classId, { price: price * 2 });

    const report = await request(app)
      .get("/api/admin/reports/enrollments")
      .query({ classId })
      .set("Authorization", `Bearer ${adminToken}`);
    expect(report.status).toBe(200);
    const row = report.body.data.items.find((i) => i.id === String(enrollmentId));
    expect(row).toBeTruthy();
    expect(row.basePrice).toBe(price);
    expect(row.finalAmount).toBe(price);
    expect(row.priceCharged).toBe(price);
    expect(row.currentClassPrice).toBe(price * 2);
  });

  test("payment report summary + no secret leakage", async () => {
    const { classId, participantId, price } = await bootstrap();
    const reservation = await request(app)
      .post("/api/enrollments/reservations")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ classId, participantId, idempotencyKey: "r-pay-sum" });
    const confirm = await request(app)
      .post("/api/enrollments/confirm")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        reservationId: reservation.body.data.id,
        idempotencyKey: `pay-${Date.now()}`,
      });
    expect([200, 201]).toContain(confirm.status);

    const enrollment = await Enrollment.findById(confirm.body.data.enrollment.id);
    await Payment.create({
      userId,
      participantId,
      enrollmentId: enrollment._id,
      classId,
      amount: price,
      currency: "IRR",
      status: PAYMENT_STATUSES.SUCCESS,
      provider: "mock",
      idempotencyKey: `report-pay-${Date.now()}`,
      verifiedAt: new Date(),
      metadata: { merchantSecret: "SHOULD_NOT_LEAK", callbackSecret: "nope" },
    });

    const report = await request(app)
      .get("/api/admin/reports/payments")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(report.status).toBe(200);
    expect(report.body.data.summary.totalSuccessfulAmount).toBeGreaterThanOrEqual(price);
    expect(report.body.data.summary.currency).toBe("IRR");
    const json = JSON.stringify(report.body);
    expect(json).not.toMatch(/SHOULD_NOT_LEAK/);
    expect(json).not.toMatch(/merchantSecret/);
    expect(json).not.toMatch(/passwordHash/);
  });

  test("class / waitlist / attendance / discount / compliance reports", async () => {
    const { classId, participantId } = await bootstrap();
    const cls = await CourseClass.findById(classId);
    cls.confirmedCount = cls.capacity;
    cls.heldCount = 0;
    await cls.save();

    await WaitlistEntry.create({
      classId,
      userId,
      participantId,
      position: 1,
      status: WAITLIST_STATUSES.WAITING,
    });

    await AttendanceRecord.create({
      classId,
      sessionId: new (require("mongoose").Types.ObjectId)(),
      participantId,
      enrollmentId: new (require("mongoose").Types.ObjectId)(),
      status: "PRESENT",
      markedAt: new Date(),
    });
    expect(await AttendanceRecord.countDocuments({ classId, status: "PRESENT" })).toBe(1);

    await Discount.create({
      code: "SAVE10",
      type: "PERCENTAGE",
      value: 10,
      startDate: new Date("2026-01-01"),
      endDate: new Date("2027-01-01"),
      isActive: true,
      usedCount: 2,
    });

    await InsuranceRecord.create({
      participantId,
      status: COMPLIANCE_STATUSES.PENDING,
      storageKey: "secret/path/should-not-appear",
    });
    await MedicalDocument.create({
      participantId,
      status: COMPLIANCE_STATUSES.APPROVED,
      storageKey: "secret/med/key",
    });

    const classes = await request(app)
      .get("/api/admin/reports/classes")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(classes.status).toBe(200);
    const c = classes.body.data.items.find((i) => i.id === classId);
    expect(c.isFull).toBe(true);
    expect(c.remainingCapacity).toBe(0);
    expect(c.waitlistCount).toBe(1);

    const waitlist = await request(app)
      .get("/api/admin/reports/waitlist")
      .query({ classId })
      .set("Authorization", `Bearer ${adminToken}`);
    expect(waitlist.status).toBe(200);
    expect(waitlist.body.data.items[0].position).toBe(1);

    const attendance = await request(app)
      .get("/api/admin/reports/attendance")
      .query({ classId })
      .set("Authorization", `Bearer ${adminToken}`);
    expect(attendance.status).toBe(200);
    expect(attendance.body.data.summary.PRESENT).toBeGreaterThanOrEqual(1);

    const discounts = await request(app)
      .get("/api/admin/reports/discounts")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(discounts.status).toBe(200);
    expect(discounts.body.data.items.some((d) => d.code === "SAVE10")).toBe(true);

    const compliance = await request(app)
      .get("/api/admin/reports/compliance")
      .query({ kind: "insurance" })
      .set("Authorization", `Bearer ${adminToken}`);
    expect(compliance.status).toBe(200);
    const body = JSON.stringify(compliance.body);
    expect(body).not.toMatch(/secret\/path/);
    expect(body).not.toMatch(/storageKey/);
  });

  test("excel export: content-type, persian text, formula injection, max rows", async () => {
    const { participantId } = await bootstrap();
    await Participant.findByIdAndUpdate(participantId, {
      firstName: "=CMD",
      lastName: "علی",
    });

    expect(sanitizeCell("=1+1")).toBe("'=1+1");
    expect(sanitizeCell("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(sanitizeCell("علی")).toBe("علی");

    const exportRes = await request(app)
      .get("/api/admin/reports/participants/export")
      .set("Authorization", `Bearer ${adminToken}`)
      .buffer(true)
      .parse((res, cb) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => cb(null, Buffer.concat(chunks)));
      });
    expect(exportRes.status).toBe(200);
    expect(exportRes.headers["content-type"]).toMatch(
      /application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet/,
    );
    expect(exportRes.headers["content-disposition"]).toMatch(/attachment; filename="/);
    expect(exportRes.headers["content-disposition"]).not.toMatch(/[\r\n]/);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(exportRes.body);
    const sheet = workbook.worksheets[0];
    let foundEscaped = false;
    let foundPersian = false;
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      row.eachCell((cell) => {
        const v = String(cell.value ?? "");
        if (v.startsWith("'=")) foundEscaped = true;
        if (v.includes("علی")) foundPersian = true;
      });
    });
    expect(foundEscaped).toBe(true);
    expect(foundPersian).toBe(true);

    const userDenied = await request(app)
      .get("/api/admin/reports/participants/export")
      .set("Authorization", `Bearer ${userToken}`);
    expect(userDenied.status).toBe(403);

    const prevMax = env.EXPORT_MAX_ROWS;
    env.EXPORT_MAX_ROWS = 1;
    try {
      await Participant.create({
        ownerUserId: userId,
        firstName: "دوم",
        lastName: "نفر",
        birthDate: new Date(Date.UTC(1999, 1, 1)),
        gender: "MALE",
        relation: "OTHER",
      });
      const tooBig = await request(app)
        .get("/api/admin/reports/participants/export")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(tooBig.status).toBe(413);
      expect(tooBig.body.error.code).toBe("EXPORT_TOO_LARGE");
    } finally {
      env.EXPORT_MAX_ROWS = prevMax;
    }
  });

  test("same-day date range inclusive", async () => {
    await bootstrap();
    const today = new Date().toISOString().slice(0, 10);
    const res = await request(app)
      .get("/api/admin/reports/participants")
      .query({ fromDate: today, toDate: today })
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.pagination.total).toBeGreaterThanOrEqual(1);
  });
});
