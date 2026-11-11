/**
 * Force promo SMS via SOAP GroupSms (dedicated sender), check credit + delivery.
 */
require("dotenv").config();

const phone = process.argv[2] || "09301905219";
const username = process.env.NIKSMS_USERNAME;
const password = process.env.NIKSMS_PASSWORD;
const endpoint = String(process.env.NIKSMS_ENDPOINT || "http://94.182.154.28:1370/NiksmsWebservice.svc")
  .replace(/\?wsdl$/i, "")
  .replace(/\/$/, "");
const message =
  "مدرسه شنا ایران استرالیا: عضو باشگاه هستید؛ برای ثبت نام آنلاین با تخفیف ویژه به سایت مدرسه مراجعه کنید.";

function esc(v) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
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
  return res.text();
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

async function credit() {
  const text = await soap(
    "GetCredit",
    `<GetCredit xmlns="http://tempuri.org/"><security><Username>${esc(username)}</Username><Password>${esc(password)}</Password></security></GetCredit>`,
  );
  return tag(text, "GetCreditResult");
}

(async () => {
  const senders = ["blacklist", "985000403011", "9830006179559594"];
  const results = [];
  for (const sender of senders) {
    const before = await credit();
    const clientId = String(Date.now());
    const xml = await soap(
      "GroupSms",
      `<GroupSms xmlns="http://tempuri.org/">
        <security><Username>${esc(username)}</Username><Password>${esc(password)}</Password></security>
        <model>
          <SenderNumber>${esc(sender)}</SenderNumber>
          <Numbers><string>${esc(phone)}</string></Numbers>
          <SendType>Normal</SendType>
          <YourMessageId><long>${esc(clientId)}</long></YourMessageId>
          <Message>${esc(message)}</Message>
        </model>
      </GroupSms>`,
    );
    const block = tag(xml, "GroupSmsResult");
    const status = tag(block, "Status");
    const id = tag(block, "Id");
    const warning = tag(block, "WarningMessage");
    const nikIds = tags(tag(block, "NikIds") || "", "long");
    await new Promise((r) => setTimeout(r, 8000));
    const after = await credit();
    let delivery = [];
    if (nikIds[0] || id) {
      const dXml = await soap(
        "GetSmsDelivery",
        `<GetSmsDelivery xmlns="http://tempuri.org/"><security><Username>${esc(username)}</Username><Password>${esc(password)}</Password></security><nikIds><long>${esc(nikIds[0] || id)}</long></nikIds></GetSmsDelivery>`,
      );
      const dBlock = tag(dXml, "GetSmsDeliveryResult");
      delivery = tags(dBlock, "SmsStatus").concat(tags(dBlock, "string")).filter(Boolean);
    }
    results.push({
      sender,
      status,
      id,
      nikIds,
      warning: warning || null,
      before,
      after,
      creditChanged: before !== after,
      delivery,
    });
  }
  console.log(JSON.stringify({ phone, messagePreview: message.slice(0, 60), results }, null, 2));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
