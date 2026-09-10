export const GENDER_OPTIONS = [
  { value: "MALE", label: "مرد" },
  { value: "FEMALE", label: "زن" },
];

export const RELATION_OPTIONS = [
  { value: "SELF", label: "خودم" },
  { value: "CHILD", label: "فرزند" },
  { value: "OTHER", label: "سایر" },
];

export const GENDER_LABELS = Object.fromEntries(GENDER_OPTIONS.map((o) => [o.value, o.label]));
export const RELATION_LABELS = Object.fromEntries(RELATION_OPTIONS.map((o) => [o.value, o.label]));

export function formatDateInput(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export function formatDateFa(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fa-IR");
}

export function userMessageFromParticipantError(err, fallback = "خطایی رخ داد") {
  if (!err) return fallback;
  if (err.code === "PARTICIPANT_NOT_FOUND" || err.status === 404) {
    return "شرکت‌کننده یافت نشد.";
  }
  if (err.code === "FORBIDDEN" || err.status === 403) {
    return "دسترسی به این شرکت‌کننده مجاز نیست.";
  }
  if (err.code === "PARTICIPANT_INACTIVE") {
    return "این شرکت‌کننده غیرفعال است.";
  }
  if (err.code === "PARTICIPANT_HAS_ACTIVE_ENROLLMENT") {
    return "به دلیل ثبت‌نام فعال، غیرفعال‌سازی ممکن نیست.";
  }
  if (err.code === "INVALID_BIRTH_DATE") {
    return "تاریخ تولد نامعتبر است.";
  }
  if (err.status === 401) return "برای ادامه وارد حساب شوید.";
  if (err.status === 429) return "تعداد درخواست‌ها زیاد است؛ کمی بعد تلاش کنید.";
  if (err.isNetwork) return "ارتباط با سرور برقرار نشد.";
  return err.message || fallback;
}

/** Client-side mirror of Zod rules — backend remains authoritative. */
export function validateParticipantForm(values, { partial = false } = {}) {
  const errors = {};
  const require = (key, ok, msg) => {
    if (!ok) errors[key] = msg;
  };

  if (!partial || values.firstName !== undefined) {
    const v = String(values.firstName || "").trim();
    require("firstName", v.length >= 2 && v.length <= 80, "نام باید ۲ تا ۸۰ کاراکتر باشد.");
  }
  if (!partial || values.lastName !== undefined) {
    const v = String(values.lastName || "").trim();
    require("lastName", v.length >= 2 && v.length <= 80, "نام خانوادگی باید ۲ تا ۸۰ کاراکتر باشد.");
  }
  if (!partial || values.birthDate !== undefined) {
    require("birthDate", Boolean(values.birthDate), "تاریخ تولد الزامی است.");
  }
  if (!partial || values.gender !== undefined) {
    require("gender", values.gender === "MALE" || values.gender === "FEMALE", "جنسیت را انتخاب کنید.");
  }
  if (values.relation != null && values.relation !== "") {
    require(
      "relation",
      ["SELF", "CHILD", "OTHER"].includes(values.relation),
      "نسبت نامعتبر است.",
    );
  }
  const phoneOk = (p) => !p || /^09\d{9}$/.test(p);
  if (values.phone != null) {
    require("phone", phoneOk(String(values.phone).trim()), "موبایل باید خالی یا ۰۹xxxxxxxxx باشد.");
  }
  if (values.emergencyContact?.phone != null) {
    require(
      "emergencyPhone",
      phoneOk(String(values.emergencyContact.phone).trim()),
      "موبایل تماس اضطراری نامعتبر است.",
    );
  }
  return errors;
}

export function buildParticipantPayload(values) {
  const payload = {
    firstName: String(values.firstName || "").trim(),
    lastName: String(values.lastName || "").trim(),
    birthDate: values.birthDate,
    gender: values.gender,
    relation: values.relation || "SELF",
    phone: String(values.phone || "").trim(),
    emergencyContact: {
      name: String(values.emergencyContact?.name || "").trim(),
      phone: String(values.emergencyContact?.phone || "").trim(),
      relationship: String(values.emergencyContact?.relationship || "").trim(),
    },
  };
  return payload;
}
