const request = require("supertest");
const { createApp } = require("../src/app");
const { setupTestDatabase, clearDatabase, teardownTestDatabase } = require("./helpers/db");
const { User } = require("../src/modules/auth/user.model");
const { hashPassword } = require("../src/utils/password");
const { flattenSlots, DEFAULT_SWIMMING_RECORDS } = require("../src/modules/catalog/catalog.definition");

describe("Catalog API", () => {
  let app;
  let adminToken;

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

  async function loginAsAdmin() {
    await User.create({
      phone: "09120000088",
      firstName: "ادمین",
      lastName: "کاتالوگ",
      passwordHash: await hashPassword("Password1"),
      phoneVerified: true,
      role: "ADMIN",
    });
    const res = await request(app).post("/api/auth/login").send({
      phone: "09120000088",
      password: "Password1",
    });
    adminToken = res.body.data.accessToken;
  }

  test("GET /catalog/marketing returns categories and groups", async () => {
    const res = await request(app).get("/api/catalog/marketing");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.categories.men).toBeTruthy();
    expect(res.body.data.categories.women).toBeTruthy();
    expect(res.body.data.groups.length).toBeGreaterThan(0);
    expect(res.body.data.pricing.school.price).toBe(3_700_000);
  });

  test("GET /catalog/records stays empty until an admin restores defaults", async () => {
    const res = await request(app).get("/api/catalog/records");
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(0);
    expect(res.body.data.items).toEqual([]);
  });

  test("ADMIN sync catalogs slots into course_classes and resolves by catalogKey", async () => {
    await loginAsAdmin();
    const sync = await request(app)
      .post("/api/catalog/sync")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ openRegistration: true });
    expect(sync.status).toBe(200);
    expect(sync.body.data.slots).toBe(flattenSlots().length);
    expect(sync.body.data.created + sync.body.data.updated + sync.body.data.unchanged).toBe(
      sync.body.data.slots,
    );

    const status = await request(app)
      .get("/api/catalog/sync/status")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(status.status).toBe(200);
    expect(status.body.data.missingCount).toBe(0);

    const key = "men-sajjad-01:evening-1:s1";
    const byKey = await request(app).get(`/api/courses/classes/${encodeURIComponent(key)}`);
    expect(byKey.status).toBe(200);
    expect(byKey.body.data.catalogKey).toBe(key);
    expect(byKey.body.data.pool).toContain("سجاد");
    expect(byKey.body.data.status).toBe("REGISTRATION_OPEN");

    const marketing = await request(app).get("/api/catalog/marketing");
    const session = marketing.body.data.groups
      .find((g) => g.groupKey === "men-sajjad-01")
      ?.schedule?.[0]?.sessions?.[0];
    expect(session?.classId).toMatch(/^[a-f\d]{24}$/i);
    expect(session?.catalogKey).toBe(key);
  });

  test("ADMIN can reset swimming records", async () => {
    await loginAsAdmin();
    await request(app).get("/api/catalog/records");
    const reset = await request(app)
      .post("/api/catalog/records/reset")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(reset.status).toBe(200);
    expect(reset.body.data.total).toBe(DEFAULT_SWIMMING_RECORDS.length);
  });
});
