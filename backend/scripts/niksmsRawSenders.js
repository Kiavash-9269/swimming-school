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

(async () => {
  const inner = `<GetSenderNumbers xmlns="http://tempuri.org/"><security><Username>${esc(username)}</Username><Password>${esc(password)}</Password></security></GetSenderNumbers>`;
  const envelope = `<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body>${inner}</soap:Body></soap:Envelope>`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      SOAPAction: `"http://tempuri.org/INiksmsWebservice/GetSenderNumbers"`,
    },
    body: envelope,
  });
  const text = await res.text();
  console.log(text);
  console.log("--- credit ---");
  const creditInner = `<GetCredit xmlns="http://tempuri.org/"><security><Username>${esc(username)}</Username><Password>${esc(password)}</Password></security></GetCredit>`;
  const creditEnv = `<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body>${creditInner}</soap:Body></soap:Envelope>`;
  const cRes = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      SOAPAction: `"http://tempuri.org/INiksmsWebservice/GetCredit"`,
    },
    body: creditEnv,
  });
  console.log(await cRes.text());
})();
