import {
  ENROLLMENT_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  COMPLIANCE_STATUS_LABELS,
  formatIrrAmount,
  formatExpiryFa,
  userMessageFromEnrollmentError,
} from "../enrollments/enrollmentLabels";
import { CLASS_STATUS_LABELS } from "../courses/courseLabels";

export { ENROLLMENT_STATUS_LABELS, PAYMENT_STATUS_LABELS, COMPLIANCE_STATUS_LABELS, CLASS_STATUS_LABELS };
export { formatIrrAmount, formatExpiryFa };

export const WAITLIST_STATUS_LABELS = {
  WAITING: "در انتظار",
  OFFERED: "پیشنهاد شده",
  ACCEPTED: "پذیرفته",
  EXPIRED: "منقضی",
  CANCELLED: "لغو شده",
};

export const REPORT_TABS = [
  { id: "summary", label: "خلاصه" },
  { id: "enrollments", label: "ثبت‌نام‌ها" },
  { id: "payments", label: "پرداخت‌ها" },
  { id: "classes", label: "کلاس‌ها" },
  { id: "participants", label: "شرکت‌کنندگان" },
  { id: "compliance", label: "مدارک" },
  { id: "waitlist", label: "لیست انتظار" },
  { id: "discounts", label: "تخفیف‌ها" },
];

export function userMessageFromReportError(err, fallback = "بارگذاری گزارش ناموفق بود.") {
  return userMessageFromEnrollmentError(err, fallback);
}

export function formatDateInputValue(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}
