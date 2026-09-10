import { apiRequest, apiDownloadBlob } from "../../services/api/http";

/**
 * ADMIN reports — `/api/admin/reports/*` only (authorize ADMIN on router).
 */

function toQuery(params = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    if (value instanceof Date) {
      q.set(key, value.toISOString().slice(0, 10));
      return;
    }
    q.set(key, String(value));
  });
  const s = q.toString();
  return s ? `?${s}` : "";
}

export function getReportsDashboard({ signal } = {}) {
  return apiRequest("/admin/reports/dashboard", { method: "GET", auth: true, signal });
}

export function getEnrollmentReport(params = {}, { signal } = {}) {
  return apiRequest(`/admin/reports/enrollments${toQuery(params)}`, {
    method: "GET",
    auth: true,
    signal,
  });
}

export function getPaymentReport(params = {}, { signal } = {}) {
  return apiRequest(`/admin/reports/payments${toQuery(params)}`, {
    method: "GET",
    auth: true,
    signal,
  });
}

export function getClassReport(params = {}, { signal } = {}) {
  return apiRequest(`/admin/reports/classes${toQuery(params)}`, {
    method: "GET",
    auth: true,
    signal,
  });
}

export function getParticipantReport(params = {}, { signal } = {}) {
  return apiRequest(`/admin/reports/participants${toQuery(params)}`, {
    method: "GET",
    auth: true,
    signal,
  });
}

export function getWaitlistReport(params = {}, { signal } = {}) {
  return apiRequest(`/admin/reports/waitlist${toQuery(params)}`, {
    method: "GET",
    auth: true,
    signal,
  });
}

export function getDiscountReport(params = {}, { signal } = {}) {
  return apiRequest(`/admin/reports/discounts${toQuery(params)}`, {
    method: "GET",
    auth: true,
    signal,
  });
}

export function getComplianceReport(params = {}, { signal } = {}) {
  return apiRequest(`/admin/reports/compliance${toQuery(params)}`, {
    method: "GET",
    auth: true,
    signal,
  });
}

/** Binary xlsx export for supported report types. */
export function exportAdminReport(kind, params = {}, { signal } = {}) {
  const path = `/admin/reports/${kind}/export${toQuery(params)}`;
  return apiDownloadBlob(path, { method: "GET", auth: true, signal });
}
