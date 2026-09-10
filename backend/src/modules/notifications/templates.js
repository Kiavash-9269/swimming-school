const { NOTIFICATION_TYPES, LOCALES } = require("./notification.constants");

const TEMPLATES = {
  [NOTIFICATION_TYPES.PAYMENT_SUCCESS]: {
    version: "v1",
    fa: "پرداخت شما با موفقیت انجام شد.",
    en: "Your payment was successful.",
  },
  [NOTIFICATION_TYPES.PAYMENT_FAILED]: {
    version: "v1",
    fa: "پرداخت شما ناموفق بود. در صورت کسر وجه با پشتیبانی تماس بگیرید.",
    en: "Your payment failed. Contact support if charged.",
  },
  [NOTIFICATION_TYPES.PAYMENT_EXPIRED]: {
    version: "v1",
    fa: "مهلت پرداخت شما به پایان رسید.",
    en: "Your payment window has expired.",
  },
  [NOTIFICATION_TYPES.ENROLLMENT_CONFIRMED]: {
    version: "v1",
    fa: "ثبت‌نام شما در کلاس شنا تأیید شد.",
    en: "Your swimming class enrollment is confirmed.",
  },
  [NOTIFICATION_TYPES.ENROLLMENT_PENDING_COMPLIANCE]: {
    version: "v1",
    fa: "پرداخت شما موفق بود؛ تکمیل مدارک برای فعال‌سازی ثبت‌نام لازم است.",
    en: "Payment succeeded; complete required documents to activate enrollment.",
  },
  [NOTIFICATION_TYPES.ENROLLMENT_CANCELLED]: {
    version: "v1",
    fa: "ثبت‌نام شما لغو شد.",
    en: "Your enrollment was cancelled.",
  },
  [NOTIFICATION_TYPES.ENROLLMENT_REFUNDED]: {
    version: "v1",
    fa: "استرداد مرتبط با ثبت‌نام شما ثبت شد.",
    en: "A refund related to your enrollment was recorded.",
  },
  [NOTIFICATION_TYPES.DOCUMENT_APPROVED]: {
    version: "v1",
    fa: "مدرک شما تأیید شد.",
    en: "Your document was approved.",
  },
  [NOTIFICATION_TYPES.DOCUMENT_REJECTED]: {
    version: "v1",
    fa: "مدرک شما رد شد. لطفاً دوباره ارسال کنید.",
    en: "Your document was rejected. Please resubmit.",
  },
  [NOTIFICATION_TYPES.WAITLIST_AVAILABLE]: {
    version: "v1",
    fa: "یک ظرفیت برای شما در لیست انتظار آزاد شد. مهلت رزرو محدود است.",
    en: "A waitlist seat is available for you. The hold is time-limited.",
  },
  [NOTIFICATION_TYPES.SESSION_REMINDER]: {
    version: "v1",
    fa: "یادآوری: جلسه کلاس شنای شما به‌زودی برگزار می‌شود.",
    en: "Reminder: your swimming session is coming up soon.",
  },
  [NOTIFICATION_TYPES.CLASS_CANCELLED]: {
    version: "v1",
    fa: "کلاس شما لغو شده است.",
    en: "Your class has been cancelled.",
  },
  [NOTIFICATION_TYPES.CLASS_RESCHEDULED]: {
    version: "v1",
    fa: "زمان کلاس شما تغییر کرده است.",
    en: "Your class has been rescheduled.",
  },
  [NOTIFICATION_TYPES.ATTENDANCE_ABSENT]: {
    version: "v1",
    fa: "شما در روز {{dayLabel}} ساعت {{timeLabel}} در کلاس «{{classTitle}}» غایب بودید.",
    en: "You were absent from class «{{classTitle}}» on {{dayLabel}} at {{timeLabel}}.",
  },
};

function applyVars(body, vars = {}) {
  let out = String(body || "");
  for (const [key, raw] of Object.entries(vars)) {
    if (raw == null) continue;
    const safe = String(raw).replace(/[<>]/g, "").slice(0, 80);
    out = out.split(`{{${key}}}`).join(safe);
  }
  // drop any leftover placeholders
  out = out.replace(/\{\{[a-zA-Z0-9_]+\}\}/g, "").replace(/\s{2,}/g, " ").trim();
  return out;
}

function renderTemplate(type, locale = LOCALES.FA, vars = {}) {
  const tpl = TEMPLATES[type];
  if (!tpl) {
    return { body: "", version: "v1" };
  }
  const lang = locale === LOCALES.EN ? "en" : "fa";
  let body = applyVars(tpl[lang] || tpl.fa, vars);
  // Safe optional placeholders only (never user-controlled HTML)
  if (vars.whenLabel && type !== NOTIFICATION_TYPES.ATTENDANCE_ABSENT) {
    body = `${body} (${String(vars.whenLabel).slice(0, 40)})`;
  }
  if (vars.rejectionHint && type === NOTIFICATION_TYPES.DOCUMENT_REJECTED) {
    // intentionally omit admin free-text — only generic hint flag
    body = locale === LOCALES.EN ? `${body} Check the portal for details.` : `${body} جزئیات را در پنل ببینید.`;
  }
  return { body: body.slice(0, 1000), version: tpl.version };
}

module.exports = {
  TEMPLATES,
  renderTemplate,
};
