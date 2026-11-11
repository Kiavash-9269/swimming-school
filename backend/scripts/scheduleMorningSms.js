/**
 * Schedule a promo SMS for next allowed morning hour (Tehran 09:30).
 * Niksms rejects sends during ForbiddenHours (typically late night).
 */
require("dotenv").config();
const { NiksmsProvider } = require("../src/services/sms/providers/niksmsProvider");
const { fetchWithTimeout } = require("../src/services/sms/http");

const phone = process.argv[2] || "09301905219";
const username = process.env.NIKSMS_USERNAME;
const password = process.env.NIKSMS_PASSWORD;

function nextTehranMorningIso() {
  // Asia/Tehran ≈ UTC+3:30 (no DST currently)
  const now = new Date();
  const tehranOffsetMin = 3 * 60 + 30;
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const tehran = new Date(utc + tehranOffsetMin * 60000);
  const target = new Date(tehran);
  target.setHours(9, 30, 0, 0);
  if (tehran >= target) target.setDate(target.getDate() + 1);
  // Convert Tehran wall time back to UTC Date for API
  const asUtc = new Date(target.getTime() - tehranOffsetMin * 60000);
  return {
    tehranLabel: target.toISOString().replace("T", " ").slice(0, 19) + " (Tehran wall)",
    sendDate: asUtc.toISOString().slice(0, 19),
  };
}

(async () => {
  const { tehranLabel, sendDate } = nextTehranMorningIso();
  const message =
    "مدرسه شنا ایران استرالیا: عضو باشگاه هستید؛ برای ثبت نام آنلاین با تخفیف ویژه به سایت مدرسه مراجعه کنید.";

  const body = new URLSearchParams({
    username,
    password,
    message,
    senderNumber: "blacklist",
    sendDate,
    recipient: phone,
    localId: String(Date.now()),
  });

  const res = await fetchWithTimeout(
    process.env.NIKSMS_REST_URL || "https://niksms.com/api/v2/send/one",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body,
    },
    25000,
  );
  const text = await res.text();
  console.log(
    JSON.stringify(
      {
        phone,
        scheduledFor: tehranLabel,
        sendDate,
        http: res.status,
        body: text.slice(0, 500),
      },
      null,
      2,
    ),
  );

  // Also try immediate send to confirm ForbiddenHours surfaces correctly after parser fix
  const provider = new NiksmsProvider({
    username,
    password,
    sender: "blacklist",
    endpoint: process.env.NIKSMS_ENDPOINT,
    restUrl: process.env.NIKSMS_REST_URL,
    timeoutMs: 20000,
    otpTtlSeconds: 120,
  });
  try {
    await provider.sendText({ phone, message: `تست فوری ${Date.now()}`, purpose: "TEST" });
    console.log(JSON.stringify({ immediate: "unexpected_success" }));
  } catch (e) {
    console.log(
      JSON.stringify({
        immediate: "rejected_as_expected",
        message: e.message,
        providerStatus: e.details?.providerStatus,
      }),
    );
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
