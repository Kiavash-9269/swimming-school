/** Labels for backend enums — display only; values stay English. */

export const CLASS_STATUS_LABELS = {
  DRAFT: "پیش‌نویس",
  PUBLISHED: "منتشر شده",
  REGISTRATION_OPEN: "ثبت‌نام باز",
  REGISTRATION_CLOSED: "ثبت‌نام بسته",
  IN_PROGRESS: "در حال برگزاری",
  COMPLETED: "پایان‌یافته",
  CANCELLED: "لغو شده",
  ARCHIVED: "بایگانی",
};

export const CLASS_STATUS_OPTIONS = Object.keys(CLASS_STATUS_LABELS);

export const SESSION_STATUS_LABELS = {
  SCHEDULED: "زمان‌بندی‌شده",
  COMPLETED: "برگزار شده",
  CANCELLED: "لغو شده",
  RESCHEDULED: "تغییر زمان",
};

export const GENDER_RESTRICTION_LABELS = {
  ANY: "بدون محدودیت",
  MALE: "مردانه",
  FEMALE: "زنانه",
};

/** Product rule: courses are male or female only. */
export const GENDER_RESTRICTION_OPTIONS = [
  { value: "MALE", label: GENDER_RESTRICTION_LABELS.MALE },
  { value: "FEMALE", label: GENDER_RESTRICTION_LABELS.FEMALE },
];

/** Backend daysOfWeek: 0–6 (JS getUTCDay style). */
export const DAY_OF_WEEK_OPTIONS = [
  { value: 0, label: "یکشنبه" },
  { value: 1, label: "دوشنبه" },
  { value: 2, label: "سه‌شنبه" },
  { value: 3, label: "چهارشنبه" },
  { value: 4, label: "پنجشنبه" },
  { value: 5, label: "جمعه" },
  { value: 6, label: "شنبه" },
];

const DAY_LABELS = DAY_OF_WEEK_OPTIONS.map((d) => d.label);

/** Backend daysOfWeek: 0–6 (JS getDay style). */
export function formatDaysOfWeek(days = []) {
  return days.map((d) => DAY_LABELS[d] ?? String(d)).join("، ");
}

export function formatIrr(amount) {
  if (amount == null || Number.isNaN(Number(amount))) return "—";
  return `${Number(amount).toLocaleString("fa-IR")} ریال`;
}

export function formatDateFa(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fa-IR");
}

export function toDateInputValue(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export const inputClass =
  "w-full rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/80 px-3 py-2.5 text-sm text-slate-900 outline-none shadow-sm transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-600/15";

export function classStatusTone(status) {
  if (status === "REGISTRATION_OPEN" || status === "IN_PROGRESS") return "success";
  if (status === "DRAFT" || status === "PUBLISHED") return "info";
  if (status === "REGISTRATION_CLOSED" || status === "COMPLETED" || status === "ARCHIVED") return "neutral";
  if (status === "CANCELLED") return "danger";
  return "warn";
}

export function userMessageFromApiError(err, fallback = "خطایی رخ داد") {
  if (!err) return fallback;
  const code = err.code || err?.data?.error?.code;
  if (err.status === 404 || code === "CLASS_NOT_FOUND" || code === "COURSE_NOT_FOUND") {
    return "کلاس یا دوره پیدا نشد.";
  }
  if (code === "INSTRUCTOR_NOT_FOUND") return "مربی یافت نشد یا غیرفعال است.";
  if (code === "INVALID_CLASS_STATUS") return "تغییر وضعیت کلاس در این حالت مجاز نیست.";
  if (code === "CLASS_HAS_ACTIVE_ENROLLMENTS") {
    return "کلاس دارای ثبت‌نام فعال/در جریان است و قابل لغو نیست.";
  }
  if (code === "SESSIONS_HAVE_ATTENDANCE") {
    return "جلسات دارای حضور ثبت‌شده قابل تولید مجدد نیستند؛ انجام این کار می‌تواند حضورهای ثبت‌شده را بی‌اعتبار کند. جلسات فعلی جایگزین نشدند.";
  }
  if (code === "INSTRUCTOR_USER_LINKED") {
    return "این کاربر قبلاً به یک مربی فعال لینک شده است.";
  }
  if (code === "VALIDATION_ERROR") {
    const details = err.details || err?.data?.error?.details;
    if (Array.isArray(details) && details.length) {
      const first = details[0];
      const path = first.path || first.field || "";
      if (String(path).includes("userId") || /شناسه نامعتبر/.test(first.message || "")) {
        return "شناسه کاربر نامعتبر است. برای اتصال مربی فقط شماره موبایل را وارد کنید و شناسه را خالی بگذارید.";
      }
      if (first.message) return first.message;
    }
    return "اطلاعات ارسال‌شده نامعتبر است. فیلدها را بررسی کنید.";
  }
  if (code === "SESSION_GENERATION_FAILED") {
    return "تولید جلسات با برنامه کلاس هم‌خوان نیست (تعداد تولیدشده با تعداد جلسات کلاس برابر نیست).";
  }
  if (err.status === 401) return "برای ادامه وارد حساب شوید.";
  if (err.status === 403) return "دسترسی مجاز نیست.";
  if (err.status === 429) return "تعداد درخواست‌ها زیاد است؛ کمی بعد تلاش کنید.";
  if (err.status === 502 || err.status === 504) return "سرور موقتاً در دسترس نیست.";
  if (err.isNetwork) return "ارتباط با سرور برقرار نشد.";
  return err.message || fallback;
}

/**
 * Derive UX registration state from capacity snapshot (preferred) or class.
 */
export function resolveRegistrationUx(capacity, courseClass) {
  const status = capacity?.status || courseClass?.status;
  const registrationOpen =
    capacity?.registrationOpen ?? status === "REGISTRATION_OPEN";
  const isFull = capacity?.isFull ?? (courseClass?.availableSeats != null && courseClass.availableSeats <= 0);
  const available = capacity?.available ?? courseClass?.availableSeats;

  if (status === "CANCELLED" || status === "ARCHIVED") {
    return { key: "unavailable", label: CLASS_STATUS_LABELS[status] || status, registrationOpen: false, isFull: true, available };
  }
  if (!registrationOpen) {
    return {
      key: "closed",
      label: CLASS_STATUS_LABELS[status] || "ثبت‌نام بسته",
      registrationOpen: false,
      isFull,
      available,
    };
  }
  if (isFull) {
    return { key: "full", label: "ظرفیت تکمیل", registrationOpen: true, isFull: true, available: available ?? 0 };
  }
  return { key: "open", label: "ثبت‌نام باز", registrationOpen: true, isFull: false, available };
}
