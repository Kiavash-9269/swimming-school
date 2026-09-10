import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getCourseTemplateById, updateCourseTemplate } from "../../features/courses/coursesApi";
import {
  GENDER_RESTRICTION_OPTIONS,
  inputClass,
  userMessageFromApiError,
} from "../../features/courses/courseLabels";
import { Field } from "../../features/courses/components/AdminCourseUi";
import { SectionLoader } from "../../components/Ui/Loading";
import ErrorState from "../../components/Ui/ErrorState";
import { useToast } from "../../components/feedback/useToast";

export default function AdminCourseEditPage() {
  const { courseId } = useParams();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(
    async (signal) => {
      setStatus("loading");
      try {
        const t = await getCourseTemplateById(courseId, { signal });
        setForm({
          title: t.title || "",
          description: t.description || "",
          level: t.level || "",
          ageMin: String(t.ageMin ?? ""),
          ageMax: String(t.ageMax ?? ""),
          genderRestriction: t.genderRestriction === "FEMALE" ? "FEMALE" : "MALE",
          requiresInsurance: Boolean(t.requiresInsurance),
          requiresMedicalApproval: Boolean(t.requiresMedicalApproval),
          isActive: Boolean(t.isActive),
        });
        setStatus("ready");
      } catch (err) {
        if (err?.code === "ABORTED") return;
        setErrorMessage(userMessageFromApiError(err, "بارگذاری دوره ناموفق بود."));
        setStatus("error");
      }
    },
    [courseId],
  );

  useEffect(() => {
    const ac = new AbortController();
    load(ac.signal);
    return () => ac.abort();
  }, [load]);

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
      await updateCourseTemplate(courseId, {
        title: form.title.trim(),
        description: form.description.trim(),
        level: form.level.trim(),
        ageMin: Number(form.ageMin),
        ageMax: Number(form.ageMax),
        genderRestriction: form.genderRestriction,
        requiresInsurance: Boolean(form.requiresInsurance),
        requiresMedicalApproval: Boolean(form.requiresMedicalApproval),
        isActive: Boolean(form.isActive),
      });
      toast.success("دوره به‌روزرسانی شد.");
      navigate(`/admin/courses/${courseId}`);
    } catch (err) {
      toast.error(userMessageFromApiError(err, "ذخیره ناموفق بود."));
    } finally {
      setSaving(false);
    }
  }

  if (status === "loading") return <SectionLoader label="در حال بارگذاری…" />;
  if (status === "error") return <ErrorState title="خطا" message={errorMessage} onRetry={() => load()} />;
  if (!form) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link to={`/admin/courses/${courseId}`} className="text-sm text-cyan-700 hover:underline">
          ← جزئیات دوره
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">ویرایش دوره</h1>
        <p className="mt-1 text-xs text-slate-500">حذف سخت در سرور وجود ندارد — از «فعال» برای غیرفعال‌سازی استفاده کنید.</p>
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
              className={inputClass}
              value={form.ageMin}
              onChange={(e) => set("ageMin", e.target.value)}
            />
          </Field>
          <Field label="حداکثر سن" error={errors.ageMax}>
            <input
              type="number"
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
          className="rounded-xl bg-cyan-700 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? "در حال ذخیره…" : "ذخیره تغییرات"}
        </button>
      </form>
    </div>
  );
}
