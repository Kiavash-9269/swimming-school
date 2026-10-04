/**
 * Probe Niksms REST/public API variants.
 * Usage: node scripts/niksmsRestProbe.js [phone]
 */
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const username = process.env.NIKSMS_USERNAME;
const password = process.env.NIKSMS_PASSWORD;
const senderEnv = process.env.NIKSMS_SENDER || "985000403011";
const phone09 = process.argv[2] || "090352195219";
const phone98 = phone09.startsWith("0") ? `98${phone09.slice(1)}` : phone09;
const senderBare = senderEnv.replace(/^98/, "");
const sender98 = senderEnv.startsWith("98") ? senderEnv : `98${senderEnv}`;
const message = "کد تایید تست REST";

const endpoints = [
  "https://niksms.com/fa/publicapi/GroupSMS",
  "https://niksms.com/fa/publicapi/groupsms",
  "https://api.niksms.com/fa/publicapi/GroupSMS",
  "https://niksms.com/api/public/GroupSMS",
  "http://niksms.com/fa/publicapi/GroupSMS",
];

const payloads = [
  {
    label: "doc_camel_98phones_bareSender",
    body: {
      Username: username,
      Password: password,
      senderNumber: senderBare,
      numbers: [phone98],
      message,
    },
  },
  {
    label: "pascal_98phones_98sender",
    body: {
      Username: username,
      Password: password,
      SenderNumber: sender98,
      Numbers: [phone98],
      Message: message,
    },
  },
  {
    label: "doc_09phones_bareSender",
    body: {
      Username: username,
      Password: password,
      senderNumber: senderBare,
      numbers: [phone09],
      message,
    },
  },
];

async function tryOnce(url, payload, method = "POST") {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: method === "GET" ? undefined : JSON.stringify(payload.body),
      signal: controller.signal,
    });
    const text = await res.text();
    return {
      url,
      label: payload.label,
      http: res.status,
      body: text.slice(0, 500),
    };
  } catch (e) {
    return { url, label: payload.label, error: e.message };
  } finally {
    clearTimeout(timer);
  }
}

(async () => {
  console.log(
    JSON.stringify({
      phoneTail: phone09.slice(-4),
      senderBare,
      sender98,
    }),
  );
  for (const url of endpoints) {
    for (const payload of payloads.slice(0, 1)) {
      const out = await tryOnce(url, payload);
      console.log(JSON.stringify(out));
      if (out.http && out.http < 500 && out.body && !/login|html|unauthorized/i.test(out.body)) {
        // also try other payload shapes on first working host
        for (const p of payloads.slice(1)) {
          console.log(JSON.stringify(await tryOnce(url, p)));
        }
        break;
      }
    }
  }
})().catch((e) => {
  console.error(JSON.stringify({ error: e.message }));
  process.exit(1);
});
