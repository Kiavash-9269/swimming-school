const { logEvent } = require("../../logging");
const { maskPhone } = require("../../../utils/mask");

class DevelopmentDeliveryAdapter {
  async send({ phone, code, purpose }) {
    logEvent("SMS_SEND_SUCCESS", {
      provider: "development",
      phoneMasked: maskPhone(phone),
      purpose,
      channel: "development",
    });

    return { delivered: true, channel: "development", provider: "development", code };
  }

  /** General notification text — reuses same adapter, never logs message body. */
  async sendText({ phone, message, purpose = "notification" }) {
    logEvent("SMS_SEND_SUCCESS", {
      provider: "development",
      phoneMasked: maskPhone(phone),
      purpose,
      channel: "development",
      mode: "text",
      bodyLength: String(message || "").length,
    });
    return {
      delivered: true,
      channel: "sms",
      provider: "development",
      messageId: `dev_${Date.now()}`,
    };
  }
}

module.exports = {
  DevelopmentDeliveryAdapter,
};
