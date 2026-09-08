const { generateOpaqueToken } = require("../../../utils/cryptoHash");
const { AppError } = require("../../../utils/AppError");

/**
 * Mock gateway for tests/dev. Never marks success without explicit verify intent.
 */
class MockPaymentProvider {
  constructor({ callbackBaseUrl } = {}) {
    this.name = "mock";
    this.callbackBaseUrl = callbackBaseUrl || "";
  }

  async createPayment({ amount, paymentId, idempotencyKey }) {
    if (amount < 0) {
      throw new AppError("مبلغ نامعتبر است", { statusCode: 400, code: "INVALID_AMOUNT" });
    }

    if (amount === 0) {
      return {
        provider: this.name,
        providerRef: `mock_free_${String(paymentId).slice(-8)}`,
        authority: `free_${idempotencyKey || paymentId}`,
        redirectUrl: null,
        requiresRedirect: false,
        zeroAmount: true,
      };
    }

    const providerRef = `mock_${generateOpaqueToken().slice(0, 16)}`;
    return {
      provider: this.name,
      providerRef,
      authority: providerRef,
      redirectUrl: `${this.callbackBaseUrl || "/api/payments/callback"}?authority=${providerRef}`,
      requiresRedirect: true,
      zeroAmount: false,
    };
  }

  /**
   * Server-side verification. Does not trust client alone.
   * @param {{ payment, authority?, providerRef?, reportedAmount?, intentSuccess? }}
   */
  async verifyPayment({ payment, authority, providerRef, reportedAmount, intentSuccess = true }) {
    const ref = providerRef || authority || "";

    // Test/dev failure injection via payment.metadata (never used in production flows)
    if (payment.metadata?.simulateTimeout) {
      throw new AppError("درگاه پاسخ نداد", { statusCode: 504, code: "GATEWAY_TIMEOUT" });
    }
    if (payment.metadata?.simulateNetworkError) {
      throw new AppError("خطای شبکه درگاه", { statusCode: 502, code: "GATEWAY_NETWORK_ERROR" });
    }

    if (payment.amount === 0) {
      return { ok: true, amount: 0, providerRef: payment.providerRef || ref };
    }

    if (intentSuccess === false) {
      return { ok: false, reason: "USER_CANCELLED", code: "PAYMENT_CANCELLED" };
    }

    if (payment.providerRef && ref && ref !== payment.providerRef && ref !== payment.authority) {
      return { ok: false, reason: "INVALID_AUTHORITY", code: "INVALID_AUTHORITY" };
    }

    if (payment.metadata?.simulateAmountMismatch) {
      return {
        ok: true,
        amount: Math.max(0, Number(payment.amount) - 1),
        providerRef: payment.providerRef || ref,
      };
    }

    if (reportedAmount != null && Number(reportedAmount) !== Number(payment.amount)) {
      return { ok: false, reason: "AMOUNT_MISMATCH", code: "AMOUNT_MISMATCH" };
    }

    return {
      ok: true,
      amount: payment.amount,
      providerRef: payment.providerRef || ref,
    };
  }

  async refund({ payment }) {
    return {
      ok: true,
      refundRef: `mock_refund_${String(payment._id).slice(-8)}`,
      deferred: false,
    };
  }
}

module.exports = { MockPaymentProvider };
