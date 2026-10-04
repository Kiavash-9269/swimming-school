const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const { fetchWithTimeout } = require("../src/services/sms/http");

const endpoint = String(process.env.NIKSMS_ENDPOINT || "")
  .replace(/\?wsdl$/i, "")
  .replace(/\/$/, "");
const username = process.env.NIKSMS_USERNAME || "";
const password = process.env.NIKSMS_PASSWORD || "";

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

function pick(xml, tag) {
  const m = String(xml).match(
    new RegExp(`<(?:[\\w-]+:)?${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[\\w-]+:)?${tag}>`, "i"),
  );
  return m ? m[1].trim() : "";
}

(async () => {
  const phone = process.argv[2] || "090352195219";
  const sender = process.argv[3] || process.env.NIKSMS_SENDER || "985000403011";
  const sendOn = new Date().toISOString();
  const clientId = String(Date.now());
  const msg = "کد تایید شما: 44556";

  const group = await soap(
    "GroupSms",
    `<GroupSms xmlns="http://tempuri.org/">
      <security><Username>${esc(username)}</Username><Password>${esc(password)}</Password></security>
      <model>
        <SenderNumber>${esc(sender)}</SenderNumber>
        <Numbers><string>${esc(phone)}</string></Numbers>
        <SendOn>${esc(sendOn)}</SendOn>
        <SendType>Normal</SendType>
        <YourMessageId><string>${esc(clientId)}</string></YourMessageId>
        <Message>${esc(msg)}</Message>
      </model>
    </GroupSms>`,
  );

  const result = pick(group.text, "GroupSmsResult");
  const status = pick(result, "Status");
  const id = pick(result, "Id");
  const nikBlock = pick(result, "NikIds");
  const longs = [...nikBlock.matchAll(/<(?:[\w-]+:)?long[^>]*>([\s\S]*?)<\/(?:[\w-]+:)?long>/gi)].map(
    (m) => m[1].trim(),
  );
  const warning = pick(result, "WarningMessage");

  console.log(
    JSON.stringify({
      sender,
      phoneTail: phone.slice(-4),
      status,
      id: id || null,
      nikIds: longs,
      warning: warning || null,
      resultXml: result.slice(0, 900),
    }),
  );

  const trackId = longs[0] || id;
  if (trackId) {
    const delivery = await soap(
      "GetSmsDelivery",
      `<GetSmsDelivery xmlns="http://tempuri.org/">
        <security><Username>${esc(username)}</Username><Password>${esc(password)}</Password></security>
        <nikIds><long>${esc(trackId)}</long></nikIds>
      </GetSmsDelivery>`,
    );
    console.log(
      JSON.stringify({
        deliveryFor: trackId,
        deliveryBody: delivery.text.replace(/\s+/g, " ").slice(0, 700),
      }),
    );
  }

  const byClient = await soap(
    "GetSmsDeliveryWithClientId",
    `<GetSmsDeliveryWithClientId xmlns="http://tempuri.org/">
      <security><Username>${esc(username)}</Username><Password>${esc(password)}</Password></security>
      <yourId><long>${esc(clientId)}</long></yourId>
    </GetSmsDeliveryWithClientId>`,
  );
  console.log(
    JSON.stringify({
      clientId,
      byClientBody: byClient.text.replace(/\s+/g, " ").slice(0, 900),
    }),
  );
})().catch((e) => {
  console.error(JSON.stringify({ error: e.message }));
  process.exit(1);
});
