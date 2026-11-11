/**
 * Live SMS diagnostics: credit delta + delivery for a few transports.
 */
require("dotenv").config();
const { NiksmsProvider } = require("../src/services/sms/providers/niksmsProvider");

const phone = process.argv[2] || "09301905219";
const username = process.env.NIKSMS_USERNAME;
const password = process.env.NIKSMS_PASSWORD;
const endpoint = String(process.env.NIKSMS_ENDPOINT || "http://94.182.154.28:1370/NiksmsWebservice.svc")
  .replace(/\?wsdl$/i, "")
  .replace(/\/$/, "");

function esc(v) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function soapCredit() {
  const inner = `<GetCredit xmlns="http://tempuri.org/"><security><Username>${esc(username)}</Username><Password>${esc(password)}</Password></security></GetCredit>`;
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
  return (text.match(/GetCreditResult>([^<]+)</) || [])[1] || "?";
}

async function wait(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

async function runOne(label, fn) {
  const before = await soapCredit();
  let result;
  try {
    result = await fn();
  } catch (e) {
    return {
      label,
      error: e.message,
      details: e.details || null,
      before,
      after: await soapCredit(),
    };
  }
  await wait(15000);
  const after = await soapCredit();
  let delivery = [];
  try {
    const provider = new NiksmsProvider({
      username,
      password,
      sender: "985000403011",
      endpoint,
      restUrl: process.env.NIKSMS_REST_URL,
      timeoutMs: 20000,
      otpTtlSeconds: 120,
    });
    delivery = await provider.getSmsDelivery(result.nikIds?.length ? result.nikIds : [result.messageId]);
  } catch (e) {
    delivery = [e.message];
  }
  return {
    label,
    before,
    after,
    creditChanged: before !== after,
    delta: Number(before) - Number(after),
    messageId: result.messageId,
    nikIds: result.nikIds,
    providerStatus: result.providerStatus,
    delivery,
  };
}

(async () => {
  const otpCode = String(Math.floor(10000 + Math.random() * 90000));
  const promo =
    "مدرسه شنا ایران استرالیا: عضو باشگاه هستید؛ برای ثبت نام آنلاین با تخفیف ویژه به سایت مدرسه مراجعه کنید.";

  const trials = [];

  // 1) Provider OTP via current path (REST first)
  trials.push(
    await runOne("provider_otp_blacklist", async () => {
      const p = new NiksmsProvider({
        username,
        password,
        sender: "blacklist",
        endpoint,
        restUrl: process.env.NIKSMS_REST_URL,
        timeoutMs: 20000,
        otpTtlSeconds: 120,
      });
      return p.send({ phone, code: otpCode, purpose: "REGISTER" });
    }),
  );

  await wait(2000);

  // 2) Provider text via dedicated 5000 sender
  trials.push(
    await runOne("provider_promo_5000", async () => {
      const p = new NiksmsProvider({
        username,
        password,
        sender: "985000403011",
        endpoint,
        restUrl: process.env.NIKSMS_REST_URL,
        timeoutMs: 20000,
        otpTtlSeconds: 120,
      });
      return p.sendText({ phone, message: promo, purpose: "REGISTRATION_DISCOUNT" });
    }),
  );

  await wait(2000);

  // 3) Official publicapi form groupSms
  trials.push(
    await runOne("publicapi_form_otp_5000", async () => {
      const body = new URLSearchParams({
        username,
        password,
        senderNumber: "5000403011",
        numbers: phone,
        message: `کد تایید شما: ${otpCode} اعتبار: 2 دقیقه`,
        sendType: "1",
      });
      const res = await fetch("https://niksms.com/fa/publicapi/groupSms", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      const text = await res.text();
      let parsed;
      try {
        parsed = JSON.parse(text);
        if (typeof parsed === "string") parsed = JSON.parse(parsed);
      } catch {
        parsed = { raw: text.slice(0, 200) };
      }
      const id = String(parsed?.NikId || parsed?.Id || parsed?.Data?.NikId || parsed?.Data?.Id || "");
      return {
        delivered: true,
        messageId: id || `publicapi_${Date.now()}`,
        nikIds: id ? [id] : [],
        providerStatus: String(parsed?.Status ?? res.status),
        raw: text.slice(0, 250),
      };
    }),
  );

  console.log(JSON.stringify({ phone, trials }, null, 2));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
