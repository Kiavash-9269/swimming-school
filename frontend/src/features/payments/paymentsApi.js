import { apiRequest } from "../../services/api/http";
import { getPayment } from "../enrollments/enrollmentsApi";

/**
 * ADMIN payment operations — verified `/api/payments*` only.
 * Expire job intentionally NOT wrapped for UI (mutating batch maintenance).
 */

function toQuery(params = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    q.set(key, String(value));
  });
  const s = q.toString();
  return s ? `?${s}` : "";
}

/** GET /api/payments — ADMIN list; limit 1–200, no page cursor */
export function listAdminPayments({ status, userId, classId, limit = 50, signal } = {}) {
  return apiRequest(
    `/payments${toQuery({ status, userId, classId, limit })}`,
    { method: "GET", auth: true, signal },
  );
}

export { getPayment };

/**
 * POST /api/payments/card-to-card — the family reports a card transfer
 * (and ticks the confirmation box in the panel) so an admin can approve it.
 */
export function startCardToCardPayment(
  { enrollmentId, trackingCode, note } = {},
  { signal } = {},
) {
  return apiRequest("/payments/card-to-card", {
    method: "POST",
    auth: true,
    body: { enrollmentId, trackingCode, note },
    signal,
  });
}

/** POST /api/payments/:id/confirm — ADMIN approves a reported card transfer. */
export function confirmCardToCardPayment(paymentId, { signal } = {}) {
  return apiRequest(`/payments/${paymentId}/confirm`, {
    method: "POST",
    auth: true,
    body: {},
    signal,
  });
}

/** POST /api/payments/:id/reject — ADMIN rejects a reported card transfer. */
export function rejectCardToCardPayment(paymentId, { reason } = {}, { signal } = {}) {
  return apiRequest(`/payments/${paymentId}/reject`, {
    method: "POST",
    auth: true,
    body: { reason },
    signal,
  });
}

/** POST /api/payments/:id/refund — empty body; ADMIN */
export function requestPaymentRefund(paymentId, { signal } = {}) {
  return apiRequest(`/payments/${paymentId}/refund`, {
    method: "POST",
    auth: true,
    body: {},
    signal,
  });
}

/**
 * GET /api/payments/jobs/reconcile — DETECT_ONLY_NO_AUTO_MUTATION.
 * Safe read-only findings for Admin ops visibility.
 */
export function reconcilePayments({ limit = 50, signal } = {}) {
  return apiRequest(`/payments/jobs/reconcile${toQuery({ limit })}`, {
    method: "GET",
    auth: true,
    signal,
  });
}
