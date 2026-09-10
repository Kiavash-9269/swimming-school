import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getMyEnrollments } from "../../features/enrollments/enrollmentsApi";
import { getCourseClassById } from "../../features/courses/coursesApi";
import { getParticipant } from "../../features/participants/participantsApi";
import {
  ENROLLMENT_STATUS_LABELS,
  userMessageFromEnrollmentError,
  formatExpiryFa,
  formatIrrAmount,
} from "../../features/enrollments/enrollmentLabels";
import { SectionLoader } from "../../components/Ui/Loading";
import ErrorState from "../../components/Ui/ErrorState";
import EmptyState from "../../components/Ui/EmptyState";

/**
 * GET /enrollments/me — enrich class/participant titles via existing F3/F4 APIs only.
 */
export default function AppEnrollmentsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({});
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");

  const load = useCallback(async (signal) => {
    setStatus("loading");
    setErrorMessage("");
    try {
      const data = await getMyEnrollments({ signal });
      const list = Array.isArray(data?.items) ? data.items : [];
      setItems(list);

      const classIds = [...new Set(list.map((e) => e.classId).filter(Boolean))];
      const participantIds = [...new Set(list.map((e) => e.participantId).filter(Boolean))];

      const classEntries = await Promise.all(
        classIds.map(async (id) => {
          try {
            const c = await getCourseClassById(id, { signal });
            return [id, c];
          } catch {
            return [id, null];
          }
        }),
      );
      const participantEntries = await Promise.all(
        participantIds.map(async (id) => {
          try {
            const p = await getParticipant(id, { signal });
            return [id, p];
          } catch {
            return [id, null];
          }
        }),
      );

      if (signal?.aborted) return;

      setMeta({
        classes: Object.fromEntries(classEntries),
        participants: Object.fromEntries(participantEntries),
      });
      setStatus("ready");
    } catch (err) {
      if (err?.code === "ABORTED") return;
      setErrorMessage(userMessageFromEnrollmentError(err, "بارگذاری ثبت‌نام‌ها ناموفق بود."));
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    load(ac.signal);
    return () => ac.abort();
  }, [load]);

  if (status === "loading") {
    return <SectionLoader label="در حال بارگذاری ثبت‌نام‌ها…" />;
  }

  if (status === "error") {
    return <ErrorState title="خطا" message={errorMessage} onRetry={() => load()} />;
  }

  if (items.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-slate-900">ثبت‌نام‌های من</h1>
        <EmptyState
          title="هنوز ثبت‌نامی ندارید"
          description="برای مشاهده کلاس‌های موجود، به بخش دوره‌ها بروید."
          actionLabel="مشاهده دوره‌ها"
          onAction={() => navigate("/app/courses")}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">ثبت‌نام‌های من</h1>
          <p className="mt-1 text-sm text-slate-600">
            {items.length.toLocaleString("fa-IR")} ثبت‌نام (حداکثر ۲۰۰ مورد از سرور)
          </p>
        </div>
        <Link to="/app/courses" className="text-sm text-cyan-700 hover:underline">
          مشاهده کلاس‌ها
        </Link>
      </div>

      <ul className="space-y-3">
        {items.map((enr) => {
          const cls = meta.classes?.[enr.classId];
          const part = meta.participants?.[enr.participantId];
          const title = cls?.title || "کلاس";
          const participantName = part
            ? `${part.firstName || ""} ${part.lastName || ""}`.trim()
            : null;

          return (
            <li key={enr.id}>
              <Link
                to={`/app/enrollments/${enr.id}`}
                className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-cyan-300"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h2 className="font-bold text-slate-900">{title}</h2>
                  <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-700">
                    {ENROLLMENT_STATUS_LABELS[enr.status] || enr.status}
                  </span>
                </div>
                <dl className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs text-slate-400">شرکت‌کننده</dt>
                    <dd>{participantName || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-400">تاریخ ایجاد</dt>
                    <dd>{formatExpiryFa(enr.createdAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-400">مبلغ نهایی (سرور)</dt>
                    <dd>{formatIrrAmount(enr.finalAmount)}</dd>
                  </div>
                  {enr.status === "PENDING_COMPLIANCE" ? (
                    <div>
                      <dt className="text-xs text-slate-400">مدارک</dt>
                      <dd className="text-amber-800">در انتظار تکمیل</dd>
                    </div>
                  ) : null}
                </dl>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
