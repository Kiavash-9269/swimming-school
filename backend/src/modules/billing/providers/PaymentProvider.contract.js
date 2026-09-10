/**
 * Payment provider contract (duck-typed).
 *
 * Core checkout owns amount, status, enrollment, idempotency.
 * Adapters own PSP request/verify/refund protocols.
 *
 * Implementations: mockProvider, zarinpalProvider.
 * New Shaparak-compatible PSP = new adapter registered in createPaymentProvider.
 *
 * Methods:
 * - createPayment({ amount, paymentId, description?, idempotencyKey? })
 *     → { provider, providerRef, authority, redirectUrl, requiresRedirect, zeroAmount? }
 * - verifyPayment({ payment, authority?, providerRef?, reportedAmount?, intentSuccess? })
 *     → { ok, amount?, providerRef?, code?, reason?, gatewayCode? }
 * - refund({ payment })
 *     → { ok, refundRef?, deferred?, reason? }
 *
 * Never expose merchant secrets to frontend.
 */
module.exports = {};
