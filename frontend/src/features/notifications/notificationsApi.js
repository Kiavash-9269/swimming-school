import { apiRequest } from "../../services/api/http";

/**
 * ADMIN notifications ops — `/api/notifications*` only.
 * Job mutation endpoints exist on backend but are not exposed in product UI in F18
 * except read-only job status if needed later.
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

/** GET /api/notifications — ADMIN list with pagination */
export function listAdminNotifications({ status, type, channel, userId, page = 1, limit = 20, signal } = {}) {
  return apiRequest(
    `/notifications${toQuery({ status, type, channel, userId, page, limit })}`,
    { method: "GET", auth: true, signal },
  );
}

/** GET /api/notifications/:id */
export function getAdminNotification(notificationId, { signal } = {}) {
  return apiRequest(`/notifications/${notificationId}`, {
    method: "GET",
    auth: true,
    signal,
  });
}

/** POST /api/notifications/:id/retry — empty body */
export function retryAdminNotification(notificationId, { signal } = {}) {
  return apiRequest(`/notifications/${notificationId}/retry`, {
    method: "POST",
    auth: true,
    body: {},
    signal,
  });
}

/** GET /api/notifications/jobs — scheduler + lock status (read-only) */
export function listNotificationJobs({ signal } = {}) {
  return apiRequest("/notifications/jobs", {
    method: "GET",
    auth: true,
    signal,
  });
}
