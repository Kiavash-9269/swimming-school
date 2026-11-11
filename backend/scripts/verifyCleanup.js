require("dotenv").config();
const mongoose = require("mongoose");
const { env } = require("../src/config/env");

(async () => {
  await mongoose.connect(env.MONGODB_URI);
  const phones = ["09155556666", "09121112233", "09035975219"];
  const leftUsers = await mongoose.connection
    .collection("users")
    .find({ phone: { $in: phones } })
    .project({ phone: 1, firstName: 1, lastName: 1 })
    .toArray();
  const leftParts = await mongoose.connection
    .collection("participants")
    .find({ $or: [{ firstName: /تست|نمونه|test/i }, { lastName: /تست|نمونه|test/i }] })
    .project({ firstName: 1, lastName: 1, phone: 1, externalId: 1 })
    .toArray();
  console.log(JSON.stringify({ leftUsers, leftParts }, null, 2));
  await mongoose.disconnect();
})().catch(async (e) => {
  console.error(e);
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
