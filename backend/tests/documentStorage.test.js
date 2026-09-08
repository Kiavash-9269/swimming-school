const fs = require("fs");
const path = require("path");
const request = require("supertest");
const { createApp } = require("../src/app");
const { setupTestDatabase, clearDatabase, teardownTestDatabase } = require("./helpers/db");
const { User } = require("../src/modules/auth/user.model");
const { hashPassword } = require("../src/utils/password");
const { Instructor } = require("../src/modules/courses/instructor.model");
const { MedicalDocument } = require("../src/modules/compliance/medical.model");
const { getDocumentStorage, resetDocumentStorage } = require("../src/modules/compliance/storage/createDocumentStorage");
const {
  detectMimeFromBuffer,
  validateUploadedBuffer,
  sanitizeOriginalFilename,
  contentDispositionFilename,
} = require("../src/modules/compliance/documentStorage");
const { env } = require("../src/config/env");

const PDF_BUF = Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n", "utf8");
const PNG_BUF = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
  0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
  0x00, 0x00, 0x03, 0x00, 0x01, 0x00, 0x05, 0xfe, 0xd4, 0xef, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45,
  0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
]);
const JPEG_BUF = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
  0x00, 0x01, 0x00, 0x00, 0xff, 0xd9,
]);
const EXE_BUF = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]);

describe("Phase 7 secure document storage", () => {
  let app;
  let adminToken;
  let userToken;
  let otherToken;
  let instructorToken;
  let participantId;

  beforeAll(async () => {
    await setupTestDatabase();
    resetDocumentStorage();
    await getDocumentStorage().ensureRoot();
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
      lastName: "سند",
      passwordHash: await hashPassword("Password1"),
      phoneVerified: true,
      role: "ADMIN",
    });
    adminToken = (
      await request(app).post("/api/auth/login").send({ phone: "09127770001", password: "Password1" })
    ).body.data.accessToken;

    const user = await User.create({
      phone: "09127770002",
      firstName: "کاربر",
      lastName: "سند",
      passwordHash: await hashPassword("Password1"),
      phoneVerified: true,
    });
    userToken = (
      await request(app).post("/api/auth/login").send({ phone: "09127770002", password: "Password1" })
    ).body.data.accessToken;

    await User.create({
      phone: "09127770003",
      firstName: "دیگر",
      lastName: "سند",
      passwordHash: await hashPassword("Password1"),
      phoneVerified: true,
    });
    otherToken = (
      await request(app).post("/api/auth/login").send({ phone: "09127770003", password: "Password1" })
    ).body.data.accessToken;

    const instructorUser = await User.create({
      phone: "09127770004",
      firstName: "مربی",
      lastName: "سند",
      passwordHash: await hashPassword("Password1"),
      phoneVerified: true,
    });
    instructorToken = (
      await request(app).post("/api/auth/login").send({ phone: "09127770004", password: "Password1" })
    ).body.data.accessToken;
    await Instructor.create({ userId: instructorUser._id, name: "مربی سند" });

    const participant = await request(app)
      .post("/api/enrollments/participants")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        firstName: "فرزند",
        lastName: "سند",
        birthDate: "2014-05-01",
        gender: "FEMALE",
        relation: "CHILD",
      });
    participantId = participant.body.data.id;
    return { userId: String(user._id) };
  }

  test("magic byte helpers", () => {
    expect(detectMimeFromBuffer(PDF_BUF)).toBe("application/pdf");
    expect(detectMimeFromBuffer(PNG_BUF)).toBe("image/png");
    expect(detectMimeFromBuffer(JPEG_BUF)).toBe("image/jpeg");
    expect(detectMimeFromBuffer(EXE_BUF)).toBeNull();
    expect(() =>
      validateUploadedBuffer({
        buffer: Buffer.concat([Buffer.from("%PDF"), Buffer.alloc(100)]),
        originalFilename: "x.pdf",
        claimedMime: "image/png",
      }),
    ).toThrow();
    expect(sanitizeOriginalFilename("a\r\nb.pdf")).toBe("ab.pdf");
    expect(contentDispositionFilename("گزارش.pdf")).toMatch(/attachment;/);
    expect(contentDispositionFilename("a\r\nb.pdf")).not.toMatch(/[\r\n]/);
  });

  test("multipart upload + download + IDOR + instructor denied", async () => {
    await bootstrap();

    const unauth = await request(app)
      .post(`/api/enrollments/participants/${participantId}/medical/upload`)
      .attach("file", PDF_BUF, "clearance.pdf");
    expect(unauth.status).toBe(401);

    const idorUpload = await request(app)
      .post(`/api/enrollments/participants/${participantId}/medical/upload`)
      .set("Authorization", `Bearer ${otherToken}`)
      .attach("file", PDF_BUF, "clearance.pdf");
    expect(idorUpload.status).toBe(403);

    const upload = await request(app)
      .post(`/api/enrollments/participants/${participantId}/medical/upload`)
      .set("Authorization", `Bearer ${userToken}`)
      .field("documentType", "MEDICAL_CLEARANCE")
      .attach("file", PDF_BUF, "مجوز-پزشکی.pdf");
    expect(upload.status).toBe(201);
    expect(upload.body.data.persisted).toBe(true);
    expect(upload.body.data.storage.persisted).toBe(true);
    expect(upload.body.data).not.toHaveProperty("storageKey");
    expect(upload.body.data.hasDocument).toBe(true);
    expect(JSON.stringify(upload.body)).not.toMatch(/DOCUMENT_STORAGE_ROOT|\.data[/\\]documents/);

    const docId = upload.body.data.id;
    const dbDoc = await MedicalDocument.findById(docId);
    expect(dbDoc.persisted).toBe(true);
    expect(dbDoc.checksumSha256).toHaveLength(64);
    expect(dbDoc.storageKey).toMatch(/^medical\/[a-f0-9]{32}$/);
    expect(await getDocumentStorage().exists(dbDoc.storageKey)).toBe(true);

    const download = await request(app)
      .get(`/api/enrollments/documents/medical/${docId}/content`)
      .set("Authorization", `Bearer ${userToken}`)
      .buffer(true)
      .parse((res, cb) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => cb(null, Buffer.concat(chunks)));
      });
    expect(download.status).toBe(200);
    expect(download.headers["content-type"]).toMatch(/application\/pdf/);
    expect(download.headers["content-disposition"]).toMatch(/attachment;/);
    expect(download.headers["content-disposition"]).not.toMatch(/[\r\n]/);
    expect(download.headers["x-content-type-options"]).toBe("nosniff");
    expect(Buffer.compare(download.body, PDF_BUF)).toBe(0);

    const idorDl = await request(app)
      .get(`/api/enrollments/documents/medical/${docId}/content`)
      .set("Authorization", `Bearer ${otherToken}`);
    expect(idorDl.status).toBe(403);

    const instructorDl = await request(app)
      .get(`/api/enrollments/documents/medical/${docId}/content`)
      .set("Authorization", `Bearer ${instructorToken}`);
    expect(instructorDl.status).toBe(403);

    const adminDl = await request(app)
      .get(`/api/enrollments/documents/medical/${docId}/content`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(adminDl.status).toBe(200);

    // Re-upload creates NEW pending doc (does not overwrite)
    const upload2 = await request(app)
      .post(`/api/enrollments/participants/${participantId}/medical/upload`)
      .set("Authorization", `Bearer ${userToken}`)
      .attach("file", PNG_BUF, "scan.png");
    expect(upload2.status).toBe(201);
    expect(upload2.body.data.id).not.toBe(docId);
    expect(await MedicalDocument.countDocuments({ participantId })).toBe(2);
  });

  test("rejects bad types, mime mismatch, empty, oversized; path traversal keys", async () => {
    await bootstrap();

    const exe = await request(app)
      .post(`/api/enrollments/participants/${participantId}/insurance/upload`)
      .set("Authorization", `Bearer ${userToken}`)
      .attach("file", EXE_BUF, "virus.exe");
    expect([400, 413]).toContain(exe.status);

    const mismatch = await request(app)
      .post(`/api/enrollments/participants/${participantId}/insurance/upload`)
      .set("Authorization", `Bearer ${userToken}`)
      .attach("file", PDF_BUF, {
        filename: "fake.png",
        contentType: "image/png",
      });
    expect(mismatch.status).toBe(400);
    expect(mismatch.body.error.code).toMatch(/MIME_MISMATCH|INVALID_FILE_TYPE/);

    const empty = await request(app)
      .post(`/api/enrollments/participants/${participantId}/insurance/upload`)
      .set("Authorization", `Bearer ${userToken}`)
      .attach("file", Buffer.alloc(0), "empty.pdf");
    expect(empty.status).toBe(400);

    const storage = getDocumentStorage();
    expect(() => storage.assertSafeKey("../../etc/passwd")).toThrow();
    expect(() => storage.assertSafeKey("medical/../secret")).toThrow();
    expect(() => storage.assertSafeKey("/absolute/path")).toThrow();
  });

  test("missing storage file returns safe 404; metadata-only content unavailable", async () => {
    await bootstrap();
    const meta = await request(app)
      .post(`/api/enrollments/participants/${participantId}/medical`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        originalFilename: "clearance.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1024,
      });
    expect(meta.status).toBe(201);
    expect(meta.body.data.storage.persisted).toBe(false);

    const missingContent = await request(app)
      .get(`/api/enrollments/documents/medical/${meta.body.data.id}/content`)
      .set("Authorization", `Bearer ${userToken}`);
    expect(missingContent.status).toBe(404);
    expect(missingContent.body.error.code).toBe("DOCUMENT_FILE_MISSING");

    const upload = await request(app)
      .post(`/api/enrollments/participants/${participantId}/insurance/upload`)
      .set("Authorization", `Bearer ${userToken}`)
      .field("providerName", "Asia")
      .attach("file", JPEG_BUF, "card.jpg");
    expect(upload.status).toBe(201);

    const { InsuranceRecord } = require("../src/modules/compliance/insurance.model");
    const ins = await InsuranceRecord.findById(upload.body.data.id);
    await getDocumentStorage().delete(ins.storageKey);

    const gone = await request(app)
      .get(`/api/enrollments/documents/insurance/${ins._id}/content`)
      .set("Authorization", `Bearer ${userToken}`);
    expect(gone.status).toBe(404);
    expect(JSON.stringify(gone.body)).not.toMatch(env.DOCUMENT_STORAGE_ROOT.replace(/\\/g, "\\\\"));
  });

  test("review still works after real upload; notification failure does not roll back", async () => {
    await bootstrap();
    const upload = await request(app)
      .post(`/api/enrollments/participants/${participantId}/medical/upload`)
      .set("Authorization", `Bearer ${userToken}`)
      .attach("file", PDF_BUF, "ok.pdf");

    const review = await request(app)
      .post(`/api/enrollments/admin/documents/medical/${upload.body.data.id}/review`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ decision: "APPROVED" });
    expect(review.status).toBe(200);
    expect(review.body.data.record.status).toBe("APPROVED");
    expect(review.body.data.alreadyProcessed).toBe(false);

    const again = await request(app)
      .post(`/api/enrollments/admin/documents/medical/${upload.body.data.id}/review`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ decision: "REJECTED", rejectionReason: "late" });
    expect(again.status).toBe(200);
    expect(again.body.data.alreadyProcessed).toBe(true);
  });
});
