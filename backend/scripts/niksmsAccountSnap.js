const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const endpoint = String(process.env.NIKSMS_ENDPOINT || "http://94.182.154.28:1370/NiksmsWebservice.svc")
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

function tag(xml, name) {
  const m = String(xml || "").match(
    new RegExp(`<(?:[\\w-]+:)?${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[\\w-]+:)?${name}>`, "i"),
  );
  return m ? m[1].trim() : "";
}

(async () => {
  console.log({
    userLen: username.length,
    passLen: password.length,
    sender: process.env.NIKSMS_SENDER,
    provider: process.env.SMS_PROVIDER,
    endpoint,
  });

  const creditXml = await soap(
    "GetCredit",
    `<GetCredit xmlns="http://tempuri.org/"><security><Username>${esc(username)}</Username><Password>${esc(password)}</Password></security></GetCredit>`,
  );
  const before = tag(creditXml, "GetCreditResult");
  const expXml = await soap(
    "GetPanelExpireDate",
    `<GetPanelExpireDate xmlns="http://tempuri.org/"><security><Username>${esc(username)}</Username><Password>${esc(password)}</Password></security></GetPanelExpireDate>`,
  );
  const sendersXml = await soap(
    "GetSenderNumbers",
    `<GetSenderNumbers xmlns="http://tempuri.org/"><security><Username>${esc(username)}</Username><Password>${esc(password)}</Password></security></GetSenderNumbers>`,
  );

  console.log({
    before,
    expire: tag(expXml, "GetPanelExpireDateResult"),
    senders: [...sendersXml.matchAll(/<string>([^<]*)<\/string>/g)].map((m) => m[1]),
  });

  const body = new URLSearchParams({
    username,
    password,
    message: "کد تایید شما: 11223 اعتبار: 2 دقیقه",
    senderNumber: "5000403011",
    sendDate: "",
    recipient: "09035125219",
    localId: String(Date.now()),
  });
  const res = await fetch("https://niksms.com/api/v2/send/one", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const raw = await res.text();
  await new Promise((r) => setTimeout(r, 3000));
  const afterXml = await soap(
    "GetCredit",
    `<GetCredit xmlns="http://tempuri.org/"><security><Username>${esc(username)}</Username><Password>${esc(password)}</Password></security></GetCredit>`,
  );
  const after = tag(afterXml, "GetCreditResult");
  console.log({ v2: raw.slice(0, 300), after, changed: before !== after });
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
