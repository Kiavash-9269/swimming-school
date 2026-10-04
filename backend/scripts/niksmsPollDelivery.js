const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const { NiksmsProvider } = require("../src/services/sms/providers/niksmsProvider");

const nikId = process.argv[2] || "639258942496539322";

(async () => {
  const p = new NiksmsProvider({
    username: process.env.NIKSMS_USERNAME,
    password: process.env.NIKSMS_PASSWORD,
    sender: process.env.NIKSMS_SENDER || "",
    endpoint: process.env.NIKSMS_ENDPOINT || "",
    restUrl: process.env.NIKSMS_REST_URL || "",
    timeoutMs: 25000,
    otpTtlSeconds: 120,
  });

  for (const wait of [0, 5000, 15000]) {
    if (wait) await new Promise((r) => setTimeout(r, wait));
    const statuses = await p.getSmsDelivery([nikId]);
    console.log(JSON.stringify({ waitMs: wait, nikId, statuses }));
  }
})().catch((e) => {
  console.error(JSON.stringify({ error: e.message, details: e.details || null }));
  process.exit(1);
});
