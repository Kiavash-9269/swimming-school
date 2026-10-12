import { apiRequest } from "../../services/api/http";

/**
 * `/api/catalog` — public marketing catalog + swimming records; ADMIN sync/replace.
 */

export function getMarketingCatalog({ signal } = {}) {
  return apiRequest("/catalog/marketing", { method: "GET", signal });
}

export function getSwimmingRecords({ signal } = {}) {
  return apiRequest("/catalog/records", { method: "GET", signal });
}

export function getCatalogSyncStatus({ signal } = {}) {
  return apiRequest("/catalog/sync/status", { method: "GET", auth: true, signal });
}

export function syncCatalog({ openRegistration = false, signal } = {}) {
  return apiRequest("/catalog/sync", {
    method: "POST",
    auth: true,
    body: { openRegistration: Boolean(openRegistration) },
    signal,
  });
}

export function replaceSwimmingRecords(items, { signal } = {}) {
  return apiRequest("/catalog/records", {
    method: "PUT",
    auth: true,
    body: { items },
    signal,
  });
}

export function resetSwimmingRecords({ signal } = {}) {
  return apiRequest("/catalog/records/reset", {
    method: "POST",
    auth: true,
    signal,
  });
}
