require("dotenv").config();
const mongoose = require("mongoose");
const { env } = require("../src/config/env");

async function main() {
  await mongoose.connect(env.MONGODB_URI);
  const users = await mongoose.connection
    .collection("users")
    .find({})
    .project({ phone: 1, firstName: 1, lastName: 1, role: 1, isActive: 1, createdAt: 1 })
    .sort({ createdAt: 1 })
    .toArray();

  const admins = users.filter((u) => u.role === "ADMIN");
  const holding = users.filter((u) => u.phone === "09000000000");
  const namedTest = users.filter((u) => /تست|test|demo|آزمایش|sample/i.test(`${u.firstName} ${u.lastName}`));
  const early = users.slice(0, 30);

  const clubParts = await mongoose.connection.collection("participants").countDocuments({
    externalId: /^club:/,
  });
  const testParts = await mongoose.connection
    .collection("participants")
    .find({ $or: [{ firstName: /تست|test/i }, { lastName: /تست|test/i }, { notes: /تست/i }] })
    .project({ firstName: 1, lastName: 1, phone: 1, externalId: 1, notes: 1 })
    .limit(40)
    .toArray();

  console.log(
    JSON.stringify(
      {
        userCount: users.length,
        admins: admins.map((u) => ({
          phone: u.phone,
          name: `${u.firstName} ${u.lastName}`,
          id: String(u._id),
        })),
        holding,
        namedTest: namedTest.map((u) => ({
          phone: u.phone,
          name: `${u.firstName} ${u.lastName}`,
          role: u.role,
          id: String(u._id),
        })),
        earliestUsers: early.map((u) => ({
          phone: u.phone,
          name: `${u.firstName} ${u.lastName}`,
          role: u.role,
          createdAt: u.createdAt,
        })),
        clubParts,
        testParts,
      },
      null,
      2,
    ),
  );
  await mongoose.disconnect();
}

main().catch(async (e) => {
  console.error(e);
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
