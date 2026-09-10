import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  listAdminNotifications,
  listNotificationJobs,
} from "../../features/notifications/notificationsApi";
import {
  NOTIFICATION_STATUS_LABELS,
  NOTIFICATION_STATUS_OPTIONS,
  NOTIFICATION_TYPE_LABELS,
  NOTIFICATION_TYPE_OPTIONS,
  NOTIFICATION_CHANNEL_LABELS,
  notificationStatusTone,
  formatNotificationTime,
  userMessageFromNotificationError,
} from "../../features/notifications/notificationLabels";
import { StatusPill, AdminPageHeader } from "../../features/courses/components/AdminCourseUi";
import { DetailSection, ActionBar, EntityCard } from "../../features/ops/OpsUi";
import { SectionLoader } from "../../components/Ui/Loading";
import ErrorState from "../../components/Ui/ErrorState";
import EmptyState from "../../components/Ui/EmptyState";
import ForbiddenState from "../../components/Ui/ForbiddenState";

/**
 * ADMIN notifications queue — GET /api/notifications only.
 * No fake KPIs. Expire/process job mutations not exposed in product UI.
 */
export default function AdminNotificationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get("status") || "";
  const typeFilter = searchParams.get("type") || "";
  const page = Math.max(1, Number(searchParams.get("page") || 1) || 1);

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(20);
  const [jobs, setJobs] = useState(null);
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [forbidden, setForbidden] = useState(false);

  const load = useCallback(
    async (signal) => {
      setStatus("loading");
      setForbidden(false);
      setErrorMessage("");
      try {
        const [data, jobData] = await Promise.all([
          listAdminNotifications({
            status: statusFilter || undefined,
            type: typeFilter || undefined,
            page,
            limit: 20,
            signal,
          }),
          listNotificationJobs({ signal }).catch(() => null),
        ]);
        setItems(Array.isArray(data?.items) ? data.items : []);
        setTotal(Number(data?.total) || 0);
        setLimit(Number(data?.limit) || 20);
        setJobs(jobData);
        setStatus("ready");
      } catch (err) {
        if (err?.code === "ABORTED") return;
        if (err?.status === 403 || err?.code === "FORBIDDEN") {
          setForbidden(true);
          setStatus("error");
          return;
        }
        setErrorMessage(userMessageFromNotificationError(err, "بارگذاری صف اعلان‌ها ناموفق بود."));
        setStatus("error");
      }
    },
    [statusFilter, typeFilter, page],
  );

  useEffect(() => {
    const ac = new AbortController();
    load(ac.signal);
    return () => ac.abort();
  }, [load]);

  function setFilter(key, value) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    setSearchParams(next);
  }

  const totalPages = Math.max(1, Math.ceil(total / limit) || 1);

  if (forbidden) {
    return (
      <ForbiddenState
        title="دسترسی مجاز نیست"
        message="فقط ادمین می‌تواند صف اعلان‌ها را ببیند."
        homeTo="/admin"
      />
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        backTo="/admin"
        backLabel="← مرکز عملیات"
        title="اعلان‌ها"
        description="صف تحویل پیامک/ایمیل از سرور. تلاش مجدد فقط از جزئیات و پس از پاسخ سرور."
      />

      <DetailSection title="فیلتر صف" hint="فیلترها از قرارداد سرور اعتبارسنجی می‌شوند">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="text-xs text-slate-500">وضعیت</span>
            <select
              value={statusFilter}
              onChange={(e) => setFilter("status", e.target.value)}
              className="mt-1 block min-w-40 rounded-xl border border-slate-200 px-3 py-2"
            >
              <option value="">همه</option>
              {NOTIFICATION_STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {NOTIFICATION_STATUS_LABELS[s] || s}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="text-xs text-slate-500">نوع</span>
            <select
              value={typeFilter}
              onChange={(e) => setFilter("type", e.target.value)}
              className="mt-1 block min-w-48 rounded-xl border border-slate-200 px-3 py-2"
            >
              <option value="">همه</option>
              {NOTIFICATION_TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {NOTIFICATION_TYPE_LABELS[t] || t}
                </option>
              ))}
            </select>
          </label>
        </div>
      </DetailSection>

      {jobs?.scheduler ? (
        <DetailSection title="وضعیت زمان‌بند" hint="فقط خواندنی — از GET /notifications/jobs">
          <p className="text-sm text-slate-700">
            زمان‌بند: {jobs.scheduler.enabled ? "فعال" : "غیرفعال"}
            {jobs.scheduler.running ? " · در حال اجرا" : ""}
          </p>
          {Array.isArray(jobs.jobs) && jobs.jobs.length > 0 ? (
            <ul className="mt-2 space-y-1 text-xs text-slate-600">
              {jobs.jobs.slice(0, 8).map((j) => (
                <li key={j.jobName || j.name || JSON.stringify(j)}>
                  {j.jobName || j.name || "job"} ·{" "}
                  {j.lockedUntil
                    ? `قفل تا ${formatNotificationTime(j.lockedUntil)}`
                    : "بدون قفل فعال"}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-slate-500">قفل جاب ثبت‌شده‌ای نیست.</p>
          )}
        </DetailSection>
      ) : null}

      {status === "loading" ? <SectionLoader label="در حال بارگذاری صف اعلان‌ها…" /> : null}
      {status === "error" ? (
        <ErrorState title="خطا" message={errorMessage} onRetry={() => load()} />
      ) : null}

      {status === "ready" && items.length === 0 ? (
        <EmptyState
          title="اعلانی در این فیلتر نیست"
          message="صف خالی است یا فیلتر نتیجه‌ای ندارد."
        />
      ) : null}

      {status === "ready" && items.length > 0 ? (
        <DetailSection
          title={`نتایج (${total.toLocaleString("fa-IR")})`}
          hint={`صفحه ${page.toLocaleString("fa-IR")} از ${totalPages.toLocaleString("fa-IR")}`}
        >
          <div className="space-y-3">
            {items.map((n) => (
              <EntityCard
                key={n.id}
                title={NOTIFICATION_TYPE_LABELS[n.type] || n.type}
                meta={`${NOTIFICATION_CHANNEL_LABELS[n.channel] || n.channel} · تلاش ${Number(n.attempts || 0).toLocaleString("fa-IR")}/${Number(n.maxAttempts || 0).toLocaleString("fa-IR")}`}
                status={
                  <StatusPill tone={notificationStatusTone(n.status)}>
                    {NOTIFICATION_STATUS_LABELS[n.status] || n.status}
                  </StatusPill>
                }
                to={`/admin/notifications/${n.id}`}
              >
                <p className="text-xs text-slate-600">
                  ایجاد: {formatNotificationTime(n.createdAt)}
                  {n.sentAt ? ` · ارسال: ${formatNotificationTime(n.sentAt)}` : ""}
                  {n.failedAt ? ` · شکست: ${formatNotificationTime(n.failedAt)}` : ""}
                </p>
                {n.errorCode ? (
                  <p className="mt-1 font-mono text-[11px] text-rose-700">{n.errorCode}</p>
                ) : null}
              </EntityCard>
            ))}
          </div>

          <ActionBar>
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => {
                const next = new URLSearchParams(searchParams);
                next.set("page", String(page - 1));
                setSearchParams(next);
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm disabled:opacity-40"
            >
              قبلی
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => {
                const next = new URLSearchParams(searchParams);
                next.set("page", String(page + 1));
                setSearchParams(next);
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm disabled:opacity-40"
            >
              بعدی
            </button>
          </ActionBar>
        </DetailSection>
      ) : null}
    </div>
  );
}
