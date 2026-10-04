const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const { fetchWithTimeout } = require("../src/services/sms/http");

const username = process.env.NIKSMS_USERNAME;
const password = process.env.NIKSMS_PASSWORD;
const nikId = process.argv[2] || "639258934720294949";

(async () => {
  await new Promise((r) => setTimeout(r, 2000));
  for (const url of [
    "https://niksms.com/fa/publicapi/GetSmsDelivery",
    "https://niksms.com/fa/publicapi/SmsDelivery",
    "https://niksms.com/fa/publicapi/GetDelivery",
  ]) {
    for (const body of [
      { Username: username, Password: password, nikIds: String(nikId) },
      { Username: username, Password: password, NikIds: String(nikId) },
    ]) {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      if (res.status !== 404 && !String(text).includes("<!DOCTYPE")) {
        console.log(JSON.stringify({ url, http: res.status, body: text.slice(0, 500) }));
      }
    }
  }

  const endpoint = "http://94.182.154.28:1370/NiksmsWebservice.svc";
  const envl = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <GetSmsDelivery xmlns="http://tempuri.org/">
      <security><Username>${username}</Username><Password>${password}</Password></security>
      <nikIds><long>${nikId}</long></nikIds>
    </GetSmsDelivery>
  </soap:Body>
</soap:Envelope>`;
  const res = await fetchWithTimeout(
    endpoint,
    {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        SOAPAction: '"http://tempuri.org/INiksmsWebservice/GetSmsDelivery"',
      },
      body: envl,
    },
    20000,
  );
  console.log(JSON.stringify({ soap: (await res.text()).replace(/\s+/g, " ").slice(0, 500) }));
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
