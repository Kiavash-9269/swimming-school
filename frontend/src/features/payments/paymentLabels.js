import {
  PAYMENT_STATUS_LABELS,
  formatIrrAmount,
  formatExpiryFa,
  userMessageFromEnrollmentError,
} from "../enrollments/enrollmentLabels";

export { PAYMENT_STATUS_LABELS, formatIrrAmount, formatExpiryFa };

/** Exact backend PAYMENT_STATUSES — for filters only */
export const PAYMENT_STATUS_OPTIONS = [
  "CREATED",
  "INITIATED",
  "PENDING",
  "SUCCESS",
  "FAILED",
  "CANCELLED",
  "EXPIRED",
  "REFUNDED",
  "REFUND_REQUESTED",
];

export function paymentStatusTone(status) {
  switch (status) {
    case "SUCCESS":
      return "success";
    case "FAILED":
    case "CANCELLED":
    case "EXPIRED":
      return "danger";
    case "REFUND_REQUESTED":
    case "PENDING":
    case "INITIATED":
    case "CREATED":
      return "warn";
    case "REFUNDED":
      return "neutral";
    default:
      return "info";
  }
}

/** UI gate only — backend remains authoritative. */
export function canOfferRefundAction(status) {
  return status === "SUCCESS" || status === "REFUND_REQUESTED";
}

export function userMessageFromPaymentError(err, fallback = "عملیات پرداخت ناموفق بود.") {
  if (!err) return fallback;
  const code = err.code || err?.data?.error?.code;
  if (code === "REFUND_FAILED") return "استرداد توسط درگاه انجام نشد. وضعیت درخواست استرداد را بررسی کنید.";
  if (err.status === 409) return "وضعیت فعلی پرداخت اجازهٔ این عملیات را نمی‌دهد.";
  return userMessageFromEnrollmentError(err, fallback);
}
