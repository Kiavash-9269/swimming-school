/**
 * Check delivery for a NikId and optionally resend one OTP via provider.
 */
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const { NiksmsProvider } = require("../src/services/sms/providers/niksmsProvider");

const phone = process.argv[2] || "09035125219";
const nikId = process.argv[3] || "";

async function credit(provider) {
  const endpoint = provider.soapEndpoint;
  const esc = (v) =>
    String(v ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  const inner = `<GetCredit xmlns="http://tempuri.org/"><security><Username>${esc(provider.username)}</Username><Password>${esc(provider.password)}</Password></security></GetCredit>`;
  const envelope = `<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body>${inner}</soap:Body></soap:Envelope>`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      SOAPAction: `"http://tempuri.org/INiksmsWebservice/GetCredit"`,
    },
    body: envelope,
  });
  const text = await res.text();
  const m = text.match(/GetCreditResult>([^<]+)</);
  return m ? m[1].trim() : "?";
}

(async () => {
  const provider = new NiksmsProvider({
    username: process.env.NIKSMS_USERNAME,
    password: process.env.NIKSMS_PASSWORD,
    sender: process.env.NIKSMS_SENDER || "985000403011",
    endpoint: process.env.NIKSMS_ENDPOINT,
    restUrl: process.env.NIKSMS_REST_URL,
    timeoutMs: 20000,
    otpTtlSeconds: 120,
  });

  if (nikId) {
    const statuses = await provider.getSmsDelivery([nikId]);
    console.log(JSON.stringify({ checkOnly: true, nikId, statuses }, null, 2));
    return;
  }

  const before = await credit(provider);
  const code = String(Math.floor(10000 + Math.random() * 90000));
  const result = await provider.send({ phone, code, purpose: "REGISTER" });
  await new Promise((r) => setTimeout(r, 8000));
  const after = await credit(provider);
  let delivery = [];
  try {
    delivery = await provider.getSmsDelivery([result.messageId]);
  } catch (e) {
    delivery = [e.message];
  }
  console.log(
    JSON.stringify(
      {
        phone,
        messageId: result.messageId,
        providerStatus: result.providerStatus,
        before,
        after,
        creditChanged: before !== after,
        delivery,
        note: "If creditChanged and phone still empty, Niksms panel/operator is dropping the SMS (blacklist/filter).",
      },
      null,
      2,
    ),
  );
})().catch((e) => {
  console.error(JSON.stringify({ err: e.message, details: e.details || null }));
  process.exit(1);
});
