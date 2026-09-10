/** Non-component ops helpers (keeps OpsUi.jsx component-only for fast refresh). */

export function nextLifecycleHint(status) {
  switch (status) {
    case "DRAFT":
      return "مرحله بعد: انتشار";
    case "PUBLISHED":
      return "مرحله بعد: باز کردن ثبت‌نام";
    case "REGISTRATION_OPEN":
      return "مرحله بعد: بستن ثبت‌نام";
    case "REGISTRATION_CLOSED":
      return "مرحله بعد: شروع کلاس";
    case "IN_PROGRESS":
      return "مرحله بعد: تکمیل کلاس";
    case "COMPLETED":
    case "CANCELLED":
      return "مرحله بعد: بایگانی";
    case "ARCHIVED":
      return "پایان چرخهٔ عمر";
    default:
      return "";
  }
}

export const ATTENDANCE_CHIP_TONES = {
  PRESENT: "bg-emerald-600 text-white border-emerald-700",
  ABSENT: "bg-rose-600 text-white border-rose-700",
  LATE: "bg-amber-500 text-white border-amber-600",
  EXCUSED: "bg-sky-600 text-white border-sky-700",
  UNKNOWN: "bg-slate-200 text-slate-700 border-slate-300",
};
