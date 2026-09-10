import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { listAdminPayments, reconcilePayments } from "../../features/payments/paymentsApi";
import {
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_OPTIONS,
  formatIrrAmount,
  formatExpiryFa,
  paymentStatusTone,
  userMessageFromPaymentError,
} from "../../features/payments/paymentLabels";
import { StatusPill, AdminPageHeader } from "../../features/courses/components/AdminCourseUi";
import { SectionLoader } from "../../components/Ui/Loading";
import ErrorState from "../../components/Ui/ErrorState";
import EmptyState from "../../components/Ui/EmptyState";
import ForbiddenState from "../../components/Ui/ForbiddenState";

/**
 * ADMIN payment list — GET /payments (limit+filters, no page cursor).
 * Reconcile is detect-only. Expire job is NOT exposed.
 */
export default function AdminPaymentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get("status") || "";
  const classId = searchParams.get("classId") || "";
  const userId = searchParams.get("userId") || "";

  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [forbidden, setForbidden] = useState(false);
  const [reconcile, setReconcile] = useState(null);
  const [reconcileBusy, setReconcileBusy] = useState(false);
  const [reconcileError, setReconcileError] = useState("");
  const [classInput, setClassInput] = useState(classId);
  const [userInput, setUserInput] = useState(userId);

  const load = useCallback(
    async (signal) => {
      setStatus("loading");
      setForbidden(false);
      setErrorMessage("");
      try {
        const data = await listAdminPayments({
          status: statusFilter || undefined,
          classId: classId || undefined,
          userId: userId || undefined,
          limit: 100,
          signal,
        });
        setItems(Array.isArray(data?.items) ? data.items : []);
        setStatus("ready");
      } catch (err) {
        if (err?.code === "ABORTED") return;
        if (err?.status === 403 || err?.code === "FORBIDDEN") {
          setForbidden(true);
          setStatus("error");
          return;
        }
        setErrorMessage(userMessageFromPaymentError(err, "بارگذاری پرداخت‌ها ناموفق بود."));
        setStatus("error");
      }
    },
    [statusFilter, classId, userId],
  );

  useEffect(() => {
    const ac = new AbortController();
    load(ac.signal);
    return () => ac.abort();
  }, [load]);

  function applyFilters() {
    const next = new URLSearchParams();
    if (statusFilter) next.set("status", statusFilter);
    if (classInput.trim()) next.set("classId", classInput.trim());
    if (userInput.trim()) next.set("userId", userInput.trim());
    // preserve status from select via current searchParams merge
    if (statusFilter) next.set("status", statusFilter);
    setSearchParams(next);
  }

  async function runReconcile() {
    setReconcileBusy(true);
    setReconcileError("");
    try {
      const data = await reconcilePayments({ limit: 50 });
      setReconcile(data);
    } catch (err) {
      setReconcileError(userMessageFromPaymentError(err, "اسکن تطبیق ناموفق بود."));
    } finally {
      setReconcileBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        backTo="/admin"
        backLabel="← مرکز عملیات"
        title="پرداخت‌ها"
        description="فهرست ادمین از گزارش سرور. صفحه‌بندی ندارد — حداکثر ۱۰۰ رکورد با فیلتر سرور. استرداد فقط از جزئیات پرداخت."
      />

      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <label className="text-sm">
          <span className="text-xs text-slate-500">وضعیت</span>
          <select
            value={statusFilter}
            onChange={(e) => {
              const next = new URLSearchParams(searchParams);
              if (e.target.value) next.set("status", e.target.value);
              else next.delete("status");
              setSearchParams(next);
            }}
            className="mt-1 block min-w-40 rounded-xl border border-slate-200 px-3 py-2"
          >
            <option value="">همه</option>
            {PAYMENT_STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {PAYMENT_STATUS_LABELS[s] || s}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="text-xs text-slate-500">شناسه کلاس</span>
          <input
            value={classInput}
            onChange={(e) => setClassInput(e.target.value.trim())}
            className="mt-1 block w-52 rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs"
            placeholder="اختیاری"
          />
        </label>
        <label className="text-sm">
          <span className="text-xs text-slate-500">شناسه کاربر</span>
          <input
            value={userInput}
            onChange={(e) => setUserInput(e.target.value.trim())}
            className="mt-1 block w-52 rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs"
            placeholder="اختیاری"
          />
        </label>
        <button
          type="button"
          onClick={applyFilters}
          className="rounded-xl bg-cyan-700 px-4 py-2 text-sm text-white hover:bg-cyan-600"
        >
          اعمال فیلتر
        </button>
        <button
          type="button"
          disabled={reconcileBusy}
          onClick={runReconcile}
          className="rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-700 disabled:opacity-50"
        >
          {reconcileBusy ? "در حال اسکن…" : "اسکن تطبیق (فقط تشخیص)"}
        </button>
      </div>

      {reconcileError ? <p className="text-sm text-rose-700">{reconcileError}</p> : null}
      {reconcile ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-sm">
          <p className="font-bold text-amber-950">نتیجه تطبیق (بدون تغییر خودکار)</p>
          <p className="mt-1 text-xs text-amber-900">
            سیاست:{" "}
            {reconcile.policy === "DETECT_ONLY" || !reconcile.policy
              ? "فقط تشخیص"
              : reconcile.policy}{" "}
            · یافته‌ها:{" "}
            {Number(reconcile.findingCount || 0).toLocaleString("fa-IR")}
          </p>
          {Array.isArray(reconcile.findings) && reconcile.findings.length > 0 ? (
            <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs text-amber-950">
              {reconcile.findings.slice(0, 20).map((f, i) => (
                <li key={`${f.type}-${f.paymentId || i}`}>
                  {f.type}
                  {f.paymentId ? (
                    <>
                      {" · "}
                      <Link to={`/admin/payments/${f.paymentId}`} className="text-cyan-800 underline">
                        {f.paymentId}
                      </Link>
                    </>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-amber-800">یافته‌ای گزارش نشد.</p>
          )}
        </section>
      ) : null}

      {forbidden ? (
        <ForbiddenState title="دسترسی مجاز نیست" message="فقط ادمین می‌تواند فهرست پرداخت را ببیند." />
      ) : null}
      {!forbidden && status === "loading" ? <SectionLoader label="در حال بارگذاری پرداخت‌ها…" /> : null}
      {!forbidden && status === "error" ? (
        <ErrorState title="خطا" message={errorMessage} onRetry={() => load()} />
      ) : null}
      {!forbidden && status === "ready" && items.length === 0 ? (
        <EmptyState title="پرداختی با این فیلتر یافت نشد." />
      ) : null}

      {!forbidden && status === "ready" && items.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="min-w-full text-right text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-3 py-2">مبلغ</th>
                <th className="px-3 py-2">وضعیت</th>
                <th className="px-3 py-2">درگاه</th>
                <th className="px-3 py-2">ثبت‌نام</th>
                <th className="px-3 py-2">کلاس</th>
                <th className="px-3 py-2">ایجاد</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                  <td className="px-3 py-2">
                    <Link
                      to={`/admin/payments/${p.id}`}
                      className="font-medium text-cyan-800 hover:underline"
                    >
                      {formatIrrAmount(p.amount)}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <StatusPill tone={paymentStatusTone(p.status)}>
                      {PAYMENT_STATUS_LABELS[p.status] || p.status}
                    </StatusPill>
                  </td>
                  <td className="px-3 py-2 text-xs">{p.provider || "—"}</td>
                  <td className="px-3 py-2">
                    {p.enrollmentId ? (
                      <Link
                        to={`/admin/enrollments/${p.enrollmentId}`}
                        className="font-mono text-[11px] text-cyan-700 hover:underline"
                      >
                        {p.enrollmentId.slice(-8)}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {p.classId ? (
                      <Link
                        to={`/admin/classes/${p.classId}`}
                        className="font-mono text-[11px] text-cyan-700 hover:underline"
                      >
                        {p.classId.slice(-8)}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2 text-slate-500">{formatExpiryFa(p.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="border-t border-slate-100 px-3 py-2 text-xs text-slate-400">
            {Number(items.length).toLocaleString("fa-IR")} ردیف · بدون صفحه‌بندی سرور در این فهرست
          </p>
        </div>
      ) : null}
    </div>
  );
}
