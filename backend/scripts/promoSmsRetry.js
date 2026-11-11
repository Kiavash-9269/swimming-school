/**
 * Resend promo SMS with a dedicated sender (not blacklist) and verify delivery/credit.
 * Usage: node scripts/promoSmsRetry.js 09301905219 [sender]
 */
require("dotenv").config();
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const { NiksmsProvider, normalizeNiksmsSender } = require("../src/services/sms/providers/niksmsProvider");

const phone = process.argv[2] || "09301905219";
const senderArg = process.argv[3] || "985000403011";

async function credit(provider) {
  const esc = (v) =>
    String(v ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  const inner = `<GetCredit xmlns="http://tempuri.org/"><security><Username>${esc(provider.username)}</Username><Password>${esc(provider.password)}</Password></security></GetCredit>`;
  const envelope = `<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body>${inner}</soap:Body></soap:Envelope>`;
  const res = await fetch(provider.soapEndpoint, {
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
    sender: senderArg,
    endpoint: process.env.NIKSMS_ENDPOINT,
    restUrl: process.env.NIKSMS_REST_URL,
    timeoutMs: 25000,
    otpTtlSeconds: 120,
  });

  const message =
    "مدرسه شنا ایران استرالیا: عضو باشگاه هستید؛ برای ثبت نام آنلاین با تخفیف ویژه به سایت مدرسه مراجعه کنید.";

  const before = await credit(provider);
  const result = await provider.sendText({
    phone,
    message,
    purpose: "REGISTRATION_DISCOUNT",
  });
  await new Promise((r) => setTimeout(r, 10000));
  const after = await credit(provider);
  let delivery = [];
  try {
    delivery = await provider.getSmsDelivery(result.nikIds?.length ? result.nikIds : [result.messageId]);
  } catch (e) {
    delivery = [String(e.message || e)];
  }

  console.log(
    JSON.stringify(
      {
        phone,
        sender: normalizeNiksmsSender(senderArg, { forRest: true }),
        messageId: result.messageId,
        nikIds: result.nikIds,
        providerStatus: result.providerStatus,
        transport: result.transport || "rest",
        before,
        after,
        creditChanged: before !== after,
        delivery,
      },
      null,
      2,
    ),
  );
})().catch((e) => {
  console.error(JSON.stringify({ err: e.message, details: e.details || null }, null, 2));
  process.exit(1);
});
