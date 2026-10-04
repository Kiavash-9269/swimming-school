/**
 * Try Niksms API v2 SendOne and check credit + delivery.
 */
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const username = process.env.NIKSMS_USERNAME || "";
const password = process.env.NIKSMS_PASSWORD || "";
const soapEndpoint = String(process.env.NIKSMS_ENDPOINT || "http://94.182.154.28:1370/NiksmsWebservice.svc")
  .replace(/\?wsdl$/i, "")
  .replace(/\/$/, "");
const phone = process.argv[2] || "09035125219";
const message = `کد تایید شما: 33441 اعتبار: 2 دقیقه`;

function esc(v) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function credit() {
  const inner = `<GetCredit xmlns="http://tempuri.org/"><security><Username>${esc(username)}</Username><Password>${esc(password)}</Password></security></GetCredit>`;
  const envelope = `<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body>${inner}</soap:Body></soap:Envelope>`;
  const res = await fetch(soapEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      SOAPAction: `"http://tempuri.org/INiksmsWebservice/GetCredit"`,
    },
    body: envelope,
  });
  const text = await res.text();
  const m = text.match(/GetCreditResult>([^<]+)</);
  return m ? m[1].trim() : "?";
}

async function trySend(label, url, fields) {
  const before = await credit();
  const body = new URLSearchParams(fields);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const text = await res.text();
  await new Promise((r) => setTimeout(r, 3000));
  const after = await credit();
  console.log(JSON.stringify({ label, http: res.status, before, after, changed: before !== after, body: text.slice(0, 500) }, null, 2));
}

(async () => {
  await trySend("v2_send_one_09", "https://niksms.com/api/v2/send/one", {
    username,
    password,
    message,
    senderNumber: "5000403011",
    sendDate: "",
    recipient: phone,
    localId: String(Date.now()),
  });

  await trySend("v2_send_one_98", "https://niksms.com/api/v2/send/one", {
    username,
    password,
    message,
    senderNumber: "985000403011",
    sendDate: "",
    recipient: phone.startsWith("0") ? `98${phone.slice(1)}` : phone,
    localId: String(Date.now() + 1),
  });

  await trySend("v1_ptp_09", "https://niksms.com/fa/publicapi/ptpSms", {
    username,
    password,
    senderNumber: "5000403011",
    numbers: phone,
    message,
    sendType: "1",
  });
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
