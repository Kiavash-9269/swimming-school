import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getPayment, requestPaymentRefund } from "../../features/payments/paymentsApi";
import {
  PAYMENT_STATUS_LABELS,
  formatIrrAmount,
  formatExpiryFa,
  paymentStatusTone,
  canOfferRefundAction,
  userMessageFromPaymentError,
} from "../../features/payments/paymentLabels";
import {
  StatusPill,
  ConfirmBanner,
  AdminPageHeader,
} from "../../features/courses/components/AdminCourseUi";
import { SectionLoader } from "../../components/Ui/Loading";
import ErrorState from "../../components/Ui/ErrorState";
import ForbiddenState from "../../components/Ui/ForbiddenState";
import { useToast } from "../../components/feedback/useToast";

/**
 * ADMIN payment detail + refund — GET /payments/:id, POST /payments/:id/refund.
 * No optimistic financial success.
 */
export default function AdminPaymentDetailPage() {
  const { paymentId } = useParams();
  const toast = useToast();
  const [payment, setPayment] = useState(null);
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [forbidden, setForbidden] = useState(false);
  const [confirmRefund, setConfirmRefund] = useState(false);
  const [refunding, setRefunding] = useState(false);

  const load = useCallback(
    async (signal) => {
      setStatus("loading");
      setForbidden(false);
      setErrorMessage("");
      try {
        const data = await getPayment(paymentId, { signal });
        setPayment(data);
        setStatus("ready");
      } catch (err) {
        if (err?.code === "ABORTED") return;
        if (err?.status === 403 || err?.code === "FORBIDDEN") {
          setForbidden(true);
          setStatus("error");
          return;
        }
        setErrorMessage(userMessageFromPaymentError(err, "بارگذاری پرداخت ناموفق بود."));
        setStatus("error");
      }
    },
    [paymentId],
  );

  useEffect(() => {
    const ac = new AbortController();
    load(ac.signal);
    return () => ac.abort();
  }, [load]);

  async function onConfirmRefund() {
    if (refunding || !payment) return;
    setRefunding(true);
    try {
      const result = await requestPaymentRefund(payment.id);
      const next = result?.payment || result;
      if (next?.id) setPayment(next);
      else await load();
      setConfirmRefund(false);
      if (result?.alreadyProcessed) {
        toast.success("استرداد قبلاً انجام شده بود.");
      } else if (result?.deferred) {
        toast.success(
          "درخواست استرداد ثبت شد (داخلی). تأیید مالی درگاه هنوز متصل نیست — وضعیت: درخواست استرداد.",
        );
      } else {
        toast.success("استرداد ثبت شد.");
      }
    } catch (err) {
      toast.error(userMessageFromPaymentError(err, "استرداد ناموفق بود."));
    } finally {
      setRefunding(false);
    }
  }

  if (forbidden) {
    return (
      <ForbiddenState
        title="دسترسی مجاز نیست"
        message="فقط مالک پرداخت یا ادمین می‌تواند جزئیات را ببیند."
        homeTo="/admin/payments"
      />
    );
  }
  if (status === "loading") return <SectionLoader label="در حال بارگذاری پرداخت…" />;
  if (status === "error") {
    return <ErrorState title="خطا" message={errorMessage} onRetry={() => load()} />;
  }
  if (!payment) return null;

  const offerRefund = canOfferRefundAction(payment.status);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        backTo="/admin/payments"
        backLabel="← پرداخت‌ها"
        title={formatIrrAmount(payment.amount)}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <StatusPill tone={paymentStatusTone(payment.status)}>
              {PAYMENT_STATUS_LABELS[payment.status] || payment.status}
            </StatusPill>
            <span className="font-mono text-xs text-slate-400">{payment.id}</span>
          </span>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm">
          <h2 className="font-bold text-slate-900">هویت پرداخت</h2>
          <dl className="mt-4 space-y-3">
            <div>
              <dt className="text-xs text-slate-500">درگاه</dt>
              <dd>{payment.provider || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">ارجاع درگاه</dt>
              <dd className="font-mono text-xs">{payment.providerRef || payment.authority || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">ارز</dt>
              <dd>{payment.currency || "IRR"}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">ایجاد / تأیید</dt>
              <dd>
                {formatExpiryFa(payment.createdAt)}
                {payment.verifiedAt ? ` · تأیید: ${formatExpiryFa(payment.verifiedAt)}` : ""}
              </dd>
            </div>
            {payment.expiresAt ? (
              <div>
                <dt className="text-xs text-slate-500">انقضا</dt>
                <dd>{formatExpiryFa(payment.expiresAt)}</dd>
              </div>
            ) : null}
            {payment.refundRequestedAt || payment.refundedAt ? (
              <div>
                <dt className="text-xs text-slate-500">استرداد</dt>
                <dd>
                  {payment.refundRequestedAt
                    ? `درخواست: ${formatExpiryFa(payment.refundRequestedAt)}`
                    : ""}
                  {payment.refundedAt ? ` · انجام: ${formatExpiryFa(payment.refundedAt)}` : ""}
                </dd>
              </div>
            ) : null}
            {payment.failureCode ? (
              <div>
                <dt className="text-xs text-slate-500">کد خطا</dt>
                <dd className="font-mono text-xs text-rose-700">{payment.failureCode}</dd>
              </div>
            ) : null}
            {payment.reconciliationRequired ? (
              <div>
                <dt className="text-xs text-slate-500">تطبیق دستی</dt>
                <dd className="text-amber-800">
                  نیاز به رسیدگی · {payment.reconciliationReason || "RECONCILIATION_REQUIRED"}
                </dd>
              </div>
            ) : null}
          </dl>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm">
          <h2 className="font-bold text-slate-900">ارتباطات</h2>
          <dl className="mt-4 space-y-3">
            <div>
              <dt className="text-xs text-slate-500">ثبت‌نام</dt>
              <dd>
                {payment.enrollmentId ? (
                  <Link
                    to={`/admin/enrollments/${payment.enrollmentId}`}
                    className="text-cyan-700 hover:underline"
                  >
                    {payment.enrollmentId}
                  </Link>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">شرکت‌کننده</dt>
              <dd>
                {payment.participantId ? (
                  <Link
                    to={`/admin/participants/${payment.participantId}`}
                    className="text-cyan-700 hover:underline"
                  >
                    {payment.participantId}
                  </Link>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">کلاس</dt>
              <dd>
                {payment.classId ? (
                  <Link
                    to={`/admin/classes/${payment.classId}`}
                    className="text-cyan-700 hover:underline"
                  >
                    {payment.classId}
                  </Link>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">کاربر</dt>
              <dd className="font-mono text-xs">{payment.userId || "—"}</dd>
            </div>
          </dl>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-bold text-slate-900">اقدامات مالی</h2>
        <p className="mt-1 text-xs text-slate-500">
          استرداد فقط برای وضعیت موفق (یا ادامهٔ درخواست استرداد). سرور تصمیم نهایی را می‌گیرد. دکمه در حین
          ارسال غیرفعال است. اگر درگاه استرداد واقعی نداشته باشد، وضعیت «درخواست استرداد» می‌ماند (کتابداری
          داخلی، نه تأیید PSP).
        </p>
        {offerRefund ? (
          <button
            type="button"
            disabled={refunding}
            onClick={() => setConfirmRefund(true)}
            className="mt-4 rounded-xl border border-rose-300 px-4 py-2 text-sm text-rose-800 disabled:opacity-50"
          >
            درخواست استرداد
          </button>
        ) : (
          <p className="mt-4 text-sm text-slate-600">
            وضعیت فعلی ({PAYMENT_STATUS_LABELS[payment.status] || payment.status}) امکان استرداد از این
            صفحه را نشان نمی‌دهد.
          </p>
        )}
        {confirmRefund ? (
          <div className="mt-4">
            <ConfirmBanner
              title="استرداد این پرداخت؟"
              message={`مبلغ ${formatIrrAmount(payment.amount)} · شناسه ${payment.id}. این عمل وضعیت مالی و احتمالاً ثبت‌نام/ظرفیت را تغییر می‌دهد. تا پاسخ سرور موفق فرض نکنید.`}
              confirmLabel="تأیید استرداد"
              busy={refunding}
              onCancel={() => !refunding && setConfirmRefund(false)}
              onConfirm={onConfirmRefund}
            />
          </div>
        ) : null}
      </section>
    </div>
  );
}
