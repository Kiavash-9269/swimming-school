const { fetchWithTimeout, readJsonSafe } = require("../http");
const { SmsProviderError, SMS_ERROR_CODES } = require("../errors");
const { toSmsWebserviceDestination, toSmsWebserviceRecipient } = require("../phoneFormat");
const { logEvent, logError } = require("../../logging");
const { maskPhone } = require("../../../utils/mask");

/** Official samples commonly use HTTP; HTTPS often times out on some Iranian networks. */
const DEFAULT_BASE_URL = "http://api.sms-webservice.com/api/V3";

/**
 * Production adapter for sms-webservice.com (PayamResan V3 API).
 * Docs: https://doc.sms-webservice.com/
 *
 * Template mode: GET /SendTokenSingle (ApiKey, TemplateKey, Destination, p1, p2, p3)
 * Plain text: GET /Send (ApiKey, Text, Sender, Recipients)
 */
class SmsWebserviceProvider {
  constructor({ apiKey, sender, templateKey, timeoutMs, otpTtlSeconds, baseUrl }) {
    this.apiKey = apiKey;
    this.sender = sender;
    this.templateKey = templateKey;
    this.timeoutMs = timeoutMs;
    this.otpTtlSeconds = otpTtlSeconds;
    this.baseUrl = String(baseUrl || DEFAULT_BASE_URL).replace(/\/$/, "");
  }

  async send({ phone, code, purpose }) {
    logEvent("SMS_SEND_STARTED", {
      provider: "sms-webservice",
      phoneMasked: maskPhone(phone),
      purpose,
      mode: this.templateKey ? "template" : "text",
    });

    try {
      const result = this.templateKey
        ? await this.#sendTemplate({ phone, code })
        : await this.#sendText({ phone, code });

      logEvent("SMS_SEND_SUCCESS", {
        provider: "sms-webservice",
        phoneMasked: maskPhone(phone),
        purpose,
        messageId: result.messageId,
      });

      return {
        delivered: true,
        channel: "sms",
        provider: "sms-webservice",
        messageId: result.messageId,
      };
    } catch (error) {
      logError("SMS_SEND_FAILED", error, {
        provider: "sms-webservice",
        phoneMasked: maskPhone(phone),
        purpose,
        code: error?.code,
      });
      throw error;
    }
  }

  async #sendTemplate({ phone, code }) {
    const destination = toSmsWebserviceDestination(phone);
    const ttlMinutes = Math.max(1, Math.ceil(this.otpTtlSeconds / 60));
    const params = new URLSearchParams({
      ApiKey: this.apiKey,
      TemplateKey: this.templateKey,
      Destination: destination,
      p1: String(code),
      p2: String(ttlMinutes),
      p3: "-",
    });

    const url = `${this.baseUrl}/SendTokenSingle?${params.toString()}`;
    const response = await fetchWithTimeout(url, { method: "GET" }, this.timeoutMs);
    return this.#assertSuccess(response);
  }

  async #sendText({ phone, code }) {
    if (!this.sender) {
      throw new SmsProviderError("پیکربندی فرستنده پیامک ناقص است", {
        code: SMS_ERROR_CODES.SMS_CONFIGURATION_ERROR,
        statusCode: 500,
      });
    }

    const ttlMinutes = Math.max(1, Math.ceil(this.otpTtlSeconds / 60));
    const text = `کد تایید شما: ${code}\nاعتبار کد: ${ttlMinutes} دقیقه`;
    return this.#sendRawText({ phone, text });
  }

  /** Free-text notification SMS (reuses same provider; requires sender). */
  async sendText({ phone, message, purpose = "notification" }) {
    logEvent("SMS_SEND_STARTED", {
      provider: "sms-webservice",
      phoneMasked: maskPhone(phone),
      purpose,
      mode: "notification_text",
      bodyLength: String(message || "").length,
    });
    try {
      const result = await this.#sendRawText({ phone, text: String(message || "").slice(0, 900) });
      logEvent("SMS_SEND_SUCCESS", {
        provider: "sms-webservice",
        phoneMasked: maskPhone(phone),
        purpose,
        messageId: result.messageId,
      });
      return {
        delivered: true,
        channel: "sms",
        provider: "sms-webservice",
        messageId: result.messageId,
      };
    } catch (error) {
      logError("SMS_SEND_FAILED", error, {
        provider: "sms-webservice",
        phoneMasked: maskPhone(phone),
        purpose,
        code: error?.code,
      });
      throw error;
    }
  }

  async #sendRawText({ phone, text }) {
    if (!this.sender) {
      throw new SmsProviderError("پیکربندی فرستنده پیامک ناقص است", {
        code: SMS_ERROR_CODES.SMS_CONFIGURATION_ERROR,
        statusCode: 500,
      });
    }

    const params = new URLSearchParams({
      ApiKey: this.apiKey,
      Text: text,
      Sender: String(this.sender),
      Recipients: toSmsWebserviceRecipient(phone),
    });

    const url = `${this.baseUrl}/Send?${params.toString()}`;
    const response = await fetchWithTimeout(url, { method: "GET" }, this.timeoutMs);
    return this.#assertSuccess(response);
  }

  #providerMessage(body) {
    if (typeof body === "string") {
      return body.slice(0, 200);
    }
    if (body && typeof body.raw === "string") {
      return body.raw.slice(0, 200);
    }
    if (body && typeof body === "object" && !Array.isArray(body)) {
      return body.Message || body.message || body.Error || body.error || undefined;
    }
    return undefined;
  }

  #asMessageId(value) {
    if (value === undefined || value === null || value === "") {
      return undefined;
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
    if (typeof value === "bigint") {
      return String(value);
    }
    if (typeof value === "string" && /^\d+$/.test(value.trim())) {
      return value.trim();
    }
    return undefined;
  }

  /**
   * sms-webservice may return:
   * - { id } / { Id }
   * - [{ id }] / [{ Id }]
   * - [123456] numeric id list (common for Send)
   * - bare number / numeric string
   */
  #extractMessageId(body) {
    const direct = this.#asMessageId(body);
    if (direct) {
      return direct;
    }

    if (!body || typeof body !== "object") {
      return undefined;
    }

    if (Array.isArray(body)) {
      if (!body.length) {
        return undefined;
      }
      const first = body[0];
      return (
        this.#asMessageId(first) ||
        this.#asMessageId(first?.id) ||
        this.#asMessageId(first?.Id) ||
        this.#asMessageId(first?.messageId) ||
        this.#asMessageId(first?.MessageId)
      );
    }

    return (
      this.#asMessageId(body.id) ||
      this.#asMessageId(body.Id) ||
      this.#asMessageId(body.messageId) ||
      this.#asMessageId(body.MessageId) ||
      this.#extractMessageId(body.Result) ||
      this.#extractMessageId(body.result) ||
      this.#extractMessageId(body.data) ||
      this.#extractMessageId(body.Data)
    );
  }

  #describeBodyShape(body) {
    if (body === null || body === undefined) {
      return { bodyType: "null" };
    }
    if (typeof body !== "object") {
      return { bodyType: typeof body };
    }
    if (Array.isArray(body)) {
      return {
        bodyType: "array",
        length: body.length,
        firstType: body.length ? typeof body[0] : "empty",
      };
    }
    return {
      bodyType: "object",
      keys: Object.keys(body).filter((k) => !/finaltext|text|message/i.test(k)).slice(0, 12),
    };
  }

  async #assertSuccess(response) {
    const body = await readJsonSafe(response);
    const providerMessage = this.#providerMessage(body);
    const lower = String(providerMessage || "").toLowerCase();
    const shape = this.#describeBodyShape(body);

    if (response.status === 403 || lower.includes("ip address not allowed") || lower.includes("ip not allowed")) {
      throw new SmsProviderError(
        "IP سرور در پنل پیامک مجاز نیست. IP عمومی خود را در پنل sms-webservice اضافه کنید",
        {
          code: SMS_ERROR_CODES.SMS_CONFIGURATION_ERROR,
          statusCode: 502,
          details: { httpStatus: response.status, reason: "ip_not_allowed", ...shape },
        },
      );
    }

    if (!response.ok) {
      throw new SmsProviderError("ارسال پیامک ناموفق بود", {
        code: SMS_ERROR_CODES.SMS_DELIVERY_FAILED,
        statusCode: 502,
        details: {
          httpStatus: response.status,
          providerCode: body?.StatusCode ?? body?.status,
          reason: providerMessage ? "provider_rejected" : undefined,
          ...shape,
        },
      });
    }

    // HTTP OK + error string body (some gateways still return 200)
    if (typeof body === "string" && !/^\d+$/.test(body.trim())) {
      throw new SmsProviderError("ارسال پیامک ناموفق بود", {
        code: SMS_ERROR_CODES.SMS_DELIVERY_FAILED,
        statusCode: 502,
        details: { httpStatus: response.status, reason: "provider_string_error", ...shape },
      });
    }

    const messageId = this.#extractMessageId(body);
    if (messageId === undefined) {
      throw new SmsProviderError("پاسخ نامعتبر از سرویس پیامک", {
        code: SMS_ERROR_CODES.SMS_DELIVERY_FAILED,
        statusCode: 502,
        details: {
          httpStatus: response.status,
          reason: "missing_message_id",
          ...shape,
        },
      });
    }

    return { messageId };
  }
}

module.exports = {
  SmsWebserviceProvider,
  SMS_WEBSERVICE_DEFAULT_BASE_URL: DEFAULT_BASE_URL,
};
