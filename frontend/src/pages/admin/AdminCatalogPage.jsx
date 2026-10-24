import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getCatalogSyncStatus,
  syncCatalog,
  getSwimmingRecords,
  resetSwimmingRecords,
} from "../../features/catalog/catalogApi";
import {
  CLASS_STATUS_LABELS,
  classStatusTone,
  formatIrr,
  userMessageFromApiError,
} from "../../features/courses/courseLabels";
import { AdminPageHeader, StatusPill } from "../../features/courses/components/AdminCourseUi";
import { SectionLoader } from "../../components/Ui/Loading";
import ErrorState from "../../components/Ui/ErrorState";
import ForbiddenState from "../../components/Ui/ForbiddenState";
import { useToast } from "../../components/feedback/useToast";

/**
 * ADMIN — sync marketing catalog into course_classes + manage swimming records seed.
 */
export default function AdminCatalogPage() {
  const toast = useToast();
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [forbidden, setForbidden] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);
  const [recordsTotal, setRecordsTotal] = useState(0);
  const [openRegistration, setOpenRegistration] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (signal) => {
    setStatus("loading");
    setForbidden(false);
    try {
      const [sync, records] = await Promise.all([
        getCatalogSyncStatus({ signal }),
        getSwimmingRecords({ signal }),
      ]);
      setSyncStatus(sync);
      setRecordsTotal(Number(records?.total ?? records?.items?.length ?? 0));
      setStatus("ready");
    } catch (err) {
      if (err?.code === "ABORTED") return;
      if (err?.status === 403 || err?.code === "FORBIDDEN") {
        setForbidden(true);
        setStatus("error");
        return;
      }
      setErrorMessage(userMessageFromApiError(err, "بارگذاری وضعیت کاتالوگ ناموفق بود."));
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    load(ac.signal);
    return () => ac.abort();
  }, [load]);

  async function onSync() {
    if (busy) return;
    setBusy(true);
    try {
      const result = await syncCatalog({ openRegistration });
      toast.success(
        `سینک شد: ${Number(result?.created || 0).toLocaleString("fa-IR")} جدید، ${Number(result?.updated || 0).toLocaleString("fa-IR")} به‌روز، ${Number(result?.unchanged || 0).toLocaleString("fa-IR")} بدون تغییر.`,
      );
      await load();
    } catch (err) {
      toast.error(userMessageFromApiError(err, "سینک کاتالوگ ناموفق بود."));
    } finally {
      setBusy(false);
    }
  }

  async function onResetRecords() {
    if (busy) return;
    if (!window.confirm("همه رکوردهای شنا با مقادیر پیش‌فرض (مهر ۱۴۰۵) جایگزین شوند؟")) return;
    setBusy(true);
    try {
      const data = await resetSwimmingRecords();
      setRecordsTotal(Number(data?.total ?? data?.items?.length ?? 0));
      toast.success("رکوردها به پیش‌فرض بازگردانی شد.");
    } catch (err) {
      toast.error(userMessageFromApiError(err, "بازنشانی رکوردها ناموفق بود."));
    } finally {
      setBusy(false);
    }
  }

  if (status === "loading") return <SectionLoader label="در حال بارگذاری کاتالوگ…" />;
  if (forbidden) return <ForbiddenState />;
  if (status === "error") {
    return <ErrorState title="خطا" message={errorMessage} onRetry={() => load()} />;
  }

  const items = Array.isArray(syncStatus?.items) ? syncStatus.items : [];
  const missing = Number(syncStatus?.missingCount || 0);
  const linked = Number(syncStatus?.linkedCount || 0);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        backTo="/admin"
        backLabel="میز مدیریت"
        title="کاتالوگ و رکوردها"
        description="زمان‌بندی و قیمت‌های صفحه دوره‌ها را به کلاس‌های واقعی سینک کنید و رکوردهای شنای عمومی را مدیریت کنید."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">اسلات‌های کاتالوگ</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {Number(syncStatus?.totalSlots || 0).toLocaleString("fa-IR")}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">لینک‌شده به کلاس</p>
          <p className="mt-1 text-2xl font-bold text-emerald-700">
            {linked.toLocaleString("fa-IR")}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">فاقد کلاس / رکورد شنا</p>
          <p className="mt-1 text-2xl font-bold text-amber-700">
            {missing.toLocaleString("fa-IR")}
            <span className="mx-2 text-slate-300">·</span>
            {recordsTotal.toLocaleString("fa-IR")}
          </p>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
        <h2 className="font-bold text-slate-900">سینک کاتالوگ بازاریابی</h2>
        <p className="text-sm text-slate-600">
          از تعریف سرور (`catalog.definition`) کلاس می‌سازد یا قیمت/زمان/استخر را به‌روز می‌کند. وضعیت
          ثبت‌نام و شمارنده‌های ظرفیت حفظ می‌شوند مگر اینکه باز کردن ثبت‌نام را فعال کنید.
        </p>
        {syncStatus?.pricing ? (
          <dl className="grid gap-2 text-sm sm:grid-cols-3">
            {Object.entries(syncStatus.pricing).map(([key, val]) => (
              <div key={key} className="rounded-xl bg-slate-50 px-3 py-2">
                <dt className="text-xs text-slate-500">{key}</dt>
                <dd>
                  {formatIrr(val.discountPrice ?? val.price)}
                  {val.discountPrice != null && val.price !== val.discountPrice ? (
                    <span className="mr-2 text-xs text-slate-400 line-through">
                      {formatIrr(val.price)}
                    </span>
                  ) : null}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={openRegistration}
            onChange={(e) => setOpenRegistration(e.target.checked)}
            className="rounded border-slate-300"
          />
          پس از سینک، پیش‌نویس‌ها را منتشر و ثبت‌نام را باز کن
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onSync}
            className="rounded-xl bg-cyan-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-cyan-600 disabled:opacity-50"
          >
            {busy ? "در حال اجرا…" : "سینک کاتالوگ"}
          </button>
          <Link
            to="/admin/classes"
            className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            مشاهده کلاس‌ها
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-bold text-slate-900">رکوردهای شنا</h2>
            <p className="mt-1 text-sm text-slate-600">
              منبع صفحه «رکورد یاب». بازنشانی همه ردیف‌ها را با پیش‌فرض مهر ۱۴۰۵ جایگزین می‌کند.
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onResetRecords}
            className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900 hover:bg-amber-100 disabled:opacity-50"
          >
            بازنشانی به پیش‌فرض
          </button>
        </div>
      </section>

      <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-full text-right text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="px-3 py-2">کلید کاتالوگ</th>
              <th className="px-3 py-2">استخر / زمان</th>
              <th className="px-3 py-2">قیمت</th>
              <th className="px-3 py-2">وضعیت</th>
              <th className="px-3 py-2">کلاس</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.catalogKey} className="border-t border-slate-100">
                <td className="px-3 py-2 font-mono text-[11px]">{row.catalogKey}</td>
                <td className="px-3 py-2">
                  <div className="font-medium">{row.pool}</div>
                  <div className="text-xs text-slate-500">{row.time}</div>
                </td>
                <td className="px-3 py-2">
                  {formatIrr(row.price)}
                  {row.listPrice != null && row.listPrice !== row.price ? (
                    <div className="text-[10px] text-slate-400 line-through">
                      {formatIrr(row.listPrice)}
                    </div>
                  ) : null}
                </td>
                <td className="px-3 py-2">
                  {row.linked ? (
                    <StatusPill tone={classStatusTone(row.status)}>
                      {CLASS_STATUS_LABELS[row.status] || row.status || "—"}
                    </StatusPill>
                  ) : (
                    <StatusPill tone="warn">فاقد کلاس</StatusPill>
                  )}
                </td>
                <td className="px-3 py-2">
                  {row.classId ? (
                    <Link
                      to={`/admin/classes/${row.classId}`}
                      className="text-xs text-cyan-700 hover:underline"
                    >
                      جزئیات
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
