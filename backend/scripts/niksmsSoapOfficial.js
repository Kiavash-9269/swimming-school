/**
 * Official soap GroupSms exactly as Niksms panel docs (no SendOn).
 * Compares phone/sender variants and credit delta.
 */
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const endpoint = String(process.env.NIKSMS_ENDPOINT || "http://94.182.154.28:1370/NiksmsWebservice.svc")
  .replace(/\?wsdl$/i, "")
  .replace(/\/$/, "");
const username = process.env.NIKSMS_USERNAME || "";
const password = process.env.NIKSMS_PASSWORD || "";
const phone09 = process.argv[2] || "09035125219";
const phone98 = `98${phone09.slice(1)}`;
const message = "صرفا جهت تست ارسال گروهی می باشد";

function esc(v) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function tag(xml, name) {
  const m = String(xml || "").match(
    new RegExp(`<(?:[\\w-]+:)?${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[\\w-]+:)?${name}>`, "i"),
  );
  return m ? m[1].trim() : "";
}

function tags(xml, name) {
  const re = new RegExp(`<(?:[\\w-]+:)?${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[\\w-]+:)?${name}>`, "gi");
  const out = [];
  let m;
  while ((m = re.exec(String(xml || "")))) out.push(m[1].trim());
  return out;
}

async function soap(operation, inner) {
  const envelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>${inner}</soap:Body>
</soap:Envelope>`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      SOAPAction: `"http://tempuri.org/INiksmsWebservice/${operation}"`,
    },
    body: envelope,
  });
  return { http: res.status, text: await res.text() };
}

async function credit() {
  const { text } = await soap(
    "GetCredit",
    `<GetCredit xmlns="http://tempuri.org/"><security><Username>${esc(username)}</Username><Password>${esc(password)}</Password></security></GetCredit>`,
  );
  return tag(text, "GetCreditResult");
}

async function groupSms({ sender, number, withSendOn }) {
  const clientId = String(Date.now());
  const sendOnXml = withSendOn
    ? `<SendOn>${esc(new Date().toISOString())}</SendOn>`
    : "";
  const inner = `
    <GroupSms xmlns="http://tempuri.org/">
      <security><Username>${esc(username)}</Username><Password>${esc(password)}</Password></security>
      <model>
        <SenderNumber>${esc(sender)}</SenderNumber>
        <Numbers><string>${esc(number)}</string></Numbers>
        ${sendOnXml}
        <SendType>Normal</SendType>
        <YourMessageId><long>${esc(clientId)}</long></YourMessageId>
        <Message>${esc(message)}</Message>
      </model>
    </GroupSms>`;
  const { http, text } = await soap("GroupSms", inner);
  const block = tag(text, "GroupSmsResult");
  return {
    http,
    status: tag(block, "Status"),
    id: tag(block, "Id"),
    warning: tag(block, "WarningMessage"),
    nikIds: tags(tag(block, "NikIds"), "long"),
    clientId,
  };
}

async function delivery(nikId) {
  const { text } = await soap(
    "GetSmsDelivery",
    `<GetSmsDelivery xmlns="http://tempuri.org/"><security><Username>${esc(username)}</Username><Password>${esc(password)}</Password></security><nikIds><long>${esc(nikId)}</long></nikIds></GetSmsDelivery>`,
  );
  const block = tag(text, "GetSmsDeliveryResult");
  return tags(block, "SmsStatus").concat(tags(block, "string")).filter(Boolean);
}

(async () => {
  const trials = [
    { label: "soap_noSendOn_985000_09", sender: "985000403011", number: phone09, withSendOn: false },
    { label: "soap_noSendOn_985000_98", sender: "985000403011", number: phone98, withSendOn: false },
    { label: "soap_noSendOn_983000_09", sender: "9830006179559594", number: phone09, withSendOn: false },
    { label: "soap_noSendOn_983000_98", sender: "9830006179559594", number: phone98, withSendOn: false },
  ];

  for (const trial of trials) {
    const before = await credit();
    const out = await groupSms(trial);
    await new Promise((r) => setTimeout(r, 4000));
    const after = await credit();
    const nik = out.nikIds[0] || out.id;
    const del = nik ? await delivery(nik) : [];
    console.log(
      JSON.stringify({
        label: trial.label,
        status: out.status,
        id: out.id || null,
        nikIds: out.nikIds,
        warning: out.warning || null,
        before,
        after,
        creditChanged: before !== after,
        delivery: del,
      }),
    );
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
