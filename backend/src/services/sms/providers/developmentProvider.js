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
}

module.exports = {
  DevelopmentDeliveryAdapter,
};
