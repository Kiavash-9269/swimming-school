const { isValidIranianMobile } = require("../../utils/phone");
const { SmsProviderError, SMS_ERROR_CODES } = require("./errors");

/**
 * sms-webservice Destination examples use digits without country code, often without leading 0.
 * Official Send docs also accept 09... and +989... for Recipients.
 */
function toSmsWebserviceDestination(canonicalPhone) {
  if (!isValidIranianMobile(canonicalPhone)) {
    throw new SmsProviderError("شماره موبایل برای ارسال پیامک معتبر نیست", {
      code: SMS_ERROR_CODES.INVALID_PHONE_FOR_PROVIDER,
      statusCode: 400,
    });
  }
  return canonicalPhone.slice(1);
}

function toSmsWebserviceRecipient(canonicalPhone) {
  if (!isValidIranianMobile(canonicalPhone)) {
    throw new SmsProviderError("شماره موبایل برای ارسال پیامک معتبر نیست", {
      code: SMS_ERROR_CODES.INVALID_PHONE_FOR_PROVIDER,
      statusCode: 400,
    });
  }
  return canonicalPhone;
}

/** Kavenegar accepts 09xxxxxxxxx */
function toKavenegarReceptor(canonicalPhone) {
  if (!isValidIranianMobile(canonicalPhone)) {
    throw new SmsProviderError("شماره موبایل برای ارسال پیامک معتبر نیست", {
      code: SMS_ERROR_CODES.INVALID_PHONE_FOR_PROVIDER,
      statusCode: 400,
    });
  }
  return canonicalPhone;
}

/**
 * Niksms SOAP GroupSms / API v2: use 09xxxxxxxxxx (canonical).
 * Sending 98… often returns Successful without debiting credit.
 */
function toNiksmsRecipient(canonicalPhone) {
  if (!isValidIranianMobile(canonicalPhone)) {
    throw new SmsProviderError("شماره موبایل برای ارسال پیامک معتبر نیست", {
      code: SMS_ERROR_CODES.INVALID_PHONE_FOR_PROVIDER,
      statusCode: 400,
    });
  }
  return canonicalPhone;
}

/** Legacy helper: 98xxxxxxxxxx (kept for callers that still need it). */
function toNiksmsNumber(canonicalPhone) {
  if (!isValidIranianMobile(canonicalPhone)) {
    throw new SmsProviderError("شماره موبایل برای ارسال پیامک معتبر نیست", {
      code: SMS_ERROR_CODES.INVALID_PHONE_FOR_PROVIDER,
      statusCode: 400,
    });
  }
  return `98${canonicalPhone.slice(1)}`;
}

module.exports = {
  toSmsWebserviceDestination,
  toSmsWebserviceRecipient,
  toKavenegarReceptor,
  toNiksmsNumber,
  toNiksmsRecipient,
};
