const { DevelopmentDeliveryAdapter } = require("./providers/developmentProvider");
const { SmsWebserviceProvider } = require("./providers/smsWebserviceProvider");
const { KavenegarProvider } = require("./providers/kavenegarProvider");
const { SmsProviderError, SMS_ERROR_CODES } = require("./errors");

function requireCredential(value, name) {
  if (!value || !String(value).trim()) {
    throw new SmsProviderError(`Missing required SMS configuration: ${name}`, {
      code: SMS_ERROR_CODES.SMS_CONFIGURATION_ERROR,
      statusCode: 500,
    });
  }
  return String(value).trim();
}

/**
 * Environment-driven SMS provider factory.
 * No silent fallback between providers.
 */
function createSmsProvider(env) {
  const provider = env.SMS_PROVIDER;

  if (provider === "development") {
    if (env.NODE_ENV === "production") {
      throw new SmsProviderError("Development SMS provider is not allowed in production", {
        code: SMS_ERROR_CODES.SMS_CONFIGURATION_ERROR,
        statusCode: 500,
      });
    }
    return new DevelopmentDeliveryAdapter();
  }

  if (provider === "sms-webservice") {
    const apiKey = requireCredential(env.SMS_WEBSERVICE_API_KEY, "SMS_WEBSERVICE_API_KEY");
    const templateKey = env.SMS_WEBSERVICE_TEMPLATE_KEY?.trim() || "";
    const sender = env.SMS_WEBSERVICE_SENDER?.trim() || "";

    if (!templateKey && !sender) {
      throw new SmsProviderError(
        "sms-webservice requires SMS_WEBSERVICE_TEMPLATE_KEY or SMS_WEBSERVICE_SENDER",
        {
          code: SMS_ERROR_CODES.SMS_CONFIGURATION_ERROR,
          statusCode: 500,
        },
      );
    }

    return new SmsWebserviceProvider({
      apiKey,
      sender,
      templateKey,
      timeoutMs: env.SMS_TIMEOUT_MS,
      otpTtlSeconds: env.OTP_TTL_SECONDS,
      baseUrl: env.SMS_WEBSERVICE_BASE_URL,
    });
  }

  if (provider === "kavenegar") {
    const apiKey = requireCredential(env.KAVENEGAR_API_KEY, "KAVENEGAR_API_KEY");
    const template = requireCredential(env.KAVENEGAR_TEMPLATE, "KAVENEGAR_TEMPLATE");
    const sender = env.KAVENEGAR_SENDER?.trim() || "";

    return new KavenegarProvider({
      apiKey,
      template,
      sender,
      timeoutMs: env.SMS_TIMEOUT_MS,
    });
  }

  throw new SmsProviderError(`Unsupported SMS_PROVIDER: ${provider}`, {
    code: SMS_ERROR_CODES.SMS_CONFIGURATION_ERROR,
    statusCode: 500,
  });
}

module.exports = {
  createSmsProvider,
};
