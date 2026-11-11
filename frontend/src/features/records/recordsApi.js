import { apiRequest } from "../../services/api/http";

/** My swimming records (entered by the school). */
export function getMyRecords({ signal } = {}) {
  return apiRequest("/records/me", { method: "GET", auth: true, signal });
}

/** ADMIN: list/search student records. */
export function listAdminRecords({ q, stroke, page = 1, limit = 100, signal } = {}) {
  const params = new URLSearchParams();
  Object.entries({ q, stroke, page, limit }).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    params.set(key, String(value));
  });
  const query = params.toString();
  return apiRequest(`/records/admin${query ? `?${query}` : ""}`, {
    method: "GET",
    auth: true,
    signal,
  });
}

/** ADMIN: student picker for the record form. */
export function searchRecordParticipants({ q, limit = 20, signal } = {}) {
  const params = new URLSearchParams();
  Object.entries({ q, limit }).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    params.set(key, String(value));
  });
  const query = params.toString();
  return apiRequest(`/records/admin/participants${query ? `?${query}` : ""}`, {
    method: "GET",
    auth: true,
    signal,
  });
}

/** ADMIN: create a record for a student. */
export function createAdminRecord(body, { signal } = {}) {
  return apiRequest("/records/admin", { method: "POST", auth: true, body, signal });
}

/** ADMIN: edit a record. */
export function updateAdminRecord(recordId, body, { signal } = {}) {
  return apiRequest(`/records/admin/${recordId}`, {
    method: "PATCH",
    auth: true,
    body,
    signal,
  });
}

/** ADMIN: delete a record. */
export function deleteAdminRecord(recordId, { signal } = {}) {
  return apiRequest(`/records/admin/${recordId}`, { method: "DELETE", auth: true, signal });
}

/** Persian labels for the strokes a record can be entered for. */
export const STROKE_LABELS = {
  FREESTYLE: "کرال سینه",
  BACKSTROKE: "کرال پشت",
  BREASTSTROKE: "قورباغه",
  BUTTERFLY: "پروانه",
  MEDLEY: "ترکیبی",
};

export const STROKE_OPTIONS = Object.entries(STROKE_LABELS).map(([value, label]) => ({
  value,
  label,
}));
