import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  getEnrollment,
  activateEnrollmentCompliance,
  getPayment,
} from "../../features/enrollments/enrollmentsApi";
import { getParticipant } from "../../features/participants/participantsApi";
import { getCourseClassById } from "../../features/courses/coursesApi";
import {
  ENROLLMENT_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  formatExpiryFa,
  formatIrrAmount,
  userMessageFromEnrollmentError,
} from "../../features/enrollments/enrollmentLabels";
import { CLASS_STATUS_LABELS } from "../../features/courses/courseLabels";
import { StatusPill, AdminPageHeader } from "../../features/courses/components/AdminCourseUi";
import { paymentStatusTone } from "../../features/payments/paymentLabels";
import { SectionLoader } from "../../components/Ui/Loading";
import ErrorState from "../../components/Ui/ErrorState";
import ForbiddenState from "../../components/Ui/ForbiddenState";
import { useToast } from "../../components/feedback/useToast";

/**
 * ADMIN enrollment hub — GET /enrollments/:id (+ optional related loads).
 * Activate compliance only when status is PENDING_COMPLIANCE.
 */
export default function AdminEnrollmentDetailPage() {
  const { enrollmentId } = useParams();
  const toast = useToast();
  const [enrollment, setEnrollment] = useState(null);
  const [participant, setParticipant] = useState(null);
  const [courseClass, setCourseClass] = useState(null);
  const [payment, setPayment] = useState(null);
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [forbidden, setForbidden] = useState(false);
  const [activating, setActivating] = useState(false);

  const load = useCallback(
    async (signal) => {
      setStatus("loading");
      setForbidden(false);
      setErrorMessage("");
      try {
        const e = await getEnrollment(enrollmentId, { signal });
        setEnrollment(e);

        const [p, c, pay] = await Promise.all([
          e.participantId
            ? getParticipant(e.participantId, { signal }).catch(() => null)
            : Promise.resolve(null),
          e.classId ? getCourseClassById(e.classId, { signal }).catch(() => null) : Promise.resolve(null),
          e.paymentId ? getPayment(e.paymentId, { signal }).catch(() => null) : Promise.resolve(null),
        ]);
        setParticipant(p);
        setCourseClass(c);
        setPayment(pay);
        setStatus("ready");
      } catch (err) {
        if (err?.code === "ABORTED") return;
        if (err?.status === 403 || err?.code === "FORBIDDEN") {
          setForbidden(true);
          setStatus("error");
          return;
        }
        setErrorMessage(userMessageFromEnrollmentError(err, "بارگذاری ثبت‌نام ناموفق بود."));
        setStatus("error");
      }
    },
    [enrollmentId],
  );

  useEffect(() => {
    const ac = new AbortController();
    load(ac.signal);
    return () => ac.abort();
  }, [load]);

  async function onActivate() {
    if (activating || !enrollment) return;
    setActivating(true);
    try {
      const updated = await activateEnrollmentCompliance(enrollment.id);
      setEnrollment(updated);
      toast.success("ثبت‌نام فعال شد.");
    } catch (err) {
      toast.error(userMessageFromEnrollmentError(err, "فعال‌سازی مدارک ناموفق بود."));
    } finally {
      setActivating(false);
    }
  }

  if (forbidden) {
    return <ForbiddenState title="دسترسی مجاز نیست" homeTo="/admin" />;
  }
  if (status === "loading") return <SectionLoader label="در حال بارگذاری ثبت‌نام…" />;
  if (status === "error") {
    return <ErrorState title="خطا" message={errorMessage} onRetry={() => load()} />;
  }
  if (!enrollment) return null;

  const canActivate = enrollment.status === "PENDING_COMPLIANCE";

  return (
    <div className="space-y-6">
      <AdminPageHeader
        backTo="/admin/reports?tab=enrollments"
        backLabel="← گزارش ثبت‌نام‌ها"
        title={ENROLLMENT_STATUS_LABELS[enrollment.status] || enrollment.status}
        description={<span className="font-mono text-xs text-slate-400">{enrollment.id}</span>}
        actions={
          enrollment.classId ? (
            <Link
              to={`/admin/attendance?classId=${enrollment.classId}${
                enrollment.participantId ? `&participantId=${enrollment.participantId}` : ""
              }`}
              className="rounded-xl border border-cyan-700 px-4 py-2 text-sm text-cyan-800 hover:bg-cyan-50"
            >
              حضور
            </Link>
          ) : null
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm">
          <h2 className="font-bold text-slate-900">وضعیت ثبت‌نام</h2>
          <dl className="mt-4 space-y-3">
            <div>
              <dt className="text-xs text-slate-500">وضعیت</dt>
              <dd>
                <StatusPill tone="info">
                  {ENROLLMENT_STATUS_LABELS[enrollment.status] || enrollment.status}
                </StatusPill>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">مبالغ</dt>
              <dd>
                پایه {formatIrrAmount(enrollment.basePrice ?? enrollment.priceCharged)} · نهایی{" "}
                {formatIrrAmount(enrollment.finalAmount ?? enrollment.priceCharged)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">زمان‌ها</dt>
              <dd className="text-xs text-slate-600">
                ایجاد: {formatExpiryFa(enrollment.createdAt)}
                {enrollment.confirmedAt ? ` · تأیید: ${formatExpiryFa(enrollment.confirmedAt)}` : ""}
                {enrollment.cancelledAt ? ` · لغو: ${formatExpiryFa(enrollment.cancelledAt)}` : ""}
              </dd>
            </div>
            {enrollment.eligibilitySnapshot ? (
              <div>
                <dt className="text-xs text-slate-500">الigibility</dt>
                <dd className="text-xs">
                  {enrollment.eligibilitySnapshot.eligible ? "واجد شرایط" : "غیرواجد"}
                  {Array.isArray(enrollment.eligibilitySnapshot.reasons) &&
                  enrollment.eligibilitySnapshot.reasons.length
                    ? ` · ${enrollment.eligibilitySnapshot.reasons.join("، ")}`
                    : ""}
                </dd>
              </div>
            ) : null}
          </dl>
          {canActivate ? (
            <button
              type="button"
              disabled={activating}
              onClick={onActivate}
              className="mt-4 rounded-xl bg-emerald-700 px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              {activating ? "در حال فعال‌سازی…" : "فعال‌سازی پس از مدارک"}
            </button>
          ) : null}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm">
          <h2 className="font-bold text-slate-900">شرکت‌کننده</h2>
          {participant ? (
            <div className="mt-4 space-y-2">
              <Link
                to={`/admin/participants/${participant.id}`}
                className="font-medium text-cyan-800 hover:underline"
              >
                {`${participant.firstName || ""} ${participant.lastName || ""}`.trim()}
              </Link>
              <p className="text-xs text-slate-500">{participant.phone || "—"}</p>
            </div>
          ) : enrollment.participantId ? (
            <Link
              to={`/admin/participants/${enrollment.participantId}`}
              className="mt-4 inline-block font-mono text-xs text-cyan-700 hover:underline"
            >
              {enrollment.participantId}
            </Link>
          ) : (
            <p className="mt-4 text-slate-500">—</p>
          )}
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm">
          <h2 className="font-bold text-slate-900">کلاس</h2>
          {courseClass ? (
            <div className="mt-4 space-y-2">
              <Link
                to={`/admin/classes/${courseClass.id}`}
                className="font-medium text-cyan-800 hover:underline"
              >
                {courseClass.title}
              </Link>
              <p className="text-xs text-slate-500">
                {CLASS_STATUS_LABELS[courseClass.status] || courseClass.status}
              </p>
              <Link
                to={`/admin/classes/${courseClass.id}`}
                className="text-xs text-cyan-700 hover:underline"
              >
                فهرست شرکت‌کنندگان و جلسات
              </Link>
            </div>
          ) : enrollment.classId ? (
            <Link
              to={`/admin/classes/${enrollment.classId}`}
              className="mt-4 inline-block font-mono text-xs text-cyan-700 hover:underline"
            >
              {enrollment.classId}
            </Link>
          ) : (
            <p className="mt-4 text-slate-500">—</p>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm">
          <h2 className="font-bold text-slate-900">پرداخت</h2>
          {payment ? (
            <div className="mt-4 space-y-2">
              <Link
                to={`/admin/payments/${payment.id}`}
                className="font-medium text-cyan-800 hover:underline"
              >
                {formatIrrAmount(payment.amount)}
              </Link>
              <div>
                <StatusPill tone={paymentStatusTone(payment.status)}>
                  {PAYMENT_STATUS_LABELS[payment.status] || payment.status}
                </StatusPill>
              </div>
            </div>
          ) : enrollment.paymentId ? (
            <Link
              to={`/admin/payments/${enrollment.paymentId}`}
              className="mt-4 inline-block font-mono text-xs text-cyan-700 hover:underline"
            >
              {enrollment.paymentId}
            </Link>
          ) : (
            <p className="mt-4 text-slate-500">پرداختی پیوست نشده.</p>
          )}
        </section>
      </div>
    </div>
  );
}
