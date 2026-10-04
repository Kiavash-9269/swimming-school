/**
 * One-shot Niksms GroupSms diagnostic. Prints Status only (no secrets, no OTP).
 * Usage: node scripts/niksmsDiag.js [phone]
 */
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const { fetchWithTimeout } = require("../src/services/sms/http");

const endpoint = String(process.env.NIKSMS_ENDPOINT || "")
  .replace(/\?wsdl$/i, "")
  .replace(/\/$/, "");
const username = process.env.NIKSMS_USERNAME || "";
const password = process.env.NIKSMS_PASSWORD || "";
const sender = process.env.NIKSMS_SENDER || "";
const phone = process.argv[2] || "09300000000";

function esc(v) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function tag(xml, name) {
  const m = String(xml).match(
    new RegExp(`<(?:[\\w-]+:)?${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[\\w-]+:)?${name}>`, "i"),
  );
  return m ? m[1].trim() : "";
}

async function sendVariant(label, modelXml) {
  const body = `<GroupSms xmlns="http://tempuri.org/">
  <security><Username>${esc(username)}</Username><Password>${esc(password)}</Password></security>
  <model>${modelXml}</model>
</GroupSms>`;
  const envelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>${body}</soap:Body>
</soap:Envelope>`;

  const res = await fetchWithTimeout(
    endpoint,
    {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        SOAPAction: '"http://tempuri.org/INiksmsWebservice/GroupSms"',
      },
      body: envelope,
    },
    25000,
  );
  const text = await res.text();
  const result = tag(text, "GroupSmsResult");
  const status = tag(result || text, "Status");
  const warning = tag(result || text, "WarningMessage");
  const id = tag(result || text, "Id");
  const fault = tag(text, "faultstring");
  console.log(
    JSON.stringify({
      label,
      http: res.status,
      status: status || null,
      warning: warning || null,
      id: id || null,
      fault: fault || null,
      hasGroupSmsResult: Boolean(result),
    }),
  );
}

(async () => {
  if (!username || !password || !endpoint) {
    console.error("missing_env");
    process.exit(1);
  }
  console.log(
    JSON.stringify({
      endpointHost: endpoint.replace(/^https?:\/\//, "").split("/")[0],
      senderConfigured: Boolean(sender),
      senderLength: sender.length,
      phoneTail: phone.slice(-4),
    }),
  );

  const sendOn = new Date().toISOString();
  const msg = "تست ارسال نیک اس ام اس";

  // A: current app shape (ArrayOfString YourMessageId + string Numbers)
  await sendVariant(
    "A_string_ids_iso_sendOn",
    `
    ${sender ? `<SenderNumber>${esc(sender)}</SenderNumber>` : "<SenderNumber />"}
    <Numbers><string>${esc(phone)}</string></Numbers>
    <SendOn>${esc(sendOn)}</SendOn>
    <SendType>Normal</SendType>
    <YourMessageId><string>1</string></YourMessageId>
    <Message>${esc(msg)}</Message>
  `,
  );

  // B: docs-style long YourMessageId
  await sendVariant(
    "B_long_ids",
    `
    ${sender ? `<SenderNumber>${esc(sender)}</SenderNumber>` : "<SenderNumber />"}
    <Numbers><string>${esc(phone)}</string></Numbers>
    <SendOn>${esc(sendOn)}</SendOn>
    <SendType>Normal</SendType>
    <YourMessageId><long>1</long></YourMessageId>
    <Message>${esc(msg)}</Message>
  `,
  );

  // C: empty sender (panel default)
  await sendVariant(
    "C_empty_sender",
    `
    <SenderNumber />
    <Numbers><string>${esc(phone)}</string></Numbers>
    <SendOn>${esc(sendOn)}</SendOn>
    <SendType>Normal</SendType>
    <YourMessageId><string>1</string></YourMessageId>
    <Message>${esc(msg)}</Message>
  `,
  );

  // D: phone as 98...
  const phone98 = phone.startsWith("0") ? `98${phone.slice(1)}` : phone;
  await sendVariant(
    "D_phone98",
    `
    ${sender ? `<SenderNumber>${esc(sender)}</SenderNumber>` : "<SenderNumber />"}
    <Numbers><string>${esc(phone98)}</string></Numbers>
    <SendOn>${esc(sendOn)}</SendOn>
    <SendType>Normal</SendType>
    <YourMessageId><string>1</string></YourMessageId>
    <Message>${esc(msg)}</Message>
  `,
  );

  // E: sender with 98 prefix if missing
  const sender98 = sender && !sender.startsWith("98") ? `98${sender}` : sender;
  await sendVariant(
    "E_sender98",
    `
    ${sender98 ? `<SenderNumber>${esc(sender98)}</SenderNumber>` : "<SenderNumber />"}
    <Numbers><string>${esc(phone)}</string></Numbers>
    <SendOn>${esc(sendOn)}</SendOn>
    <SendType>Normal</SendType>
    <YourMessageId><string>1</string></YourMessageId>
    <Message>${esc(msg)}</Message>
  `,
  );
})().catch((e) => {
  console.error(JSON.stringify({ error: e.message, code: e.code || null }));
  process.exit(1);
});
