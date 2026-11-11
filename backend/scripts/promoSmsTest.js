/**
 * Send registration-discount SMS test to a phone (default 09301905219).
 * Usage: node scripts/promoSmsTest.js [09xxxxxxxxx]
 */
require("dotenv").config();
const mongoose = require("mongoose");
const { env } = require("../src/config/env");
const { enqueueRegistrationDiscountSms, DEFAULT_TEST_PHONE } = require("../src/modules/notifications/promoSms.service");

async function main() {
  const testPhone = process.argv[2] || DEFAULT_TEST_PHONE;
  await mongoose.connect(env.MONGODB_URI);
  const actorId = new mongoose.Types.ObjectId();
  const result = await enqueueRegistrationDiscountSms({
    audience: "test",
    testPhone,
    sendNow: true,
    actorId,
  });
  console.log(JSON.stringify(result, null, 2));
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
