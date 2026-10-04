/**
 * Compare SOAP vs official form REST, then poll GetSmsDelivery.
 */
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const username = process.env.NIKSMS_USERNAME || "";
const password = process.env.NIKSMS_PASSWORD || "";
const soapEndpoint = String(process.env.NIKSMS_ENDPOINT || "http://94.182.154.28:1370/NiksmsWebservice.svc")
  .replace(/\?wsdl$/i, "")
  .replace(/\/$/, "");
const phone09 = process.argv[2] || "09035125219";
const phone98 = phone09.startsWith("0") ? `98${phone09.slice(1)}` : phone09;
const message = `کد تایید شما: 77881 اعتبار: 2 دقیقه`;

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
  const res = await fetch(soapEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      SOAPAction: `"http://tempuri.org/INiksmsWebservice/${operation}"`,
    },
    body: envelope,
  });
  return await res.text();
}

function tag(xml, name) {
  const m = String(xml || "").match(new RegExp(`<(?:[\\w-]+:)?${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[\\w-]+:)?${name}>`, "i"));
  return m ? m[1].trim() : "";
}

function tags(xml, name) {
  const re = new RegExp(`<(?:[\\w-]+:)?${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[\\w-]+:)?${name}>`, "gi");
  const out = [];
  let m;
  while ((m = re.exec(String(xml || "")))) out.push(m[1].trim());
  return out;
}

async function restForm({ senderBare, numbers }) {
  const body = new URLSearchParams({
    username,
    password,
    senderNumber: senderBare,
    numbers,
    message,
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
  } catch {
    parsed = { raw: text.slice(0, 200) };
  }
  return { http: res.status, parsed };
}

async function delivery(nikId) {
  const xml = await soap(
    "GetSmsDelivery",
    `<GetSmsDelivery xmlns="http://tempuri.org/"><security><Username>${esc(username)}</Username><Password>${esc(password)}</Password></security><nikIds><long>${esc(nikId)}</long></nikIds></GetSmsDelivery>`,
  );
  const block = tag(xml, "GetSmsDeliveryResult");
  return tags(block, "SmsStatus").concat(tags(block, "string")).filter(Boolean);
}

async function soapSend({ senderSoap, number }) {
  const clientMessageId = String(Date.now());
  const sendOn = new Date().toISOString();
  const inner = `
    <GroupSms xmlns="http://tempuri.org/">
      <security><Username>${esc(username)}</Username><Password>${esc(password)}</Password></security>
      <model>
        <SenderNumber>${esc(senderSoap)}</SenderNumber>
        <Numbers><string>${esc(number)}</string></Numbers>
        <SendOn>${esc(sendOn)}</SendOn>
        <SendType>Normal</SendType>
        <YourMessageId><long>${esc(clientMessageId)}</long></YourMessageId>
        <Message>${esc(message)}</Message>
      </model>
    </GroupSms>`;
  const xml = await soap("GroupSms", inner);
  const block = tag(xml, "GroupSmsResult");
  return {
    status: tag(block, "Status"),
    id: tag(block, "Id"),
    warning: tag(block, "WarningMessage"),
    nikIds: tags(tag(block, "NikIds"), "long"),
  };
}

(async () => {
  const trials = [
    { label: "rest_form_5000_09", run: () => restForm({ senderBare: "5000403011", numbers: phone09 }) },
    { label: "rest_form_3000_09", run: () => restForm({ senderBare: "30006179559594", numbers: phone09 }) },
    { label: "soap_985000_98", run: () => soapSend({ senderSoap: "985000403011", number: phone98 }) },
    { label: "soap_983000_98", run: () => soapSend({ senderSoap: "9830006179559594", number: phone98 }) },
  ];

  for (const trial of trials) {
    const out = await trial.run();
    const id =
      out?.parsed?.Id != null
        ? String(out.parsed.Id)
        : out?.id
          ? String(out.id)
          : out?.nikIds?.[0]
            ? String(out.nikIds[0])
            : "";
    await new Promise((r) => setTimeout(r, 5000));
    const del = id ? await delivery(id) : [];
    console.log(
      JSON.stringify({
        label: trial.label,
        status: out?.parsed?.Status ?? out?.status ?? null,
        id: id || null,
        warning: out?.parsed?.WarningMessage || out?.warning || null,
        delivery: del,
      }),
    );
  }
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
