/**
 * Future domain API modules live here.
 * F2 only wires transport + auth — no invented product endpoints.
 *
 * Planned (real backend prefixes only):
 * - courses.js      → /api/courses
 * - enrollments.js  → /api/enrollments
 * - payments.js     → /api/payments
 * - reports.js      → /api/admin/reports
 * - notifications.js→ /api/notifications (ADMIN)
 */
export {
  apiRequest,
  apiUpload,
  apiDownloadBlob,
  authApi,
  ApiError,
  normalizeApiError,
} from "./http";

/** Domain modules: import from features/* — e.g. features/courses/coursesApi.js */