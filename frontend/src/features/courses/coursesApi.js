import { apiRequest } from "../../services/api/http";

/**
 * `/api/courses` — public discovery + ADMIN write/lifecycle.
 * Verified against backend courses.routes.js (no invented endpoints).
 */

function toQuery(params = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      q.set(key, String(value));
    }
  });
  const s = q.toString();
  return s ? `?${s}` : "";
}

/* -------------------- Templates (Course) -------------------- */

export function getCourseTemplates({ activeOnly, signal } = {}) {
  return apiRequest(`/courses/templates${toQuery({ activeOnly: activeOnly ? "true" : undefined })}`, {
    method: "GET",
    auth: true,
    signal,
  });
}

export function getCourseTemplateById(templateId, { signal } = {}) {
  return apiRequest(`/courses/templates/${templateId}`, { method: "GET", signal });
}

export function createCourseTemplate(body, { signal } = {}) {
  return apiRequest("/courses/templates", { method: "POST", auth: true, body, signal });
}

export function updateCourseTemplate(templateId, body, { signal } = {}) {
  return apiRequest(`/courses/templates/${templateId}`, {
    method: "PATCH",
    auth: true,
    body,
    signal,
  });
}

/* -------------------- Classes -------------------- */

/**
 * @param {{ status?: string, courseTemplateId?: string, signal?: AbortSignal }} opts
 */
export function getCourseClasses({ status, courseTemplateId, signal } = {}) {
  return apiRequest(`/courses/classes${toQuery({ status, courseTemplateId })}`, {
    method: "GET",
    // Send token when present so ADMIN sees DRAFT; anonymous still works without token
    auth: true,
    signal,
  });
}

export function getCourseClassById(classId, { signal } = {}) {
  return apiRequest(`/courses/classes/${classId}`, { method: "GET", auth: true, signal });
}

export function createCourseClass(body, { signal } = {}) {
  return apiRequest("/courses/classes", { method: "POST", auth: true, body, signal });
}

export function updateCourseClass(classId, body, { signal } = {}) {
  return apiRequest(`/courses/classes/${classId}`, { method: "PATCH", auth: true, body, signal });
}

export function publishCourseClass(classId, { signal } = {}) {
  return apiRequest(`/courses/classes/${classId}/publish`, { method: "POST", auth: true, signal });
}

export function openClassRegistration(classId, { signal } = {}) {
  return apiRequest(`/courses/classes/${classId}/open-registration`, {
    method: "POST",
    auth: true,
    signal,
  });
}

export function closeClassRegistration(classId, { signal } = {}) {
  return apiRequest(`/courses/classes/${classId}/close-registration`, {
    method: "POST",
    auth: true,
    signal,
  });
}

export function cancelCourseClass(classId, { signal } = {}) {
  return apiRequest(`/courses/classes/${classId}/cancel`, { method: "POST", auth: true, signal });
}

export function startCourseClass(classId, { signal } = {}) {
  return apiRequest(`/courses/classes/${classId}/start`, { method: "POST", auth: true, signal });
}

export function completeCourseClass(classId, { signal } = {}) {
  return apiRequest(`/courses/classes/${classId}/complete`, { method: "POST", auth: true, signal });
}

export function archiveCourseClass(classId, { signal } = {}) {
  return apiRequest(`/courses/classes/${classId}/archive`, { method: "POST", auth: true, signal });
}

export function generateClassSessions(classId, { signal } = {}) {
  return apiRequest(`/courses/classes/${classId}/generate-sessions`, {
    method: "POST",
    auth: true,
    signal,
  });
}

export function getClassCapacity(classId, { signal } = {}) {
  return apiRequest(`/courses/classes/${classId}/capacity`, { method: "GET", signal });
}

export function getClassSchedule(classId, { signal } = {}) {
  return apiRequest(`/courses/classes/${classId}/schedule`, { method: "GET", signal });
}

export function getClassSessions(classId, { signal } = {}) {
  return apiRequest(`/courses/classes/${classId}/sessions`, { method: "GET", signal });
}

/* -------------------- Instructors (ADMIN) -------------------- */

export function listInstructors({ activeOnly, signal } = {}) {
  const q = new URLSearchParams();
  if (activeOnly === false) q.set("activeOnly", "false");
  if (activeOnly === true) q.set("activeOnly", "true");
  const qs = q.toString();
  return apiRequest(`/courses/instructors${qs ? `?${qs}` : ""}`, { method: "GET", auth: true, signal });
}

export function createInstructor(body, { signal } = {}) {
  return apiRequest("/courses/instructors", { method: "POST", auth: true, body, signal });
}

export function updateInstructor(instructorId, body, { signal } = {}) {
  return apiRequest(`/courses/instructors/${instructorId}`, {
    method: "PATCH",
    auth: true,
    body,
    signal,
  });
}
