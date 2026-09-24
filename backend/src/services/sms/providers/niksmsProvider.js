const { fetchWithTimeout } = require("../http");
const { SmsProviderError, SMS_ERROR_CODES } = require("../errors");
const { toNiksmsRecipient } = require("../phoneFormat");
const { logEvent, logError } = require("../../logging");
const { maskPhone } = require("../../../utils/mask");

/** Official panel SOAP endpoint (docs: …/NiksmsWebservice.svc?wsdl). */
const DEFAULT_SOAP_ENDPOINT = "http://94.182.154.28:1370/NiksmsWebservice.svc";

/**
 * Optional REST fallback (API v2 SendOne). Official OTP path is SOAP GroupSms.
 */
const DEFAULT_REST_URL = "https://niksms.com/api/v2/send/one";

const SOAP_NS = "http://schemas.xmlsoap.org/soap/envelope/";
const TEMPURI_NS = "http://tempuri.org/";

/** SmsReturn values that mean accepted. */
const SUCCESS_STATUSES = new Set(["Successful", "Warning", "1", "13", 1, 13]);

const STATUS_MESSAGES = {
  Successful: "پیام با موفقیت ارسال شد",
  1: "پیام با موفقیت ارسال شد",
  UnknownError: "خطای نامشخص از سرویس پیامک",
  2: "خطای نامشخص از سرویس پیامک",
  InsufficientCredit: "موجودی پنل پیامک کافی نیست",
  3: "موجودی پنل پیامک کافی نیست",
  ForbiddenHours: "ارسال در این ساعت مجاز نیست",
  4: "ارسال در این ساعت مجاز نیست",
  Filtered: "متن پیامک فیلتر شده است",
  5: "متن پیامک فیلتر شده است",
  PrivateNumberIsDisable: "شماره اختصاصی غیرفعال است",
  7: "شماره اختصاصی غیرفعال است",
  ArgumentIsNullOrIncorrect: "پارامترهای ارسال پیامک نامعتبر است",
  8: "پارامترهای ارسال پیامک نامعتبر است",
  MessageBodyIsNullOrEmpty: "متن پیامک خالی است",
  9: "متن پیامک خالی است",
  PrivateNumberIsIncorrect: "شماره اختصاصی نامعتبر است",
  10: "شماره اختصاصی نامعتبر است",
  ReceptionNumberIsIncorrect: "شماره موبایل گیرنده نامعتبر است",
  11: "شماره موبایل گیرنده نامعتبر است",
  SentTypeIsIncorrect: "نوع ارسال نامعتبر است",
  12: "نوع ارسال نامعتبر است",
  Warning: "ارسال با هشدار انجام شد",
  13: "ارسال با هشدار انجام شد",
  PanelIsBlocked: "پنل پیامک مسدود است",
  14: "پنل پیامک مسدود است",
  SiteUpdating: "سرویس پیامک در حال به‌روزرسانی است",
  15: "سرویس پیامک در حال به‌روزرسانی است",
  PanelExpired: "پنل پیامک منقضی شده است",
  18: "پنل پیامک منقضی شده است",
  InvalidUserNameOrPass: "نام کاربری یا رمز عبور پیامک نادرست است",
  19: "نام کاربری یا رمز عبور پیامک نادرست است",
  UserIsWaitForApprove: "حساب کاربری پیامک در انتظار تأیید است",
  UserApiBlocked: "دسترسی وب‌سرویس/API پنل نیک‌اس‌ام‌اس مسدود است؛ از پشتیبانی یا تنظیمات پنل فعال کنید",
  CheckedByAi: "پیامک توسط سیستم بررسی محتوا متوقف شده است",
  HavePendingFilter: "پیامک در صف بررسی فیلتر است",
  LinkNotAllowed: "ارسال لینک در متن پیامک مجاز نیست",
};

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Panel GetSenderNumbers returns 98-prefixed lines (e.g. 985000403011).
 * REST v2 often wants the bare line without 98.
 */
function normalizeNiksmsSender(sender, { forRest = false } = {}) {
  const raw = String(sender || "").trim();
  if (!raw) return "";
  if (forRest) {
    return raw.replace(/^98/, "");
  }
  if (/^98\d+$/.test(raw)) return raw;
  if (/^3000\d+$/.test(raw) || /^5000\d+$/.test(raw) || /^9000\d+$/.test(raw)) {
    return `98${raw}`;
  }
  return raw;
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

/**
 * Parse v2 SendOne / public API JSON. Prefer string Id from raw text
 * (JSON numbers can exceed Number.MAX_SAFE_INTEGER).
 */
function parsePublicApiPayload(rawText) {
  const text = String(rawText || "").trim();
  let parsed;
  try {
    parsed = JSON.parse(text);
    if (typeof parsed === "string") {
      parsed = JSON.parse(parsed);
    }
  } catch {
    parsed = null;
  }

  const data = parsed?.Data && typeof parsed.Data === "object" ? parsed.Data : parsed;
  const idMatch = text.match(/"Id"\s*:\s*"([^"]+)"/i) || text.match(/"Id"\s*:\s*([0-9]+)/i);
  const nikIdMatch = text.match(/"NikId"\s*:\s*"([^"]+)"/i) || text.match(/"NikId"\s*:\s*([0-9]+)/i);

  let nikIds = [];
  if (Array.isArray(data?.NikIds) && data.NikIds.length) {
    nikIds = data.NikIds.map((v) => String(v));
  } else {
    const nikMatches = [...text.matchAll(/"NikIds"\s*:\s*\[([^\]]*)\]/gi)];
    if (nikMatches.length) {
      nikIds = nikMatches[0][1]
        .split(",")
        .map((s) => s.replace(/["\\\s]/g, "").trim())
        .filter(Boolean);
    }
  }

  const id =
    data?.Id != null && String(data.Id) !== ""
      ? String(data.Id)
      : idMatch?.[1] || "";

  const nikId =
    data?.NikId != null && String(data.NikId) !== ""
      ? String(data.NikId)
      : nikIdMatch?.[1] || "";

  if (nikId) {
    nikIds = [nikId, ...nikIds.filter((n) => n !== nikId)];
  }
  if (id && (!nikIds.length || nikIds.some((n) => n !== id && n.startsWith(id.slice(0, 12))))) {
    nikIds = [id, ...nikIds.filter((n) => n !== id)];
  }

  const status = data?.Status ?? parsed?.Status ?? "";

  return {
    status,
    id: id || nikId,
    warningMessage: data?.WarningMessage || parsed?.WarningMessage || "",
    nikIds: nikIds.length ? nikIds : id || nikId ? [id || nikId] : [],
    raw: text.slice(0, 400),
  };
}

/**
 * Niksms provider — primary: API v2 SendOne (form-urlencoded, recipient 09…).
 * This is the path that actually debits panel credit on this account.
 * Fallback: official SOAP GroupSms (panel WSDL) on transport failures only.
 */
class NiksmsProvider {
  constructor({ username, password, sender, endpoint, restUrl, timeoutMs, otpTtlSeconds }) {
    this.username = username;
    this.password = password;
    this.sender = String(sender || "").trim();
    this.soapEndpoint = String(endpoint || DEFAULT_SOAP_ENDPOINT)
      .replace(/\?wsdl$/i, "")
      .replace(/\/$/, "");
    this.restUrl = String(restUrl || DEFAULT_REST_URL).replace(/\/$/, "");
    this.timeoutMs = timeoutMs;
    this.otpTtlSeconds = otpTtlSeconds;
  }

  async send({ phone, code, purpose }) {
    const ttlMinutes = Math.max(1, Math.ceil(this.otpTtlSeconds / 60));
    const message = `کد تایید شما: ${code} اعتبار: ${ttlMinutes} دقیقه`;
    return this.#sendOtpSms({ phone, message, purpose, mode: "otp_text" });
  }

  async sendText({ phone, message, purpose = "notification" }) {
    return this.#sendOtpSms({
      phone,
      message: String(message || "").replace(/\s+/g, " ").trim().slice(0, 900),
      purpose,
      mode: "notification_text",
    });
  }

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
    if (statuses.length) return statuses;
    const nested = extractAllTags(resultBlock, "string");
    if (nested.length) return nested;
    return resultBlock ? [resultBlock] : [];
  }

  async #sendOtpSms({ phone, message, purpose, mode }) {
    logEvent("SMS_SEND_STARTED", {
      provider: "niksms",
      phoneMasked: maskPhone(phone),
      purpose,
      mode,
      transport: "rest",
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

      // Live account: API v2 SendOne with 09… actually debits credit.
      // Official SOAP GroupSms often returns Successful without debiting / delivering.
      const recipient09 = toNiksmsRecipient(phone);
      const senderBare = normalizeNiksmsSender(this.sender, { forRest: true });
      const senderSoap = normalizeNiksmsSender(this.sender, { forRest: false });
      const clientMessageId = String(Date.now());

      let result;
      try {
        result = await this.#sendViaRest({
          recipient09,
          senderBare,
          message,
          clientMessageId,
        });
        this.#assertAccepted(result);
      } catch (restError) {
        const canFallback =
          restError?.details?.reason === "http_error" ||
          restError?.code === SMS_ERROR_CODES.SMS_PROVIDER_UNAVAILABLE ||
          restError?.code === SMS_ERROR_CODES.SMS_PROVIDER_TIMEOUT;

        if (!canFallback) {
          throw restError;
        }

        logEvent("SMS_REST_FALLBACK_SOAP", {
          provider: "niksms",
          phoneMasked: maskPhone(phone),
          reason: restError?.details?.reason || restError?.code || "rest_failed",
          httpStatus: restError?.details?.httpStatus,
          providerStatus: restError?.details?.providerStatus,
        });

        result = await this.#sendViaSoap({
          recipient09,
          senderSoap,
          message,
          clientMessageId,
        });
        this.#assertAccepted(result);
      }

      const messageId = result.nikIds[0] || result.id || clientMessageId;

      logEvent("SMS_SEND_SUCCESS", {
        provider: "niksms",
        phoneMasked: maskPhone(phone),
        purpose,
        messageId,
        providerStatus: String(result.status),
        transport: result.transport || "rest",
      });

      return {
        delivered: true,
        channel: "sms",
        provider: "niksms",
        messageId: String(messageId),
        nikIds: result.nikIds,
        providerStatus: String(result.status),
      };
    } catch (error) {
      logError("SMS_SEND_FAILED", error, {
        provider: "niksms",
        phoneMasked: maskPhone(phone),
        purpose,
        smsErrorCode: error?.code,
        providerStatus: error?.details?.providerStatus,
        httpStatus: error?.details?.httpStatus,
        warningMessage: error?.details?.warningMessage,
      });
      throw error;
    }
  }

  /**
   * Official GroupSms SOAP — matches panel node.js sample.
   * SendOn omitted for immediate send (docs: optional; wrong format prevents real queue).
   */
  async #sendViaSoap({ recipient09, senderSoap, message, clientMessageId }) {
    const modelParts = [
      senderSoap ? `<SenderNumber>${escapeXml(senderSoap)}</SenderNumber>` : "<SenderNumber />",
      `<Numbers><string>${escapeXml(recipient09)}</string></Numbers>`,
      "<SendType>Normal</SendType>",
      `<YourMessageId><long>${escapeXml(clientMessageId)}</long></YourMessageId>`,
      `<Message>${escapeXml(message)}</Message>`,
    ];

    const soapBody = `
      <GroupSms xmlns="${TEMPURI_NS}">
        ${this.#securityXml()}
        <model>
          ${modelParts.join("\n          ")}
        </model>
      </GroupSms>`;

    const xml = await this.#soapCall("GroupSms", soapBody);
    const block = extractTag(xml, "GroupSmsResult");
    if (!block) {
      throw new SmsProviderError("پاسخ نامعتبر از سرویس پیامک", {
        code: SMS_ERROR_CODES.SMS_DELIVERY_FAILED,
        statusCode: 502,
        details: { reason: "missing_result", transport: "soap" },
      });
    }

    const status = extractTag(block, "Status") || "";
    const id = extractTag(block, "Id") || "";
    const warningMessage = extractTag(block, "WarningMessage") || "";
    const nikIds = extractAllTags(extractTag(block, "NikIds") || "", "long").filter(Boolean);

    return {
      status,
      id,
      warningMessage,
      nikIds: nikIds.length ? nikIds : id ? [id] : [],
      transport: "soap",
    };
  }

  async #sendViaRest({ recipient09, senderBare, message, clientMessageId }) {
    const body = new URLSearchParams({
      username: this.username,
      password: this.password,
      message: String(message),
      senderNumber: senderBare,
      sendDate: "",
      recipient: recipient09,
      localId: String(clientMessageId || Date.now()),
    });

    const response = await fetchWithTimeout(
      this.restUrl,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body,
      },
      this.timeoutMs,
    );

    const rawText = await response.text();
    if (!response.ok) {
      throw new SmsProviderError("ارسال پیامک ناموفق بود", {
        code: SMS_ERROR_CODES.SMS_DELIVERY_FAILED,
        statusCode: 502,
        details: {
          httpStatus: response.status,
          reason: "http_error",
          raw: String(rawText || "").slice(0, 200),
        },
      });
    }

    const result = parsePublicApiPayload(rawText);
    result.transport = "rest";
    return result;
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
      this.soapEndpoint,
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
        details: { httpStatus: response.status, reason: "http_error" },
      });
    }
    return text;
  }

  #assertAccepted(result) {
    const status = result?.status;
    if (SUCCESS_STATUSES.has(status) || SUCCESS_STATUSES.has(String(status))) {
      return;
    }

    const statusKey = status;
    const authFailure = status === "InvalidUserNameOrPass" || status === "19" || status === 19;
    const configFailure =
      status === "PrivateNumberIsIncorrect" ||
      status === "PrivateNumberIsDisable" ||
      status === "UserApiBlocked" ||
      status === "UserIsWaitForApprove" ||
      status === "PanelIsBlocked" ||
      status === "PanelExpired" ||
      status === 7 ||
      status === 10 ||
      status === 14 ||
      status === 18;

    const message = STATUS_MESSAGES[statusKey] || STATUS_MESSAGES[String(statusKey)] || "ارسال پیامک ناموفق بود";

    throw new SmsProviderError(message, {
      code:
        authFailure || configFailure
          ? SMS_ERROR_CODES.SMS_CONFIGURATION_ERROR
          : SMS_ERROR_CODES.SMS_DELIVERY_FAILED,
      statusCode: 502,
      details: {
        providerStatus: status != null && status !== "" ? String(status) : "unknown",
        reason: authFailure ? "invalid_credentials" : configFailure ? "provider_config" : "provider_rejected",
        warningMessage: result?.warningMessage || undefined,
      },
    });
  }
}

module.exports = {
  NiksmsProvider,
  NIKSMS_DEFAULT_ENDPOINT: DEFAULT_SOAP_ENDPOINT,
  NIKSMS_DEFAULT_REST_URL: DEFAULT_REST_URL,
  NIKSMS_SUCCESS_STATUSES: SUCCESS_STATUSES,
  normalizeNiksmsSender,
  parsePublicApiPayload,
};
