const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

let accessTokenMemory = null;
let refreshPromise = null;

export function getAccessToken() {
  return accessTokenMemory;
}

export function setAccessToken(token) {
  accessTokenMemory = token || null;
}

export function clearAccessToken() {
  accessTokenMemory = null;
}

async function parseJson(response) {
  try {
    return await response.json();
  } catch {
    return {
      success: false,
      error: {
        code: "INVALID_RESPONSE",
        message: "پاسخ نامعتبر از سرور دریافت شد",
      },
    };
  }
}

export async function apiRequest(path, { method = "GET", body, auth = false, retry = true } = {}) {
  const headers = {
    Accept: "application/json",
  };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (auth && accessTokenMemory) {
    headers.Authorization = `Bearer ${accessTokenMemory}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    credentials: "include",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // Single-flight refresh: concurrent 401s share one POST /auth/refresh.
  if (
    response.status === 401 &&
    auth &&
    retry &&
    path !== "/auth/refresh" &&
    path !== "/auth/login" &&
    path !== "/auth/logout"
  ) {
    const refreshed = await refreshAccessToken();
    if (refreshed?.accessToken) {
      return apiRequest(path, { method, body, auth, retry: false });
    }
  }

  const payload = await parseJson(response);

  if (!response.ok || payload.success === false) {
    const error = new Error(payload?.error?.message || "خطای سرور");
    error.status = response.status;
    error.code = payload?.error?.code || "REQUEST_FAILED";
    error.details = payload?.error?.details;
    error.payload = payload;
    throw error;
  }

  return payload.data;
}

export async function refreshAccessToken() {
  if (refreshPromise) {
    return refreshPromise;
  }

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
      clearAccessToken();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export const authApi = {
  checkPhone: (phone) => apiRequest("/auth/check-phone", { method: "POST", body: { phone } }),
  sendRegisterOtp: (phone) =>
    apiRequest("/auth/register/send-otp", { method: "POST", body: { phone } }),
  verifyRegisterOtp: (phone, code) =>
    apiRequest("/auth/register/verify-otp", { method: "POST", body: { phone, code } }),
  register: (payload) => apiRequest("/auth/register", { method: "POST", body: payload }),
  login: (payload) => apiRequest("/auth/login", { method: "POST", body: payload }),
  sendPasswordOtp: (phone) =>
    apiRequest("/auth/password/send-otp", { method: "POST", body: { phone } }),
  verifyPasswordOtp: (phone, code) =>
    apiRequest("/auth/password/verify-otp", { method: "POST", body: { phone, code } }),
  resetPassword: (payload) =>
    apiRequest("/auth/password/reset", { method: "POST", body: payload }),
  me: () => apiRequest("/auth/me", { method: "GET", auth: true }),
  logout: () => apiRequest("/auth/logout", { method: "POST" }),
  refresh: () => refreshAccessToken(),
};
