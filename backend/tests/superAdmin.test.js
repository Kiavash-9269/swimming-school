const request = require("supertest");
const { createApp } = require("../src/app");
const { setupTestDatabase, clearDatabase, teardownTestDatabase } = require("./helpers/db");
const { User } = require("../src/modules/auth/user.model");
const { hashPassword } = require("../src/utils/password");

const SUPER_PHONE = "09301905219";
const OTHER_ADMIN_PHONE = "09379579269";

describe("Super admin — admin management", () => {
  let app;

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

  async function seedAdmin(phone, firstName, lastName) {
    await User.create({
      phone,
      firstName,
      lastName,
      passwordHash: await hashPassword(phone),
      phoneVerified: true,
      role: "ADMIN",
    });
  }

  async function login(phone, password = phone) {
    const res = await request(app).post("/api/auth/login").send({ phone, password });
    expect(res.status).toBe(200);
    return { token: res.body.data.accessToken, user: res.body.data.user };
  }

  test("only the super admin sees isSuperAdmin and can list admins", async () => {
    await seedAdmin(SUPER_PHONE, "مدیر", "اصلی");
    await seedAdmin(OTHER_ADMIN_PHONE, "مدیر", "دوم");

    const sup = await login(SUPER_PHONE);
    expect(sup.user.isSuperAdmin).toBe(true);
    const other = await login(OTHER_ADMIN_PHONE);
    expect(other.user.isSuperAdmin).toBe(false);

    const ok = await request(app).get("/api/admin/admins").set("Authorization", `Bearer ${sup.token}`);
    expect(ok.status).toBe(200);
    expect(ok.body.data.items.map((a) => a.phone).sort()).toEqual([SUPER_PHONE, OTHER_ADMIN_PHONE].sort());

    const denied = await request(app)
      .get("/api/admin/admins")
      .set("Authorization", `Bearer ${other.token}`);
    expect(denied.status).toBe(403);
    expect(denied.body.error?.code || denied.body.code).toBe("SUPER_ADMIN_ONLY");

    const addDenied = await request(app)
      .post("/api/admin/admins")
      .set("Authorization", `Bearer ${other.token}`)
      .send({ phone: "09120000001", firstName: "نفوذ", lastName: "ناموفق" });
    expect(addDenied.status).toBe(403);
    expect(await User.countDocuments({ phone: "09120000001" })).toBe(0);

    const anon = await request(app).get("/api/admin/admins");
    expect(anon.status).toBe(401);
  });

  test("super admin adds a new admin whose password is the phone number", async () => {
    await seedAdmin(SUPER_PHONE, "مدیر", "اصلی");
    const sup = await login(SUPER_PHONE);

    const res = await request(app)
      .post("/api/admin/admins")
      .set("Authorization", `Bearer ${sup.token}`)
      .send({ phone: "09121234567", firstName: "علی", lastName: "رضایی" });
    expect(res.status).toBe(201);
    expect(res.body.data.created).toBe(true);

    const fresh = await login("09121234567");
    expect(fresh.user.role).toBe("ADMIN");
    expect(fresh.user.isSuperAdmin).toBe(false);
  });

  test("existing user is promoted and keeps their own password; names required only for new users", async () => {
    await seedAdmin(SUPER_PHONE, "مدیر", "اصلی");
    await User.create({
      phone: "09125550000",
      firstName: "کاربر",
      lastName: "عادی",
      passwordHash: await hashPassword("OwnPass123"),
      phoneVerified: true,
      role: "USER",
    });
    const sup = await login(SUPER_PHONE);

    const noName = await request(app)
      .post("/api/admin/admins")
      .set("Authorization", `Bearer ${sup.token}`)
      .send({ phone: "09126660000", firstName: "", lastName: "" });
    expect(noName.status).toBe(400);

    const promoted = await request(app)
      .post("/api/admin/admins")
      .set("Authorization", `Bearer ${sup.token}`)
      .send({ phone: "09125550000" });
    expect(promoted.status).toBe(200);
    expect(promoted.body.data.created).toBe(false);

    const user = await login("09125550000", "OwnPass123");
    expect(user.user.role).toBe("ADMIN");

    const again = await request(app)
      .post("/api/admin/admins")
      .set("Authorization", `Bearer ${sup.token}`)
      .send({ phone: "09125550000" });
    expect(again.status).toBe(409);
  });

  test("super admin can revoke other admins but never themselves", async () => {
    await seedAdmin(SUPER_PHONE, "مدیر", "اصلی");
    await seedAdmin(OTHER_ADMIN_PHONE, "مدیر", "دوم");
    const sup = await login(SUPER_PHONE);
    const other = await login(OTHER_ADMIN_PHONE);
    const list = await request(app).get("/api/admin/admins").set("Authorization", `Bearer ${sup.token}`);
    const byPhone = Object.fromEntries(list.body.data.items.map((a) => [a.phone, a.id]));

    const self = await request(app)
      .delete(`/api/admin/admins/${byPhone[SUPER_PHONE]}`)
      .set("Authorization", `Bearer ${sup.token}`);
    expect(self.status).toBe(409);

    const revoke = await request(app)
      .delete(`/api/admin/admins/${byPhone[OTHER_ADMIN_PHONE]}`)
      .set("Authorization", `Bearer ${sup.token}`);
    expect(revoke.status).toBe(200);

    const afterRevoke = await request(app)
      .get("/api/courses/instructors")
      .set("Authorization", `Bearer ${other.token}`);
    expect(afterRevoke.status).toBe(403);
    expect((await User.findOne({ phone: OTHER_ADMIN_PHONE })).role).toBe("USER");
  });
});
