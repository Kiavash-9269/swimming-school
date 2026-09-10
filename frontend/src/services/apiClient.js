/**
 * Backward-compatible entry for auth + HTTP transport.
 * Prefer importing from `./api/http` in new code.
 */
export {
  apiRequest,
  apiUpload,
  apiDownloadBlob,
  authApi,
  getAccessToken,
  setAccessToken,
  clearAccessToken,
  setUnauthorizedHandler,
  refreshAccessToken,
  ApiError,
  normalizeApiError,
} from "./api/http";
