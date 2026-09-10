/**
 * Persian labels for Excel export headers, sheet names, and enum cell values.
 * Keys remain English (API field names); only display text is localized.
 */

const SHEET_NAMES = {
  participants: "شرکت‌کنندگان",
  enrollments: "ثبت‌نام‌ها",
  payments: "پرداخت‌ها",
  attendance: "حضور و غیاب",
  classes: "کلاس‌ها",
  waitlist: "لیست انتظار",
};

const FILE_BASENAMES = {
  participants: "گزارش-شرکت‌کنندگان",
  enrollments: "گزارش-ثبت‌نام‌ها",
  payments: "گزارش-پرداخت‌ها",
  attendance: "گزارش-حضور-و-غیاب",
  classes: "گزارش-کلاس‌ها",
  waitlist: "گزارش-لیست-انتظار",
};

const CLASS_STATUS = {
  DRAFT: "پیش‌نویس",
  PUBLISHED: "منتشر شده",
  REGISTRATION_OPEN: "ثبت‌نام باز",
  REGISTRATION_CLOSED: "ثبت‌نام بسته",
  IN_PROGRESS: "در حال برگزاری",
  COMPLETED: "پایان‌یافته",
  CANCELLED: "لغو شده",
  ARCHIVED: "بایگانی",
};

const ENROLLMENT_STATUS = {
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

const PAYMENT_STATUS = {
  CREATED: "ایجاد شده",
  INITIATED: "آغاز شده",
  PENDING: "در انتظار",
  SUCCESS: "موفق",
  FAILED: "ناموفق",
  CANCELLED: "لغو شده",
  EXPIRED: "منقضی",
  REFUNDED: "استرداد شده",
  REFUND_REQUESTED: "درخواست استرداد",
};

const ATTENDANCE_STATUS = {
  PRESENT: "حاضر",
  ABSENT: "غایب",
  LATE: "تأخیر",
  EXCUSED: "موجه",
  UNKNOWN: "نامشخص",
};

const WAITLIST_STATUS = {
  WAITING: "در انتظار",
  OFFERED: "پیشنهاد شده",
  ACCEPTED: "پذیرفته",
  EXPIRED: "منقضی",
  CANCELLED: "لغو شده",
};

const COMPLIANCE_STATUS = {
  NONE: "ندارد",
  MISSING: "ثبت نشده",
  PENDING: "در انتظار بررسی",
  APPROVED: "تأیید شده",
  REJECTED: "رد شده",
  EXPIRED: "منقضی",
  UNKNOWN: "نامشخص",
};

const GENDER = {
  MALE: "مرد",
  FEMALE: "زن",
  ANY: "بدون محدودیت",
};

const RELATION = {
  SELF: "خودم",
  CHILD: "فرزند",
  SPOUSE: "همسر",
  OTHER: "سایر",
};

function labelOf(map, value) {
  if (value == null || value === "") return "";
  const key = String(value);
  return map[key] || key;
}

function formatFaDate(value) {
  if (value == null || value === "") return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("fa-IR");
}

function formatFaDateTime(value) {
  if (value == null || value === "") return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("fa-IR", { dateStyle: "short", timeStyle: "short" });
}

function formatBool(value) {
  if (value === true || value === "true") return "بله";
  if (value === false || value === "false") return "خیر";
  return value == null ? "" : String(value);
}

/**
 * Map a report row's display fields to Persian before Excel write.
 * Non-enum / ID fields stay as-is (IDs remain technical identifiers).
 */
function localizeExportRow(reportType, row) {
  if (!row || typeof row !== "object") return row;
  const out = { ...row };

  switch (reportType) {
    case "participants":
      out.gender = labelOf(GENDER, row.gender);
      out.relation = labelOf(RELATION, row.relation);
      out.isActive = formatBool(row.isActive);
      out.hasEmergencyContact = formatBool(row.hasEmergencyContact);
      out.insuranceStatus = labelOf(COMPLIANCE_STATUS, row.insuranceStatus);
      out.medicalStatus = labelOf(COMPLIANCE_STATUS, row.medicalStatus);
      out.birthDate = formatFaDate(row.birthDate);
      out.createdAt = formatFaDateTime(row.createdAt);
      break;
    case "enrollments":
      out.status = labelOf(ENROLLMENT_STATUS, row.status);
      out.eligibilityEligible = formatBool(row.eligibilityEligible);
      out.createdAt = formatFaDateTime(row.createdAt);
      out.confirmedAt = formatFaDateTime(row.confirmedAt);
      out.cancelledAt = formatFaDateTime(row.cancelledAt);
      break;
    case "payments":
      out.status = labelOf(PAYMENT_STATUS, row.status);
      out.createdAt = formatFaDateTime(row.createdAt);
      out.verifiedAt = formatFaDateTime(row.verifiedAt);
      break;
    case "attendance":
      out.status = labelOf(ATTENDANCE_STATUS, row.status);
      out.markedAt = formatFaDateTime(row.markedAt);
      break;
    case "classes":
      out.status = labelOf(CLASS_STATUS, row.status);
      out.startDate = formatFaDate(row.startDate);
      out.endDate = formatFaDate(row.endDate);
      break;
    case "waitlist":
      out.status = labelOf(WAITLIST_STATUS, row.status);
      out.notifiedAt = formatFaDateTime(row.notifiedAt);
      out.expiresAt = formatFaDateTime(row.expiresAt);
      out.createdAt = formatFaDateTime(row.createdAt);
      break;
    default:
      break;
  }

  return out;
}

module.exports = {
  SHEET_NAMES,
  FILE_BASENAMES,
  localizeExportRow,
  labelOf,
  formatBool,
  formatFaDate,
  formatFaDateTime,
  CLASS_STATUS,
  ENROLLMENT_STATUS,
  PAYMENT_STATUS,
  ATTENDANCE_STATUS,
  WAITLIST_STATUS,
  COMPLIANCE_STATUS,
  GENDER,
  RELATION,
};
