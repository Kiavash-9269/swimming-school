const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const { fetchWithTimeout } = require("../src/services/sms/http");

const username = process.env.NIKSMS_USERNAME;
const password = process.env.NIKSMS_PASSWORD;
const endpoint = "http://94.182.154.28:1370/NiksmsWebservice.svc";

function esc(v) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function soap(operation, inner) {
  const envelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>${inner}</soap:Body>
</soap:Envelope>`;
  const res = await fetchWithTimeout(
    endpoint,
    {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        SOAPAction: `"http://tempuri.org/INiksmsWebservice/${operation}"`,
      },
      body: envelope,
    },
    25000,
  );
  return res.text();
}

function pick(xml, tag) {
  const m = String(xml).match(
    new RegExp(`<(?:[\\w-]+:)?${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[\\w-]+:)?${tag}>`, "i"),
  );
  return m ? m[1].trim() : "";
}

async function group(phone, sender) {
  const sendOn = new Date().toISOString();
  const id = String(Date.now()).slice(-10);
  const text = await soap(
    "GroupSms",
    `<GroupSms xmlns="http://tempuri.org/">
      <security><Username>${esc(username)}</Username><Password>${esc(password)}</Password></security>
      <model>
        <SenderNumber>${esc(sender)}</SenderNumber>
        <Numbers><string>${esc(phone)}</string></Numbers>
        <SendOn>${esc(sendOn)}</SendOn>
        <SendType>Normal</SendType>
        <YourMessageId><long>${esc(id)}</long></YourMessageId>
        <Message>کد تایید تست فرمت</Message>
      </model>
    </GroupSms>`,
  );
  const result = pick(text, "GroupSmsResult");
  const status = pick(result, "Status");
  const nik = pick(pick(result, "NikIds"), "long");
  await new Promise((r) => setTimeout(r, 2500));
  let delivery = null;
  if (nik) {
    const d = await soap(
      "GetSmsDelivery",
      `<GetSmsDelivery xmlns="http://tempuri.org/">
        <security><Username>${esc(username)}</Username><Password>${esc(password)}</Password></security>
        <nikIds><long>${esc(nik)}</long></nikIds>
      </GetSmsDelivery>`,
    );
    delivery = pick(pick(d, "GetSmsDeliveryResult"), "SmsStatus");
  }
  console.log(JSON.stringify({ phone, sender, status, nik: nik || null, delivery }));
}

async function rest(phone98, senderBare) {
  const res = await fetch("https://niksms.com/fa/publicapi/GroupSMS", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      Username: username,
      Password: password,
      senderNumber: senderBare,
      numbers: phone98,
      message: "کد تایید تست REST ثابت",
    }),
  });
  const raw = await res.text();
  let parsed = raw;
  try {
    parsed = JSON.parse(raw);
    if (typeof parsed === "string") parsed = JSON.parse(parsed);
  } catch {
    // keep raw
  }
  console.log(JSON.stringify({ via: "rest", phone98, senderBare, http: res.status, parsed }));
}

(async () => {
  await group("9890352195219", "9830006179559594");
  await group("9890352195219", "985000403011");
  await group("090352195219", "9830006179559594");
  await rest("9890352195219", "30006179559594");
  await rest("9890352195219", "5000403011");
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
