import { apiRequest } from "../../services/api/http";

/** Public clinic info: program details + how many seats are taken. */
export function getClinicInfo({ signal } = {}) {
  return apiRequest("/clinic", { method: "GET", signal });
}

/** Register one person (self or a child) for the clinic. */
export function registerClinic(body, { signal } = {}) {
  return apiRequest("/clinic/register", { method: "POST", auth: true, body, signal });
}

/** My clinic registrations. */
export function getMyClinicRegistrations({ signal } = {}) {
  return apiRequest("/clinic/me", { method: "GET", auth: true, signal });
}

/** Tick "I paid by card" so an admin can confirm it. */
export function reportClinicPaid(registrationId, { trackingCode, note } = {}, { signal } = {}) {
  return apiRequest(`/clinic/me/${registrationId}/paid`, {
    method: "POST",
    auth: true,
    body: { trackingCode, note },
    signal,
  });
}

/** ADMIN: everyone who registered for the clinic, with review counts. */
export function listAdminClinicRegistrations(
  { status, paymentStatus, q, page = 1, limit = 100, signal } = {},
) {
  const params = new URLSearchParams();
  Object.entries({ status, paymentStatus, q, page, limit }).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    params.set(key, String(value));
  });
  const query = params.toString();
  return apiRequest(`/clinic/admin${query ? `?${query}` : ""}`, {
    method: "GET",
    auth: true,
    signal,
  });
}

/** ADMIN: change status / payment status / admin note. */
export function updateAdminClinicRegistration(registrationId, body, { signal } = {}) {
  return apiRequest(`/clinic/admin/${registrationId}`, {
    method: "PATCH",
    auth: true,
    body,
    signal,
  });
}
