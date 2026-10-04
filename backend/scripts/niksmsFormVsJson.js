/**
 * Official Niksms publicapi uses form-urlencoded (UploadValues), not JSON.
 * Compare JSON vs form vs GET and poll delivery.
 */
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const username = process.env.NIKSMS_USERNAME;
const password = process.env.NIKSMS_PASSWORD;
const sender = String(process.env.NIKSMS_SENDER || "5000403011").replace(/^98/, "");
const phone09 = process.argv[2] || "09035125219";
const phone98 = phone09.startsWith("0") ? `98${phone09.slice(1)}` : phone09;
const message = `کد تایید شما: 55441 اعتبار: 2 دقیقه`;
const url = "https://niksms.com/fa/publicapi/groupSms";

function parseBody(text) {
  const raw = String(text || "").trim();
  try {
    let p = JSON.parse(raw);
    if (typeof p === "string") p = JSON.parse(p);
    return p;
  } catch {
    return { raw: raw.slice(0, 300) };
  }
}

async function postForm(fields) {
  const body = new URLSearchParams(fields);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const text = await res.text();
  return { http: res.status, parsed: parseBody(text), text: text.slice(0, 250) };
}

async function postJson(payload) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  return { http: res.status, parsed: parseBody(text), text: text.slice(0, 250) };
}

async function getQuery(fields) {
  const qs = new URLSearchParams(fields);
  const res = await fetch(`${url}?${qs.toString()}`, { method: "GET" });
  const text = await res.text();
  return { http: res.status, parsed: parseBody(text), text: text.slice(0, 250) };
}

async function delivery(nikId) {
  const deliveryUrl = "https://niksms.com/fa/publicapi/getSmsDelivery";
  const body = new URLSearchParams({
    username,
    password,
    nikIds: String(nikId),
  });
  const res = await fetch(deliveryUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const text = await res.text();
  return { http: res.status, parsed: parseBody(text), text: text.slice(0, 300) };
}

(async () => {
  const trials = [
    {
      label: "form_09",
      run: () =>
        postForm({
          username,
          password,
          senderNumber: sender,
          numbers: phone09,
          message,
          sendType: "1",
        }),
    },
    {
      label: "form_98",
      run: () =>
        postForm({
          username,
          password,
          senderNumber: sender,
          numbers: phone98,
          message,
          sendType: "1",
        }),
    },
    {
      label: "json_98_string",
      run: () =>
        postJson({
          Username: username,
          Password: password,
          senderNumber: sender,
          numbers: phone98,
          message,
        }),
    },
    {
      label: "get_09",
      run: () =>
        getQuery({
          username,
          password,
          senderNumber: sender,
          numbers: phone09,
          message,
          sendType: "1",
        }),
    },
  ];

  for (const trial of trials) {
    const out = await trial.run();
    const id = out.parsed?.Id || out.parsed?.NikIds?.[0] || null;
    let del = null;
    if (id) {
      await new Promise((r) => setTimeout(r, 4000));
      del = await delivery(id);
    }
    console.log(
      JSON.stringify({
        label: trial.label,
        http: out.http,
        status: out.parsed?.Status ?? null,
        id: id != null ? String(id) : null,
        warning: out.parsed?.WarningMessage || null,
        deliveryHttp: del?.http ?? null,
        delivery: del?.parsed ?? del?.text ?? null,
      }),
    );
  }
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
