import { appConfig } from "../../config/env";
import { ApiError, normalizeApiError } from "./errors";

const API_BASE = appConfig.apiBaseUrl;

let accessTokenMemory = null;
let refreshPromise = null;
/** Optional: AuthProvider clears React session when recovery fails. */
let unauthorizedHandler = null;

export function getAccessToken() {
  return accessTokenMemory;
}

export function setAccessToken(token) {
  accessTokenMemory = token || null;
}

export function clearAccessToken() {
  accessTokenMemory = null;
}

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = typeof handler === "function" ? handler : null;
}

function notifyUnauthorized() {
  clearAccessToken();
  try {
    unauthorizedHandler?.();
  } catch {
    // never break transport on handler errors
  }
}

async function parseJsonSafe(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function buildHeaders({ auth, jsonBody, extra } = {}) {
  const headers = {
    Accept: "application/json",
    ...extra,
  };
  if (jsonBody) {
    headers["Content-Type"] = "application/json";
  }
  if (auth && accessTokenMemory) {
    headers.Authorization = `Bearer ${accessTokenMemory}`;
  }
  return headers;
}

function shouldAttemptRefresh(path, auth, retry) {
  if (!auth || !retry) return false;
  if (path === "/auth/refresh" || path === "/auth/login" || path === "/auth/logout") {
    return false;
  }
  return true;
}

/**
 * Shared single-flight refresh. Concurrent 401s await the same promise.
 */
export async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const data = await apiRequest("/auth/refresh", {
        method: "POST",
        auth: false,
        retry: false,
      });
      setAccessToken(data.accessToken);
      return data;
    } catch {
      notifyUnauthorized();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function handleUnauthorizedRetry() {
  const refreshed = await refreshAccessToken();
  if (refreshed?.accessToken) {
    return { ok: true };
  }
  notifyUnauthorized();
  return { ok: false };
}

function throwFromJsonPayload(response, payload) {
  const error = new ApiError({
    status: response.status,
    code: payload?.error?.code || "REQUEST_FAILED",
    message: payload?.error?.message || "خطای سرور",
    details: payload?.error?.details,
  });
  error.payload = payload;
  throw error;
}

/**
 * JSON API request. Returns `data` from `{ success, data }` envelope.
 */
export async function apiRequest(
  path,
  { method = "GET", body, auth = false, retry = true, signal } = {},
) {
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: buildHeaders({ auth, jsonBody: body !== undefined }),
      credentials: "include",
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });

    if (response.status === 401 && shouldAttemptRefresh(path, auth, retry)) {
      const recovered = await handleUnauthorizedRetry();
      if (recovered.ok) {
        return apiRequest(path, { method, body, auth, retry: false, signal });
      }
    }

    const payload = await parseJsonSafe(response);

    if (!response.ok || payload?.success === false) {
      throwFromJsonPayload(response, payload || {
        success: false,
        error: { code: "INVALID_RESPONSE", message: "پاسخ نامعتبر از سرور دریافت شد" },
      });
    }

    return payload.data;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Multipart upload. Do NOT set Content-Type — browser sets boundary.
 * Returns envelope `data` on success.
 */
export async function apiUpload(
  path,
  formData,
  { method = "POST", auth = true, retry = true, signal } = {},
) {
  if (!(formData instanceof FormData)) {
    throw new ApiError({
      status: 0,
      code: "VALIDATION_ERROR",
      message: "FormData الزامی است",
    });
  }

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: buildHeaders({ auth, jsonBody: false }),
      credentials: "include",
      body: formData,
      signal,
    });

    if (response.status === 401 && shouldAttemptRefresh(path, auth, retry)) {
      const recovered = await handleUnauthorizedRetry();
      if (recovered.ok) {
        return apiUpload(path, formData, { method, auth, retry: false, signal });
      }
    }

    const payload = await parseJsonSafe(response);
    if (!response.ok || payload?.success === false) {
      throwFromJsonPayload(response, payload || {
        success: false,
        error: { code: "INVALID_RESPONSE", message: "پاسخ نامعتبر از سرور دریافت شد" },
      });
    }
    return payload.data;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Binary download (documents, Excel). Returns { blob, filename?, contentType }.
 * If the server returns JSON error, parses and throws ApiError.
 */
export async function apiDownloadBlob(
  path,
  { method = "GET", auth = true, retry = true, signal, body } = {},
) {
  try {
    const headers = buildHeaders({
      auth,
      jsonBody: body !== undefined,
      extra: { Accept: "*/*" },
    });

    const response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      credentials: "include",
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });

    if (response.status === 401 && shouldAttemptRefresh(path, auth, retry)) {
      const recovered = await handleUnauthorizedRetry();
      if (recovered.ok) {
        return apiDownloadBlob(path, { method, auth, retry: false, signal, body });
      }
    }

    const contentType = response.headers.get("content-type") || "";

    if (!response.ok) {
      if (contentType.includes("application/json")) {
        const payload = await parseJsonSafe(response);
        throwFromJsonPayload(response, payload || {
          success: false,
          error: { code: "REQUEST_FAILED", message: "دانلود ناموفق بود" },
        });
      }
      throw new ApiError({
        status: response.status,
        code: "DOWNLOAD_FAILED",
        message: "دانلود فایل ناموفق بود",
      });
    }

    if (contentType.includes("application/json")) {
      // Unexpected JSON on success path — treat as envelope or error
      const payload = await parseJsonSafe(response);
      if (payload?.success === false) {
        throwFromJsonPayload(response, payload);
      }
    }

    const blob = await response.blob();
    const disposition = response.headers.get("content-disposition") || "";
    const starMatch = /filename\*=(?:UTF-8''|utf-8'')([^;]+)/i.exec(disposition);
    const plainMatch = /filename="([^"]+)"/i.exec(disposition) || /filename=([^";]+)/i.exec(disposition);
    const filename = starMatch
      ? decodeURIComponent(starMatch[1].trim())
      : plainMatch
        ? decodeURIComponent(plainMatch[1].replace(/"/g, "").trim())
        : undefined;

    return {
      blob,
      filename,
      contentType: contentType || blob.type || "application/octet-stream",
    };
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/** Real auth endpoints only — verified against backend `/api/auth`. */
export const authApi = {
  checkPhone: (phone, opts) =>
    apiRequest("/auth/check-phone", { method: "POST", body: { phone }, ...opts }),
  sendRegisterOtp: (phone, opts) =>
    apiRequest("/auth/register/send-otp", { method: "POST", body: { phone }, ...opts }),
  verifyRegisterOtp: (phone, code, opts) =>
    apiRequest("/auth/register/verify-otp", { method: "POST", body: { phone, code }, ...opts }),
  register: (payload, opts) =>
    apiRequest("/auth/register", { method: "POST", body: payload, ...opts }),
  login: (payload, opts) =>
    apiRequest("/auth/login", { method: "POST", body: payload, ...opts }),
  sendPasswordOtp: (phone, opts) =>
    apiRequest("/auth/password/send-otp", { method: "POST", body: { phone }, ...opts }),
  verifyPasswordOtp: (phone, code, opts) =>
    apiRequest("/auth/password/verify-otp", { method: "POST", body: { phone, code }, ...opts }),
  resetPassword: (payload, opts) =>
    apiRequest("/auth/password/reset", { method: "POST", body: payload, ...opts }),
  me: (opts) => apiRequest("/auth/me", { method: "GET", auth: true, ...opts }),
  logout: (opts) => apiRequest("/auth/logout", { method: "POST", ...opts }),
  refresh: () => refreshAccessToken(),
};

export { ApiError, normalizeApiError } from "./errors";
