import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  getCourseClassById,
  updateCourseClass,
  listInstructors,
} from "../../features/courses/coursesApi";
import {
  DAY_OF_WEEK_OPTIONS,
  toDateInputValue,
  inputClass,
  userMessageFromApiError,
} from "../../features/courses/courseLabels";
import { Field } from "../../features/courses/components/AdminCourseUi";
import PersianDateField from "../../components/Ui/PersianDateField";
import { SectionLoader } from "../../components/Ui/Loading";
import ErrorState from "../../components/Ui/ErrorState";
import { useToast } from "../../components/feedback/useToast";

export default function AdminClassEditPage() {
  const { classId } = useParams();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [classStatus, setClassStatus] = useState("");
  const [instructors, setInstructors] = useState([]);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(
    async (signal) => {
      setStatus("loading");
      try {
        const [cls, instr] = await Promise.all([
          getCourseClassById(classId, { signal }),
          listInstructors({ signal }),
        ]);
        setClassStatus(cls.status);
        setInstructors(Array.isArray(instr?.items) ? instr.items : []);
        setForm({
          title: cls.title || "",
          instructorId: cls.instructorId || "",
          startDate: toDateInputValue(cls.startDate),
          endDate: toDateInputValue(cls.endDate),
          daysOfWeek: Array.isArray(cls.daysOfWeek) ? [...cls.daysOfWeek] : [],
          startTime: cls.startTime || "",
          endTime: cls.endTime || "",
          timezone: cls.timezone || "",
          totalSessions: String(cls.totalSessions ?? ""),
          price: String(cls.price ?? ""),
          capacity: String(cls.capacity ?? ""),
        });
        setStatus("ready");
      } catch (err) {
        if (err?.code === "ABORTED") return;
        setErrorMessage(userMessageFromApiError(err, "بارگذاری کلاس ناموفق بود."));
        setStatus("error");
      }
    },
    [classId],
  );

  useEffect(() => {
    const ac = new AbortController();
    load(ac.signal);
    return () => ac.abort();
  }, [load]);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function toggleDay(day) {
    setForm((f) => {
      const has = f.daysOfWeek.includes(day);
      return {
        ...f,
        daysOfWeek: has ? f.daysOfWeek.filter((d) => d !== day) : [...f.daysOfWeek, day].sort((a, b) => a - b),
      };
    });
  }

  function validate() {
    const e = {};
    if (!form.title.trim() || form.title.trim().length < 2) e.title = "عنوان حداقل ۲ کاراکتر.";
    if (!form.instructorId) e.instructorId = "مربی الزامی است.";
    if (!form.daysOfWeek.length) e.daysOfWeek = "حداقل یک روز.";
    if (!/^\d{1,2}:\d{2}$/.test(form.startTime)) e.startTime = "فرمت HH:MM";
    if (!/^\d{1,2}:\d{2}$/.test(form.endTime)) e.endTime = "فرمت HH:MM";
    const cap = Number(form.capacity);
    if (!cap || cap < 1) e.capacity = "ظرفیت نامعتبر.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function onSubmit(ev) {
    ev.preventDefault();
    if (!validate() || saving) return;
    setSaving(true);
    try {
      const body = {
        title: form.title.trim(),
        instructorId: form.instructorId,
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
        daysOfWeek: form.daysOfWeek,
        startTime: form.startTime,
        endTime: form.endTime,
        totalSessions: Number(form.totalSessions),
        capacity: Number(form.capacity),
      };
      if (form.timezone.trim()) body.timezone = form.timezone.trim();
      if (classStatus === "DRAFT") body.price = Number(form.price);
      await updateCourseClass(classId, body);
      toast.success("کلاس به‌روزرسانی شد.");
      navigate(`/admin/classes/${classId}`);
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
        <Link to={`/admin/classes/${classId}`} className="text-sm text-cyan-700 hover:underline">
          ← جزئیات کلاس
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">ویرایش کلاس</h1>
        <p className="mt-1 text-xs text-slate-500">
          وضعیت از این فرم تغییر نمی‌کند. قیمت فقط در وضعیت پیش‌نویس توسط سرور پذیرفته می‌شود.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
        <Field label="عنوان" error={errors.title}>
          <input className={inputClass} value={form.title} onChange={(e) => set("title", e.target.value)} />
        </Field>
        <Field label="مربی (تخصیص / تغییر)" error={errors.instructorId}>
          <select
            className={inputClass}
            value={form.instructorId}
            onChange={(e) => set("instructorId", e.target.value)}
          >
            <option value="">انتخاب…</option>
            {instructors.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="تاریخ شروع">
            <PersianDateField
              value={form.startDate}
              placeholder="انتخاب تاریخ شروع"
              onChange={(v) => set("startDate", v)}
            />
          </Field>
          <Field label="تاریخ پایان">
            <PersianDateField
              value={form.endDate}
              placeholder="انتخاب تاریخ پایان"
              onChange={(v) => set("endDate", v)}
            />
          </Field>
        </div>
        <Field label="روزهای هفته" error={errors.daysOfWeek}>
          <div className="flex flex-wrap gap-2">
            {DAY_OF_WEEK_OPTIONS.map((d) => (
              <label
                key={d.value}
                className={`cursor-pointer rounded-lg border px-2.5 py-1.5 text-xs ${
                  form.daysOfWeek.includes(d.value)
                    ? "border-cyan-700 bg-cyan-50 text-cyan-900"
                    : "border-slate-200"
                }`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={form.daysOfWeek.includes(d.value)}
                  onChange={() => toggleDay(d.value)}
                />
                {d.label}
              </label>
            ))}
          </div>
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="ساعت شروع" error={errors.startTime}>
            <input className={inputClass} value={form.startTime} onChange={(e) => set("startTime", e.target.value)} />
          </Field>
          <Field label="ساعت پایان" error={errors.endTime}>
            <input className={inputClass} value={form.endTime} onChange={(e) => set("endTime", e.target.value)} />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="تعداد جلسات">
            <input
              type="number"
              className={inputClass}
              value={form.totalSessions}
              onChange={(e) => set("totalSessions", e.target.value)}
            />
          </Field>
          <Field label="قیمت (ریال)" hint={classStatus !== "DRAFT" ? "فقط در وضعیت پیش‌نویس قابل تغییر است." : undefined}>
            <input
              type="number"
              className={inputClass}
              value={form.price}
              disabled={classStatus !== "DRAFT"}
              onChange={(e) => set("price", e.target.value)}
            />
          </Field>
          <Field label="ظرفیت" error={errors.capacity}>
            <input
              type="number"
              className={inputClass}
              value={form.capacity}
              onChange={(e) => set("capacity", e.target.value)}
            />
          </Field>
        </div>
        <Field label="منطقه زمانی">
          <input className={inputClass} value={form.timezone} onChange={(e) => set("timezone", e.target.value)} />
        </Field>
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-cyan-700 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? "در حال ذخیره…" : "ذخیره"}
        </button>
      </form>
    </div>
  );
}
