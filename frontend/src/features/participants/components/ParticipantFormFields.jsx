import {
  GENDER_OPTIONS,
  RELATION_OPTIONS,
} from "../participantLabels";
import PersianDateField from "../../../components/Ui/PersianDateField";

const inputClass =
  "mt-1 w-full rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/80 px-3 py-2.5 text-sm text-slate-900 outline-none shadow-sm focus:border-cyan-600 focus:ring-2 focus:ring-cyan-600/15";
const labelClass = "block text-sm font-medium text-slate-700";
const errClass = "mt-1 text-xs text-rose-600";

/**
 * Shared create/edit fields — mirrors backend participantBody / updateBody.
 */
export default function ParticipantFormFields({
  values,
  errors = {},
  onChange,
  disabled = false,
}) {
  const set = (key, value) => onChange({ ...values, [key]: value });
  const setEmergency = (key, value) =>
    onChange({
      ...values,
      emergencyContact: { ...(values.emergencyContact || {}), [key]: value },
    });

  return (
    <div className="space-y-4" dir="rtl">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="firstName">
            نام <span className="text-rose-600">*</span>
          </label>
          <input
            id="firstName"
            className={inputClass}
            value={values.firstName || ""}
            disabled={disabled}
            onChange={(e) => set("firstName", e.target.value)}
            autoComplete="given-name"
          />
          {errors.firstName ? <p className={errClass}>{errors.firstName}</p> : null}
        </div>
        <div>
          <label className={labelClass} htmlFor="lastName">
            نام خانوادگی <span className="text-rose-600">*</span>
          </label>
          <input
            id="lastName"
            className={inputClass}
            value={values.lastName || ""}
            disabled={disabled}
            onChange={(e) => set("lastName", e.target.value)}
            autoComplete="family-name"
          />
          {errors.lastName ? <p className={errClass}>{errors.lastName}</p> : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="birthDate">
            تاریخ تولد <span className="text-rose-600">*</span>
          </label>
          <div className="mt-1">
            <PersianDateField
              id="birthDate"
              value={values.birthDate || ""}
              disabled={disabled}
              placeholder="انتخاب تاریخ تولد"
              onChange={(v) => set("birthDate", v)}
            />
          </div>
          {errors.birthDate ? <p className={errClass}>{errors.birthDate}</p> : null}
        </div>
        <div>
          <label className={labelClass} htmlFor="gender">
            جنسیت <span className="text-rose-600">*</span>
          </label>
          <select
            id="gender"
            className={inputClass}
            value={values.gender || ""}
            disabled={disabled}
            onChange={(e) => set("gender", e.target.value)}
          >
            <option value="">انتخاب کنید</option>
            {GENDER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {errors.gender ? <p className={errClass}>{errors.gender}</p> : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="relation">
            نسبت
          </label>
          <select
            id="relation"
            className={inputClass}
            value={values.relation || "SELF"}
            disabled={disabled}
            onChange={(e) => set("relation", e.target.value)}
          >
            {RELATION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {errors.relation ? <p className={errClass}>{errors.relation}</p> : null}
        </div>
        <div>
          <label className={labelClass} htmlFor="phone">
            موبایل (اختیاری)
          </label>
          <input
            id="phone"
            className={inputClass}
            value={values.phone || ""}
            disabled={disabled}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="09xxxxxxxxx"
            inputMode="numeric"
          />
          {errors.phone ? <p className={errClass}>{errors.phone}</p> : null}
        </div>
      </div>

      <fieldset className="rounded-xl border border-slate-200 p-4">
        <legend className="px-1 text-sm font-medium text-slate-700">تماس اضطراری (اختیاری)</legend>
        <div className="mt-2 grid gap-4 sm:grid-cols-3">
          <div>
            <label className={labelClass} htmlFor="ecName">
              نام
            </label>
            <input
              id="ecName"
              className={inputClass}
              value={values.emergencyContact?.name || ""}
              disabled={disabled}
              onChange={(e) => setEmergency("name", e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="ecPhone">
              موبایل
            </label>
            <input
              id="ecPhone"
              className={inputClass}
              value={values.emergencyContact?.phone || ""}
              disabled={disabled}
              onChange={(e) => setEmergency("phone", e.target.value)}
              placeholder="09xxxxxxxxx"
              inputMode="numeric"
            />
            {errors.emergencyPhone ? <p className={errClass}>{errors.emergencyPhone}</p> : null}
          </div>
          <div>
            <label className={labelClass} htmlFor="ecRel">
              نسبت
            </label>
            <input
              id="ecRel"
              className={inputClass}
              value={values.emergencyContact?.relationship || ""}
              disabled={disabled}
              onChange={(e) => setEmergency("relationship", e.target.value)}
            />
          </div>
        </div>
      </fieldset>
    </div>
  );
}
