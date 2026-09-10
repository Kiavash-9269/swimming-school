import { apiRequest } from "../../services/api/http";
import {
  getCourseClassById,
  getClassCapacity,
  getClassSchedule,
  getClassSessions,
} from "../courses/coursesApi";
import { listClassAttendance, markAttendance } from "../attendance/attendanceApi";
import { getClassRoster } from "../enrollments/enrollmentsApi";

/**
 * B-T instructor contracts + class reads.
 * My Classes NEVER uses public GET /courses/classes filtering.
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

/** GET /api/courses/instructors/me */
export function getMyInstructor({ signal } = {}) {
  return apiRequest("/courses/instructors/me", { method: "GET", auth: true, signal });
}

/** GET /api/courses/instructors/me/classes — ownership-scoped */
export function getMyInstructorClasses({ status, signal } = {}) {
  return apiRequest(`/courses/instructors/me/classes${toQuery({ status })}`, {
    method: "GET",
    auth: true,
    signal,
  });
}

export {
  getCourseClassById,
  getClassCapacity,
  getClassSchedule,
  getClassSessions,
  listClassAttendance,
  markAttendance,
  getClassRoster,
};
