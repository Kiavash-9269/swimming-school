import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  getReportsDashboard,
  getEnrollmentReport,
  getPaymentReport,
  getClassReport,
  getParticipantReport,
  getWaitlistReport,
  getDiscountReport,
  getComplianceReport,
  exportAdminReport,
} from "../../features/reports/reportsApi";
import {
  REPORT_TABS,
  ENROLLMENT_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  COMPLIANCE_STATUS_LABELS,
  CLASS_STATUS_LABELS,
  WAITLIST_STATUS_LABELS,
  formatIrrAmount,
  formatExpiryFa,
  userMessageFromReportError,
} from "../../features/reports/reportLabels";
import { SectionLoader } from "../../components/Ui/Loading";
import ErrorState from "../../components/Ui/ErrorState";
import EmptyState from "../../components/Ui/EmptyState";
import ForbiddenState from "../../components/Ui/ForbiddenState";
import PersianDateField from "../../components/Ui/PersianDateField";
import { useToast } from "../../components/feedback/useToast";

const ENROLLMENT_STATUS_OPTIONS = Object.keys(ENROLLMENT_STATUS_LABELS);
const PAYMENT_STATUS_OPTIONS = Object.keys(PAYMENT_STATUS_LABELS);
const CLASS_STATUS_OPTIONS = Object.keys(CLASS_STATUS_LABELS);
const COMPLIANCE_STATUS_OPTIONS = Object.keys(COMPLIANCE_STATUS_LABELS);

function MetricCard({ label, value, hint }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-2 text-xl font-bold text-slate-900">{value}</dd>
      {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
    </div>
  );
}

function FilterBar({ fromDate, toDate, onFrom, onTo, onApply, extra, exporting, onExport }) {
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200/80 bg-gradient-to-l from-white to-slate-50/60 p-4 shadow-sm">
      <label className="min-w-[10rem] flex-1 text-sm sm:max-w-[14rem]">
        <span className="text-xs font-semibold text-slate-500">از تاریخ</span>
        <div className="mt-1">
          <PersianDateField value={fromDate} onChange={onFrom} placeholder="از تاریخ" />
        </div>
      </label>
      <label className="min-w-[10rem] flex-1 text-sm sm:max-w-[14rem]">
        <span className="text-xs font-semibold text-slate-500">تا تاریخ</span>
        <div className="mt-1">
          <PersianDateField value={toDate} onChange={onTo} placeholder="تا تاریخ" />
        </div>
      </label>
      {extra}
      <button
        type="button"
        onClick={onApply}
        className="rounded-xl bg-cyan-700 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-cyan-600"
      >
        اعمال فیلتر
      </button>
      {onExport ? (
        <button
          type="button"
          disabled={exporting}
          onClick={onExport}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm disabled:opacity-50"
        >
          {exporting ? "در حال خروجی…" : "خروجی اکسل"}
        </button>
      ) : null}
    </div>
  );
}

function Pagination({ pagination, page, setPage }) {
  if (!pagination) return null;
  const totalPages = pagination.totalPages || 0;
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => setPage((p) => Math.max(1, p - 1))}
        className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-40"
      >
        قبلی
      </button>
      <span>
        صفحه {Number(page).toLocaleString("fa-IR")}
        {totalPages ? ` از ${Number(totalPages).toLocaleString("fa-IR")}` : ""}
        {pagination.total != null
          ? ` · جمع ${Number(pagination.total).toLocaleString("fa-IR")}`
          : ""}
      </span>
      <button
        type="button"
        disabled={totalPages ? page >= totalPages : false}
        onClick={() => setPage((p) => p + 1)}
        className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-40"
      >
        بعدی
      </button>
    </div>
  );
}

/**
 * ADMIN reporting — real `/api/admin/reports/*` only.
 * Attendance report endpoint exists but is out of F9 product scope.
 */
export default function AdminReportsPage() {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "summary";

  const [fromDate, setFromDate] = useState(searchParams.get("fromDate") || "");
  const [toDate, setToDate] = useState(searchParams.get("toDate") || "");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "");
  const [page, setPage] = useState(Number(searchParams.get("page") || 1) || 1);

  const [dashboard, setDashboard] = useState(null);
  const [report, setReport] = useState(null);
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [forbidden, setForbidden] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [filterTick, setFilterTick] = useState(0);


  const setTab = (id) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", id);
    next.delete("page");
    setPage(1);
    setSearchParams(next);
  };

  const syncFiltersToUrl = useCallback(() => {
    const next = new URLSearchParams();
    next.set("tab", tab);
    if (fromDate) next.set("fromDate", fromDate);
    if (toDate) next.set("toDate", toDate);
    if (statusFilter) next.set("status", statusFilter);
    if (page > 1) next.set("page", String(page));
    setSearchParams(next);
  }, [tab, fromDate, toDate, statusFilter, page, setSearchParams]);

  const baseParams = useMemo(() => {
    const p = { page, limit: 20 };
    if (fromDate) p.fromDate = fromDate;
    if (toDate) p.toDate = toDate;
    if (statusFilter) p.status = statusFilter;
    return p;
  }, [page, fromDate, toDate, statusFilter]);

  const load = useCallback(
    async (signal) => {
      if (fromDate && toDate && fromDate > toDate) {
        setStatus("error");
        setErrorMessage("تاریخ پایان باید بعد از تاریخ شروع باشد.");
        return;
      }
      setStatus("loading");
      setErrorMessage("");
      setForbidden(false);
      try {
        if (tab === "summary") {
          const data = await getReportsDashboard({ signal });
          setDashboard(data);
          setReport(null);
        } else {
          let data;
          if (tab === "enrollments") data = await getEnrollmentReport(baseParams, { signal });
          else if (tab === "payments") data = await getPaymentReport(baseParams, { signal });
          else if (tab === "classes") data = await getClassReport(baseParams, { signal });
          else if (tab === "participants") {
            const { status: _s, ...rest } = baseParams;
            data = await getParticipantReport(rest, { signal });
          } else if (tab === "compliance") {
            data = await getComplianceReport({ ...baseParams, kind: "both" }, { signal });
          } else if (tab === "waitlist") data = await getWaitlistReport(baseParams, { signal });
          else if (tab === "discounts") {
            const { status: _s, ...rest } = baseParams;
            data = await getDiscountReport(rest, { signal });
          } else data = null;
          setReport(data);
          setDashboard(null);
        }
        setStatus("ready");
      } catch (err) {
        if (err?.code === "ABORTED") return;
        if (err?.status === 403 || err?.code === "FORBIDDEN") {
          setForbidden(true);
          setStatus("error");
          return;
        }
        setErrorMessage(userMessageFromReportError(err));
        setStatus("error");
      }
    },
    [tab, baseParams, fromDate, toDate],
  );

  useEffect(() => {
    const ac = new AbortController();
    load(ac.signal);
    return () => ac.abort();
  }, [load, filterTick]);

  async function handleExport() {
    const exportable = ["enrollments", "payments", "classes", "participants", "waitlist"];
    if (!exportable.includes(tab)) {
      toast.info("خروجی اکسل برای این گزارش در سرور تعریف نشده است.");
      return;
    }
    setExporting(true);
    try {
      const params = { ...baseParams };
      delete params.page;
      delete params.limit;
      const { blob, filename } = await exportAdminReport(tab, params);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename || `${tab}-report.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("خروجی آماده شد.");
    } catch (err) {
      toast.error(userMessageFromReportError(err, "خروجی ناموفق بود."));
    } finally {
      setExporting(false);
    }
  }

  const paymentChartData = useMemo(() => {
    if (!dashboard?.paymentByStatus) return [];
    return Object.entries(dashboard.paymentByStatus).map(([st, row]) => ({
      status: PAYMENT_STATUS_LABELS[st] || st,
      count: row?.count || 0,
      amount: row?.totalAmount || 0,
    }));
  }, [dashboard]);

  return (
    <div className="space-y-6">
      <div>
        <Link to="/admin" className="text-sm text-cyan-700 hover:underline">
          ← پنل مدیریت
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">گزارش‌ها</h1>
        <p className="mt-1 text-sm text-slate-600">
          داده‌ها فقط از گزارش سرور خوانده می‌شوند. واحد مبلغ: ریال.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {REPORT_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-xl px-3 py-1.5 text-sm ${
              tab === t.id
                ? "bg-cyan-700 text-white"
                : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab !== "summary" ? (
        <FilterBar
          fromDate={fromDate}
          toDate={toDate}
          onFrom={setFromDate}
          onTo={setToDate}
          onApply={() => {
            setPage(1);
            syncFiltersToUrl();
            setFilterTick((n) => n + 1);
          }}
          exporting={exporting}
          onExport={
            ["enrollments", "payments", "classes", "participants", "waitlist"].includes(tab)
              ? handleExport
              : null
          }
          extra={
            ["enrollments", "payments", "classes", "compliance", "waitlist"].includes(tab) ? (
              <label className="text-sm">
                <span className="text-xs text-slate-500">وضعیت</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="mt-1 block rounded-xl border border-slate-200 px-3 py-2"
                >
                  <option value="">همه</option>
                  {(tab === "enrollments"
                    ? ENROLLMENT_STATUS_OPTIONS
                    : tab === "payments"
                      ? PAYMENT_STATUS_OPTIONS
                      : tab === "classes"
                        ? CLASS_STATUS_OPTIONS
                        : tab === "compliance"
                          ? COMPLIANCE_STATUS_OPTIONS
                          : Object.keys(WAITLIST_STATUS_LABELS)
                  ).map((s) => (
                    <option key={s} value={s}>
                      {(tab === "enrollments"
                        ? ENROLLMENT_STATUS_LABELS[s]
                        : tab === "payments"
                          ? PAYMENT_STATUS_LABELS[s]
                          : tab === "classes"
                            ? CLASS_STATUS_LABELS[s]
                            : tab === "compliance"
                              ? COMPLIANCE_STATUS_LABELS[s]
                              : WAITLIST_STATUS_LABELS[s]) || s}
                    </option>
                  ))}
                </select>
              </label>
            ) : null
          }
        />
      ) : null}

      {forbidden ? (
        <ForbiddenState title="دسترسی مجاز نیست" message="فقط ادمین می‌تواند گزارش‌ها را ببیند." />
      ) : null}

      {!forbidden && status === "loading" ? (
        <SectionLoader label="در حال بارگذاری گزارش…" />
      ) : null}

      {!forbidden && status === "error" ? (
        <ErrorState title="خطا" message={errorMessage} onRetry={() => load()} />
      ) : null}

      {!forbidden && status === "ready" && tab === "summary" && dashboard ? (
        <div className="space-y-6">
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="کاربران"
              value={Number(dashboard.users || 0).toLocaleString("fa-IR")}
            />
            <MetricCard
              label="شرکت‌کنندگان (فعال)"
              value={`${Number(dashboard.activeParticipants || 0).toLocaleString("fa-IR")} / ${Number(dashboard.participants || 0).toLocaleString("fa-IR")}`}
            />
            <MetricCard
              label="کلاس‌ها (فعال عملیاتی)"
              value={`${Number(dashboard.activeClasses || 0).toLocaleString("fa-IR")} / ${Number(dashboard.courses || 0).toLocaleString("fa-IR")}`}
            />
            <MetricCard
              label="ثبت‌نام‌ها (فعال)"
              value={`${Number(dashboard.activeEnrollments || 0).toLocaleString("fa-IR")} / ${Number(dashboard.enrollments || 0).toLocaleString("fa-IR")}`}
            />
            <MetricCard
              label="در انتظار مدارک"
              value={Number(dashboard.pendingCompliance || 0).toLocaleString("fa-IR")}
            />
            <MetricCard
              label="مدارک بیمه/پزشکی در انتظار"
              value={`${Number(dashboard.pendingInsuranceDocuments || 0).toLocaleString("fa-IR")} / ${Number(dashboard.pendingMedicalDocuments || 0).toLocaleString("fa-IR")}`}
            />
            <MetricCard
              label="لیست انتظار فعال"
              value={Number(dashboard.waitlistCount || 0).toLocaleString("fa-IR")}
            />
            <MetricCard
              label="درآمد موفق (ریال)"
              value={formatIrrAmount(dashboard.revenue)}
              hint={`پرداخت موفق: ${Number(dashboard.successfulPayments || 0).toLocaleString("fa-IR")} از ${Number(dashboard.payments || 0).toLocaleString("fa-IR")}`}
            />
          </dl>

          {paymentChartData.length ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="font-bold text-slate-900">پرداخت‌ها بر اساس وضعیت (سرور)</h2>
              <div className="mt-4 h-64 w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={paymentChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="status" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#0e7490" name="تعداد" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          ) : null}
        </div>
      ) : null}

      {!forbidden && status === "ready" && tab !== "summary" ? (
        <div className="space-y-4">
          {report?.summary && tab === "payments" ? (
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                label="جمع ردیف‌ها"
                value={Number(report.summary.totalCount || 0).toLocaleString("fa-IR")}
              />
              <MetricCard
                label="موفق"
                value={Number(report.summary.successfulCount || 0).toLocaleString("fa-IR")}
              />
              <MetricCard
                label="مبلغ موفق"
                value={formatIrrAmount(report.summary.totalSuccessfulAmount)}
              />
              <MetricCard
                label="در انتظار / ناموفق"
                value={`${Number(report.summary.pendingCount || 0).toLocaleString("fa-IR")} / ${Number(report.summary.failedCount || 0).toLocaleString("fa-IR")}`}
              />
            </dl>
          ) : null}

          {!(report?.items || []).length ? (
            <EmptyState title="داده‌ای برای این گزارش وجود ندارد." />
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
              <table className="min-w-full text-right text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr>
                    {tab === "enrollments" ? (
                      <>
                        <th className="px-3 py-2">شناسه</th>
                        <th className="px-3 py-2">وضعیت</th>
                        <th className="px-3 py-2">مبلغ نهایی</th>
                        <th className="px-3 py-2">ایجاد</th>
                      </>
                    ) : null}
                    {tab === "payments" ? (
                      <>
                        <th className="px-3 py-2">شناسه</th>
                        <th className="px-3 py-2">وضعیت</th>
                        <th className="px-3 py-2">مبلغ</th>
                        <th className="px-3 py-2">ایجاد</th>
                      </>
                    ) : null}
                    {tab === "classes" ? (
                      <>
                        <th className="px-3 py-2">عنوان</th>
                        <th className="px-3 py-2">وضعیت</th>
                        <th className="px-3 py-2">ظرفیت</th>
                        <th className="px-3 py-2">شروع</th>
                      </>
                    ) : null}
                    {tab === "participants" ? (
                      <>
                        <th className="px-3 py-2">نام</th>
                        <th className="px-3 py-2">فعال</th>
                        <th className="px-3 py-2">ایجاد</th>
                      </>
                    ) : null}
                    {tab === "compliance" ? (
                      <>
                        <th className="px-3 py-2">نوع</th>
                        <th className="px-3 py-2">شرکت‌کننده</th>
                        <th className="px-3 py-2">وضعیت</th>
                        <th className="px-3 py-2">به‌روزرسانی</th>
                      </>
                    ) : null}
                    {tab === "waitlist" ? (
                      <>
                        <th className="px-3 py-2">کلاس</th>
                        <th className="px-3 py-2">موقعیت</th>
                        <th className="px-3 py-2">وضعیت</th>
                        <th className="px-3 py-2">ایجاد</th>
                      </>
                    ) : null}
                    {tab === "discounts" ? (
                      <>
                        <th className="px-3 py-2">کد</th>
                        <th className="px-3 py-2">فعال</th>
                        <th className="px-3 py-2">استفاده</th>
                        <th className="px-3 py-2">ایجاد</th>
                      </>
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {(report.items || []).map((row) => (
                    <tr key={row.id || row.code} className="border-t border-slate-100">
                      {tab === "enrollments" ? (
                        <>
                          <td className="px-3 py-2 font-mono text-xs">{row.id}</td>
                          <td className="px-3 py-2">
                            {ENROLLMENT_STATUS_LABELS[row.status] || row.status}
                          </td>
                          <td className="px-3 py-2">{formatIrrAmount(row.finalAmount)}</td>
                          <td className="px-3 py-2">{formatExpiryFa(row.createdAt)}</td>
                        </>
                      ) : null}
                      {tab === "payments" ? (
                        <>
                          <td className="px-3 py-2 font-mono text-xs">{row.id}</td>
                          <td className="px-3 py-2">
                            {PAYMENT_STATUS_LABELS[row.status] || row.status}
                          </td>
                          <td className="px-3 py-2">{formatIrrAmount(row.amount)}</td>
                          <td className="px-3 py-2">{formatExpiryFa(row.createdAt)}</td>
                        </>
                      ) : null}
                      {tab === "classes" ? (
                        <>
                          <td className="px-3 py-2">{row.title || row.id}</td>
                          <td className="px-3 py-2">
                            {CLASS_STATUS_LABELS[row.status] || row.status}
                          </td>
                          <td className="px-3 py-2">
                            {row.confirmedCount != null
                              ? `${Number(row.confirmedCount).toLocaleString("fa-IR")} / ${Number(row.capacity || 0).toLocaleString("fa-IR")}`
                              : "—"}
                          </td>
                          <td className="px-3 py-2">{formatExpiryFa(row.startDate)}</td>
                        </>
                      ) : null}
                      {tab === "participants" ? (
                        <>
                          <td className="px-3 py-2">
                            {`${row.firstName || ""} ${row.lastName || ""}`.trim() || row.id}
                          </td>
                          <td className="px-3 py-2">{row.isActive ? "فعال" : "غیرفعال"}</td>
                          <td className="px-3 py-2">{formatExpiryFa(row.createdAt)}</td>
                        </>
                      ) : null}
                      {tab === "compliance" ? (
                        <>
                          <td className="px-3 py-2">
                            {row.kind === "insurance" ? "بیمه" : row.kind === "medical" ? "پزشکی" : row.kind}
                          </td>
                          <td className="px-3 py-2">{row.participantName || row.participantId}</td>
                          <td className="px-3 py-2">
                            {COMPLIANCE_STATUS_LABELS[row.status] || row.status}
                          </td>
                          <td className="px-3 py-2">{formatExpiryFa(row.updatedAt)}</td>
                        </>
                      ) : null}
                      {tab === "waitlist" ? (
                        <>
                          <td className="px-3 py-2">{row.classTitle || row.classId}</td>
                          <td className="px-3 py-2">
                            {row.position != null
                              ? Number(row.position).toLocaleString("fa-IR")
                              : "—"}
                          </td>
                          <td className="px-3 py-2">
                            {WAITLIST_STATUS_LABELS[row.status] || row.status}
                          </td>
                          <td className="px-3 py-2">{formatExpiryFa(row.createdAt)}</td>
                        </>
                      ) : null}
                      {tab === "discounts" ? (
                        <>
                          <td className="px-3 py-2">{row.code}</td>
                          <td className="px-3 py-2">{row.isActive ? "فعال" : "غیرفعال"}</td>
                          <td className="px-3 py-2">
                            {row.usedCount != null
                              ? Number(row.usedCount).toLocaleString("fa-IR")
                              : "—"}
                          </td>
                          <td className="px-3 py-2">{formatExpiryFa(row.createdAt)}</td>
                        </>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {report?.note ? (
            <p className="text-xs text-amber-800">{report.note}</p>
          ) : null}

          <Pagination
            pagination={report?.pagination}
            page={page}
            setPage={(updater) => {
              setPage((p) => {
                const next = typeof updater === "function" ? updater(p) : updater;
                const params = new URLSearchParams(searchParams);
                params.set("tab", tab);
                params.set("page", String(next));
                if (fromDate) params.set("fromDate", fromDate);
                if (toDate) params.set("toDate", toDate);
                if (statusFilter) params.set("status", statusFilter);
                setSearchParams(params);
                return next;
              });
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
