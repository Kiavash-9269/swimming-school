const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const { fetchWithTimeout } = require("../src/services/sms/http");

const endpoint = String(process.env.NIKSMS_ENDPOINT || "")
  .replace(/\?wsdl$/i, "")
  .replace(/\/$/, "");
const username = process.env.NIKSMS_USERNAME || "";
const password = process.env.NIKSMS_PASSWORD || "";
const sender = process.env.NIKSMS_SENDER || "";
const nikId = process.argv[2] || "639258916186828681";
const phone = process.argv[3] || "";

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
  return { http: res.status, text: await res.text() };
}

function compact(xml) {
  return String(xml).replace(/\s+/g, " ").slice(0, 1500);
}

(async () => {
  const delivery = await soap(
    "GetSmsDelivery",
    `<GetSmsDelivery xmlns="http://tempuri.org/">
      <security><Username>${esc(username)}</Username><Password>${esc(password)}</Password></security>
      <nikIds><long>${esc(nikId)}</long></nikIds>
    </GetSmsDelivery>`,
  );
  console.log(JSON.stringify({ step: "delivery", http: delivery.http, body: compact(delivery.text) }));

  const senders = await soap(
    "GetSenderNumbers",
    `<GetSenderNumbers xmlns="http://tempuri.org/">
      <security><Username>${esc(username)}</Username><Password>${esc(password)}</Password></security>
    </GetSenderNumbers>`,
  );
  console.log(JSON.stringify({ step: "senders", http: senders.http, body: compact(senders.text) }));

  if (phone) {
    const sendOn = new Date().toISOString();
    const msg = "کد تایید تست";
    const group = await soap(
      "GroupSms",
      `<GroupSms xmlns="http://tempuri.org/">
        <security><Username>${esc(username)}</Username><Password>${esc(password)}</Password></security>
        <model>
          ${sender ? `<SenderNumber>${esc(sender)}</SenderNumber>` : "<SenderNumber />"}
          <Numbers><string>${esc(phone)}</string></Numbers>
          <SendOn>${esc(sendOn)}</SendOn>
          <SendType>Normal</SendType>
          <YourMessageId><string>88</string></YourMessageId>
          <Message>${esc(msg)}</Message>
        </model>
      </GroupSms>`,
    );
    console.log(JSON.stringify({ step: "group", http: group.http, body: compact(group.text) }));
  }
})().catch((e) => {
  console.error(JSON.stringify({ error: e.message }));
  process.exit(1);
});
