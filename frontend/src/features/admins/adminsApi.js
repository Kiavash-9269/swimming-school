import { apiRequest } from "../../services/api/http";

export function listAdmins({ signal } = {}) {
  return apiRequest("/admin/admins", { method: "GET", auth: true, signal });
}

export function addAdmin(body, { signal } = {}) {
  return apiRequest("/admin/admins", { method: "POST", auth: true, body, signal });
}

export function revokeAdmin(adminId, { signal } = {}) {
  return apiRequest(`/admin/admins/${adminId}`, { method: "DELETE", auth: true, signal });
}
