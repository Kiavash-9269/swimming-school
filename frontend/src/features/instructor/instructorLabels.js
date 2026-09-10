import {
  ATTENDANCE_STATUS_LABELS,
  ATTENDANCE_STATUS_OPTIONS,
  formatExpiryFa,
  userMessageFromAttendanceError,
} from "../attendance/attendanceLabels";
import {
  CLASS_STATUS_LABELS,
  CLASS_STATUS_OPTIONS,
  SESSION_STATUS_LABELS,
  formatDateFa,
  formatDaysOfWeek,
  formatIrr,
  classStatusTone,
  userMessageFromApiError,
} from "../courses/courseLabels";

export {
  ATTENDANCE_STATUS_LABELS,
  ATTENDANCE_STATUS_OPTIONS,
  formatExpiryFa,
  userMessageFromAttendanceError,
  CLASS_STATUS_LABELS,
  CLASS_STATUS_OPTIONS,
  SESSION_STATUS_LABELS,
  formatDateFa,
  formatDaysOfWeek,
  formatIrr,
  classStatusTone,
  userMessageFromApiError,
};

export const ENROLLMENT_STATUS_LABELS = {
  PENDING: "در انتظار",
  PAYMENT_PENDING: "در انتظار پرداخت",
  PAID: "پرداخت‌شده",
  ACTIVE: "فعال",
  PENDING_COMPLIANCE: "در انتظار مدارک",
  COMPLETED: "تکمیل‌شده",
  CANCELLED: "لغو شده",
  PAYMENT_FAILED: "پرداخت ناموفق",
  EXPIRED: "منقضی",
  REFUNDED: "استرداد",
  WAITLISTED: "لیست انتظار",
};

export const GENDER_LABELS = {
  MALE: "پسر / مرد",
  FEMALE: "دختر / زن",
  ANY: "—",
};

/**
 * Instructor identity errors — JWT remains USER; linked Instructor is required.
 */
export function userMessageFromInstructorError(err, fallback = "خطایی رخ داد") {
  if (!err) return fallback;
  const code = err.code || err?.data?.error?.code;
  if (code === "INSTRUCTOR_NOT_FOUND" || err.status === 404) {
    return "حساب شما به یک مربی فعال لینک نشده است.";
  }
  if (err.status === 403 || code === "FORBIDDEN") {
    return "دسترسی به این منبع مربی مجاز نیست.";
  }
  return userMessageFromAttendanceError(err, userMessageFromApiError(err, fallback));
}

/** Calendar day key YYYY-MM-DD in local time for session date comparison. */
export function toLocalDayKey(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayLocalDayKey() {
  return toLocalDayKey(new Date());
}

export function classifySessionTiming(session) {
  const key = toLocalDayKey(session?.date);
  if (!key) return "unknown";
  const today = todayLocalDayKey();
  if (key === today) return "today";
  if (key > today) return "upcoming";
  return "past";
}
