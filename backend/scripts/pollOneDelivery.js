require("dotenv").config();
const { NiksmsProvider } = require("../src/services/sms/providers/niksmsProvider");

const nikId = process.argv[2];
if (!nikId) {
  console.error("Usage: node scripts/pollOneDelivery.js <nikId>");
  process.exit(1);
}

(async () => {
  const provider = new NiksmsProvider({
    username: process.env.NIKSMS_USERNAME,
    password: process.env.NIKSMS_PASSWORD,
    sender: process.env.NIKSMS_SENDER || "blacklist",
    endpoint: process.env.NIKSMS_ENDPOINT,
    restUrl: process.env.NIKSMS_REST_URL,
    timeoutMs: 20000,
    otpTtlSeconds: 120,
  });

  for (let i = 1; i <= 8; i += 1) {
    const statuses = await provider.getSmsDelivery([nikId]);
    console.log(JSON.stringify({ attempt: i, nikId, statuses }));
    if (statuses.some((s) => s && s !== "NotFound" && s !== "Pending" && s !== "Sending")) {
      break;
    }
    await new Promise((r) => setTimeout(r, 10000));
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
