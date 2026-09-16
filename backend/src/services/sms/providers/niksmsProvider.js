const { fetchWithTimeout } = require("../http");
const { SmsProviderError, SMS_ERROR_CODES } = require("../errors");
const { toNiksmsNumber } = require("../phoneFormat");
const { logEvent, logError } = require("../../logging");
const { maskPhone } = require("../../../utils/mask");

/** Public Niksms SOAP endpoint from panel docs (WSDL host may advertise a private IP). */
const DEFAULT_ENDPOINT = "http://94.182.154.28:1370/NiksmsWebservice.svc";

const SOAP_NS = "http://schemas.xmlsoap.org/soap/envelope/";
const TEMPURI_NS = "http://tempuri.org/";

/** SmsReturn values that mean the message was accepted for send. */
const SUCCESS_STATUSES = new Set(["Successful", "Warning", "1", "13"]);

const STATUS_MESSAGES = {
  Successful: "پیام با موفقیت ارسال شد",
  UnknownError: "خطای نامشخص از سرویس پیامک",
  InsufficientCredit: "موجودی پنل پیامک کافی نیست",
  ForbiddenHours: "ارسال در این ساعت مجاز نیست",
  Filtered: "متن پیامک فیلتر شده است",
  NoFilters: "این پیام شامل فیلترینگ نمی‌شود",
  PrivateNumberIsDisable: "شماره اختصاصی غیرفعال است",
  ArgumentIsNullOrIncorrect: "پارامترهای ارسال پیامک نامعتبر است",
  MessageBodyIsNullOrEmpty: "متن پیامک خالی است",
  PrivateNumberIsIncorrect: "شماره اختصاصی نامعتبر است",
  ReceptionNumberIsIncorrect: "شماره موبایل گیرنده نامعتبر است",
  SentTypeIsIncorrect: "نوع ارسال نامعتبر است",
  Warning: "ارسال با هشدار انجام شد",
  PanelIsBlocked: "پنل پیامک مسدود است",
  SiteUpdating: "سرویس پیامک در حال به‌روزرسانی است",
  AudioMessageNotAllowed: "ارسال پیام صوتی مجاز نیست",
  AudioMessageFileSizeNotAllowed: "حجم فایل صوتی بیش از حد مجاز است",
  PanelExpired: "پنل پیامک منقضی شده است",
  InvalidUserNameOrPass: "نام کاربری یا رمز عبور پیامک نادرست است",
};

/**
 * Escape text for inclusion in SOAP XML element bodies.
 */
function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function extractTag(xml, tagName) {
  const re = new RegExp(`<(?:[\\w-]+:)?${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[\\w-]+:)?${tagName}>`, "i");
  const match = String(xml || "").match(re);
  return match ? match[1].trim() : undefined;
}

function extractAllTags(xml, tagName) {
  const re = new RegExp(`<(?:[\\w-]+:)?${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[\\w-]+:)?${tagName}>`, "gi");
  const values = [];
  let match = re.exec(String(xml || ""));
  while (match) {
    values.push(match[1].trim());
    match = re.exec(String(xml || ""));
  }
  return values;
}

function buildArrayOfString(tagName, values) {
  const items = values.map((v) => `<string>${escapeXml(v)}</string>`).join("");
  return `<${tagName}>${items}</${tagName}>`;
}

/**
 * Niksms SOAP provider (WCF).
 * Auth: AuthenticationModel { Username, Password } — not an API key.
 * OTP / single text: GroupSms (one message → n numbers).
 * Docs: https://niksms.com/fa/panel/ (Web Service)
 */
class NiksmsProvider {
  constructor({ username, password, sender, endpoint, timeoutMs, otpTtlSeconds }) {
    this.username = username;
    this.password = password;
    this.sender = sender || "";
    this.endpoint = String(endpoint || DEFAULT_ENDPOINT).replace(/\?wsdl$/i, "").replace(/\/$/, "");
    this.timeoutMs = timeoutMs;
    this.otpTtlSeconds = otpTtlSeconds;
  }

  async send({ phone, code, purpose }) {
    const ttlMinutes = Math.max(1, Math.ceil(this.otpTtlSeconds / 60));
    const message = `کد تایید شما: ${code}\nاعتبار کد: ${ttlMinutes} دقیقه`;
    return this.#sendGroupSms({ phone, message, purpose, mode: "otp_text" });
  }

  async sendText({ phone, message, purpose = "notification" }) {
    return this.#sendGroupSms({
      phone,
      message: String(message || "").slice(0, 900),
      purpose,
      mode: "notification_text",
    });
  }

  /**
   * Delivery status for NikIds returned by GroupSms / PtpSms.
   * @param {Array<string|number>} nikIds
   * @returns {Promise<string[]>} SmsStatus enum strings from the service
   */
  async getSmsDelivery(nikIds) {
    const ids = (Array.isArray(nikIds) ? nikIds : [nikIds]).filter((id) => id != null && id !== "");
    if (!ids.length) {
      throw new SmsProviderError("کد پیگیری پیامک مشخص نشده است", {
        code: SMS_ERROR_CODES.SMS_CONFIGURATION_ERROR,
        statusCode: 500,
      });
    }

    const longs = ids.map((id) => `<long>${escapeXml(id)}</long>`).join("");
    const body = `
      <GetSmsDelivery xmlns="${TEMPURI_NS}">
        ${this.#securityXml()}
        <nikIds>${longs}</nikIds>
      </GetSmsDelivery>`;

    const xml = await this.#soapCall("GetSmsDelivery", body);
    const resultBlock = extractTag(xml, "GetSmsDeliveryResult") || "";
    const statuses = extractAllTags(resultBlock, "SmsStatus");
    if (statuses.length) {
      return statuses;
    }
    // Some responses nest bare enum text under the result element.
    const nested = extractAllTags(resultBlock, "string");
    if (nested.length) {
      return nested;
    }
    return resultBlock ? [resultBlock] : [];
  }

  async #sendGroupSms({ phone, message, purpose, mode }) {
    logEvent("SMS_SEND_STARTED", {
      provider: "niksms",
      phoneMasked: maskPhone(phone),
      purpose,
      mode,
      bodyLength: String(message || "").length,
    });

    try {
      if (!String(message || "").trim()) {
        throw new SmsProviderError(STATUS_MESSAGES.MessageBodyIsNullOrEmpty, {
          code: SMS_ERROR_CODES.SMS_DELIVERY_FAILED,
          statusCode: 502,
          details: { providerStatus: "MessageBodyIsNullOrEmpty" },
        });
      }

      const number = toNiksmsNumber(phone);
      const clientMessageId = String(Date.now());
      // XSD requires SendOn (xs:dateTime). Docs sample treats scheduling as optional;
      // current UTC time = send immediately.
      const sendOn = new Date().toISOString();

      const modelParts = [
        this.sender ? `<SenderNumber>${escapeXml(this.sender)}</SenderNumber>` : "<SenderNumber />",
        buildArrayOfString("Numbers", [number]),
        `<SendOn>${escapeXml(sendOn)}</SendOn>`,
        "<SendType>Normal</SendType>",
        buildArrayOfString("YourMessageId", [clientMessageId]),
        `<Message>${escapeXml(message)}</Message>`,
      ];

      const soapBody = `
        <GroupSms xmlns="${TEMPURI_NS}">
          ${this.#securityXml()}
          <model>
            ${modelParts.join("\n            ")}
          </model>
        </GroupSms>`;

      const xml = await this.#soapCall("GroupSms", soapBody);
      const result = this.#parseReturnSmsResult(xml, "GroupSmsResult");
      this.#assertAccepted(result);

      const messageId =
        result.nikIds[0] ||
        (result.id != null && result.id !== "" ? String(result.id) : undefined) ||
        clientMessageId;

      logEvent("SMS_SEND_SUCCESS", {
        provider: "niksms",
        phoneMasked: maskPhone(phone),
        purpose,
        messageId,
        providerStatus: result.status,
      });

      return {
        delivered: true,
        channel: "sms",
        provider: "niksms",
        messageId: String(messageId),
        nikIds: result.nikIds,
        providerStatus: result.status,
      };
    } catch (error) {
      logError("SMS_SEND_FAILED", error, {
        provider: "niksms",
        phoneMasked: maskPhone(phone),
        purpose,
        code: error?.code,
      });
      throw error;
    }
  }

  #securityXml() {
    return `<security>
          <Username>${escapeXml(this.username)}</Username>
          <Password>${escapeXml(this.password)}</Password>
        </security>`;
  }

  async #soapCall(operation, innerBodyXml) {
    const envelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="${SOAP_NS}">
  <soap:Body>
    ${innerBodyXml}
  </soap:Body>
</soap:Envelope>`;

    const soapAction = `${TEMPURI_NS}INiksmsWebservice/${operation}`;
    const response = await fetchWithTimeout(
      this.endpoint,
      {
        method: "POST",
        headers: {
          "Content-Type": "text/xml; charset=utf-8",
          SOAPAction: `"${soapAction}"`,
        },
        body: envelope,
      },
      this.timeoutMs,
    );

    const text = await response.text();
    if (!response.ok) {
      throw new SmsProviderError("ارسال پیامک ناموفق بود", {
        code: SMS_ERROR_CODES.SMS_DELIVERY_FAILED,
        statusCode: 502,
        details: {
          httpStatus: response.status,
          reason: "http_error",
          fault: Boolean(extractTag(text, "Fault") || extractTag(text, "faultstring")),
        },
      });
    }

    const faultString = extractTag(text, "faultstring") || extractTag(text, "FaultString");
    if (faultString) {
      throw new SmsProviderError("ارسال پیامک ناموفق بود", {
        code: SMS_ERROR_CODES.SMS_DELIVERY_FAILED,
        statusCode: 502,
        details: { reason: "soap_fault" },
      });
    }

    return text;
  }

  #parseReturnSmsResult(xml, resultTag) {
    const block = extractTag(xml, resultTag);
    if (!block) {
      throw new SmsProviderError("پاسخ نامعتبر از سرویس پیامک", {
        code: SMS_ERROR_CODES.SMS_DELIVERY_FAILED,
        statusCode: 502,
        details: { reason: "missing_result", resultTag },
      });
    }

    const status = extractTag(block, "Status");
    const id = extractTag(block, "Id");
    const warningMessage = extractTag(block, "WarningMessage");
    const nikIdsBlock = extractTag(block, "NikIds") || "";
    const nikIds = extractAllTags(nikIdsBlock, "long").filter(Boolean);

    return {
      status: status || "",
      id,
      warningMessage,
      nikIds,
    };
  }

  #assertAccepted(result) {
    const status = String(result.status || "");
    if (SUCCESS_STATUSES.has(status)) {
      return;
    }

    const authFailure = status === "InvalidUserNameOrPass" || status === "19";
    const configFailure =
      status === "PrivateNumberIsIncorrect" ||
      status === "PrivateNumberIsDisable" ||
      status === "10" ||
      status === "7" ||
      status === "PanelIsBlocked" ||
      status === "14" ||
      status === "PanelExpired" ||
      status === "18";

    const message = STATUS_MESSAGES[status] || "ارسال پیامک ناموفق بود";

    throw new SmsProviderError(message, {
      code:
        authFailure || configFailure
          ? SMS_ERROR_CODES.SMS_CONFIGURATION_ERROR
          : SMS_ERROR_CODES.SMS_DELIVERY_FAILED,
      statusCode: 502,
      details: {
        providerStatus: status || "unknown",
        reason: authFailure ? "invalid_credentials" : configFailure ? "provider_config" : "provider_rejected",
      },
    });
  }
}

module.exports = {
  NiksmsProvider,
  NIKSMS_DEFAULT_ENDPOINT: DEFAULT_ENDPOINT,
  NIKSMS_SUCCESS_STATUSES: SUCCESS_STATUSES,
};
