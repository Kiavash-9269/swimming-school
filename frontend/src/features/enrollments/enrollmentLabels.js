export const ELIGIBILITY_REASON_LABELS = {
  PARTICIPANT_INACTIVE: "این شرکت‌کننده غیرفعال است.",
  INVALID_BIRTH_DATE: "تاریخ تولد نامعتبر است.",
  AGE_NOT_ALLOWED: "سن شرکت‌کننده با محدوده کلاس سازگار نیست.",
  GENDER_NOT_ALLOWED: "جنسیت شرکت‌کننده با محدودیت کلاس سازگار نیست.",
  PREREQUISITE_NOT_COMPLETED: "پیش‌نیاز دوره تکمیل نشده است.",
  INSURANCE_REQUIRED: "بیمه تأییدشده برای این کلاس لازم است.",
  MEDICAL_APPROVAL_REQUIRED: "تأیید پزشکی برای این کلاس لازم است.",
};

export function labelEligibilityReason(code) {
  if (!code) return "شرایط ثبت‌نام احراز نشد.";
  return ELIGIBILITY_REASON_LABELS[code] || "شرایط ثبت‌نام احراز نشد.";
}

export function formatExpiryFa(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("fa-IR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** Remaining seconds until expiresAt; 0 if past/invalid. */
export function secondsUntil(expiresAt, now = Date.now()) {
  const t = new Date(expiresAt).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.floor((t - now) / 1000));
}

export function formatCountdown(totalSeconds) {
  const s = Math.max(0, totalSeconds | 0);
  const m = Math.floor(s / 60);
  const r = s % 60;
  const raw = `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
  return raw.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}

export function userMessageFromEnrollmentError(err, fallback = "خطایی رخ داد") {
  if (!err) return fallback;
  const code = err.code;

  switch (code) {
    case "CLASS_NOT_FOUND":
      return "کلاس یافت نشد.";
    case "PARTICIPANT_NOT_FOUND":
      return "شرکت‌کننده یافت نشد.";
    case "FORBIDDEN":
      return "دسترسی مجاز نیست.";
    case "REGISTRATION_CLOSED":
      return "ثبت‌نام این کلاس باز نیست.";
    case "ENROLLMENT_ALREADY_EXISTS":
      return "برای این شرکت‌کننده ثبت‌نام یا رزرو فعال وجود دارد.";
    case "ELIGIBILITY_FAILED":
      return "شرایط ثبت‌نام برقرار نیست.";
    case "SCHEDULE_CONFLICT":
      return "تداخل زمانی با کلاس فعال دیگر وجود دارد.";
    case "COURSE_FULL":
      return "ظرفیت کلاس تکمیل شد؛ در صورت تمایل به لیست انتظار بپیوندید.";
    case "COURSE_NOT_FULL":
      return "هنوز ظرفیت خالی وجود دارد؛ ابتدا رزرو کنید.";
    case "WAITLIST_CONFLICT":
      return "پیوستن به لیست انتظار ناموفق بود؛ دوباره تلاش کنید.";
    case "RESERVATION_NOT_FOUND":
      return "رزرو یافت نشد.";
    case "RESERVATION_EXPIRED":
      return "رزرو معتبر نیست یا منقضی شده است.";
    case "NOT_ELIGIBLE":
      return "واجد شرایط ثبت‌نام نیست.";
    case "IDEMPOTENCY_KEY_REUSE":
      return "این درخواست با کلید تکراری و محتوای متفاوت ارسال شده است.";
    case "PAYMENT_FAILED":
      return "پرداخت ناموفق بود.";
    case "PAYMENT_TERMINAL":
      return "این پرداخت در وضعیت نهایی است و قابل تأیید مجدد نیست.";
    case "PAYMENT_REQUIRED":
      return "پرداخت یافت نشد.";
    case "DOCUMENT_NOT_PERSISTED":
      return "سند فایل واقعی ندارد و قابل تأیید نیست.";
    case "DOCUMENT_NOT_FOUND":
      return "سند یافت نشد.";
    case "INVALID_ENROLLMENT_STATUS":
      return "ثبت‌نام در وضعیت مجاز برای این عملیات نیست.";
    case "FILE_REQUIRED":
      return "انتخاب فایل الزامی است.";
    case "INVALID_FILE_TYPE":
      return "فقط PDF، JPEG یا PNG مجاز است.";
    case "DOCUMENT_TOO_LARGE":
      return "حجم فایل بیش از حد مجاز است (حداکثر ۵ مگابایت).";
    case "UPLOAD_ERROR":
      return "آپلود نامعتبر است.";
    case "ENROLLMENT_NOT_FOUND":
      return "ثبت‌نام یافت نشد.";
    default:
      break;
  }

  if (err.status === 401) return "برای ادامه وارد حساب شوید.";
  if (err.status === 403) return "دسترسی مجاز نیست.";
  if (err.status === 404) return "منبع مورد نظر یافت نشد.";
  if (err.status === 429) return "تعداد درخواست‌ها زیاد است؛ کمی بعد تلاش کنید.";
  if (err.isNetwork) return "ارتباط با سرور برقرار نشد.";
  return err.message || fallback;
}

export function userMessageFromComplianceError(err, fallback = "خطایی رخ داد") {
  return userMessageFromEnrollmentError(err, fallback);
}


export const PAYMENT_STATUS_LABELS = {
  CREATED: "ایجادشده",
  INITIATED: "ارسال به درگاه",
  PENDING: "در انتظار تأیید",
  SUCCESS: "موفق",
  FAILED: "ناموفق",
  CANCELLED: "لغو شده",
  EXPIRED: "منقضی",
  REFUNDED: "استرداد شده",
  REFUND_REQUESTED: "درخواست استرداد",
};

export const ENROLLMENT_STATUS_LABELS = {
  PENDING: "در انتظار",
  PAYMENT_PENDING: "در انتظار پرداخت",
  PAID: "پرداخت‌شده",
  ACTIVE: "فعال",
  PENDING_COMPLIANCE: "در انتظار تکمیل مدارک",
  COMPLETED: "تکمیل‌شده",
  CANCELLED: "لغو شده",
  PAYMENT_FAILED: "پرداخت ناموفق",
  EXPIRED: "منقضی",
  REFUNDED: "استرداد شده",
  WAITLISTED: "لیست انتظار",
};

/** Backend cancel is idempotent for these; hide cancel CTA for terminal-ish states. */
const CANCEL_HIDDEN_STATUSES = new Set(["CANCELLED", "COMPLETED", "REFUNDED"]);

export function canUserCancelEnrollment(status) {
  if (!status) return false;
  return !CANCEL_HIDDEN_STATUSES.has(status);
}

export function formatIrrAmount(amount) {
  if (amount == null || Number.isNaN(Number(amount))) return "—";
  return `${Number(amount).toLocaleString("fa-IR")} ریال`;
}

/** Parse gateway return query — do not treat as payment success alone. */
export function parsePaymentReturnQuery(searchParams) {
  const authority =
    searchParams.get("Authority") ||
    searchParams.get("authority") ||
    searchParams.get("providerRef") ||
    "";
  const statusRaw = (
    searchParams.get("Status") ||
    searchParams.get("status") ||
    searchParams.get("success") ||
    ""
  ).toUpperCase();
  const paymentId =
    searchParams.get("paymentId") || searchParams.get("payment_id") || "";

  let intentSuccess = true;
  if (
    statusRaw === "NOK" ||
    statusRaw === "FAILED" ||
    statusRaw === "CANCEL" ||
    statusRaw === "CANCELLED" ||
    statusRaw === "FALSE" ||
    statusRaw === "0"
  ) {
    intentSuccess = false;
  }

  return {
    authority: authority || null,
    paymentId: paymentId || null,
    intentSuccess,
    statusRaw: statusRaw || null,
  };
}

/** Backend COMPLIANCE_STATUSES */
export const COMPLIANCE_STATUS_LABELS = {
  PENDING: "در انتظار بررسی",
  APPROVED: "تأیید شده",
  REJECTED: "رد شده",
  EXPIRED: "منقضی",
};

export const MEDICAL_PROFILE_APPROVAL_LABELS = {
  NONE: "ثبت نشده",
  PENDING: "در انتظار بررسی",
  APPROVED: "تأیید شده",
  REJECTED: "رد شده",
  EXPIRED: "منقضی",
};

export const DOCUMENT_ACCEPT = "application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png";
export const DOCUMENT_MAX_BYTES = 5 * 1024 * 1024;

/**
 * Derive UX bucket from latest compliance document (server statuses only).
 * @returns {"missing"|"pending"|"approved"|"rejected"|"expired"|"unknown"}
 */
export function deriveDocumentUxStatus(docs) {
  const list = Array.isArray(docs) ? docs : [];
  if (!list.length) return "missing";
  const latest = list[0];
  const st = latest?.status;
  if (st === "APPROVED") {
    if (latest.expiresAt && new Date(latest.expiresAt).getTime() <= Date.now()) {
      return "expired";
    }
    return "approved";
  }
  if (st === "PENDING") return "pending";
  if (st === "REJECTED") return "rejected";
  if (st === "EXPIRED") return "expired";
  return "unknown";
}

export const DOCUMENT_UX_LABELS = {
  missing: "موردنیاز — هنوز ارسال نشده",
  pending: "ارسال شده — در انتظار بررسی",
  approved: "تأیید شده",
  rejected: "رد شده — نیاز به ارسال مجدد",
  expired: "منقضی — نیاز به ارسال مجدد",
  unknown: "وضعیت نامشخص",
};

