/**
 * Send once, keep raw body, poll Id vs NikIds, re-check credit.
 */
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const username = process.env.NIKSMS_USERNAME || "";
const password = process.env.NIKSMS_PASSWORD || "";
const soapEndpoint = String(process.env.NIKSMS_ENDPOINT || "http://94.182.154.28:1370/NiksmsWebservice.svc")
  .replace(/\?wsdl$/i, "")
  .replace(/\/$/, "");
const phone = process.argv[2] || "09035125219";
const message = `کد تایید شما: 99112 اعتبار: 2 دقیقه`;

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
  return m ? m[1].trim() : text.slice(0, 120);
}

function extractIds(raw) {
  const idMatch = String(raw).match(/"Id"\s*:\s*"?([0-9]+)"?/);
  const nikMatch = String(raw).match(/"NikIds"\s*:\s*\[([^\]]*)\]/i);
  const nikIds = nikMatch
    ? nikMatch[1]
        .split(",")
        .map((s) => s.replace(/["\\\s]/g, "").trim())
        .filter(Boolean)
    : [];
  return { id: idMatch?.[1] || "", nikIds };
}

async function restDelivery(nikId) {
  const body = new URLSearchParams({ username, password, nikIds: String(nikId) });
  const res = await fetch("https://niksms.com/fa/publicapi/getSmsDelivery", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  return { http: res.status, text: await res.text() };
}

(async () => {
  const before = await credit();
  const body = new URLSearchParams({
    username,
    password,
    senderNumber: "5000403011",
    numbers: phone,
    message,
    sendType: "1",
  });
  const res = await fetch("https://niksms.com/fa/publicapi/groupSms", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const raw = await res.text();
  const ids = extractIds(raw);
  await new Promise((r) => setTimeout(r, 8000));
  const after = await credit();
  const checks = [];
  if (ids.id) checks.push({ kind: "Id", value: ids.id, ...(await restDelivery(ids.id)) });
  for (const n of ids.nikIds) {
    checks.push({ kind: "NikId", value: n, ...(await restDelivery(n)) });
  }
  console.log(JSON.stringify({ before, after, creditChanged: before !== after, http: res.status, raw, ids, checks }, null, 2));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
