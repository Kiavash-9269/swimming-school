import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  getEnrollment,
  getPayment,
  cancelEnrollment,
} from "../../features/enrollments/enrollmentsApi";
import { getCourseClassById } from "../../features/courses/coursesApi";
import { getParticipant } from "../../features/participants/participantsApi";
import {
  ENROLLMENT_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  userMessageFromEnrollmentError,
  labelEligibilityReason,
  formatExpiryFa,
  formatIrrAmount,
  canUserCancelEnrollment,
} from "../../features/enrollments/enrollmentLabels";
import { formatDaysOfWeek } from "../../features/courses/courseLabels";
import { SectionLoader } from "../../components/Ui/Loading";
import ErrorState from "../../components/Ui/ErrorState";
import ForbiddenState from "../../components/Ui/ForbiddenState";
import { useToast } from "../../components/feedback/useToast";

const OBJECT_ID_RE = /^[a-f\d]{24}$/i;

/** Printable invoice card — `printing` marks exactly one card visible on paper. */
function InvoiceCard({
  kind,
  invoiceNo,
  issuedAt,
  rows,
  totalLabel,
  total,
  meta = [],
  printing,
  onPrint,
}) {
  const isFinal = kind === "final";
  const title = isFinal ? "فاکتور نهایی پرداخت" : "فاکتور پیش‌پرداخت";
  const tone = isFinal
    ? "border-emerald-200 bg-emerald-50/60 text-emerald-950"
    : "border-cyan-200 bg-cyan-50/60 text-cyan-950";

  return (
    <div
      dir="rtl"
      className={`rounded-2xl border bg-white p-5 ${
        printing ? "invoice-print" : "border-slate-200"
      }`}
    >
      <div className={`flex flex-wrap items-start justify-between gap-3 rounded-xl border p-4 ${tone}`}>
        <div>
          <h3 className="font-bold">{title}</h3>
          <p className="mt-1 text-xs opacity-80">
            شماره فاکتور: {invoiceNo} — تاریخ صدور: {issuedAt}
          </p>
        </div>
        <span className="rounded-lg bg-white/70 px-2 py-1 text-xs">
          {isFinal ? "پس از پرداخت" : "پیش از پرداخت"}
        </span>
      </div>

      <dl className="mt-4 space-y-2 text-sm text-slate-700">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-3 border-b border-dashed border-slate-200 pb-2"
          >
            <dt className="text-slate-500">{row.label}</dt>
            <dd className="text-left font-medium">{row.value}</dd>
          </div>
        ))}
        <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
          <dt className="font-bold text-slate-900">{totalLabel}</dt>
          <dd className="font-bold text-slate-900">{total}</dd>
        </div>
      </dl>

      {meta.length ? (
        <dl className="mt-4 grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
          {meta.map((m) => (
            <div key={m.label}>
              <dt className="text-slate-400">{m.label}</dt>
              <dd className="mt-0.5 break-all text-slate-700">{m.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      <button
        type="button"
        onClick={onPrint}
        className="mt-4 inline-flex rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
      >
        چاپ / ذخیره PDF
      </button>
    </div>
  );
}

/**
 * GET /enrollments/:id — optional cancel via POST /:id/cancel (empty body).
 */
export default function AppEnrollmentDetailPage() {
  const { enrollmentId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const validId = OBJECT_ID_RE.test(enrollmentId || "");

  const [enrollment, setEnrollment] = useState(null);
  const [courseClass, setCourseClass] = useState(null);
  const [participant, setParticipant] = useState(null);
  const [payment, setPayment] = useState(null);
  const [pageStatus, setPageStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [forbidden, setForbidden] = useState(false);

  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [printing, setPrinting] = useState(null);

  function handlePrint(key) {
    setPrinting(key);
    window.setTimeout(() => {
      window.print();
      setPrinting(null);
    }, 150);
  }

  const load = useCallback(
    async (signal) => {
      if (!validId) {
        setPageStatus("error");
        setErrorMessage("شناسه ثبت‌نام نامعتبر است.");
        return;
      }
      setPageStatus("loading");
      setErrorMessage("");
      setForbidden(false);
      try {
        const enr = await getEnrollment(enrollmentId, { signal });
        setEnrollment(enr);

        const [clsResult, partResult, payResult] = await Promise.allSettled([
          enr.classId ? getCourseClassById(enr.classId, { signal }) : Promise.resolve(null),
          enr.participantId ? getParticipant(enr.participantId, { signal }) : Promise.resolve(null),
          enr.paymentId ? getPayment(enr.paymentId, { signal }) : Promise.resolve(null),
        ]);

        if (signal?.aborted) return;

        setCourseClass(clsResult.status === "fulfilled" ? clsResult.value : null);
        setParticipant(partResult.status === "fulfilled" ? partResult.value : null);
        setPayment(payResult.status === "fulfilled" ? payResult.value : null);
        setPageStatus("ready");
      } catch (err) {
        if (err?.code === "ABORTED") return;
        if (err?.status === 403 || err?.code === "FORBIDDEN") {
          setForbidden(true);
          setPageStatus("error");
          return;
        }
        setErrorMessage(userMessageFromEnrollmentError(err, "بارگذاری ثبت‌نام ناموفق بود."));
        setPageStatus("error");
      }
    },
    [enrollmentId, validId],
  );

  useEffect(() => {
    const ac = new AbortController();
    load(ac.signal);
    return () => ac.abort();
  }, [load]);

  async function handleCancel() {
    if (!enrollment?.id || cancelling) return;
    setCancelling(true);
    setCancelError("");
    try {
      const updated = await cancelEnrollment(enrollment.id);
      setEnrollment(updated);
      setConfirmCancel(false);
      toast.success("ثبت‌نام لغو شد.");
      if (updated?.paymentId) {
        try {
          const pay = await getPayment(updated.paymentId);
          setPayment(pay);
        } catch {
          // ignore secondary
        }
      }
    } catch (err) {
      const msg = userMessageFromEnrollmentError(err, "لغو ثبت‌نام ناموفق بود.");
      setCancelError(msg);
      toast.error(msg);
    } finally {
      setCancelling(false);
    }
  }

  if (pageStatus === "loading") {
    return <SectionLoader label="در حال بارگذاری ثبت‌نام…" />;
  }
  if (forbidden) {
    return <ForbiddenState title="دسترسی مجاز نیست" message="این ثبت‌نام متعلق به حساب شما نیست." />;
  }
  if (pageStatus === "error") {
    return <ErrorState title="خطا" message={errorMessage} onRetry={() => load()} />;
  }

  const reasons = enrollment?.eligibilitySnapshot?.reasons || [];
  const showCancel = canUserCancelEnrollment(enrollment?.status);
  const paymentSuccess =
    payment?.status === "SUCCESS" ||
    ["PAID", "ACTIVE", "PENDING_COMPLIANCE", "COMPLETED"].includes(enrollment?.status);

  return (
    <div className="space-y-6">
      <div>
        <Link to="/app/enrollments" className="text-sm text-cyan-700 hover:underline">
          ← ثبت‌نام‌های من
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">جزئیات ثبت‌نام</h1>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-bold text-slate-900">وضعیت ثبت‌نام</h2>
        <p className="mt-2 text-lg text-slate-800">
          {ENROLLMENT_STATUS_LABELS[enrollment.status] || enrollment.status}
        </p>
        <dl className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-slate-400">شناسه</dt>
            <dd className="font-mono text-xs break-all">{enrollment.id}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">ایجاد</dt>
            <dd>{formatExpiryFa(enrollment.createdAt)}</dd>
          </div>
          {enrollment.cancelledAt ? (
            <div>
              <dt className="text-xs text-slate-400">زمان لغو</dt>
              <dd>{formatExpiryFa(enrollment.cancelledAt)}</dd>
            </div>
          ) : null}
          {enrollment.confirmedAt ? (
            <div>
              <dt className="text-xs text-slate-400">تأیید</dt>
              <dd>{formatExpiryFa(enrollment.confirmedAt)}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-bold text-slate-900">کلاس</h2>
        <dl className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-slate-400">نام</dt>
            <dd>{courseClass?.title || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">شناسه کلاس</dt>
            <dd className="font-mono text-xs break-all">{enrollment.classId}</dd>
          </div>
          {courseClass?.startDate ? (
            <div>
              <dt className="text-xs text-slate-400">شروع</dt>
              <dd>{formatExpiryFa(courseClass.startDate)}</dd>
            </div>
          ) : null}
          {courseClass?.daysOfWeek?.length ? (
            <div>
              <dt className="text-xs text-slate-400">روزها</dt>
              <dd>{formatDaysOfWeek(courseClass.daysOfWeek)}</dd>
            </div>
          ) : null}
        </dl>
        {enrollment.classId ? (
          <Link
            to={`/app/courses/${enrollment.classId}`}
            className="mt-3 inline-block text-sm text-cyan-700 hover:underline"
          >
            مشاهده کلاس
          </Link>
        ) : null}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-bold text-slate-900">شرکت‌کننده</h2>
        <dl className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-slate-400">نام</dt>
            <dd>
              {participant
                ? `${participant.firstName || ""} ${participant.lastName || ""}`.trim()
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">شناسه</dt>
            <dd className="font-mono text-xs break-all">{enrollment.participantId}</dd>
          </div>
        </dl>
        {enrollment.participantId ? (
          <Link
            to={`/app/participants/${enrollment.participantId}`}
            className="mt-3 inline-block text-sm text-cyan-700 hover:underline"
          >
            جزئیات شرکت‌کننده
          </Link>
        ) : null}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-bold text-slate-900">پرداخت</h2>
        <dl className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-slate-400">مبلغ قابل پرداخت</dt>
            <dd>{formatIrrAmount(enrollment.finalAmount)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">وضعیت پرداخت</dt>
            <dd>
              {payment
                ? PAYMENT_STATUS_LABELS[payment.status] || payment.status
                : enrollment.paymentId
                  ? "—"
                  : "بدون شناسه پرداخت"}
            </dd>
          </div>
        </dl>
        {enrollment.paymentId ? (
          <Link
            to={`/app/payments/${enrollment.paymentId}/result`}
            className="mt-3 inline-block text-sm text-cyan-700 hover:underline"
          >
            نتیجه پرداخت
          </Link>
        ) : null}
        <p className="mt-3 text-xs text-slate-500">
          وضعیت استرداد پس از بررسی درخواست اعلام می‌شود.
        </p>
      </section>

      {/* Invoices: proforma before payment, final after payment */}
      <section className="space-y-4">
        <h2 className="font-bold text-slate-900">فاکتورها</h2>
        <InvoiceCard
          kind="proforma"
          invoiceNo={`PI-${String(enrollment.id).slice(-8)}`}
          issuedAt={formatExpiryFa(enrollment.createdAt)}
          printing={printing === "proforma"}
          onPrint={() => handlePrint("proforma")}
          rows={[
            { label: "شرح خدمات", value: `ثبت‌نام دوره «${courseClass?.title || "—"}»` },
            { label: "شرکت‌کننده", value: participant ? `${participant.firstName || ""} ${participant.lastName || ""}`.trim() : "—" },
            { label: "قیمت پایه", value: formatIrrAmount(enrollment.basePrice) },
            { label: "تخفیف", value: formatIrrAmount(enrollment.discountAmount || 0) },
          ]}
          totalLabel="مبلغ قابل پرداخت"
          total={formatIrrAmount(enrollment.finalAmount)}
          meta={[
            { label: "شناسه ثبت‌نام", value: enrollment.id },
            { label: "وضعیت", value: ENROLLMENT_STATUS_LABELS[enrollment.status] || enrollment.status },
          ]}
        />

        {paymentSuccess ? (
          <InvoiceCard
            kind="final"
            invoiceNo={`FI-${String(enrollment.id).slice(-8)}`}
            issuedAt={formatExpiryFa(payment?.verifiedAt || payment?.createdAt || enrollment.confirmedAt)}
            printing={printing === "final"}
            onPrint={() => handlePrint("final")}
            rows={[
              { label: "شرح خدمات", value: `ثبت‌نام دوره «${courseClass?.title || "—"}»` },
              { label: "شرکت‌کننده", value: participant ? `${participant.firstName || ""} ${participant.lastName || ""}`.trim() : "—" },
              { label: "قیمت پایه", value: formatIrrAmount(enrollment.basePrice) },
              { label: "تخفیف", value: formatIrrAmount(enrollment.discountAmount || 0) },
              { label: "مبلغ پرداخت‌شده", value: formatIrrAmount(payment?.amount ?? enrollment.finalAmount) },
            ]}
            totalLabel="جمع کل پرداختی"
            total={formatIrrAmount(payment?.amount ?? enrollment.finalAmount)}
            meta={[
              { label: "شماره پیگیری پرداخت", value: payment?.authority || payment?.providerRef || "—" },
              { label: "روش پرداخت", value: payment?.provider || "—" },
              { label: "تاریخ پرداخت", value: formatExpiryFa(payment?.verifiedAt || payment?.createdAt) },
              { label: "وضعیت پرداخت", value: PAYMENT_STATUS_LABELS[payment?.status] || payment?.status || "—" },
            ]}
          />
        ) : (
          <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
            فاکتور نهایی پس از پرداخت موفق صادر می‌شود.
          </p>
        )}
      </section>

      {(enrollment.status === "PENDING_COMPLIANCE" || reasons.length > 0) && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="font-bold text-amber-950">مدارک / واجدشرایطی</h2>
          {enrollment.status === "PENDING_COMPLIANCE" ? (
            <p className="mt-2 text-sm text-amber-900">
              پرداخت موفق است اما ثبت‌نام در انتظار تکمیل مدارک است.
            </p>
          ) : null}
          {reasons.length ? (
            <ul className="mt-2 list-disc pr-5 text-sm text-amber-950">
              {reasons.map((code) => (
                <li key={code}>{labelEligibilityReason(code)}</li>
              ))}
            </ul>
          ) : null}
          {enrollment.status === "PENDING_COMPLIANCE" ? (
            <Link
              to={`/app/enrollments/${enrollment.id}/compliance`}
              className="mt-4 inline-flex rounded-xl bg-cyan-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-cyan-600"
            >
              تکمیل مدارک
            </Link>
          ) : null}
        </section>
      )}

      {enrollment.status === "ACTIVE" ? (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          ثبت‌نام فعال است.
        </p>
      ) : null}

      {showCancel ? (
        <section className="rounded-2xl border border-rose-200 bg-white p-5">
          <h2 className="font-bold text-slate-900">لغو ثبت‌نام</h2>
          <p className="mt-2 text-sm text-slate-600">
            لغو طبق مقررات آموزشگاه انجام می‌شود. مبلغ پرداخت‌شده پس از بررسی مسترد می‌شود.
          </p>
          {!confirmCancel ? (
            <button
              type="button"
              onClick={() => setConfirmCancel(true)}
              className="mt-4 rounded-xl border border-rose-400 px-4 py-2.5 text-sm font-medium text-rose-800 hover:bg-rose-50"
            >
              درخواست لغو
            </button>
          ) : (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-rose-900">
                آیا از لغو این ثبت‌نام مطمئن هستید؟
                {courseClass?.title ? ` (${courseClass.title})` : ""}
              </p>
              {cancelError ? (
                <p className="text-sm text-rose-700" role="alert">
                  {cancelError}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={cancelling}
                  onClick={handleCancel}
                  className="rounded-xl bg-rose-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-rose-600 disabled:bg-slate-300"
                >
                  {cancelling ? "در حال لغو…" : "تأیید لغو"}
                </button>
                <button
                  type="button"
                  disabled={cancelling}
                  onClick={() => {
                    setConfirmCancel(false);
                    setCancelError("");
                  }}
                  className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-700"
                >
                  انصراف
                </button>
              </div>
            </div>
          )}
        </section>
      ) : null}

      <button
        type="button"
        onClick={() => navigate("/app/enrollments")}
        className="text-sm text-cyan-700 hover:underline"
      >
        بازگشت به فهرست
      </button>
    </div>
  );
}
