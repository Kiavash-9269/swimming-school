const { logEvent } = require("../../../services/logging");

/**
 * Email provider boundary — no real SMTP credentials invented.
 * mock/log only until production email infrastructure is configured.
 */
class MockEmailProvider {
  constructor(name = "mock") {
    this.name = name;
  }

  async send({ to, subject, body }) {
    logEvent("EMAIL_SEND_SUCCESS", {
      provider: this.name,
      toMasked: String(to || "").replace(/(.{2}).+(@.+)/, "$1***$2"),
      subject: String(subject || "").slice(0, 80),
      bodyLength: String(body || "").length,
    });
    return {
      delivered: true,
      channel: "email",
      provider: this.name,
      messageId: `email_${Date.now()}`,
    };
  }
}

function createEmailProvider(config) {
  const name = config.EMAIL_PROVIDER || "mock";
  return new MockEmailProvider(name === "log" ? "log" : "mock");
}

module.exports = {
  MockEmailProvider,
  createEmailProvider,
};
