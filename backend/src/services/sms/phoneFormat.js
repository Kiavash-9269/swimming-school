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

module.exports = {
  toSmsWebserviceDestination,
  toSmsWebserviceRecipient,
  toKavenegarReceptor,
};
