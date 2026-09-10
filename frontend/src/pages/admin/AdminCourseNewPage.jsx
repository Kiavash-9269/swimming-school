import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createCourseTemplate } from "../../features/courses/coursesApi";
import {
  GENDER_RESTRICTION_OPTIONS,
  inputClass,
  userMessageFromApiError,
} from "../../features/courses/courseLabels";
import { Field } from "../../features/courses/components/AdminCourseUi";
import { useToast } from "../../components/feedback/useToast";

const empty = {
  title: "",
  description: "",
  level: "",
  ageMin: "5",
  ageMax: "18",
  genderRestriction: "MALE",
  requiresInsurance: false,
  requiresMedicalApproval: false,
  isActive: true,
};

export default function AdminCourseNewPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function validate() {
    const e = {};
    if (!form.title.trim() || form.title.trim().length < 2) e.title = "عنوان حداقل ۲ کاراکتر.";
    if (!form.level.trim()) e.level = "سطح الزامی است.";
    const amin = Number(form.ageMin);
    const amax = Number(form.ageMax);
    if (Number.isNaN(amin) || amin < 0) e.ageMin = "سن حداقل نامعتبر.";
    if (Number.isNaN(amax) || amax < amin) e.ageMax = "سن حداکثر باید ≥ حداقل باشد.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function onSubmit(ev) {
    ev.preventDefault();
    if (!validate() || saving) return;
    setSaving(true);
    try {
      const created = await createCourseTemplate({
        title: form.title.trim(),
        description: form.description.trim(),
        level: form.level.trim(),
        ageMin: Number(form.ageMin),
        ageMax: Number(form.ageMax),
        genderRestriction: form.genderRestriction,
        prerequisites: [],
        requiresInsurance: Boolean(form.requiresInsurance),
        requiresMedicalApproval: Boolean(form.requiresMedicalApproval),
        isActive: Boolean(form.isActive),
      });
      toast.success("دوره ایجاد شد.");
      navigate(`/admin/courses/${created.id}`);
    } catch (err) {
      toast.error(userMessageFromApiError(err, "ایجاد دوره ناموفق بود."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link to="/admin/courses" className="text-sm text-cyan-700 hover:underline">
          ← دوره‌ها
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">دوره جدید</h1>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
        <Field label="عنوان" error={errors.title}>
          <input className={inputClass} value={form.title} onChange={(e) => set("title", e.target.value)} />
        </Field>
        <Field label="سطح" error={errors.level}>
          <input className={inputClass} value={form.level} onChange={(e) => set("level", e.target.value)} />
        </Field>
        <Field label="توضیح">
          <textarea
            className={inputClass}
            rows={4}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="حداقل سن" error={errors.ageMin}>
            <input
              type="number"
              min={0}
              max={120}
              className={inputClass}
              value={form.ageMin}
              onChange={(e) => set("ageMin", e.target.value)}
            />
          </Field>
          <Field label="حداکثر سن" error={errors.ageMax}>
            <input
              type="number"
              min={0}
              max={120}
              className={inputClass}
              value={form.ageMax}
              onChange={(e) => set("ageMax", e.target.value)}
            />
          </Field>
        </div>
        <Field label="محدودیت جنسیت">
          <select
            className={inputClass}
            value={form.genderRestriction}
            onChange={(e) => set("genderRestriction", e.target.value)}
          >
            {GENDER_RESTRICTION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.requiresInsurance}
              onChange={(e) => set("requiresInsurance", e.target.checked)}
            />
            نیاز به بیمه
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.requiresMedicalApproval}
              onChange={(e) => set("requiresMedicalApproval", e.target.checked)}
            />
            نیاز به تأیید پزشکی
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)} />
            فعال
          </label>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-cyan-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-cyan-600 disabled:opacity-50"
        >
          {saving ? "در حال ذخیره…" : "ایجاد دوره"}
        </button>
      </form>
    </div>
  );
}
