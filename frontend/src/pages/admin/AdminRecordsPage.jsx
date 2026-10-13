import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  getCatalogSyncStatus,
  syncCatalog,
  getSwimmingRecords,
  resetSwimmingRecords,
} from "../../features/catalog/catalogApi";
import { formatIrr, userMessageFromApiError } from "../../features/courses/courseLabels";
import { AdminPageHeader, StatusPill } from "../../features/courses/components/AdminCourseUi";
import { SectionLoader } from "../../components/Ui/Loading";
import ErrorState from "../../components/Ui/ErrorState";
import ForbiddenState from "../../components/Ui/ForbiddenState";
import { useToast } from "../../components/feedback/useToast";

function formatRecordTime(seconds) {
  const n = Number(seconds);
  if (!Number.isFinite(n) || n < 0) return "—";
  const m = Math.floor(n / 60);
  const s = n - m * 60;
  if (m <= 0) return s.toFixed(2);
  return `${m}:${s.toFixed(2).padStart(5, "0")}`;
}

/**
 * ADMIN — swimming records (primary) + optional marketing-class sync tool.
 */
export default function AdminRecordsPage() {
  const toast = useToast();
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [forbidden, setForbidden] = useState(false);
  const [records, setRecords] = useState([]);
  const [syncStatus, setSyncStatus] = useState(null);
  const [openRegistration, setOpenRegistration] = useState(false);
  const [showSyncTool, setShowSyncTool] = useState(false);
  const [busy, setBusy] = useState(false);
  const [filterType, setFilterType] = useState("all");

  const load = useCallback(async (signal) => {
    setStatus("loading");
    setForbidden(false);
    try {
      const [recordsData, sync] = await Promise.all([
        getSwimmingRecords({ signal }),
        getCatalogSyncStatus({ signal }).catch(() => null),
      ]);
      setRecords(Array.isArray(recordsData?.items) ? recordsData.items : []);
      setSyncStatus(sync);
      setStatus("ready");
    } catch (err) {
      if (err?.code === "ABORTED") return;
      if (err?.status === 403 || err?.code === "FORBIDDEN") {
        setForbidden(true);
        setStatus("error");
        return;
      }
      setErrorMessage(userMessageFromApiError(err, "بارگذاری رکوردها ناموفق بود."));
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    load(ac.signal);
    return () => ac.abort();
  }, [load]);

  const filtered = useMemo(() => {
    if (filterType === "all") return records;
    return records.filter((r) => r.type === filterType);
  }, [records, filterType]);

  const counts = useMemo(
    () => ({
      all: records.length,
      foreign: records.filter((r) => r.type === "خارجی").length,
      national: records.filter((r) => r.type === "داخلی").length,
      highlighted: records.filter((r) => r.highlight).length,
    }),
    [records],
  );

  async function onResetRecords() {
    if (busy) return;
    if (!window.confirm("همه رکوردهای شنا با مقادیر پیش‌فرض (مهر ۱۴۰۵) جایگزین شوند؟")) return;
    setBusy(true);
    try {
      const data = await resetSwimmingRecords();
      setRecords(Array.isArray(data?.items) ? data.items : []);
      toast.success("رکوردها به پیش‌فرض مهر ۱۴۰۵ بازگردانی شد.");
    } catch (err) {
      toast.error(userMessageFromApiError(err, "بازنشانی رکوردها ناموفق بود."));
    } finally {
      setBusy(false);
    }
  }

  async function onSync() {
    if (busy) return;
    setBusy(true);
    try {
      const result = await syncCatalog({ openRegistration });
      toast.success(
        `کلاس‌ها سینک شد: ${Number(result?.created || 0).toLocaleString("fa-IR")} جدید، ${Number(result?.updated || 0).toLocaleString("fa-IR")} به‌روز.`,
      );
      await load();
    } catch (err) {
      toast.error(userMessageFromApiError(err, "سینک کلاس‌ها ناموفق بود."));
    } finally {
      setBusy(false);
    }
  }

  if (status === "loading") return <SectionLoader label="در حال بارگذاری رکوردها…" />;
  if (forbidden) return <ForbiddenState />;
  if (status === "error") {
    return <ErrorState title="خطا" message={errorMessage} onRetry={() => load()} />;
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        backTo="/admin"
        backLabel="میز مدیریت"
        title="رکوردهای شنا"
        description="منبع صفحه «رکورد یاب» برای عموم. اینجا می‌توانید فهرست را ببینید و به پیش‌فرض مهر ۱۴۰۵ بازگردانید."
      />

      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">همه رکوردها</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{counts.all.toLocaleString("fa-IR")}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">جهانی</p>
          <p className="mt-1 text-2xl font-bold text-sky-700">{counts.foreign.toLocaleString("fa-IR")}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">ملی ایران</p>
          <p className="mt-1 text-2xl font-bold text-emerald-700">{counts.national.toLocaleString("fa-IR")}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">برجسته</p>
          <p className="mt-1 text-2xl font-bold text-amber-700">{counts.highlighted.toLocaleString("fa-IR")}</p>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {[
              { id: "all", label: "همه" },
              { id: "خارجی", label: "جهانی" },
              { id: "داخلی", label: "ملی" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterType(tab.id)}
                className={`rounded-xl px-3 py-1.5 text-sm ${
                  filterType === tab.id
                    ? "bg-cyan-700 text-white"
                    : "border border-slate-300 text-slate-700 hover:bg-slate-50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href="/record"
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              مشاهده رکورد یاب
            </a>
            <button
              type="button"
              disabled={busy}
              onClick={onResetRecords}
              className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900 hover:bg-amber-100 disabled:opacity-50"
            >
              بازنشانی به پیش‌فرض
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="min-w-full text-right text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-3 py-2">ماده</th>
                <th className="px-3 py-2">رشته</th>
                <th className="px-3 py-2">زمان</th>
                <th className="px-3 py-2">رکورددار</th>
                <th className="px-3 py-2">نوع</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr
                  key={row.id || `${row.event}-${row.type}`}
                  className={`border-t border-slate-100 ${row.highlight ? "bg-amber-50/60" : ""}`}
                >
                  <td className="px-3 py-2 font-medium">
                    {row.event}
                    {row.highlight ? (
                      <span className="mr-2 text-[10px] text-amber-700">برجسته</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-slate-600">{row.discipline || "—"}</td>
                  <td className="px-3 py-2 font-mono tabular-nums" dir="ltr">
                    {formatRecordTime(row.time)}
                  </td>
                  <td className="px-3 py-2">{row.holder}</td>
                  <td className="px-3 py-2">
                    <StatusPill tone={row.type === "داخلی" ? "success" : "info"}>
                      {row.type === "داخلی" ? "ملی" : "جهانی"}
                    </StatusPill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 ? (
            <p className="p-4 text-center text-sm text-slate-500">رکوردی برای نمایش نیست.</p>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-5">
        <button
          type="button"
          className="flex w-full items-center justify-between text-right"
          onClick={() => setShowSyncTool((v) => !v)}
        >
          <span>
            <span className="font-bold text-slate-800">ابزار سینک کلاس‌های صفحه دوره‌ها</span>
            <span className="mt-1 block text-xs text-slate-500">
              فقط در صورت نیاز — کلاس‌ها را از تعریف سرور می‌سازد/به‌روز می‌کند.
              {syncStatus
                ? ` (${Number(syncStatus.linkedCount || 0).toLocaleString("fa-IR")} از ${Number(syncStatus.totalSlots || 0).toLocaleString("fa-IR")} لینک‌شده)`
                : ""}
            </span>
          </span>
          <span className="text-sm text-cyan-700">{showSyncTool ? "بستن" : "باز کردن"}</span>
        </button>

        {showSyncTool ? (
          <div className="mt-4 space-y-3 border-t border-slate-200 pt-4">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={openRegistration}
                onChange={(e) => setOpenRegistration(e.target.checked)}
                className="rounded border-slate-300"
              />
              پس از سینک، ثبت‌نام کلاس‌های پیش‌نویس را باز کن
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={onSync}
                className="rounded-xl bg-slate-800 px-4 py-2 text-sm text-white disabled:opacity-50"
              >
                {busy ? "در حال اجرا…" : "سینک کلاس‌ها"}
              </button>
              <Link
                to="/admin/classes"
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                مشاهده کلاس‌ها
              </Link>
            </div>
            {syncStatus?.pricing ? (
              <dl className="grid gap-2 text-sm sm:grid-cols-3">
                {Object.entries(syncStatus.pricing).map(([key, val]) => (
                  <div key={key} className="rounded-xl bg-white px-3 py-2">
                    <dt className="text-xs text-slate-500">{key}</dt>
                    <dd>{formatIrr(val.discountPrice)}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}
