import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  getAdminNotification,
  retryAdminNotification,
} from "../../features/notifications/notificationsApi";
import {
  NOTIFICATION_STATUS_LABELS,
  NOTIFICATION_TYPE_LABELS,
  NOTIFICATION_CHANNEL_LABELS,
  notificationStatusTone,
  canOfferRetryAction,
  formatNotificationTime,
  userMessageFromNotificationError,
} from "../../features/notifications/notificationLabels";
import { StatusPill, AdminPageHeader } from "../../features/courses/components/AdminCourseUi";
import { DetailSection, ActionBar } from "../../features/ops/OpsUi";
import { SectionLoader } from "../../components/Ui/Loading";
import ErrorState from "../../components/Ui/ErrorState";
import ForbiddenState from "../../components/Ui/ForbiddenState";
import { useToast } from "../../components/feedback/useToast";

/**
 * ADMIN notification detail + retry — GET /:id, POST /:id/retry.
 * No optimistic delivery success.
 */
export default function AdminNotificationDetailPage() {
  const { notificationId } = useParams();
  const toast = useToast();
  const [item, setItem] = useState(null);
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [forbidden, setForbidden] = useState(false);
  const [invalidId, setInvalidId] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const load = useCallback(
    async (signal) => {
      setStatus("loading");
      setForbidden(false);
      setInvalidId(false);
      setErrorMessage("");
      if (!notificationId || !/^[a-f\d]{24}$/i.test(notificationId)) {
        setInvalidId(true);
        setStatus("error");
        setErrorMessage("شناسه اعلان نامعتبر است.");
        return;
      }
      try {
        const data = await getAdminNotification(notificationId, { signal });
        setItem(data);
        setStatus("ready");
      } catch (err) {
        if (err?.code === "ABORTED") return;
        if (err?.status === 403 || err?.code === "FORBIDDEN") {
          setForbidden(true);
          setStatus("error");
          return;
        }
        if (err?.status === 400 || err?.code === "VALIDATION_ERROR") {
          setInvalidId(true);
        }
        setErrorMessage(userMessageFromNotificationError(err, "بارگذاری اعلان ناموفق بود."));
        setStatus("error");
      }
    },
    [notificationId],
  );

  useEffect(() => {
    const ac = new AbortController();
    load(ac.signal);
    return () => ac.abort();
  }, [load]);

  async function onRetry() {
    if (retrying || !item) return;
    setRetrying(true);
    try {
      const result = await retryAdminNotification(item.id);
      const next = result?.notification || result;
      if (next?.id) setItem(next);
      else await load();
      if (result?.alreadySent) {
        toast.success("این اعلان قبلاً ارسال شده بود.");
      } else {
        toast.success("تلاش مجدد در صف قرار گرفت. نتیجه ارسال پس از پردازش جاب مشخص می‌شود.");
      }
    } catch (err) {
      toast.error(userMessageFromNotificationError(err, "تلاش مجدد ناموفق بود."));
    } finally {
      setRetrying(false);
    }
  }

  if (forbidden) {
    return (
      <ForbiddenState
        title="دسترسی مجاز نیست"
        message="فقط ادمین می‌تواند جزئیات اعلان را ببیند."
        homeTo="/admin/notifications"
      />
    );
  }
  if (status === "loading") return <SectionLoader label="در حال بارگذاری اعلان…" />;
  if (status === "error") {
    return (
      <div className="space-y-4">
        <ErrorState
          title={invalidId ? "شناسه نامعتبر" : "خطا"}
          message={errorMessage}
          onRetry={invalidId ? undefined : () => load()}
        />
        <Link to="/admin/notifications" className="text-sm text-cyan-700 hover:underline">
          بازگشت به صف اعلان‌ها
        </Link>
      </div>
    );
  }
  if (!item) return null;

  const offerRetry = canOfferRetryAction(item.status);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        backTo="/admin/notifications"
        backLabel="← اعلان‌ها"
        title={NOTIFICATION_TYPE_LABELS[item.type] || item.type}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <StatusPill tone={notificationStatusTone(item.status)}>
              {NOTIFICATION_STATUS_LABELS[item.status] || item.status}
            </StatusPill>
            <span className="font-mono text-xs text-slate-400">{item.id}</span>
          </span>
        }
      />

      <DetailSection title="وضعیت تحویل">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-slate-500">کانال</dt>
            <dd>{NOTIFICATION_CHANNEL_LABELS[item.channel] || item.channel}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">تلاش‌ها</dt>
            <dd>
              {Number(item.attempts || 0).toLocaleString("fa-IR")} /{" "}
              {Number(item.maxAttempts || 0).toLocaleString("fa-IR")}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">ایجاد</dt>
            <dd>{formatNotificationTime(item.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">ارسال / شکست</dt>
            <dd>
              {item.sentAt ? formatNotificationTime(item.sentAt) : "—"}
              {item.failedAt ? ` · ${formatNotificationTime(item.failedAt)}` : ""}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">تلاش بعدی</dt>
            <dd>{formatNotificationTime(item.nextAttemptAt)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">کد خطا</dt>
            <dd className="font-mono text-xs text-rose-700">{item.errorCode || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">شناسه پیام درگاه</dt>
            <dd className="font-mono text-xs">{item.providerMessageId || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">کاربر</dt>
            <dd className="font-mono text-xs">{item.userId || "—"}</dd>
          </div>
        </dl>
      </DetailSection>

      <DetailSection title="ارجاع‌ها" hint="شناسه‌های مرتبط بدون افشای متن پیامک">
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          {[
            ["ثبت‌نام", item.refs?.enrollmentId, item.refs?.enrollmentId ? `/admin/enrollments/${item.refs.enrollmentId}` : null],
            ["پرداخت", item.refs?.paymentId, item.refs?.paymentId ? `/admin/payments/${item.refs.paymentId}` : null],
            ["شرکت‌کننده", item.refs?.participantId, item.refs?.participantId ? `/admin/participants/${item.refs.participantId}` : null],
            ["کلاس", item.refs?.classId, item.refs?.classId ? `/admin/classes/${item.refs.classId}` : null],
          ].map(([label, id, to]) => (
            <div key={label}>
              <dt className="text-xs text-slate-500">{label}</dt>
              <dd>
                {id && to ? (
                  <Link to={to} className="font-mono text-xs text-cyan-700 hover:underline">
                    {id}
                  </Link>
                ) : (
                  "—"
                )}
              </dd>
            </div>
          ))}
        </dl>
      </DetailSection>

      <DetailSection title="اقدامات" hint="تلاش مجدد وضعیت را بلافاصله SENT نمی‌کند؛ جاب ارسال می‌کند.">
        <ActionBar tone="primary">
          {offerRetry ? (
            <button
              type="button"
              disabled={retrying}
              onClick={onRetry}
              className="rounded-xl bg-cyan-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {retrying ? "در حال ثبت…" : "تلاش مجدد"}
            </button>
          ) : (
            <p className="text-sm text-slate-600">
              وضعیت فعلی ({NOTIFICATION_STATUS_LABELS[item.status] || item.status}) از این صفحه قابل
              تلاش مجدد نیست.
            </p>
          )}
        </ActionBar>
      </DetailSection>
    </div>
  );
}
