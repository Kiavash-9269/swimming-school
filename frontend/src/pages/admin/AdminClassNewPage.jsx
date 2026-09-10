import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  createCourseClass,
  getCourseTemplates,
  listInstructors,
} from "../../features/courses/coursesApi";
import { DAY_OF_WEEK_OPTIONS, inputClass, userMessageFromApiError } from "../../features/courses/courseLabels";
import { Field } from "../../features/courses/components/AdminCourseUi";
import PersianDateField from "../../components/Ui/PersianDateField";
import { useToast } from "../../components/feedback/useToast";

export default function AdminClassNewPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const presetTemplate = searchParams.get("courseTemplateId") || "";

  const [templates, setTemplates] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    courseTemplateId: presetTemplate,
    title: "",
    instructorId: "",
    startDate: "",
    endDate: "",
    daysOfWeek: [],
    startTime: "16:00",
    endTime: "17:00",
    timezone: "",
    totalSessions: "12",
    price: "0",
    capacity: "10",
  });

  useEffect(() => {
    const ac = new AbortController();
    Promise.all([
      getCourseTemplates({ activeOnly: true, signal: ac.signal }),
      listInstructors({ signal: ac.signal }),
    ])
      .then(([t, i]) => {
        setTemplates(Array.isArray(t?.items) ? t.items : []);
        setInstructors(Array.isArray(i?.items) ? i.items : []);
      })
      .catch(() => {
        /* form submit will surface auth errors */
      });
    return () => ac.abort();
  }, []);

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
    if (!form.courseTemplateId) e.courseTemplateId = "انتخاب دوره الزامی است.";
    if (!form.title.trim() || form.title.trim().length < 2) e.title = "عنوان حداقل ۲ کاراکتر.";
    if (!form.instructorId) e.instructorId = "انتخاب مربی الزامی است.";
    if (!form.startDate) e.startDate = "تاریخ شروع الزامی است.";
    if (!form.endDate) e.endDate = "تاریخ پایان الزامی است.";
    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      e.endDate = "پایان باید بعد از شروع باشد.";
    }
    if (!form.daysOfWeek.length) e.daysOfWeek = "حداقل یک روز هفته.";
    if (!/^\d{1,2}:\d{2}$/.test(form.startTime)) e.startTime = "فرمت HH:MM";
    if (!/^\d{1,2}:\d{2}$/.test(form.endTime)) e.endTime = "فرمت HH:MM";
    const ts = Number(form.totalSessions);
    const price = Number(form.price);
    const cap = Number(form.capacity);
    if (!ts || ts < 1) e.totalSessions = "تعداد جلسات نامعتبر.";
    if (Number.isNaN(price) || price < 0) e.price = "قیمت نامعتبر.";
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
        courseTemplateId: form.courseTemplateId,
        title: form.title.trim(),
        instructorId: form.instructorId,
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
        daysOfWeek: form.daysOfWeek,
        startTime: form.startTime,
        endTime: form.endTime,
        totalSessions: Number(form.totalSessions),
        price: Number(form.price),
        capacity: Number(form.capacity),
      };
      if (form.timezone.trim()) body.timezone = form.timezone.trim();
      const created = await createCourseClass(body);
      toast.success("کلاس به‌صورت پیش‌نویس ایجاد شد.");
      navigate(`/admin/classes/${created.id}`);
    } catch (err) {
      toast.error(userMessageFromApiError(err, "ایجاد کلاس ناموفق بود."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link to="/admin/classes" className="text-sm text-cyan-700 hover:underline">
          ← کلاس‌ها
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">کلاس جدید</h1>
        <p className="mt-1 text-xs text-slate-500">وضعیت اولیه سرور: پیش‌نویس</p>
      </div>

      {!instructors.length ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          مربی فعالی یافت نشد. ابتدا از{" "}
          <Link to="/admin/instructors" className="font-medium underline">
            مدیریت مربیان
          </Link>{" "}
          یک مربی بسازید.
        </p>
      ) : null}

      <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
        <Field label="قالب دوره" error={errors.courseTemplateId}>
          <select
            className={inputClass}
            value={form.courseTemplateId}
            onChange={(e) => set("courseTemplateId", e.target.value)}
          >
            <option value="">انتخاب…</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </Field>
        <Field label="عنوان کلاس" error={errors.title}>
          <input className={inputClass} value={form.title} onChange={(e) => set("title", e.target.value)} />
        </Field>
        <Field label="مربی" error={errors.instructorId}>
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
          <Field label="تاریخ شروع" error={errors.startDate}>
            <PersianDateField
              value={form.startDate}
              placeholder="انتخاب تاریخ شروع"
              onChange={(v) => set("startDate", v)}
            />
          </Field>
          <Field label="تاریخ پایان" error={errors.endDate}>
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
                    : "border-slate-200 bg-white text-slate-700"
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
          <Field label="تعداد جلسات" error={errors.totalSessions}>
            <input
              type="number"
              min={1}
              className={inputClass}
              value={form.totalSessions}
              onChange={(e) => set("totalSessions", e.target.value)}
            />
          </Field>
          <Field label="قیمت (ریال)" error={errors.price}>
            <input
              type="number"
              min={0}
              className={inputClass}
              value={form.price}
              onChange={(e) => set("price", e.target.value)}
            />
          </Field>
          <Field label="ظرفیت" error={errors.capacity}>
            <input
              type="number"
              min={1}
              className={inputClass}
              value={form.capacity}
              onChange={(e) => set("capacity", e.target.value)}
            />
          </Field>
        </div>
        <Field label="منطقه زمانی (اختیاری)" hint="اگر خالی باشد سرور از منطقه زمانی پیش‌فرض برنامه استفاده می‌کند.">
          <input
            className={inputClass}
            value={form.timezone}
            onChange={(e) => set("timezone", e.target.value)}
            placeholder="مثلاً Asia/Tehran"
          />
        </Field>
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-cyan-700 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? "در حال ایجاد…" : "ایجاد کلاس"}
        </button>
      </form>
    </div>
  );
}
