import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { getPayment, getEnrollment } from "../../features/enrollments/enrollmentsApi";
import {
  userMessageFromEnrollmentError,
  formatIrrAmount,
  PAYMENT_STATUS_LABELS,
  ENROLLMENT_STATUS_LABELS,
} from "../../features/enrollments/enrollmentLabels";
import { SectionLoader } from "../../components/Ui/Loading";
import ErrorState from "../../components/Ui/ErrorState";
import ForbiddenState from "../../components/Ui/ForbiddenState";

const OBJECT_ID_RE = /^[a-f\d]{24}$/i;

/**
 * Authoritative payment/enrollment result — driven by GET /payments/:id (+ enrollment).
 * Query/nav state alone never claims success.
 */
export default function AppPaymentResultPage() {
  const { paymentId } = useParams();
  const location = useLocation();
  const validId = OBJECT_ID_RE.test(paymentId || "");

  const [payment, setPayment] = useState(null);
  const [enrollment, setEnrollment] = useState(null);
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [forbidden, setForbidden] = useState(false);

  const navHint = location.state || {};

  const load = useCallback(
    async (signal) => {
      if (!validId) {
        setStatus("error");
        setErrorMessage("شناسه پرداخت نامعتبر است.");
        return;
      }
      setStatus("loading");
      setErrorMessage("");
      setForbidden(false);
      try {
        const pay = await getPayment(paymentId, { signal });
        setPayment(pay);
        if (pay?.enrollmentId) {
          try {
            const enr = await getEnrollment(pay.enrollmentId, { signal });
            setEnrollment(enr);
          } catch {
            setEnrollment(null);
          }
        }
        setStatus("ready");
      } catch (err) {
        if (err?.code === "ABORTED") return;
        if (err?.status === 403 || err?.code === "FORBIDDEN") {
          setForbidden(true);
          setStatus("error");
          return;
        }
        setErrorMessage(userMessageFromEnrollmentError(err, "بارگذاری نتیجه پرداخت ناموفق بود."));
        setStatus("error");
      }
    },
    [paymentId, validId],
  );

  useEffect(() => {
    const ac = new AbortController();
    load(ac.signal);
    return () => ac.abort();
  }, [load]);

  if (status === "loading") {
    return <SectionLoader label="در حال دریافت وضعیت پرداخت…" />;
  }

  if (forbidden) {
    return <ForbiddenState title="دسترسی مجاز نیست" message="این پرداخت متعلق به حساب شما نیست." />;
  }

  if (status === "error") {
    return <ErrorState title="خطا" message={errorMessage} onRetry={() => load()} />;
  }

  const payStatus = payment?.status;
  const enrStatus = enrollment?.status;
  const isSuccessPay = payStatus === "SUCCESS";
  const isFullyActive = enrStatus === "ACTIVE";
  const isPendingCompliance = enrStatus === "PENDING_COMPLIANCE";
  const isFailed =
    ["FAILED", "CANCELLED", "EXPIRED"].includes(payStatus) ||
    enrStatus === "PAYMENT_FAILED" ||
    enrStatus === "EXPIRED" ||
    enrStatus === "CANCELLED";
  const isPending = ["CREATED", "INITIATED", "PENDING"].includes(payStatus);

  const classId = payment?.classId;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">نتیجه پرداخت</h1>
        <p className="mt-1 text-sm text-slate-600">وضعیت نهایی فقط بر اساس پاسخ سرور نمایش داده می‌شود.</p>
      </div>

      {navHint.callbackError ? (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900" role="status">
          {navHint.callbackError}
        </p>
      ) : null}

      {isSuccessPay && isFullyActive ? (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <h2 className="font-bold text-emerald-950">ثبت‌نام با موفقیت انجام شد</h2>
          <p className="mt-2 text-sm text-emerald-900">پرداخت و ثبت‌نام از سمت سرور تأیید و فعال شد.</p>
        </section>
      ) : null}

      {isSuccessPay && isPendingCompliance ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="font-bold text-amber-950">پرداخت موفق — در انتظار تکمیل مدارک</h2>
          <p className="mt-2 text-sm text-amber-950">
            پرداخت با موفقیت انجام شده، اما برای نهایی‌شدن ثبت‌نام باید مدارک/تأییدیه‌های لازم تکمیل
            شود.
          </p>
          {enrollment?.id ? (
            <Link
              to={`/app/enrollments/${enrollment.id}/compliance`}
              className="mt-4 inline-flex rounded-xl bg-cyan-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-cyan-600"
            >
              تکمیل مدارک و تأییدیه‌ها
            </Link>
          ) : null}
        </section>
      ) : null}

      {isFailed ? (
        <section className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
          <h2 className="font-bold text-rose-950">پرداخت یا ثبت‌نام تکمیل نشد</h2>
          <p className="mt-2 text-sm text-rose-900">
            ثبت‌نام فعال نیست. برای تلاش دوباره باید از صفحه کلاس جریان رزرو را از نو شروع کنید؛
            پرداخت خودکار تکرار نمی‌شود.
          </p>
        </section>
      ) : null}

      {isPending && !isFailed ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="font-bold text-amber-950">پرداخت در انتظار تأیید</h2>
          <p className="mt-2 text-sm text-amber-900">
            هنوز وضعیت نهایی از سرور دریافت نشده است. کمی بعد دوباره بررسی کنید.
          </p>
          <button
            type="button"
            onClick={() => load()}
            className="mt-3 rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm text-amber-950"
          >
            بررسی مجدد
          </button>
        </section>
      ) : null}

      {!isSuccessPay && !isFailed && !isPending ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-bold text-slate-900">وضعیت نامشخص</h2>
          <p className="mt-2 text-sm text-slate-600">جزئیات زیر را از سرور ببینید.</p>
        </section>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-bold text-slate-900">جزئیات (سرور)</h2>
        <dl className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-slate-400">وضعیت پرداخت</dt>
            <dd>{PAYMENT_STATUS_LABELS[payStatus] || payStatus || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">مبلغ</dt>
            <dd>{formatIrrAmount(payment?.amount)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">وضعیت ثبت‌نام</dt>
            <dd>
              {enrStatus
                ? ENROLLMENT_STATUS_LABELS[enrStatus] || enrStatus
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">شناسه پرداخت</dt>
            <dd className="font-mono text-xs break-all">{payment?.id}</dd>
          </div>
        </dl>
      </section>

      <div className="flex flex-wrap gap-3 text-sm">
        {classId ? (
          <Link to={`/app/courses/${classId}`} className="text-cyan-700 hover:underline">
            بازگشت به کلاس
          </Link>
        ) : null}
        <Link to="/app/courses" className="text-cyan-700 hover:underline">
          فهرست کلاس‌ها
        </Link>
        {classId ? (
          <Link to={`/app/courses/${classId}/register`} className="text-cyan-700 hover:underline">
            شروع مجدد ثبت‌نام
          </Link>
        ) : null}
        {enrollment?.id ? (
          <Link
            to={`/app/enrollments/${enrollment.id}/compliance`}
            className="text-cyan-700 hover:underline"
          >
            مدارک و تأییدیه‌ها
          </Link>
        ) : null}
      </div>
    </div>
  );
}
