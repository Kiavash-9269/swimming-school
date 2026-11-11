require("dotenv").config();

const phone = process.argv[2] || "09301905219";
const username = process.env.NIKSMS_USERNAME;
const password = process.env.NIKSMS_PASSWORD;
const code = String(Math.floor(10000 + Math.random() * 90000));
const message = `کد تایید شما: ${code} اعتبار: 2 دقیقه`;

async function soapCredit() {
  const endpoint = String(process.env.NIKSMS_ENDPOINT || "http://94.182.154.28:1370/NiksmsWebservice.svc")
    .replace(/\?wsdl$/i, "")
    .replace(/\/$/, "");
  const inner = `<GetCredit xmlns="http://tempuri.org/"><security><Username>${username}</Username><Password>${password}</Password></security></GetCredit>`;
  const envelope = `<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body>${inner}</soap:Body></soap:Envelope>`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      SOAPAction: `"http://tempuri.org/INiksmsWebservice/GetCredit"`,
    },
    body: envelope,
  });
  const text = await res.text();
  return (text.match(/GetCreditResult>([^<]+)</) || [])[1];
}

(async () => {
  const before = await soapCredit();

  // REST v2
  const restBody = new URLSearchParams({
    username,
    password,
    message,
    senderNumber: "blacklist",
    sendDate: "",
    recipient: phone,
    localId: String(Date.now()),
  });
  const restRes = await fetch(process.env.NIKSMS_REST_URL || "https://niksms.com/api/v2/send/one", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: restBody,
  });
  const restText = await restRes.text();

  await new Promise((r) => setTimeout(r, 20000));
  const after = await soapCredit();

  // public delivery
  let pubDelivery = null;
  try {
    const idMatch = restText.match(/"NikId"\s*:\s*"?(\d+)"?/i) || restText.match(/"Id"\s*:\s*"?(\d+)"?/i);
    const nikId = idMatch?.[1];
    if (nikId) {
      const dBody = new URLSearchParams({ username, password, nikIds: nikId });
      const dRes = await fetch("https://niksms.com/fa/publicapi/getSmsDelivery", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: dBody,
      });
      pubDelivery = { nikId, http: dRes.status, body: (await dRes.text()).slice(0, 400) };
    }
  } catch (e) {
    pubDelivery = { error: e.message };
  }

  console.log(
    JSON.stringify(
      {
        phone,
        code,
        before,
        after,
        creditChanged: before !== after,
        restHttp: restRes.status,
        restBody: restText.slice(0, 500),
        pubDelivery,
      },
      null,
      2,
    ),
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
