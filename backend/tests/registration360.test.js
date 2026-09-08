const request = require("supertest");
const { createApp } = require("../src/app");
const { setupTestDatabase, clearDatabase, teardownTestDatabase } = require("./helpers/db");
const { User } = require("../src/modules/auth/user.model");
const { hashPassword } = require("../src/utils/password");
const { Instructor } = require("../src/modules/courses/instructor.model");
const { ClassSession } = require("../src/modules/courses/classSession.model");
const { CourseClass } = require("../src/modules/courses/courseClass.model");
const { Enrollment } = require("../src/modules/enrollments/enrollment.model");
const { MedicalDocument } = require("../src/modules/compliance/medical.model");
const { InsuranceRecord } = require("../src/modules/compliance/insurance.model");
const { COMPLIANCE_STATUSES } = require("../src/modules/courses/domain.constants");
const complianceService = require("../src/modules/compliance/compliance.service");
const { registerDocumentMetadata } = require("../src/modules/compliance/documentStorage");

describe("Phase 4 registration / User 360", () => {
  let app;
  let adminToken;
  let userToken;
  let otherToken;
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

  async function bootstrapUsers() {
    await User.create({
      phone: "09126660001",
      firstName: "ادمین",
      lastName: "سیصدشصت",
      passwordHash: await hashPassword("Password1"),
      phoneVerified: true,
      role: "ADMIN",
    });
    adminToken = (
      await request(app).post("/api/auth/login").send({ phone: "09126660001", password: "Password1" })
    ).body.data.accessToken;

    const user = await User.create({
      phone: "09126660002",
      firstName: "ولی",
      lastName: "سیصدشصت",
      passwordHash: await hashPassword("Password1"),
      phoneVerified: true,
    });
    userId = String(user._id);
    userToken = (
      await request(app).post("/api/auth/login").send({ phone: "09126660002", password: "Password1" })
    ).body.data.accessToken;

    await User.create({
      phone: "09126660003",
      firstName: "دیگر",
      lastName: "سیصدشصت",
      passwordHash: await hashPassword("Password1"),
      phoneVerified: true,
    });
    otherToken = (
      await request(app).post("/api/auth/login").send({ phone: "09126660003", password: "Password1" })
    ).body.data.accessToken;
  }

  async function createOpenClass({ requiresInsurance = false, requiresMedicalApproval = false, capacity = 5 } = {}) {
    const template = await request(app)
      .post("/api/courses/templates")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "دوره ۳۶۰",
        level: "Beginner",
        ageMin: 5,
        ageMax: 18,
        genderRestriction: "ANY",
        requiresInsurance,
        requiresMedicalApproval,
      });
    const instructor = await request(app)
      .post("/api/courses/instructors")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "مربی ۳۶۰" });
    const courseClass = await request(app)
      .post("/api/courses/classes")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        courseTemplateId: template.body.data.id,
        title: "کلاس ۳۶۰",
        instructorId: instructor.body.data.id,
        startDate: "2026-10-03T00:00:00.000Z",
        endDate: "2026-12-01T00:00:00.000Z",
        daysOfWeek: [6],
        startTime: "10:00",
        endTime: "11:00",
        totalSessions: 4,
        price: 1000000,
        capacity,
      });
    await request(app)
      .post(`/api/courses/classes/${courseClass.body.data.id}/publish`)
      .set("Authorization", `Bearer ${adminToken}`);
    await request(app)
      .post(`/api/courses/classes/${courseClass.body.data.id}/open-registration`)
      .set("Authorization", `Bearer ${adminToken}`);
    return {
      classId: courseClass.body.data.id,
      instructorId: instructor.body.data.id,
      templateId: template.body.data.id,
    };
  }

  test("participant CRUD, emergency contact, DOB validation, ownership", async () => {
    await bootstrapUsers();

    const created = await request(app)
      .post("/api/enrollments/participants")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        firstName: "مینا",
        lastName: "شناگر",
        birthDate: "2015-05-01",
        gender: "FEMALE",
        relation: "CHILD",
        phone: "09121234567",
        emergencyContact: { name: "پدر", phone: "09129876543", relationship: "FATHER" },
      });
    expect(created.status).toBe(201);
    expect(created.body.data.emergencyContact.phone).toBe("09129876543");
    expect(created.body.data.age).toBeGreaterThan(0);

    const future = await request(app)
      .post("/api/enrollments/participants")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        firstName: "آینده",
        lastName: "نامعتبر",
        birthDate: "2099-01-01",
        gender: "FEMALE",
        relation: "CHILD",
      });
    expect(future.status).toBe(400);

    const badPhone = await request(app)
      .post("/api/enrollments/participants")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        firstName: "تلفن",
        lastName: "بد",
        birthDate: "2014-01-01",
        gender: "FEMALE",
        emergencyContact: { name: "x", phone: "123", relationship: "MOTHER" },
      });
    expect(badPhone.status).toBe(400);

    const idor = await request(app)
      .get(`/api/enrollments/participants/${created.body.data.id}`)
      .set("Authorization", `Bearer ${otherToken}`);
    expect(idor.status).toBe(403);

    const patched = await request(app)
      .patch(`/api/enrollments/participants/${created.body.data.id}`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({ firstName: "مینای" });
    expect(patched.status).toBe(200);
    expect(patched.body.data.firstName).toBe("مینای");
  });

  test("medical profile protected; documents review race; IDOR", async () => {
    await bootstrapUsers();
    const participant = await request(app)
      .post("/api/enrollments/participants")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        firstName: "پزشکی",
        lastName: "تست",
        birthDate: "2014-01-01",
        gender: "FEMALE",
        relation: "CHILD",
      });

    const profile = await request(app)
      .put(`/api/enrollments/participants/${participant.body.data.id}/medical-profile`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({ hasMedicalCondition: true, allergies: "pollen", notes: "private" });
    expect(profile.status).toBe(200);

    const otherProfile = await request(app)
      .get(`/api/enrollments/participants/${participant.body.data.id}/medical-profile`)
      .set("Authorization", `Bearer ${otherToken}`);
    expect(otherProfile.status).toBe(403);

    const PDF_BUF = Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n", "utf8");

    const medMeta = await request(app)
      .post(`/api/enrollments/participants/${participant.body.data.id}/medical`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        status: "PENDING",
        originalFilename: "clearance.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1024,
      });
    expect(medMeta.status).toBe(201);
    expect(medMeta.body.data.hasDocument).toBe(true);
    expect(medMeta.body.data).not.toHaveProperty("storageKey");
    expect(medMeta.body.data.storage.persisted).toBe(false);

    // Metadata-only docs cannot be approved (Phase 9).
    const approveMeta = await request(app)
      .post(`/api/enrollments/admin/documents/medical/${medMeta.body.data.id}/review`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ decision: "APPROVED" });
    expect(approveMeta.status).toBe(409);
    expect(approveMeta.body.error.code).toBe("DOCUMENT_NOT_PERSISTED");

    const med = await request(app)
      .post(`/api/enrollments/participants/${participant.body.data.id}/medical/upload`)
      .set("Authorization", `Bearer ${userToken}`)
      .attach("file", PDF_BUF, "clearance.pdf");
    expect(med.status).toBe(201);
    expect(med.body.data.persisted).toBe(true);
    expect(med.body.data).not.toHaveProperty("storageKey");

    const approveSelf = await request(app)
      .post(`/api/enrollments/admin/documents/medical/${med.body.data.id}/review`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({ decision: "APPROVED" });
    expect(approveSelf.status).toBe(403);

    const races = await Promise.all([
      complianceService.reviewDocument({
        kind: "medical",
        documentId: med.body.data.id,
        adminUserId: (await User.findOne({ phone: "09126660001" }))._id,
        decision: "APPROVED",
      }),
      complianceService.reviewDocument({
        kind: "medical",
        documentId: med.body.data.id,
        adminUserId: (await User.findOne({ phone: "09126660001" }))._id,
        decision: "REJECTED",
        rejectionReason: "incomplete",
      }),
    ]);
    const fresh = races.filter((r) => !r.alreadyProcessed);
    expect(fresh).toHaveLength(1);
    const doc = await MedicalDocument.findById(med.body.data.id);
    expect(["APPROVED", "REJECTED"]).toContain(doc.status);

    const idorDoc = await request(app)
      .get(`/api/enrollments/documents/medical/${med.body.data.id}`)
      .set("Authorization", `Bearer ${otherToken}`);
    expect(idorDoc.status).toBe(403);
  });

  test("insurance date validity and document metadata rejection", async () => {
    await bootstrapUsers();
    const { classId } = await createOpenClass({ requiresInsurance: true });
    const participant = await request(app)
      .post("/api/enrollments/participants")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        firstName: "بیمه",
        lastName: "تست",
        birthDate: "2013-01-01",
        gender: "FEMALE",
        relation: "CHILD",
      });

    await request(app)
      .post(`/api/enrollments/participants/${participant.body.data.id}/insurance`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        status: "APPROVED",
        providerName: "Asia",
        policyRef: "P1",
        startDate: "2020-01-01",
        expiresAt: "2021-01-01",
      });

    const elig = await request(app)
      .post("/api/enrollments/eligibility/check")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ classId, participantId: participant.body.data.id });
    expect(elig.status).toBe(200);
    expect(elig.body.data.eligible).toBe(false);
    expect(elig.body.data.reasons).toContain("INSURANCE_REQUIRED");

    await request(app)
      .post(`/api/enrollments/participants/${participant.body.data.id}/insurance`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        status: "APPROVED",
        providerName: "Asia",
        policyRef: "P2",
        startDate: "2025-01-01",
        expiresAt: "2030-01-01",
      });

    const elig2 = await request(app)
      .post("/api/enrollments/eligibility/check")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ classId, participantId: participant.body.data.id });
    expect(elig2.body.data.eligible).toBe(true);

    expect(() =>
      registerDocumentMetadata({
        originalFilename: "../evil.exe",
        mimeType: "application/pdf",
        sizeBytes: 10,
      }),
    ).toThrow();
    expect(() =>
      registerDocumentMetadata({
        originalFilename: "x.pdf",
        mimeType: "application/x-msdownload",
        sizeBytes: 10,
      }),
    ).toThrow();
  });

  test("admin User 360 + search pagination; non-admin denied", async () => {
    await bootstrapUsers();
    await request(app)
      .post("/api/enrollments/participants")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        firstName: "فرزند",
        lastName: "جستجو",
        birthDate: "2012-01-01",
        gender: "FEMALE",
        relation: "CHILD",
      });

    const denied = await request(app)
      .get(`/api/enrollments/users/${userId}/360`)
      .set("Authorization", `Bearer ${otherToken}`);
    expect(denied.status).toBe(403);

    const deniedSearch = await request(app)
      .get("/api/enrollments/admin/users/search?q=ولی")
      .set("Authorization", `Bearer ${userToken}`);
    expect(deniedSearch.status).toBe(403);

    const view = await request(app)
      .get(`/api/enrollments/users/${userId}/360`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(view.status).toBe(200);
    expect(view.body.data.account.phone).toBe("09126660002");
    expect(view.body.data.participants.length).toBe(1);
    expect(view.body.data).toHaveProperty("enrollments");
    expect(view.body.data).toHaveProperty("medical");
    expect(JSON.stringify(view.body.data)).not.toMatch(/passwordHash/);

    const search = await request(app)
      .get("/api/enrollments/admin/participants/search?q=فرزند&limit=5&page=1")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(search.status).toBe(200);
    expect(search.body.data.limit).toBe(5);
    expect(search.body.data.total).toBeGreaterThanOrEqual(1);

    const oversized = await request(app)
      .get("/api/enrollments/admin/users/search?limit=9999")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(oversized.status).toBe(400);
  });

  test("enrollment financial snapshot survives class price change", async () => {
    await bootstrapUsers();
    const { classId } = await createOpenClass();
    const participant = await request(app)
      .post("/api/enrollments/participants")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        firstName: "قیمت",
        lastName: "ثابت",
        birthDate: "2014-06-01",
        gender: "FEMALE",
        relation: "CHILD",
      });

    const reserve = await request(app)
      .post("/api/enrollments/reservations")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ classId, participantId: participant.body.data.id, idempotencyKey: "snap-res-01" });
    const confirm = await request(app)
      .post("/api/enrollments/confirm")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ reservationId: reserve.body.data.id, idempotencyKey: "snap-conf-01" });
    expect(confirm.status).toBe(201);
    expect(confirm.body.data.enrollment.finalAmount).toBe(1000000);
    expect(confirm.body.data.enrollment.basePrice).toBe(1000000);

    await CourseClass.updateOne({ _id: classId }, { $set: { price: 1200000 } });
    const enrollment = await Enrollment.findById(confirm.body.data.enrollment.id);
    expect(enrollment.priceCharged).toBe(1000000);
    expect(enrollment.finalAmount).toBe(1000000);
    expect(enrollment.eligibilitySnapshot.eligible).toBe(true);
  });

  test("attendance mark: admin ok, unrelated user denied", async () => {
    await bootstrapUsers();
    const { classId, instructorId } = await createOpenClass();
    const participant = await request(app)
      .post("/api/enrollments/participants")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        firstName: "حضور",
        lastName: "تست",
        birthDate: "2014-01-01",
        gender: "FEMALE",
        relation: "CHILD",
      });

    const reserve = await request(app)
      .post("/api/enrollments/reservations")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ classId, participantId: participant.body.data.id, idempotencyKey: "att-res-01" });
    const confirm = await request(app)
      .post("/api/enrollments/confirm")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ reservationId: reserve.body.data.id, idempotencyKey: "att-conf-01" });
    await request(app)
      .post("/api/enrollments/payments/callback")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ paymentId: confirm.body.data.payment.id, success: true });

    const session = await ClassSession.create({
      classId,
      sessionNumber: 1,
      date: new Date("2026-10-10"),
      startTime: "10:00",
      endTime: "11:00",
      status: "SCHEDULED",
    });

    const denied = await request(app)
      .post("/api/enrollments/attendance")
      .set("Authorization", `Bearer ${otherToken}`)
      .send({
        classId,
        sessionId: String(session._id),
        participantId: participant.body.data.id,
        status: "PRESENT",
      });
    expect(denied.status).toBe(403);

    const marked = await request(app)
      .post("/api/enrollments/attendance")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        classId,
        sessionId: String(session._id),
        participantId: participant.body.data.id,
        status: "LATE",
      });
    expect(marked.status).toBe(201);
    expect(marked.body.data.status).toBe("LATE");

    // Link instructor user and allow scoped access
    const instructorUser = await User.create({
      phone: "09126660004",
      firstName: "مربی",
      lastName: "دسترسی",
      passwordHash: await hashPassword("Password1"),
      phoneVerified: true,
    });
    await Instructor.updateOne({ _id: instructorId }, { $set: { userId: instructorUser._id } });
    const instructorToken = (
      await request(app).post("/api/auth/login").send({ phone: "09126660004", password: "Password1" })
    ).body.data.accessToken;

    const instructorMark = await request(app)
      .post("/api/enrollments/attendance")
      .set("Authorization", `Bearer ${instructorToken}`)
      .send({
        classId,
        sessionId: String(session._id),
        participantId: participant.body.data.id,
        status: "PRESENT",
      });
    expect(instructorMark.status).toBe(201);

    const medicalDenied = await request(app)
      .get(`/api/enrollments/participants/${participant.body.data.id}/medical-profile`)
      .set("Authorization", `Bearer ${instructorToken}`);
    expect(medicalDenied.status).toBe(403);
  });

  test("mass assignment on participant rejected", async () => {
    await bootstrapUsers();
    const res = await request(app)
      .post("/api/enrollments/participants")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        firstName: "مس",
        lastName: "اساین",
        birthDate: "2015-01-01",
        gender: "FEMALE",
        isActive: false,
        ownerUserId: "000000000000000000000099",
      });
    expect(res.status).toBe(400);
  });
});
