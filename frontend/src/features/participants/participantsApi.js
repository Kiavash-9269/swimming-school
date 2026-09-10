import { apiRequest } from "../../services/api/http";

/**
 * Real `/api/enrollments/participants*` USER APIs only.
 * Verified: enrollment.routes.js — no hard DELETE.
 */

export function listParticipants({ signal } = {}) {
  return apiRequest("/enrollments/participants", { method: "GET", auth: true, signal });
}

export function getParticipant(participantId, { signal } = {}) {
  return apiRequest(`/enrollments/participants/${participantId}`, {
    method: "GET",
    auth: true,
    signal,
  });
}

export function createParticipant(body, { signal } = {}) {
  return apiRequest("/enrollments/participants", {
    method: "POST",
    auth: true,
    body,
    signal,
  });
}

export function updateParticipant(participantId, body, { signal } = {}) {
  return apiRequest(`/enrollments/participants/${participantId}`, {
    method: "PATCH",
    auth: true,
    body,
    signal,
  });
}

/** Soft-deactivate — backend has no hard DELETE. */
export function deactivateParticipant(participantId, { signal } = {}) {
  return apiRequest(`/enrollments/participants/${participantId}/deactivate`, {
    method: "POST",
    auth: true,
    signal,
  });
}
