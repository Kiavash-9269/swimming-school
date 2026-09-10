import { apiRequest, apiDownloadBlob } from "../../services/api/http";

/**
 * Attendance — real backend only:
 * - Admin list/export: `/api/admin/reports/attendance*`
 * - Mark / class list: `/api/enrollments/attendance`, `/api/enrollments/classes/:classId/attendance`
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

/** ADMIN — paginated attendance report with server summary. */
export function getAdminAttendanceReport(params = {}, { signal } = {}) {
  return apiRequest(`/admin/reports/attendance${toQuery(params)}`, {
    method: "GET",
    auth: true,
    signal,
  });
}

/** ADMIN — xlsx export for attendance report filters. */
export function exportAdminAttendanceReport(params = {}, { signal } = {}) {
  return apiDownloadBlob(`/admin/reports/attendance/export${toQuery(params)}`, {
    method: "GET",
    auth: true,
    signal,
  });
}

/**
 * Mark / upsert attendance.
 * Auth: ADMIN or instructor of the class (backend canMarkAttendance).
 * Body: { classId, sessionId, participantId, status, notifyAbsent? }
 */
export function markAttendance(body, { signal } = {}) {
  return apiRequest("/enrollments/attendance", {
    method: "POST",
    auth: true,
    body,
    signal,
  });
}

/**
 * Batch submit one session day. SMS for newly ABSENT only after save.
 * Body: { classId, sessionId, marks: [{ participantId, status }] }
 */
export function submitSessionAttendance(body, { signal } = {}) {
  return apiRequest("/enrollments/attendance/submit-session", {
    method: "POST",
    auth: true,
    body,
    signal,
  });
}

/**
 * List attendance records for a class (limit capped server-side).
 * Auth: ADMIN or instructor of the class.
 */
export function listClassAttendance(classId, params = {}, { signal } = {}) {
  return apiRequest(`/enrollments/classes/${classId}/attendance${toQuery(params)}`, {
    method: "GET",
    auth: true,
    signal,
  });
}
