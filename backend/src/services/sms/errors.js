const { AppError } = require("../../utils/AppError");

const SMS_ERROR_CODES = {
  SMS_DELIVERY_FAILED: "SMS_DELIVERY_FAILED",
  SMS_PROVIDER_UNAVAILABLE: "SMS_PROVIDER_UNAVAILABLE",
  SMS_PROVIDER_TIMEOUT: "SMS_PROVIDER_TIMEOUT",
  SMS_CONFIGURATION_ERROR: "SMS_CONFIGURATION_ERROR",
  INVALID_PHONE_FOR_PROVIDER: "INVALID_PHONE_FOR_PROVIDER",
};

class SmsProviderError extends AppError {
  constructor(message, { code = SMS_ERROR_CODES.SMS_DELIVERY_FAILED, statusCode = 502, details } = {}) {
    super(message, { statusCode, code, details });
    this.name = "SmsProviderError";
  }
}

module.exports = {
  SMS_ERROR_CODES,
  SmsProviderError,
};
