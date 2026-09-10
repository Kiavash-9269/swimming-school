import {
  formatExpiryFa,
  userMessageFromEnrollmentError,
} from "../enrollments/enrollmentLabels";

export { formatExpiryFa };

/** Backend AttendanceRecord / markAttendance statuses. */
export const ATTENDANCE_STATUS_LABELS = {
  PRESENT: "حاضر",
  ABSENT: "غایب",
  LATE: "تأخیر",
  EXCUSED: "موجه",
  UNKNOWN: "نامشخص",
};

export const ATTENDANCE_STATUS_OPTIONS = Object.keys(ATTENDANCE_STATUS_LABELS);

export function userMessageFromAttendanceError(err, fallback = "عملیات حضور و غیاب ناموفق بود.") {
  if (!err) return fallback;
  const code = err.code || err?.data?.error?.code;
  if (code === "SESSION_NOT_FOUND") return "جلسه یافت نشد.";
  if (code === "ENROLLMENT_NOT_FOUND") {
    return "ثبت‌نام فعال برای این شرکت‌کننده یافت نشد.";
  }
  if (code === "CLASS_NOT_FOUND") return "کلاس یافت نشد.";
  return userMessageFromEnrollmentError(err, fallback);
}
