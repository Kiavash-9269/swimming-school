const { SmsProviderError, SMS_ERROR_CODES } = require("./errors");

/**
 * Fetch with AbortController timeout. Never logs request URLs (may contain API keys).
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new SmsProviderError("مهلت ارسال پیامک به پایان رسید", {
        code: SMS_ERROR_CODES.SMS_PROVIDER_TIMEOUT,
        statusCode: 504,
      });
    }

    const causeCode = error?.cause?.code || error?.code;
    if (causeCode === "UND_ERR_CONNECT_TIMEOUT" || causeCode === "ETIMEDOUT" || causeCode === "ENOTFOUND") {
      throw new SmsProviderError("اتصال به سرویس پیامک برقرار نشد", {
        code: SMS_ERROR_CODES.SMS_PROVIDER_UNAVAILABLE,
        statusCode: 502,
        details: { reason: "connect_failed" },
      });
    }

    throw new SmsProviderError("سرویس پیامک در دسترس نیست", {
      code: SMS_ERROR_CODES.SMS_PROVIDER_UNAVAILABLE,
      statusCode: 502,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function readJsonSafe(response) {
  const text = await response.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text.slice(0, 200) };
  }
}

module.exports = {
  fetchWithTimeout,
  readJsonSafe,
};
