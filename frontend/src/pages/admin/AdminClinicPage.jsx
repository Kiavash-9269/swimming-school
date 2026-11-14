import { useCallback, useEffect, useState } from "react";
import {
  createAdminClinic,
  deleteAdminClinic,
  listAdminClinicRegistrations,
  listAdminClinics,
  updateAdminClinic,
  updateAdminClinicRegistration,
} from "../../features/clinic/clinicApi";
import { sendAdminSms } from "../../features/notifications/notificationsApi";
import { AdminPageHeader } from "../../features/courses/components/AdminCourseUi";
import { SectionLoader } from "../../components/Ui/Loading";
import ErrorState from "../../components/Ui/ErrorState";
import { useToast } from "../../components/feedback/useToast";

const STATUS_LABELS = {
  PENDING: "در انتظار",
  CONFIRMED: "تأیید شده",
  CANCELLED: "لغو شده",
  DONE: "برگزار شده",
};

const PAYMENT_LABELS = {
  UNPAID: "پرداخت نشده",
  AWAITING_REVIEW: "در انتظار تأیید پرداخت",
  PAID: "پرداخت تأیید شده",
};

function formatDateFa(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("fa-IR");
  } catch {
    return "—";
  }
}

function formatToman(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n) || n <= 0) return "—";
  return `${n.toLocaleString("fa-IR")} تومان`;
}

const EMPTY_CLINIC = {
  id: null,
  title: "",
  subtitle: "",
  description: "",
  priceToman: "",
  startDate: "",
  endDate: "",
  schedule: "",
  location: "",
  capacity: "",
  phone: "",
  notice: "",
  enabled: true,
};

const CLINIC_TEXT_FIELDS = [
  { key: "title", label: "عنوان", required: true },
  { key: "subtitle", label: "زیرعنوان" },
  { key: "startDate", label: "تاریخ شروع (متن آزاد)" },
  { key: "endDate", label: "تاریخ پایان (متن آزاد)" },
  { key: "schedule", label: "زمان جلسات" },
  { key: "location", label: "محل برگزاری" },
  { key: "phone", label: "تلفن تماس" },
];

function bodyFromForm(form) {
  return {
    title: form.title.trim(),
    subtitle: form.subtitle,
    description: form.description,
    priceToman: Number(form.priceToman) || 0,
    startDate: form.startDate,
    endDate: form.endDate,
    schedule: form.schedule,
    location: form.location,
    capacity: Number(form.capacity) || 0,
    phone: form.phone,
    notice: form.notice,
    enabled: Boolean(form.enabled),
  };
}

export default function AdminClinicPage() {
  const toast = useToast();

  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");

  const [clinics, setClinics] = useState([]);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [busyClinicId, setBusyClinicId] = useState("");

  const [items, setItems] = useState([]);
  const [counts, setCounts] = useState({});
  const [filter, setFilter] = useState({ status: "", paymentStatus: "", clinicId: "", q: "" });

  const [smsMessage, setSmsMessage] = useState("");
  const [smsClinicId, setSmsClinicId] = useState("");
  const [smsBusy, setSmsBusy] = useState(false);
  const [smsResult, setSmsResult] = useState(null);

  const load = useCallback(
    async (signal) => {
      setStatus("loading");
      setErrorMessage("");
      try {
        const [clinicData, regData] = await Promise.all([
          listAdminClinics({ signal }),
          listAdminClinicRegistrations({ ...filter, limit: 200, signal }),
        ]);
        setClinics(Array.isArray(clinicData?.items) ? clinicData.items : []);
        setItems(Array.isArray(regData?.items) ? regData.items : []);
        setCounts(regData?.counts || {});
        setStatus("ready");
      } catch (err) {
        if (err?.code === "ABORTED") return;
        setErrorMessage(err?.message || "بارگذاری کلینیک ناموفق بود.");
        setStatus("error");
      }
    },
    [filter],
  );

  useEffect(() => {
    const ac = new AbortController();
    load(ac.signal);
    return () => ac.abort();
  }, [load]);

  function startCreate() {
    setForm({ ...EMPTY_CLINIC });
  }

  function startEdit(clinic) {
    setForm({
      id: clinic.id,
      title: clinic.title || "",
      subtitle: clinic.subtitle || "",
      description: clinic.description || "",
      priceToman: String(clinic.priceToman ?? ""),
      startDate: clinic.startDate || "",
      endDate: clinic.endDate || "",
      schedule: clinic.schedule || "",
      location: clinic.location || "",
      capacity: String(clinic.capacity ?? ""),
      phone: clinic.phone || "",
      notice: clinic.notice || "",
      enabled: Boolean(clinic.enabled),
    });
  }

  async function save(event) {
    event.preventDefault();
    if (!form || saving) return;
    if (!form.title.trim()) {
      toast.error("عنوان کلینیک را وارد کنید.");
      return;
    }
    setSaving(true);
    try {
      const body = bodyFromForm(form);
      if (form.id) {
        await updateAdminClinic(form.id, body);
        toast.success("کلینیک ویرایش شد.");
      } else {
        await createAdminClinic(body);
        toast.success("کلینیک ساخته شد.");
      }
      setForm(null);
      await load();
    } catch (err) {
      toast.error(err?.message || "ذخیره کلینیک ناموفق بود.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleEnabled(clinic) {
    setBusyClinicId(clinic.id);
    try {
      await updateAdminClinic(clinic.id, { enabled: !clinic.enabled });
      await load();
    } catch (err) {
      toast.error(err?.message || "تغییر وضعیت ناموفق بود.");
    } finally {
      setBusyClinicId("");
    }
  }

  async function remove(clinic) {
    const warning = clinic.registered
      ? `کلینیک «${clinic.title}» حذف شود؟ ${clinic.registered.toLocaleString("fa-IR")} ثبت‌نام از آن جدا می‌شود ولی حذف نمی‌شود.`
      : `کلینیک «${clinic.title}» حذف شود؟`;
    if (!window.confirm(warning)) return;
    setBusyClinicId(clinic.id);
    try {
      const result = await deleteAdminClinic(clinic.id);
      toast.success(
        result?.detachedRegistrations
          ? `کلینیک حذف شد؛ ${result.detachedRegistrations} ثبت‌نام حفظ شد.`
          : "کلینیک حذف شد.",
      );
      if (form?.id === clinic.id) setForm(null);
      await load();
    } catch (err) {
      toast.error(err?.message || "حذف کلینیک ناموفق بود.");
    } finally {
      setBusyClinicId("");
    }
  }

  async function patchRegistration(row, body) {
    try {
      await updateAdminClinicRegistration(row.id, body);
      toast.success("وضعیت ثبت‌نام کلینیک به‌روز شد.");
      await load();
    } catch (err) {
      toast.error(err?.message || "به‌روزرسانی ناموفق بود.");
    }
  }

  async function sendClinicSms(event) {
    event.preventDefault();
    if (smsBusy) return;
    const message = smsMessage.trim();
    if (!message) {
      toast.error("متن پیامک را بنویسید.");
      return;
    }
    setSmsBusy(true);
    setSmsResult(null);
    try {
      const result = await sendAdminSms({
        audience: "clinic",
        message,
        clinicId: smsClinicId || undefined,
      });
      setSmsResult(result);
      setSmsMessage("");
      toast.success(`پیامک برای ${Number(result?.queued || 0).toLocaleString("fa-IR")} نفر صف شد.`);
    } catch (err) {
      toast.error(err?.message || "ارسال پیامک ناموفق بود.");
    } finally {
      setSmsBusy(false);
    }
  }

  if (status === "loading") return <SectionLoader label="در حال بارگذاری کلینیک‌ها…" />;
  if (status === "error") {
    return <ErrorState title="کلینیک باز نشد" message={errorMessage} onRetry={() => load()} />;
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        backTo="/admin"
        backLabel="میز مدیریت"
        title="کلینیک‌های شنا"
        description="کلینیک‌ها را بسازید، ویرایش یا حذف کنید؛ ثبت‌نام‌ها و پرداخت‌های کارت‌به‌کارت را هم از همین صفحه تأیید کنید."
      />

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { key: "total", label: "کل ثبت‌نام‌ها", value: counts.total },
          { key: "pending", label: "در انتظار", value: counts.pending },
          { key: "awaitingReview", label: "در انتظار تأیید پرداخت", value: counts.awaitingReview },
          { key: "confirmed", label: "تأییدشده", value: counts.confirmed },
        ].map((tile) => (
          <div key={tile.key} className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">{tile.label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {Number(tile.value || 0).toLocaleString("fa-IR")}
            </p>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-bold text-slate-900">فهرست کلینیک‌ها</h2>
          <button
            type="button"
            onClick={startCreate}
            className="rounded-xl bg-cyan-700 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-600"
          >
            + کلینیک جدید
          </button>
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-100">
          {clinics.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">
              هنوز کلینیکی ساخته نشده است. با «کلینیک جدید» اولین کلینیک را بسازید.
            </p>
          ) : (
            <table className="min-w-full text-right text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-3 py-2">عنوان</th>
                  <th className="px-3 py-2">بازه</th>
                  <th className="px-3 py-2">هزینه</th>
                  <th className="px-3 py-2">ظرفیت</th>
                  <th className="px-3 py-2">ثبت‌نام</th>
                  <th className="px-3 py-2">وضعیت</th>
                  <th className="px-3 py-2">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {clinics.map((clinic) => (
                  <tr key={clinic.id} className="border-t border-slate-100 align-top">
                    <td className="px-3 py-2">
                      <p className="font-medium text-slate-900">{clinic.title}</p>
                      {clinic.subtitle ? (
                        <p className="text-xs text-slate-500">{clinic.subtitle}</p>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-600">
                      {[clinic.startDate, clinic.endDate].filter(Boolean).join(" تا ") || "—"}
                    </td>
                    <td className="px-3 py-2">{formatToman(clinic.priceToman)}</td>
                    <td className="px-3 py-2 text-xs text-slate-600">
                      {clinic.capacity > 0
                        ? `${Number(clinic.registered || 0).toLocaleString("fa-IR")} / ${Number(
                            clinic.capacity,
                          ).toLocaleString("fa-IR")}`
                        : "نامحدود"}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-600">
                      {Number(clinic.registered || 0).toLocaleString("fa-IR")} نفر
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => toggleEnabled(clinic)}
                        disabled={busyClinicId === clinic.id}
                        className={`rounded-lg px-2 py-1 text-xs font-medium disabled:opacity-50 ${
                          clinic.enabled
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {clinic.enabled ? "ثبت‌نام باز" : "بسته"}
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(clinic)}
                          className="rounded-lg border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50"
                        >
                          ویرایش
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(clinic)}
                          disabled={busyClinicId === clinic.id}
                          className="rounded-lg border border-rose-300 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                        >
                          حذف
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {form ? (
          <form onSubmit={save} className="mt-5 rounded-2xl border border-cyan-200 bg-cyan-50/40 p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-bold text-slate-900">
                {form.id ? "ویرایش کلینیک" : "کلینیک جدید"}
              </h3>
              <button
                type="button"
                onClick={() => setForm(null)}
                className="text-xs text-slate-500 hover:text-slate-800"
              >
                بستن
              </button>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm sm:col-span-2">
                <input
                  type="checkbox"
                  checked={Boolean(form.enabled)}
                  onChange={(event) => setForm({ ...form, enabled: event.target.checked })}
                  className="h-4 w-4 rounded border-slate-400"
                />
                ثبت‌نام این کلینیک باز باشد
              </label>

              {CLINIC_TEXT_FIELDS.map((field) => (
                <label key={field.key} className="text-sm">
                  <span className="text-xs text-slate-500">{field.label}</span>
                  <input
                    value={form[field.key] ?? ""}
                    onChange={(event) => setForm({ ...form, [field.key]: event.target.value })}
                    required={Boolean(field.required)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
                  />
                </label>
              ))}

              <label className="text-sm">
                <span className="text-xs text-slate-500">هزینه (تومان)</span>
                <input
                  value={form.priceToman}
                  onChange={(event) =>
                    setForm({ ...form, priceToman: event.target.value.replace(/[^\d]/g, "") })
                  }
                  inputMode="numeric"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="text-sm">
                <span className="text-xs text-slate-500">ظرفیت (۰ = نامحدود)</span>
                <input
                  value={form.capacity}
                  onChange={(event) =>
                    setForm({ ...form, capacity: event.target.value.replace(/[^\d]/g, "") })
                  }
                  inputMode="numeric"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
                />
              </label>

              <label className="text-sm sm:col-span-2">
                <span className="text-xs text-slate-500">توضیحات</span>
                <textarea
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="text-sm sm:col-span-2">
                <span className="text-xs text-slate-500">اطلاعیه (اختیاری)</span>
                <input
                  value={form.notice}
                  onChange={(event) => setForm({ ...form, notice: event.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
                />
              </label>

              <div className="flex gap-2 sm:col-span-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-cyan-700 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-600 disabled:opacity-50"
                >
                  {saving ? "در حال ذخیره…" : form.id ? "ذخیره تغییرات" : "ساخت کلینیک"}
                </button>
                <button
                  type="button"
                  onClick={() => setForm(null)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm hover:bg-white"
                >
                  انصراف
                </button>
              </div>
            </div>
          </form>
        ) : null}
      </section>

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-bold text-slate-900">ثبت‌نام‌کنندگان</h2>
          <div className="flex flex-wrap gap-2">
            <input
              value={filter.q}
              onChange={(event) => setFilter({ ...filter, q: event.target.value })}
              placeholder="جستجوی نام / موبایل / کد پیگیری"
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
            <select
              value={filter.clinicId}
              onChange={(event) => setFilter({ ...filter, clinicId: event.target.value })}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">همه کلینیک‌ها</option>
              {clinics.map((clinic) => (
                <option key={clinic.id} value={clinic.id}>
                  {clinic.title}
                </option>
              ))}
            </select>
            <select
              value={filter.status}
              onChange={(event) => setFilter({ ...filter, status: event.target.value })}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">همه وضعیت‌ها</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <select
              value={filter.paymentStatus}
              onChange={(event) => setFilter({ ...filter, paymentStatus: event.target.value })}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">همه پرداخت‌ها</option>
              {Object.entries(PAYMENT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-100">
          {items.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">ثبت‌نامی با این فیلتر پیدا نشد.</p>
          ) : (
            <table className="min-w-full text-right text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-3 py-2">نام و فامیل</th>
                  <th className="px-3 py-2">کلینیک</th>
                  <th className="px-3 py-2">سن</th>
                  <th className="px-3 py-2">موبایل</th>
                  <th className="px-3 py-2">مبلغ</th>
                  <th className="px-3 py-2">کد پیگیری</th>
                  <th className="px-3 py-2">وضعیت</th>
                  <th className="px-3 py-2">پرداخت</th>
                  <th className="px-3 py-2">تاریخ ثبت</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100 align-top">
                    <td className="px-3 py-2 font-medium">{`${row.firstName} ${row.lastName}`}</td>
                    <td className="px-3 py-2 text-xs text-slate-600">{row.clinicTitle || "—"}</td>
                    <td className="px-3 py-2">
                      {row.age != null ? row.age.toLocaleString("fa-IR") : "—"}
                    </td>
                    <td className="px-3 py-2" dir="ltr">
                      {row.phone}
                    </td>
                    <td className="px-3 py-2">
                      {Number(row.priceToman || 0).toLocaleString("fa-IR")} تومان
                    </td>
                    <td className="px-3 py-2" dir="ltr">
                      {row.trackingCode || "—"}
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={row.status}
                        onChange={(event) => patchRegistration(row, { status: event.target.value })}
                        className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
                      >
                        {Object.entries(STATUS_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={row.paymentStatus}
                        onChange={(event) =>
                          patchRegistration(row, { paymentStatus: event.target.value })
                        }
                        className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
                      >
                        {Object.entries(PAYMENT_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                      {row.paymentStatus === "AWAITING_REVIEW" ? (
                        <button
                          type="button"
                          onClick={() =>
                            patchRegistration(row, {
                              paymentStatus: "PAID",
                              status: row.status === "PENDING" ? "CONFIRMED" : row.status,
                            })
                          }
                          className="mt-1 block rounded-lg bg-emerald-600 px-2 py-1 text-xs text-white"
                        >
                          تأیید واریز
                        </button>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-500">
                      {formatDateFa(row.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-bold text-slate-900">پیامک به ثبت‌نام‌کنندگان کلینیک</h2>
        <form onSubmit={sendClinicSms} className="mt-3 space-y-3">
          <label className="block text-sm">
            <span className="text-xs text-slate-500">کلینیک</span>
            <select
              value={smsClinicId}
              onChange={(event) => setSmsClinicId(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm sm:w-80"
            >
              <option value="">همهٔ کلینیک‌ها</option>
              {clinics.map((clinic) => (
                <option key={clinic.id} value={clinic.id}>
                  {clinic.title} ({Number(clinic.registered || 0).toLocaleString("fa-IR")} نفر)
                </option>
              ))}
            </select>
          </label>
          <textarea
            value={smsMessage}
            onChange={(event) => setSmsMessage(event.target.value)}
            rows={3}
            maxLength={400}
            placeholder="متن پیامک (فارسی، حداکثر ۴۰۰ کاراکتر — بدون لینک)"
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={smsBusy}
              className="rounded-xl bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {smsBusy ? "در حال ارسال…" : "ارسال به همه ثبت‌نام‌کنندگان"}
            </button>
            <span className="text-xs text-slate-500">
              {Number(counts.total || 0).toLocaleString("fa-IR")} گیرنده در همهٔ کلینیک‌ها
            </span>
          </div>
          {smsResult ? (
            <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
              {Number(smsResult.queued || 0).toLocaleString("fa-IR")} پیامک در صف ارسال قرار گرفت
              {smsResult.skipped ? ` · ${smsResult.skipped} مورد بدون شماره معتبر` : ""}.
            </p>
          ) : null}
        </form>
      </section>
    </div>
  );
}
