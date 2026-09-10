import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getParticipant } from "../../features/participants/participantsApi";
import { getAdminUser360 } from "../../features/enrollments/enrollmentsApi";
import {
  ENROLLMENT_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  formatExpiryFa,
  formatIrrAmount,
  userMessageFromEnrollmentError,
} from "../../features/enrollments/enrollmentLabels";
import { GENDER_RESTRICTION_LABELS } from "../../features/courses/courseLabels";
import { StatusPill, AdminPageHeader } from "../../features/courses/components/AdminCourseUi";
import { paymentStatusTone } from "../../features/payments/paymentLabels";
import { SectionLoader } from "../../components/Ui/Loading";
import ErrorState from "../../components/Ui/ErrorState";
import ForbiddenState from "../../components/Ui/ForbiddenState";

/**
 * ADMIN participant ops — GET participant + optional User 360 for owner associations.
 */
export default function AdminParticipantDetailPage() {
  const { participantId } = useParams();
  const [participant, setParticipant] = useState(null);
  const [user360, setUser360] = useState(null);
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [forbidden, setForbidden] = useState(false);
  const [partial360Error, setPartial360Error] = useState("");

  const load = useCallback(
    async (signal) => {
      setStatus("loading");
      setForbidden(false);
      setPartial360Error("");
      try {
        const p = await getParticipant(participantId, { signal });
        setParticipant(p);
        if (p?.ownerUserId) {
          try {
            const z = await getAdminUser360(p.ownerUserId, { signal });
            setUser360(z);
          } catch (err) {
            if (err?.code === "ABORTED") return;
            setUser360(null);
            setPartial360Error("بارگذاری User 360 ناموفق بود؛ مشخصات شرکت‌کننده نمایش داده می‌شود.");
          }
        } else {
          setUser360(null);
        }
        setStatus("ready");
      } catch (err) {
        if (err?.code === "ABORTED") return;
        if (err?.status === 403 || err?.code === "FORBIDDEN") {
          setForbidden(true);
          setStatus("error");
          return;
        }
        setErrorMessage(userMessageFromEnrollmentError(err, "بارگذاری شرکت‌کننده ناموفق بود."));
        setStatus("error");
      }
    },
    [participantId],
  );

  useEffect(() => {
    const ac = new AbortController();
    load(ac.signal);
    return () => ac.abort();
  }, [load]);

  const relatedEnrollments = useMemo(() => {
    const raw = user360?.enrollments;
    const list = Array.isArray(raw?.all)
      ? raw.all
      : Array.isArray(raw)
        ? raw
        : [];
    return list.filter((e) => e.participantId === participantId);
  }, [user360, participantId]);

  const relatedPayments = useMemo(() => {
    const list = Array.isArray(user360?.payments) ? user360.payments : [];
    const enrollIds = new Set(relatedEnrollments.map((e) => e.id));
    return list.filter((pay) => pay.enrollmentId && enrollIds.has(pay.enrollmentId));
  }, [user360, relatedEnrollments]);

  const relatedAttendance = useMemo(() => {
    const list = Array.isArray(user360?.attendance) ? user360.attendance : [];
    return list.filter((a) => a.participantId === participantId).slice(0, 30);
  }, [user360, participantId]);

  if (forbidden) {
    return <ForbiddenState title="دسترسی مجاز نیست" homeTo="/admin/participants" />;
  }
  if (status === "loading") return <SectionLoader label="در حال بارگذاری شرکت‌کننده…" />;
  if (status === "error") {
    return <ErrorState title="خطا" message={errorMessage} onRetry={() => load()} />;
  }
  if (!participant) return null;

  const name = `${participant.firstName || ""} ${participant.lastName || ""}`.trim() || participant.id;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        backTo="/admin/participants"
        backLabel="← جستجوی شرکت‌کنندگان"
        title={name}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <StatusPill tone={participant.isActive ? "success" : "neutral"}>
              {participant.isActive ? "فعال" : "غیرفعال"}
            </StatusPill>
            <span className="font-mono text-xs text-slate-400">{participant.id}</span>
          </span>
        }
      />

      {partial360Error ? <p className="text-sm text-amber-800">{partial360Error}</p> : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm">
        <h2 className="font-bold text-slate-900">مشخصات</h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-slate-500">تلفن</dt>
            <dd>{participant.phone || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">جنسیت</dt>
            <dd>{GENDER_RESTRICTION_LABELS[participant.gender] || participant.gender || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">تاریخ تولد / سن</dt>
            <dd>
              {formatExpiryFa(participant.birthDate)}
              {participant.age != null ? ` · ${Number(participant.age).toLocaleString("fa-IR")} سال` : ""}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">نسبت</dt>
            <dd>{participant.relation || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">مالک حساب</dt>
            <dd className="font-mono text-xs">{participant.ownerUserId || "—"}</dd>
          </div>
        </dl>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-slate-900">ثبت‌نام‌های مرتبط (از User 360)</h2>
        {relatedEnrollments.length === 0 ? (
          <p className="text-sm text-slate-500">ثبت‌نامی در محدوده User 360 برای این شرکت‌کننده نیست.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="min-w-full text-right text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-3 py-2">وضعیت</th>
                  <th className="px-3 py-2">کلاس</th>
                  <th className="px-3 py-2">پرداخت</th>
                  <th className="px-3 py-2">ایجاد</th>
                </tr>
              </thead>
              <tbody>
                {relatedEnrollments.map((e) => (
                  <tr key={e.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">
                      <Link to={`/admin/enrollments/${e.id}`} className="text-cyan-800 hover:underline">
                        {ENROLLMENT_STATUS_LABELS[e.status] || e.status}
                      </Link>
                    </td>
                    <td className="px-3 py-2">
                      {e.classId ? (
                        <Link to={`/admin/classes/${e.classId}`} className="font-mono text-[11px] text-cyan-700 hover:underline">
                          {e.classId.slice(-8)}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {e.paymentId ? (
                        <Link to={`/admin/payments/${e.paymentId}`} className="font-mono text-[11px] text-cyan-700 hover:underline">
                          {e.paymentId.slice(-8)}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2 text-slate-500">{formatExpiryFa(e.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-slate-900">پرداخت‌های مرتبط</h2>
        {relatedPayments.length === 0 ? (
          <p className="text-sm text-slate-500">پرداختی در محدوده User 360 نیست.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="min-w-full text-right text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-3 py-2">مبلغ</th>
                  <th className="px-3 py-2">وضعیت</th>
                  <th className="px-3 py-2">ایجاد</th>
                </tr>
              </thead>
              <tbody>
                {relatedPayments.map((pay) => (
                  <tr key={pay.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">
                      <Link to={`/admin/payments/${pay.id}`} className="text-cyan-800 hover:underline">
                        {formatIrrAmount(pay.amount)}
                      </Link>
                    </td>
                    <td className="px-3 py-2">
                      <StatusPill tone={paymentStatusTone(pay.status)}>
                        {PAYMENT_STATUS_LABELS[pay.status] || pay.status}
                      </StatusPill>
                    </td>
                    <td className="px-3 py-2 text-slate-500">{formatExpiryFa(pay.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-slate-900">حضور اخیر</h2>
          {relatedAttendance[0]?.classId ? (
            <Link
              to={`/admin/attendance?participantId=${participantId}&classId=${relatedAttendance[0].classId}`}
              className="text-sm text-cyan-700 hover:underline"
            >
              گزارش حضور
            </Link>
          ) : (
            <Link
              to={`/admin/attendance?participantId=${participantId}`}
              className="text-sm text-cyan-700 hover:underline"
            >
              گزارش حضور
            </Link>
          )}
        </div>
        {relatedAttendance.length === 0 ? (
          <p className="text-sm text-slate-500">رکورد حضوری در User 360 نیست.</p>
        ) : (
          <ul className="rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-600">
            {relatedAttendance.slice(0, 10).map((a) => (
              <li key={`${a.classId}-${a.sessionId}-${a.markedAt}`} className="border-b border-slate-50 py-1 last:border-0">
                {a.status} · کلاس{" "}
                {a.classId ? (
                  <Link to={`/admin/classes/${a.classId}`} className="text-cyan-700 hover:underline">
                    {String(a.classId).slice(-6)}
                  </Link>
                ) : (
                  "—"
                )}{" "}
                · {formatExpiryFa(a.markedAt)}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
