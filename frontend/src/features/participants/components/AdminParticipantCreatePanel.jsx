import { useState } from "react";
import { Link } from "react-router-dom";
import ParticipantFormFields from "./ParticipantFormFields";
import PersianDateField from "../../../components/Ui/PersianDateField";
import {
  buildParticipantPayload,
  userMessageFromParticipantError,
  validateParticipantForm,
} from "../participantLabels";
import { createAdminParticipant } from "../../enrollments/enrollmentsApi";

const inputClass =
  "mt-1 w-full rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/80 px-3 py-2.5 text-sm text-slate-900 outline-none shadow-sm focus:border-cyan-600 focus:ring-2 focus:ring-cyan-600/15";
const labelClass = "block text-sm font-medium text-slate-700";
const errClass = "mt-1 text-xs text-rose-600";

const EMPTY = {
  accountPhone: "",
  guardianFirstName: "",
  guardianLastName: "",
  firstName: "",
  lastName: "",
  birthDate: "",
  gender: "",
  relation: "SELF",
  phone: "",
  emergencyContact: { name: "", phone: "", relationship: "" },
  registeredAt: "",
  notes: "",
};

function toEnglishDigits(value) {
  return String(value || "").replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
}

function validate(values) {
  const errors = validateParticipantForm(values);
  const phone = toEnglishDigits(values.accountPhone).trim();
  if (!/^09\d{9}$/.test(phone)) errors.accountPhone = "شماره موبایل حساب باید ۰۹xxxxxxxxx باشد.";
  if (values.relation !== "SELF") {
    const gf = String(values.guardianFirstName || "").trim();
    const gl = String(values.guardianLastName || "").trim();
    if (gf.length < 2) errors.guardianFirstName = "نام ولی/صاحب حساب الزامی است.";
    if (gl.length < 2) errors.guardianLastName = "نام خانوادگی ولی/صاحب حساب الزامی است.";
  }
  return errors;
}

function errorMessage(err) {
  if (err?.code === "NAME_EXISTS") {
    return "کاربری با همین نام و نام خانوادگی با شماره دیگری ثبت شده است. شماره حساب را بررسی کنید.";
  }
  if (err?.code === "PARTICIPANT_EXISTS") return "این شاگرد قبلاً برای همین حساب ثبت شده است.";
  if (err?.code === "GUARDIAN_NAME_REQUIRED") return "نام و نام خانوادگی صاحب حساب (ولی) الزامی است.";
  if (err?.code === "VALIDATION_ERROR") return "برخی فیلدها نامعتبرند؛ مقادیر را بررسی کنید.";
  return userMessageFromParticipantError(err, "ثبت شاگرد انجام نشد.");
}

/**
 * ADMIN — add a pre-existing/offline student. The owner account is matched by phone or created
 * with the phone number as its initial password.
 */
export default function AdminParticipantCreatePanel({ onCreated, onClose }) {
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [result, setResult] = useState(null);

  const set = (key, value) => setValues((prev) => ({ ...prev, [key]: value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setServerError("");
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const isSelf = values.relation === "SELF";
    const body = {
      ...buildParticipantPayload({ ...values, phone: toEnglishDigits(values.phone) }),
      accountPhone: toEnglishDigits(values.accountPhone).trim(),
      notes: String(values.notes || "").trim(),
    };
    if (!isSelf) {
      body.guardianFirstName = values.guardianFirstName.trim();
      body.guardianLastName = values.guardianLastName.trim();
    }
    if (values.registeredAt) body.registeredAt = values.registeredAt;

    setSubmitting(true);
    try {
      const data = await createAdminParticipant(body);
      setResult(data);
      setValues(EMPTY);
      setErrors({});
      onCreated?.(data);
    } catch (err) {
      setServerError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-2xl border border-cyan-200 bg-white p-4 sm:p-6"
      dir="rtl"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">افزودن شاگرد</h2>
          <p className="mt-1 text-xs text-slate-500">
            برای شاگردانی که از قبل در مدرسه هستند. اگر حسابی با این شماره نباشد ساخته می‌شود و رمز
            اولیه همان شماره موبایل است.
          </p>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
          >
            بستن
          </button>
        ) : null}
      </div>

      {result ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          شاگرد{" "}
          <Link
            to={`/admin/participants/${result.participant?.id}`}
            className="font-semibold underline"
          >
            {`${result.participant?.firstName || ""} ${result.participant?.lastName || ""}`.trim()}
          </Link>{" "}
          ثبت شد.{" "}
          {result.account?.created
            ? `حساب جدید با شماره ${result.account.phone} ساخته شد (رمز اولیه: همان شماره).`
            : `به حساب موجود ${result.account?.phone} متصل شد.`}
        </div>
      ) : null}

      {serverError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {serverError}
        </div>
      ) : null}

      <fieldset className="rounded-xl border border-slate-200 p-4">
        <legend className="px-1 text-sm font-medium text-slate-700">حساب کاربری و عضویت</legend>
        <div className="mt-2 grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="accountPhone">
              موبایل حساب (ورود به سایت) <span className="text-rose-600">*</span>
            </label>
            <input
              id="accountPhone"
              className={inputClass}
              value={values.accountPhone}
              disabled={submitting}
              onChange={(e) => set("accountPhone", e.target.value)}
              placeholder="09xxxxxxxxx"
              inputMode="numeric"
            />
            {errors.accountPhone ? <p className={errClass}>{errors.accountPhone}</p> : null}
          </div>
          <div>
            <label className={labelClass} htmlFor="registeredAt">
              تاریخ عضویت / ثبت‌نام در مدرسه
            </label>
            <div className="mt-1">
              <PersianDateField
                id="registeredAt"
                value={values.registeredAt}
                disabled={submitting}
                placeholder="خالی = امروز"
                onChange={(v) => set("registeredAt", v)}
              />
            </div>
          </div>
        </div>
        {values.relation !== "SELF" ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="guardianFirstName">
                نام ولی / صاحب حساب <span className="text-rose-600">*</span>
              </label>
              <input
                id="guardianFirstName"
                className={inputClass}
                value={values.guardianFirstName}
                disabled={submitting}
                onChange={(e) => set("guardianFirstName", e.target.value)}
              />
              {errors.guardianFirstName ? <p className={errClass}>{errors.guardianFirstName}</p> : null}
            </div>
            <div>
              <label className={labelClass} htmlFor="guardianLastName">
                نام خانوادگی ولی / صاحب حساب <span className="text-rose-600">*</span>
              </label>
              <input
                id="guardianLastName"
                className={inputClass}
                value={values.guardianLastName}
                disabled={submitting}
                onChange={(e) => set("guardianLastName", e.target.value)}
              />
              {errors.guardianLastName ? <p className={errClass}>{errors.guardianLastName}</p> : null}
            </div>
            <p className="text-xs text-slate-500 sm:col-span-2">
              اگر حسابی با این شماره از قبل وجود داشته باشد، شاگرد به همان حساب اضافه می‌شود و این نام
              نادیده گرفته می‌شود.
            </p>
          </div>
        ) : (
          <p className="mt-3 text-xs text-slate-500">
            «نسبت» روی «خودم» است؛ یعنی خود شاگرد صاحب حساب است. برای کودک، نسبت را «فرزند» بگذارید
            تا نام ولی خواسته شود.
          </p>
        )}
      </fieldset>

      <fieldset className="rounded-xl border border-slate-200 p-4">
        <legend className="px-1 text-sm font-medium text-slate-700">مشخصات شاگرد</legend>
        <div className="mt-2">
          <ParticipantFormFields
            values={values}
            errors={errors}
            disabled={submitting}
            onChange={(next) => setValues((prev) => ({ ...prev, ...next }))}
          />
        </div>
      </fieldset>

      <div>
        <label className={labelClass} htmlFor="notes">
          یادداشت (اختیاری)
        </label>
        <textarea
          id="notes"
          rows={3}
          maxLength={1000}
          className={inputClass}
          value={values.notes}
          disabled={submitting}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="مثلاً سطح شنا، کلاس قبلی، توضیحات…"
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl bg-cyan-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-cyan-600 disabled:opacity-50"
        >
          {submitting ? "در حال ثبت…" : "ثبت شاگرد"}
        </button>
      </div>
    </form>
  );
}
