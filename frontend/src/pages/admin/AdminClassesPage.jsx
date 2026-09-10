import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getCourseClasses, getCourseTemplates } from "../../features/courses/coursesApi";
import {
  CLASS_STATUS_LABELS,
  CLASS_STATUS_OPTIONS,
  formatDateFa,
  formatIrr,
  classStatusTone,
  userMessageFromApiError,
} from "../../features/courses/courseLabels";
import { StatusPill, AdminPageHeader } from "../../features/courses/components/AdminCourseUi";
import { SectionLoader } from "../../components/Ui/Loading";
import ErrorState from "../../components/Ui/ErrorState";
import EmptyState from "../../components/Ui/EmptyState";

/**
 * ADMIN — GET /courses/classes?status&courseTemplateId (no server pagination).
 */
export default function AdminClassesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get("status") || "";
  const courseTemplateId = searchParams.get("courseTemplateId") || "";

  const [items, setItems] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");

  const load = useCallback(
    async (signal) => {
      setStatus("loading");
      try {
        const [data, tmpl] = await Promise.all([
          getCourseClasses({
            status: statusFilter || undefined,
            courseTemplateId: courseTemplateId || undefined,
            signal,
          }),
          getCourseTemplates({ signal }).catch(() => ({ items: [] })),
        ]);
        setItems(Array.isArray(data?.items) ? data.items : []);
        setTemplates(Array.isArray(tmpl?.items) ? tmpl.items : []);
        setStatus("ready");
      } catch (err) {
        if (err?.code === "ABORTED") return;
        setErrorMessage(userMessageFromApiError(err, "بارگذاری کلاس‌ها ناموفق بود."));
        setStatus("error");
      }
    },
    [statusFilter, courseTemplateId],
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
    setSearchParams(next);
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        backTo="/admin"
        backLabel="← مرکز عملیات"
        title="کلاس‌های عملیاتی"
        description="هر کلاس یک نمونه اجرایی از قالب دوره است. کلاس‌های پیش‌نویس برای کاربران دیده نمی‌شوند — از جزئیات کلاس «انتشار و باز کردن ثبت‌نام» را بزنید تا در «کلاس‌های مجموعه» ظاهر شوند."
        actions={
          <Link
            to="/admin/classes/new"
            className="rounded-xl bg-cyan-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-cyan-600"
          >
            کلاس جدید
          </Link>
        }
      />

      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <label className="text-sm">
          <span className="text-xs text-slate-500">وضعیت</span>
          <select
            value={statusFilter}
            onChange={(e) => setFilter("status", e.target.value)}
            className="mt-1 block min-w-40 rounded-xl border border-slate-200 px-3 py-2"
          >
            <option value="">همه</option>
            {CLASS_STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {CLASS_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="text-xs text-slate-500">قالب دوره</span>
          <select
            value={courseTemplateId}
            onChange={(e) => setFilter("courseTemplateId", e.target.value)}
            className="mt-1 block min-w-48 max-w-xs rounded-xl border border-slate-200 px-3 py-2"
          >
            <option value="">همه دوره‌ها</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
                {t.isActive === false ? " (غیرفعال)" : ""}
              </option>
            ))}
          </select>
        </label>
        {(statusFilter || courseTemplateId) && (
          <button
            type="button"
            onClick={() => setSearchParams({})}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-700"
          >
            پاک کردن فیلتر
          </button>
        )}
      </div>

      {status === "loading" ? <SectionLoader label="در حال بارگذاری کلاس‌ها…" /> : null}
      {status === "error" ? <ErrorState title="خطا" message={errorMessage} onRetry={() => load()} /> : null}
      {status === "ready" && items.length === 0 ? (
        <EmptyState
          title="کلاسی برای نمایش وجود ندارد."
          description="فیلتر را تغییر دهید یا کلاس جدید بسازید."
        />
      ) : null}

      {status === "ready" && items.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="min-w-full text-right text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-3 py-2">عنوان</th>
                <th className="px-3 py-2">وضعیت</th>
                <th className="px-3 py-2">ظرفیت</th>
                <th className="px-3 py-2">قیمت</th>
                <th className="px-3 py-2">شروع</th>
                <th className="px-3 py-2">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50/60">
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
                  </td>
                  <td className="px-3 py-2">{formatIrr(c.price)}</td>
                  <td className="px-3 py-2">{formatDateFa(c.startDate)}</td>
                  <td className="px-3 py-2">
                    <Link
                      to={`/admin/attendance?classId=${c.id}`}
                      className="text-xs text-cyan-700 hover:underline"
                    >
                      حضور
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
