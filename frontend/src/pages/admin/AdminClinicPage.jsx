import { useCallback, useEffect, useState } from "react";
import {
  listAdminClinicRegistrations,
  updateAdminClinicRegistration,
} from "../../features/clinic/clinicApi";
import { getAdminSiteSettings, updateClinicSettings } from "../../features/site/siteApi";
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

const EMPTY_CLINIC = {
  enabled: false,
  title: "",
  subtitle: "",
  description: "",
  priceToman: 0,
  startDate: "",
  endDate: "",
  schedule: "",
  location: "",
  capacity: 0,
  phone: "",
  notice: "",
};

export default function AdminClinicPage() {
  const toast = useToast();

  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [items, setItems] = useState([]);
  const [counts, setCounts] = useState({});
  const [filter, setFilter] = useState({ status: "", paymentStatus: "", q: "" });

  const [clinic, setClinic] = useState(EMPTY_CLINIC);
  const [savingClinic, setSavingClinic] = useState(false);

  const [smsMessage, setSmsMessage] = useState("");
  const [smsBusy, setSmsBusy] = useState(false);
  const [smsResult, setSmsResult] = useState(null);

  const load = useCallback(
    async (signal) => {
      setStatus("loading");
      setErrorMessage("");
      try {
        const [data, settingsData] = await Promise.all([
          listAdminClinicRegistrations({ ...filter, limit: 200, signal }),
          getAdminSiteSettings({ signal }),
        ]);
        setItems(Array.isArray(data?.items) ? data.items : []);
        setCounts(data?.counts || {});
        setClinic({ ...EMPTY_CLINIC, ...(settingsData?.clinic || {}) });
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

  async function saveClinic(event) {
    event.preventDefault();
    if (savingClinic) return;
    setSavingClinic(true);
    try {
      const saved = await updateClinicSettings({
        enabled: Boolean(clinic.enabled),
        title: clinic.title,
        subtitle: clinic.subtitle,
        description: clinic.description,
        priceToman: Number(clinic.priceToman) || 0,
        startDate: clinic.startDate,
        endDate: clinic.endDate,
        schedule: clinic.schedule,
        location: clinic.location,
        capacity: Number(clinic.capacity) || 0,
        phone: clinic.phone,
        notice: clinic.notice,
      });
      setClinic({ ...EMPTY_CLINIC, ...(saved || {}) });
      toast.success("تنظیمات کلینیک ذخیره شد.");
    } catch (err) {
      toast.error(err?.message || "ذخیره تنظیمات کلینیک ناموفق بود.");
    } finally {
      setSavingClinic(false);
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
      const result = await sendAdminSms({ audience: "clinic", message });
      setSmsResult(result);
      setSmsMessage("");
      toast.success(`پیامک برای ${Number(result?.queued || 0).toLocaleString("fa-IR")} نفر صف شد.`);
    } catch (err) {
      toast.error(err?.message || "ارسال پیامک ناموفق بود.");
    } finally {
      setSmsBusy(false);
    }
  }

  if (status === "loading") return <SectionLoader label="در حال بارگذاری کلینیک…" />;
  if (status === "error") {
    return <ErrorState title="کلینیک باز نشد" message={errorMessage} onRetry={() => load()} />;
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        backTo="/admin"
        backLabel="میز مدیریت"
        title="کلینیک شنا"
        description="قیمت، تاریخ و توضیحات کلینیک را اینجا تغییر دهید؛ ثبت‌نام‌ها و پرداخت‌های کارت‌به‌کارت را هم از همین صفحه تأیید یا پیگیری کنید."
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
        <h2 className="font-bold text-slate-900">تنظیمات کلینیک</h2>
        <form onSubmit={saveClinic} className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={Boolean(clinic.enabled)}
              onChange={(event) => setClinic({ ...clinic, enabled: event.target.checked })}
              className="h-4 w-4 rounded border-slate-400"
            />
            کلینیک در سایت و پنل فعال باشد
          </label>

          {[
            { key: "title", label: "عنوان" },
            { key: "subtitle", label: "زیرعنوان" },
            { key: "startDate", label: "تاریخ شروع (متن آزاد)" },
            { key: "endDate", label: "تاریخ پایان (متن آزاد)" },
            { key: "schedule", label: "زمان جلسات" },
            { key: "location", label: "محل برگزاری" },
            { key: "phone", label: "تلفن تماس" },
          ].map((field) => (
            <label key={field.key} className="text-sm">
              <span className="text-xs text-slate-500">{field.label}</span>
              <input
                value={clinic[field.key] ?? ""}
                onChange={(event) => setClinic({ ...clinic, [field.key]: event.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
              />
            </label>
          ))}

          <label className="text-sm">
            <span className="text-xs text-slate-500">هزینه (تومان)</span>
            <input
              value={clinic.priceToman ?? 0}
              onChange={(event) =>
                setClinic({ ...clinic, priceToman: event.target.value.replace(/[^\d]/g, "") })
              }
              inputMode="numeric"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="text-xs text-slate-500">ظرفیت (۰ = نامحدود)</span>
            <input
              value={clinic.capacity ?? 0}
              onChange={(event) =>
                setClinic({ ...clinic, capacity: event.target.value.replace(/[^\d]/g, "") })
              }
              inputMode="numeric"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
            />
          </label>

          <label className="text-sm sm:col-span-2">
            <span className="text-xs text-slate-500">توضیحات</span>
            <textarea
              value={clinic.description ?? ""}
              onChange={(event) => setClinic({ ...clinic, description: event.target.value })}
              rows={3}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="text-xs text-slate-500">اطلاعیه (اختیاری)</span>
            <input
              value={clinic.notice ?? ""}
              onChange={(event) => setClinic({ ...clinic, notice: event.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
            />
          </label>

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={savingClinic}
              className="rounded-xl bg-cyan-700 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-600 disabled:opacity-50"
            >
              {savingClinic ? "در حال ذخیره…" : "ذخیره تنظیمات کلینیک"}
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-bold text-slate-900">ثبت‌نام‌کنندگان کلینیک</h2>
          <div className="flex flex-wrap gap-2">
            <input
              value={filter.q}
              onChange={(event) => setFilter({ ...filter, q: event.target.value })}
              placeholder="جستجوی نام / موبایل / کد پیگیری"
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
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
              {Number(counts.total || 0).toLocaleString("fa-IR")} گیرنده
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
