const { env } = require("../../../config/env");
const { AppError } = require("../../../utils/AppError");

/**
 * Production-ready Zarinpal boundary.
 * Requires ZARINPAL_MERCHANT_ID (and optional sandbox flag). Does not invent credentials.
 * Not live-tested without merchant credentials.
 */
class ZarinpalPaymentProvider {
  constructor(config = env) {
    this.name = "zarinpal";
    this.merchantId = config.ZARINPAL_MERCHANT_ID || "";
    this.callbackUrl = config.PAYMENT_CALLBACK_URL || "";
    this.sandbox = String(config.ZARINPAL_SANDBOX || "").toLowerCase() === "true";
    this.baseUrl = this.sandbox
      ? "https://sandbox.zarinpal.com/pg/v4/payment"
      : "https://api.zarinpal.com/pg/v4/payment";

    if (!this.merchantId) {
      throw new AppError("ZARINPAL_MERCHANT_ID is not configured", {
        statusCode: 500,
        code: "PAYMENT_PROVIDER_MISCONFIGURED",
      });
    }
    if (!this.callbackUrl) {
      throw new AppError("PAYMENT_CALLBACK_URL is required for zarinpal", {
        statusCode: 500,
        code: "PAYMENT_PROVIDER_MISCONFIGURED",
      });
    }
  }

  async createPayment({ amount, paymentId, description }) {
    if (amount === 0) {
      return {
        provider: this.name,
        providerRef: `zp_free_${String(paymentId).slice(-8)}`,
        authority: `free_${paymentId}`,
        redirectUrl: null,
        requiresRedirect: false,
        zeroAmount: true,
      };
    }

    const response = await fetch(`${this.baseUrl}/request.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        merchant_id: this.merchantId,
        amount,
        callback_url: this.callbackUrl,
        description: description || `payment:${paymentId}`,
        metadata: { payment_id: String(paymentId) },
      }),
      signal: AbortSignal.timeout(env.PAYMENT_TIMEOUT_MS || 15000),
    });

    const payload = await response.json().catch(() => ({}));
    const authority = payload?.data?.authority;
    const code = payload?.data?.code;
    if (!authority || code !== 100) {
      throw new AppError("درگاه پرداخت در دسترس نیست", {
        statusCode: 502,
        code: "GATEWAY_INIT_FAILED",
      });
    }

    const startPayHost = this.sandbox
      ? "https://sandbox.zarinpal.com/pg/StartPay"
      : "https://www.zarinpal.com/pg/StartPay";

    return {
      provider: this.name,
      providerRef: authority,
      authority,
      redirectUrl: `${startPayHost}/${authority}`,
      requiresRedirect: true,
      zeroAmount: false,
    };
  }

  async verifyPayment({ payment, authority, providerRef, reportedAmount, intentSuccess = true }) {
    if (payment.amount === 0) {
      return { ok: true, amount: 0, providerRef: payment.providerRef };
    }
    if (intentSuccess === false) {
      return { ok: false, reason: "USER_CANCELLED", code: "PAYMENT_CANCELLED" };
    }

    const auth = authority || providerRef || payment.authority;
    if (!auth) {
      return { ok: false, reason: "MISSING_AUTHORITY", code: "INVALID_AUTHORITY" };
    }

    // Bind return authority to the payment's stored authority/providerRef (same as mock).
    const expected = payment.authority || payment.providerRef;
    if (expected && String(auth) !== String(expected)) {
      return { ok: false, reason: "AUTHORITY_MISMATCH", code: "INVALID_AUTHORITY" };
    }

    const response = await fetch(`${this.baseUrl}/verify.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        merchant_id: this.merchantId,
        amount: payment.amount,
        authority: auth,
      }),
      signal: AbortSignal.timeout(env.PAYMENT_TIMEOUT_MS || 15000),
    });

    const payload = await response.json().catch(() => ({}));
    const code = payload?.data?.code;
    const verifiedAmount = payload?.data?.amount ?? reportedAmount;

    // 100 = first verify success, 101 = already verified
    if (code !== 100 && code !== 101) {
      return { ok: false, reason: "VERIFY_FAILED", code: "PAYMENT_FAILED" };
    }
    if (verifiedAmount != null && Number(verifiedAmount) !== Number(payment.amount)) {
      return { ok: false, reason: "AMOUNT_MISMATCH", code: "AMOUNT_MISMATCH" };
    }

    return {
      ok: true,
      amount: payment.amount,
      providerRef: auth,
      gatewayCode: code,
    };
  }

  async refund() {
    return {
      ok: false,
      deferred: true,
      reason: "ZARINPAL_REFUND_NOT_WIRED",
    };
  }
}

module.exports = { ZarinpalPaymentProvider };
