const { env } = require("../config/env");
const { logError } = require("./logging");
const { maskPhone } = require("../utils/mask");
const { createSmsProvider } = require("./sms/createProvider");
const { DevelopmentDeliveryAdapter } = require("./sms/providers/developmentProvider");
const { SmsWebserviceProvider } = require("./sms/providers/smsWebserviceProvider");
const { KavenegarProvider } = require("./sms/providers/kavenegarProvider");
const { SmsProviderError, SMS_ERROR_CODES } = require("./sms/errors");

/**
 * OTP delivery abstraction.
 *
 * Auth calls deliver({ phone, code, purpose }) only.
 * Provider selection is environment-driven via createSmsProvider.
 */
class OtpDeliveryService {
  constructor(adapter = createSmsProvider(env)) {
    this.adapter = adapter;
  }

  setAdapter(adapter) {
    this.adapter = adapter;
  }

  resetAdapter() {
    this.adapter = createSmsProvider(env);
  }

  async deliver({ phone, code, purpose }) {
    try {
      const result = await this.adapter.send({ phone, code, purpose });
      if (!result?.delivered) {
        throw new SmsProviderError("ارسال پیامک ناموفق بود", {
          code: SMS_ERROR_CODES.SMS_DELIVERY_FAILED,
        });
      }
      return result;
    } catch (error) {
      logError("OTP_DELIVERY_FAILED", error, {
        phoneMasked: maskPhone(phone),
        purpose,
        provider: this.adapter?.constructor?.name,
        code: error?.code,
      });
      throw error;
    }
  }

  /**
   * Only expose OTP to API consumers outside production.
   */
  maybeExposeDevOtp(code) {
    if (env.NODE_ENV === "production") {
      return undefined;
    }
    if (env.SMS_PROVIDER !== "development") {
      return undefined;
    }
    return code;
  }
}

const otpDeliveryService = new OtpDeliveryService();

module.exports = {
  OtpDeliveryService,
  DevelopmentDeliveryAdapter,
  SmsWebserviceProvider,
  KavenegarProvider,
  SmsProviderError,
  SMS_ERROR_CODES,
  createSmsProvider,
  otpDeliveryService,
};
