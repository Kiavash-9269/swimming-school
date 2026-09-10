const { env } = require("../../../config/env");
const { MockPaymentProvider } = require("./mockProvider");
const { AppError } = require("../../../utils/AppError");
// Duck-typed contract: ./PaymentProvider.contract.js (initiate / verify / refund)

function createPaymentProvider(config = env) {
  const name = config.PAYMENT_PROVIDER || "mock";
  if (name === "mock") {
    return new MockPaymentProvider({
      callbackBaseUrl: config.PAYMENT_CALLBACK_URL || "",
    });
  }

  if (name === "zarinpal") {
    // Lazy-load so mock tests never require merchant credentials.
    const { ZarinpalPaymentProvider } = require("./zarinpalProvider");
    return new ZarinpalPaymentProvider(config);
  }

  throw new AppError(`Unsupported PAYMENT_PROVIDER: ${name}`, {
    statusCode: 500,
    code: "PAYMENT_PROVIDER_UNSUPPORTED",
  });
}

module.exports = {
  createPaymentProvider,
};
