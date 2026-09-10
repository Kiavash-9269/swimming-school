import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getCourseTemplateById, getCourseClasses } from "../../features/courses/coursesApi";
import {
  CLASS_STATUS_LABELS,
  GENDER_RESTRICTION_LABELS,
  formatDateFa,
  formatIrr,
  classStatusTone,
  userMessageFromApiError,
} from "../../features/courses/courseLabels";
import { StatusPill } from "../../features/courses/components/AdminCourseUi";
import { SectionLoader } from "../../components/Ui/Loading";
import ErrorState from "../../components/Ui/ErrorState";
import EmptyState from "../../components/Ui/EmptyState";

export default function AdminCourseDetailPage() {
  const { courseId } = useParams();
  const [template, setTemplate] = useState(null);
  const [classes, setClasses] = useState([]);
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");

  const load = useCallback(
    async (signal) => {
      setStatus("loading");
      setErrorMessage("");
      try {
        const [t, cls] = await Promise.all([
          getCourseTemplateById(courseId, { signal }),
          getCourseClasses({ courseTemplateId: courseId, signal }),
        ]);
        setTemplate(t);
        setClasses(Array.isArray(cls?.items) ? cls.items : []);
        setStatus("ready");
      } catch (err) {
        if (err?.code === "ABORTED") return;
        setErrorMessage(userMessageFromApiError(err, "بارگذاری دوره ناموفق بود."));
        setStatus("error");
      }
    },
    [courseId],
  );

  useEffect(() => {
    const ac = new AbortController();
    load(ac.signal);
    return () => ac.abort();
  }, [load]);

  if (status === "loading") return <SectionLoader label="در حال بارگذاری دوره…" />;
  if (status === "error") return <ErrorState title="خطا" message={errorMessage} onRetry={() => load()} />;
  if (!template) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/admin/courses" className="text-sm text-cyan-700 hover:underline">
            ← دوره‌ها
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">{template.title}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <StatusPill tone={template.isActive ? "success" : "neutral"}>
              {template.isActive ? "فعال" : "غیرفعال"}
            </StatusPill>
            <StatusPill>{template.level}</StatusPill>
            <StatusPill>
              {GENDER_RESTRICTION_LABELS[template.genderRestriction] || template.genderRestriction}
            </StatusPill>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to={`/admin/courses/${courseId}/edit`}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
          >
            ویرایش
          </Link>
          <Link
            to={`/admin/classes/new?courseTemplateId=${courseId}`}
            className="rounded-xl bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600"
          >
            کلاس جدید
          </Link>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-bold text-slate-900">نمای کلی</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-slate-500">بازه سنی</dt>
            <dd>
              {Number(template.ageMin).toLocaleString("fa-IR")} تا {Number(template.ageMax).toLocaleString("fa-IR")}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">مدارک</dt>
            <dd>
              {[
                template.requiresInsurance ? "بیمه" : null,
                template.requiresMedicalApproval ? "پزشکی" : null,
              ]
                .filter(Boolean)
                .join("، ") || "بدون الزام"}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs text-slate-500">توضیح</dt>
            <dd className="mt-1 whitespace-pre-wrap text-slate-700">{template.description || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">ایجاد</dt>
            <dd>{formatDateFa(template.createdAt)}</dd>
          </div>
        </dl>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-slate-900">کلاس‌ها</h2>
          <span className="text-xs text-slate-500">
            {Number(classes.length).toLocaleString("fa-IR")} کلاس
          </span>
        </div>
        {classes.length === 0 ? (
          <EmptyState title="کلاسی برای این دوره ثبت نشده." />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="min-w-full text-right text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-3 py-2">عنوان</th>
                  <th className="px-3 py-2">وضعیت</th>
                  <th className="px-3 py-2">ظرفیت</th>
                  <th className="px-3 py-2">قیمت</th>
                  <th className="px-3 py-2">شروع</th>
                </tr>
              </thead>
              <tbody>
                {classes.map((c) => (
                  <tr key={c.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">
                      <Link to={`/admin/classes/${c.id}`} className="font-medium text-cyan-800 hover:underline">
                        {c.title}
                      </Link>
                    </td>
                    <td className="px-3 py-2">
                      <StatusPill tone={classStatusTone(c.status)}>
                        {CLASS_STATUS_LABELS[c.status] || c.status}
                      </StatusPill>
                    </td>
                    <td className="px-3 py-2">
                      {Number(c.confirmedCount || 0).toLocaleString("fa-IR")} /{" "}
                      {Number(c.capacity || 0).toLocaleString("fa-IR")}
                      <span className="mr-1 text-xs text-slate-400">
                        (آزاد {Number(c.availableSeats ?? 0).toLocaleString("fa-IR")})
                      </span>
                    </td>
                    <td className="px-3 py-2">{formatIrr(c.price)}</td>
                    <td className="px-3 py-2">{formatDateFa(c.startDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
