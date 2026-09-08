const { fetchWithTimeout, readJsonSafe } = require("../http");
const { SmsProviderError, SMS_ERROR_CODES } = require("../errors");
const { toKavenegarReceptor } = require("../phoneFormat");
const { logEvent, logError } = require("../../logging");
const { maskPhone } = require("../../../utils/mask");

/**
 * Kavenegar verify/lookup (template OTP).
 * Docs: https://kavenegar.com/rest.html
 * Endpoint: GET/POST https://api.kavenegar.com/v1/{API-KEY}/verify/lookup.json
 * Success: return.status === 200
 */
class KavenegarProvider {
  constructor({ apiKey, template, sender, timeoutMs }) {
    this.apiKey = apiKey;
    this.template = template;
    this.sender = sender;
    this.timeoutMs = timeoutMs;
  }

  async send({ phone, code, purpose }) {
    logEvent("SMS_SEND_STARTED", {
      provider: "kavenegar",
      phoneMasked: maskPhone(phone),
      purpose,
      mode: "verify_lookup",
    });

    const receptor = toKavenegarReceptor(phone);
    const url = `https://api.kavenegar.com/v1/${encodeURIComponent(this.apiKey)}/verify/lookup.json`;

    const body = new URLSearchParams({
      receptor,
      token: String(code),
      template: this.template,
    });
    if (this.sender) {
      body.set("sender", String(this.sender));
    }

    try {
      const response = await fetchWithTimeout(
        url,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: body.toString(),
        },
        this.timeoutMs,
      );

      const payload = await readJsonSafe(response);
      const returnStatus = payload?.return?.status;

      if (!response.ok || returnStatus !== 200) {
        throw new SmsProviderError("ارسال پیامک ناموفق بود", {
          code: SMS_ERROR_CODES.SMS_DELIVERY_FAILED,
          statusCode: 502,
          details: {
            httpStatus: response.status,
            providerStatus: returnStatus,
          },
        });
      }

      const messageId = payload?.entries?.messageid ?? payload?.entries?.[0]?.messageid;

      logEvent("SMS_SEND_SUCCESS", {
        provider: "kavenegar",
        phoneMasked: maskPhone(phone),
        purpose,
        messageId: messageId != null ? String(messageId) : undefined,
      });

      return {
        delivered: true,
        channel: "sms",
        provider: "kavenegar",
        messageId: messageId != null ? String(messageId) : undefined,
      };
    } catch (error) {
      if (error instanceof SmsProviderError) {
        logError("SMS_SEND_FAILED", error, {
          provider: "kavenegar",
          phoneMasked: maskPhone(phone),
          purpose,
          code: error.code,
        });
        throw error;
      }
      logError("SMS_SEND_FAILED", error, {
        provider: "kavenegar",
        phoneMasked: maskPhone(phone),
        purpose,
      });
      throw error;
    }
  }

  /** Free-text SMS via Kavenegar send endpoint when sender is configured. */
  async sendText({ phone, message, purpose = "notification" }) {
    if (!this.sender) {
      throw new SmsProviderError("Kavenegar free-text requires KAVENEGAR_SENDER", {
        code: SMS_ERROR_CODES.SMS_CONFIGURATION_ERROR,
        statusCode: 500,
      });
    }

    logEvent("SMS_SEND_STARTED", {
      provider: "kavenegar",
      phoneMasked: maskPhone(phone),
      purpose,
      mode: "sms_send",
      bodyLength: String(message || "").length,
    });

    const receptor = toKavenegarReceptor(phone);
    const url = `https://api.kavenegar.com/v1/${encodeURIComponent(this.apiKey)}/sms/send.json`;
    const body = new URLSearchParams({
      receptor,
      sender: String(this.sender),
      message: String(message || "").slice(0, 900),
    });

    try {
      const response = await fetchWithTimeout(
        url,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: body.toString(),
        },
        this.timeoutMs,
      );
      const payload = await readJsonSafe(response);
      const returnStatus = payload?.return?.status;
      if (!response.ok || returnStatus !== 200) {
        throw new SmsProviderError("ارسال پیامک ناموفق بود", {
          code: SMS_ERROR_CODES.SMS_DELIVERY_FAILED,
          statusCode: 502,
          details: { httpStatus: response.status, providerStatus: returnStatus },
        });
      }
      const messageId = payload?.entries?.messageid ?? payload?.entries?.[0]?.messageid;
      logEvent("SMS_SEND_SUCCESS", {
        provider: "kavenegar",
        phoneMasked: maskPhone(phone),
        purpose,
        messageId: messageId != null ? String(messageId) : undefined,
      });
      return {
        delivered: true,
        channel: "sms",
        provider: "kavenegar",
        messageId: messageId != null ? String(messageId) : undefined,
      };
    } catch (error) {
      logError("SMS_SEND_FAILED", error, {
        provider: "kavenegar",
        phoneMasked: maskPhone(phone),
        purpose,
        code: error?.code,
      });
      throw error;
    }
  }
}

module.exports = {
  KavenegarProvider,
};
