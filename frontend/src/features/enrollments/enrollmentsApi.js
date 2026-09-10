import { apiRequest, apiUpload, apiDownloadBlob } from "../../services/api/http";

/**
 * F5–F8 enrollments APIs — audited real endpoints only.
 */

export function checkEligibility(classId, participantId, { signal } = {}) {
  return apiRequest("/enrollments/eligibility/check", {
    method: "POST",
    auth: true,
    body: { classId, participantId },
    signal,
  });
}

export function getClassAvailability(classId, { signal } = {}) {
  return apiRequest(`/enrollments/classes/${classId}/availability`, {
    method: "GET",
    auth: true,
    signal,
  });
}

/**
 * @param {string} classId
 * @param {string} participantId
 * @param {string} idempotencyKey — client-generated, min 8 chars (backend Zod)
 */
export function createReservation(classId, participantId, idempotencyKey, { signal } = {}) {
  return apiRequest("/enrollments/reservations", {
    method: "POST",
    auth: true,
    body: { classId, participantId, idempotencyKey },
    signal,
  });
}

export function joinWaitlist(classId, participantId, { signal } = {}) {
  return apiRequest("/enrollments/waitlist", {
    method: "POST",
    auth: true,
    body: { classId, participantId },
    signal,
  });
}

/**
 * Checkout start — body per enrollment.validation confirmEnrollmentBody.
 * @returns {{ enrollment, payment, quote, gateway, alreadyExists }}
 */
export function confirmEnrollment(reservationId, { discountCode, idempotencyKey, signal } = {}) {
  const body = { reservationId };
  if (discountCode) body.discountCode = discountCode;
  if (idempotencyKey) body.idempotencyKey = idempotencyKey;
  return apiRequest("/enrollments/confirm", {
    method: "POST",
    auth: true,
    body,
    signal,
  });
}

/**
 * Authoritative payment verification (never trust query params alone).
 * Body per paymentCallbackBody — no amount fields.
 */
export function submitPaymentCallback(
  { paymentId, success, authority, providerRef },
  { signal } = {},
) {
  const body = { paymentId, success: Boolean(success) };
  if (authority) body.authority = authority;
  if (providerRef) body.providerRef = providerRef;
  return apiRequest("/enrollments/payments/callback", {
    method: "POST",
    auth: true,
    body,
    signal,
  });
}

export function getPayment(paymentId, { signal } = {}) {
  return apiRequest(`/payments/${paymentId}`, {
    method: "GET",
    auth: true,
    signal,
  });
}

export function getEnrollment(enrollmentId, { signal } = {}) {
  return apiRequest(`/enrollments/${enrollmentId}`, {
    method: "GET",
    auth: true,
    signal,
  });
}

/** Owner list — `{ items }` · sorted createdAt desc · max 200 · no query filters. */
export function getMyEnrollments({ signal } = {}) {
  return apiRequest("/enrollments/me", {
    method: "GET",
    auth: true,
    signal,
  });
}

/** Empty body. Idempotent for CANCELLED/COMPLETED/REFUNDED. */
export function cancelEnrollment(enrollmentId, { signal } = {}) {
  return apiRequest(`/enrollments/${enrollmentId}/cancel`, {
    method: "POST",
    auth: true,
    body: {},
    signal,
  });
}

/* ——— Participant compliance (F6) — real /api/enrollments/participants/... ——— */

export function listInsurance(participantId, { signal } = {}) {
  return apiRequest(`/enrollments/participants/${participantId}/insurance`, {
    method: "GET",
    auth: true,
    signal,
  });
}

export function listMedicalDocuments(participantId, { signal } = {}) {
  return apiRequest(`/enrollments/participants/${participantId}/medical`, {
    method: "GET",
    auth: true,
    signal,
  });
}

export function getMedicalProfile(participantId, { signal } = {}) {
  return apiRequest(`/enrollments/participants/${participantId}/medical-profile`, {
    method: "GET",
    auth: true,
    signal,
  });
}

/** USER: status defaults PENDING; cannot set APPROVED. */
export function submitInsuranceRecord(participantId, body, { signal } = {}) {
  return apiRequest(`/enrollments/participants/${participantId}/insurance`, {
    method: "POST",
    auth: true,
    body,
    signal,
  });
}

export function submitMedicalRecord(participantId, body, { signal } = {}) {
  return apiRequest(`/enrollments/participants/${participantId}/medical`, {
    method: "POST",
    auth: true,
    body,
    signal,
  });
}

/**
 * Multipart upload — field name must be `file` (multer singleDocumentUpload).
 * Optional fields: providerName, policyRef, startDate, expiresAt, documentType
 */
export function uploadInsuranceDocument(participantId, formData, { signal } = {}) {
  return apiUpload(`/enrollments/participants/${participantId}/insurance/upload`, formData, {
    method: "POST",
    auth: true,
    signal,
  });
}

export function uploadMedicalDocument(participantId, formData, { signal } = {}) {
  return apiUpload(`/enrollments/participants/${participantId}/medical/upload`, formData, {
    method: "POST",
    auth: true,
    signal,
  });
}

/** USER cannot set approvalStatus (admin-only). */
export function upsertMedicalProfile(participantId, body, { signal } = {}) {
  return apiRequest(`/enrollments/participants/${participantId}/medical-profile`, {
    method: "PUT",
    auth: true,
    body,
    signal,
  });
}

/* ——— ADMIN compliance (F8) — authorize("ADMIN") on backend ——— */

function toQuery(params = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      q.set(key, String(value));
    }
  });
  const s = q.toString();
  return s ? `?${s}` : "";
}

/** GET /enrollments/admin/documents/pending — page/limit only used by service. */
export function listPendingDocuments({ page = 1, limit = 20, signal } = {}) {
  return apiRequest(`/enrollments/admin/documents/pending${toQuery({ page, limit })}`, {
    method: "GET",
    auth: true,
    signal,
  });
}

export function getInsuranceDocument(documentId, { signal } = {}) {
  return apiRequest(`/enrollments/documents/insurance/${documentId}`, {
    method: "GET",
    auth: true,
    signal,
  });
}

export function getMedicalDocument(documentId, { signal } = {}) {
  return apiRequest(`/enrollments/documents/medical/${documentId}`, {
    method: "GET",
    auth: true,
    signal,
  });
}

/**
 * decision: APPROVED | REJECTED
 * rejectionReason required by service when REJECTED
 */
export function reviewInsuranceDocument(documentId, { decision, rejectionReason }, { signal } = {}) {
  const body = { decision };
  if (rejectionReason != null) body.rejectionReason = rejectionReason;
  return apiRequest(`/enrollments/admin/documents/insurance/${documentId}/review`, {
    method: "POST",
    auth: true,
    body,
    signal,
  });
}

export function reviewMedicalDocument(documentId, { decision, rejectionReason }, { signal } = {}) {
  const body = { decision };
  if (rejectionReason != null) body.rejectionReason = rejectionReason;
  return apiRequest(`/enrollments/admin/documents/medical/${documentId}/review`, {
    method: "POST",
    auth: true,
    body,
    signal,
  });
}

export function downloadInsuranceDocumentContent(documentId, { signal } = {}) {
  return apiDownloadBlob(`/enrollments/documents/insurance/${documentId}/content`, {
    method: "GET",
    auth: true,
    signal,
  });
}

export function downloadMedicalDocumentContent(documentId, { signal } = {}) {
  return apiDownloadBlob(`/enrollments/documents/medical/${documentId}/content`, {
    method: "GET",
    auth: true,
    signal,
  });
}

/** POST /enrollments/admin/enrollments/:id/activate-compliance — empty body */
export function activateEnrollmentCompliance(enrollmentId, { signal } = {}) {
  return apiRequest(`/enrollments/admin/enrollments/${enrollmentId}/activate-compliance`, {
    method: "POST",
    auth: true,
    body: {},
    signal,
  });
}

/** ADMIN: GET /enrollments/users/:userId/360 */
export function getAdminUser360(userId, { signal } = {}) {
  return apiRequest(`/enrollments/users/${userId}/360`, {
    method: "GET",
    auth: true,
    signal,
  });
}

/** ADMIN: GET /enrollments/admin/participants/search */
export function searchAdminParticipants(
  { q, page = 1, limit = 20, gender, isActive, ownerUserId, signal } = {},
) {
  const params = new URLSearchParams();
  if (q) params.set("q", String(q));
  if (page) params.set("page", String(page));
  if (limit) params.set("limit", String(limit));
  if (gender) params.set("gender", String(gender));
  if (isActive === true || isActive === false) params.set("isActive", String(isActive));
  if (ownerUserId) params.set("ownerUserId", String(ownerUserId));
  const qs = params.toString();
  return apiRequest(`/enrollments/admin/participants/search${qs ? `?${qs}` : ""}`, {
    method: "GET",
    auth: true,
    signal,
  });
}

/** GET /enrollments/classes/:classId/roster — ADMIN or owning instructor */
export function getClassRoster(classId, { signal } = {}) {
  return apiRequest(`/enrollments/classes/${classId}/roster`, {
    method: "GET",
    auth: true,
    signal,
  });
}

/** Unique key per intentional attempt (≥8 chars). */
export function makeIdempotencyKey(prefix = "res") {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

const CHECKOUT_STORAGE_KEY = "swim_checkout_v1";

/** Persist paymentId across gateway redirect (no reservation GET; mock/zarinpal may only return authority). */
export function stashCheckoutContext(ctx) {
  try {
    sessionStorage.setItem(CHECKOUT_STORAGE_KEY, JSON.stringify({ ...ctx, savedAt: Date.now() }));
  } catch {
    // ignore quota / private mode
  }
}

export function readCheckoutContext() {
  try {
    const raw = sessionStorage.getItem(CHECKOUT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearCheckoutContext() {
  try {
    sessionStorage.removeItem(CHECKOUT_STORAGE_KEY);
  } catch {
    // ignore
  }
}

