/**
 * Find a SOAP send that leaves credit down AND delivery != NotFound.
 */
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const endpoint = String(process.env.NIKSMS_ENDPOINT || "http://94.182.154.28:1370/NiksmsWebservice.svc")
  .replace(/\?wsdl$/i, "")
  .replace(/\/$/, "");
const username = process.env.NIKSMS_USERNAME || "";
const password = process.env.NIKSMS_PASSWORD || "";
const phone = process.argv[2] || "09035125219";

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
async function soap(op, inner) {
  const envelope = `<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body>${inner}</soap:Body></soap:Envelope>`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      SOAPAction: `"http://tempuri.org/INiksmsWebservice/${op}"`,
    },
    body: envelope,
  });
  return await res.text();
}
async function credit() {
  const text = await soap(
    "GetCredit",
    `<GetCredit xmlns="http://tempuri.org/"><security><Username>${esc(username)}</Username><Password>${esc(password)}</Password></security></GetCredit>`,
  );
  return tag(text, "GetCreditResult");
}
async function delivery(id) {
  const text = await soap(
    "GetSmsDelivery",
    `<GetSmsDelivery xmlns="http://tempuri.org/"><security><Username>${esc(username)}</Username><Password>${esc(password)}</Password></security><nikIds><long>${esc(id)}</long></nikIds></GetSmsDelivery>`,
  );
  const block = tag(text, "GetSmsDeliveryResult");
  return tags(block, "SmsStatus").concat(tags(block, "string")).filter(Boolean);
}
async function deliveryByClient(clientId) {
  const text = await soap(
    "GetSmsDeliveryWithClientId",
    `<GetSmsDeliveryWithClientId xmlns="http://tempuri.org/"><security><Username>${esc(username)}</Username><Password>${esc(password)}</Password></security><yourId><long>${esc(clientId)}</long></yourId></GetSmsDeliveryWithClientId>`,
  );
  const block = tag(text, "GetSmsDeliveryWithClientIdResult") || tag(text, "GetSmsDeliveryWithClientIdModel") || text;
  return {
    status: tag(block, "SmsStatus"),
    nik: tag(block, "Niksmsid") || tag(block, "NikSmsId") || tag(block, "niksmsid"),
    raw: text.slice(0, 400),
  };
}

(async () => {
  const trials = [
    {
      label: "group_emptySender_09",
      op: "GroupSms",
      resultTag: "GroupSmsResult",
      inner: (cid, msg) => `
        <GroupSms xmlns="http://tempuri.org/">
          <security><Username>${esc(username)}</Username><Password>${esc(password)}</Password></security>
          <model>
            <SenderNumber />
            <Numbers><string>${esc(phone)}</string></Numbers>
            <SendType>Normal</SendType>
            <YourMessageId><long>${esc(cid)}</long></YourMessageId>
            <Message>${esc(msg)}</Message>
          </model>
        </GroupSms>`,
    },
    {
      label: "ptp_985000_09",
      op: "PtpSms",
      resultTag: "PtpSmsResult",
      inner: (cid, msg) => `
        <PtpSms xmlns="http://tempuri.org/">
          <security><Username>${esc(username)}</Username><Password>${esc(password)}</Password></security>
          <model>
            <SenderNumber>985000403011</SenderNumber>
            <Numbers><string>${esc(phone)}</string></Numbers>
            <SendType>Normal</SendType>
            <YourMessageId><long>${esc(cid)}</long></YourMessageId>
            <Message><string>${esc(msg)}</string></Message>
          </model>
        </PtpSms>`,
    },
    {
      label: "group_985000_simpleFa",
      op: "GroupSms",
      resultTag: "GroupSmsResult",
      inner: (cid, msg) => `
        <GroupSms xmlns="http://tempuri.org/">
          <security><Username>${esc(username)}</Username><Password>${esc(password)}</Password></security>
          <model>
            <SenderNumber>985000403011</SenderNumber>
            <Numbers><string>${esc(phone)}</string></Numbers>
            <SendType>Normal</SendType>
            <YourMessageId><long>${esc(cid)}</long></YourMessageId>
            <Message>${esc(msg)}</Message>
          </model>
        </GroupSms>`,
      message: "کد تایید: 12345",
    },
  ];

  for (const trial of trials) {
    const cid = String(Date.now());
    const msg = trial.message || `کد تایید شما: ${String(cid).slice(-5)} اعتبار: 2 دقیقه`;
    const before = await credit();
    const text = await soap(trial.op, trial.inner(cid, msg));
    const block = tag(text, trial.resultTag);
    const status = tag(block, "Status");
    const id = tag(block, "Id");
    const nikIds = tags(tag(block, "NikIds"), "long");
    const warning = tag(block, "WarningMessage");
    await new Promise((r) => setTimeout(r, 6000));
    const after = await credit();
    const nik = nikIds[0] || id;
    const del = nik ? await delivery(nik) : [];
    const byClient = await deliveryByClient(cid);
    console.log(
      JSON.stringify({
        label: trial.label,
        status,
        id: id || null,
        nikIds,
        warning: warning || null,
        before,
        after,
        creditChanged: before !== after,
        delivery: del,
        byClient,
      }),
    );
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
