const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const { fetchWithTimeout } = require("../src/services/sms/http");
const { toNiksmsNumber } = require("../src/services/sms/phoneFormat");
const { normalizeNiksmsSender, parsePublicApiPayload } = require("../src/services/sms/providers/niksmsProvider");

const username = process.env.NIKSMS_USERNAME;
const password = process.env.NIKSMS_PASSWORD;
const sender = normalizeNiksmsSender(process.env.NIKSMS_SENDER || "5000403011", { forRest: true });
const phone = process.argv[2] || "09035125219";
const urls = [
  process.env.NIKSMS_REST_URL || "https://niksms.com/fa/publicapi/GroupSMS",
  "http://niksms.com/fa/publicapi/GroupSMS",
  "https://niksms.com/fa/publicapi/groupsms",
];

(async () => {
  let number98;
  try {
    number98 = toNiksmsNumber(phone);
  } catch (e) {
    console.log(JSON.stringify({ phoneInvalid: true, phoneLen: phone.length, message: e.message }));
    process.exit(1);
  }

  const payload = {
    Username: username,
    Password: password,
    senderNumber: sender,
    numbers: number98,
    message: "کد تایید شما: 12345 اعتبار: 2 دقیقه",
  };

  console.log(
    JSON.stringify({
      phoneLen: phone.length,
      number98,
      sender,
      userTail: String(username || "").slice(-4),
    }),
  );

  for (const url of urls) {
    try {
      const res = await fetchWithTimeout(
        url,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(payload),
        },
        25000,
      );
      const text = await res.text();
      const parsed = parsePublicApiPayload(text);
      console.log(
        JSON.stringify({
          url,
          http: res.status,
          ok: res.ok,
          status: parsed.status,
          id: parsed.id,
          nikIds: parsed.nikIds,
          body: text.slice(0, 250),
        }),
      );
    } catch (e) {
      console.log(JSON.stringify({ url, error: e.message, code: e.code || null }));
    }
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
