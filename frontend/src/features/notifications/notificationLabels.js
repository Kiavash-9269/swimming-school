/** Labels for backend notification.constants — no invented types/statuses. */

export const NOTIFICATION_STATUS_LABELS = {
  PENDING: "در صف",
  PROCESSING: "در حال ارسال",
  SENT: "ارسال‌شده",
  FAILED: "ناموفق",
  CANCELLED: "لغو‌شده",
};

export const NOTIFICATION_STATUS_OPTIONS = [
  "PENDING",
  "PROCESSING",
  "SENT",
  "FAILED",
  "CANCELLED",
];

export const NOTIFICATION_TYPE_LABELS = {
  PAYMENT_SUCCESS: "پرداخت موفق",
  PAYMENT_FAILED: "پرداخت ناموفق",
  PAYMENT_EXPIRED: "پرداخت منقضی",
  ENROLLMENT_CONFIRMED: "تأیید ثبت‌نام",
  ENROLLMENT_PENDING_COMPLIANCE: "در انتظار مدارک",
  ENROLLMENT_CANCELLED: "لغو ثبت‌نام",
  ENROLLMENT_REFUNDED: "استرداد ثبت‌نام",
  DOCUMENT_APPROVED: "تأیید مدرک",
  DOCUMENT_REJECTED: "رد مدرک",
  WAITLIST_AVAILABLE: "آزاد شدن ظرفیت",
  SESSION_REMINDER: "یادآوری جلسه",
  CLASS_CANCELLED: "لغو کلاس",
  CLASS_RESCHEDULED: "تغییر زمان کلاس",
  ATTENDANCE_ABSENT: "غیبت",
};

export const NOTIFICATION_TYPE_OPTIONS = Object.keys(NOTIFICATION_TYPE_LABELS);

export const NOTIFICATION_CHANNEL_LABELS = {
  sms: "پیامک",
  email: "ایمیل",
  log: "لاگ",
};

export function notificationStatusTone(status) {
  switch (status) {
    case "SENT":
      return "success";
    case "FAILED":
    case "CANCELLED":
      return "danger";
    case "PROCESSING":
    case "PENDING":
      return "warn";
    default:
      return "info";
  }
}

export function canOfferRetryAction(status) {
  return status === "FAILED" || status === "PENDING";
}

export function formatNotificationTime(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("fa-IR");
  } catch {
    return String(value);
  }
}

export function userMessageFromNotificationError(err, fallback = "عملیات اعلان ناموفق بود.") {
  if (!err) return fallback;
  const code = err.code || err?.data?.error?.code;
  if (code === "NOTIFICATION_NOT_FOUND") return "اعلان یافت نشد.";
  if (code === "INVALID_NOTIFICATION_STATUS") return "وضعیت فعلی اعلان اجازهٔ تلاش مجدد را نمی‌دهد.";
  if (code === "VALIDATION_ERROR" || err.status === 400) return "شناسه یا فیلتر نامعتبر است.";
  if (err.status === 403 || code === "FORBIDDEN") return "فقط ادمین به صف اعلان‌ها دسترسی دارد.";
  if (err.message) return err.message;
  return fallback;
}
