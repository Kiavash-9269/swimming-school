const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const { fetchWithTimeout } = require("../src/services/sms/http");

const endpoint = String(process.env.NIKSMS_ENDPOINT || "")
  .replace(/\?wsdl$/i, "")
  .replace(/\/$/, "");
const username = process.env.NIKSMS_USERNAME || "";
const password = process.env.NIKSMS_PASSWORD || "";
const phone = process.argv[2] || "090352195219";
const sender = process.argv[3] || "985000403011";

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
  return await res.text();
}

function pick(xml, tag) {
  const m = String(xml).match(
    new RegExp(`<(?:[\\w-]+:)?${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[\\w-]+:)?${tag}>`, "i"),
  );
  return m ? m[1].trim() : "";
}

async function trial(label, modelInner) {
  const text = await soap(
    "GroupSms",
    `<GroupSms xmlns="http://tempuri.org/">
      <security><Username>${esc(username)}</Username><Password>${esc(password)}</Password></security>
      <model>${modelInner}</model>
    </GroupSms>`,
  );
  const result = pick(text, "GroupSmsResult");
  const status = pick(result, "Status");
  const id = pick(result, "Id");
  const nik = pick(pick(result, "NikIds"), "long") || "";
  const track = nik || id;
  let delivery = null;
  if (track) {
    const d = await soap(
      "GetSmsDelivery",
      `<GetSmsDelivery xmlns="http://tempuri.org/">
        <security><Username>${esc(username)}</Username><Password>${esc(password)}</Password></security>
        <nikIds><long>${esc(track)}</long></nikIds>
      </GetSmsDelivery>`,
    );
    delivery = pick(pick(d, "GetSmsDeliveryResult"), "SmsStatus") || pick(d, "SmsStatus");
  }
  console.log(JSON.stringify({ label, status, id: id || null, nik: nik || null, delivery }));
}

(async () => {
  const sendOnIso = new Date().toISOString();
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  // Asia/Tehran approx +03:30 without depending on tzdata
  const tehran = new Date(now.getTime() + 3.5 * 3600 * 1000);
  const sendOnDoc = `${tehran.getUTCFullYear()}/${pad(tehran.getUTCMonth() + 1)}/${pad(tehran.getUTCDate())}-${pad(tehran.getUTCHours())}:${pad(tehran.getUTCMinutes())}`;
  const clientId = String(Date.now()).slice(-9);
  const msg = "کد تایید تست نیک";

  const base = `
    <SenderNumber>${esc(sender)}</SenderNumber>
    <Numbers><string>${esc(phone)}</string></Numbers>
    <SendType>Normal</SendType>
    <Message>${esc(msg)}</Message>`;

  await trial(
    "filters0_iso_stringId",
    `${base}
    <SendOn>${esc(sendOnIso)}</SendOn>
    <YourMessageId><string>${esc(clientId)}</string></YourMessageId>
    <FilterUserId>0</FilterUserId>
    <OldFilterUserId>0</OldFilterUserId>
    <CheckFilterResult>NoFilters</CheckFilterResult>`,
  );

  await trial(
    "filters0_docDate_longId",
    `${base}
    <SendOn>${esc(sendOnDoc)}</SendOn>
    <YourMessageId><long>${esc(clientId)}</long></YourMessageId>
    <FilterUserId>0</FilterUserId>
    <OldFilterUserId>0</OldFilterUserId>
    <CheckFilterResult>NoFilters</CheckFilterResult>`,
  );

  await trial(
    "filters0_longId_iso",
    `${base}
    <SendOn>${esc(sendOnIso)}</SendOn>
    <YourMessageId><long>${esc(clientId)}1</long></YourMessageId>
    <FilterUserId>0</FilterUserId>
    <OldFilterUserId>0</OldFilterUserId>
    <CheckFilterResult>NoFilters</CheckFilterResult>`,
  );

  const phone98 = phone.startsWith("0") ? `98${phone.slice(1)}` : phone;
  await trial(
    "phone98_filters0_long",
    `
    <SenderNumber>${esc(sender)}</SenderNumber>
    <Numbers><string>${esc(phone98)}</string></Numbers>
    <SendOn>${esc(sendOnIso)}</SendOn>
    <SendType>Normal</SendType>
    <YourMessageId><long>${esc(clientId)}2</long></YourMessageId>
    <Message>${esc(msg)}</Message>
    <FilterUserId>0</FilterUserId>
    <OldFilterUserId>0</OldFilterUserId>
    <CheckFilterResult>NoFilters</CheckFilterResult>`,
  );
})().catch((e) => {
  console.error(JSON.stringify({ error: e.message }));
  process.exit(1);
});
