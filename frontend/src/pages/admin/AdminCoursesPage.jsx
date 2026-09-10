import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getCourseTemplates } from "../../features/courses/coursesApi";
import {
  GENDER_RESTRICTION_LABELS,
  formatDateFa,
  userMessageFromApiError,
} from "../../features/courses/courseLabels";
import { StatusPill, AdminPageHeader } from "../../features/courses/components/AdminCourseUi";
import { SectionLoader } from "../../components/Ui/Loading";
import ErrorState from "../../components/Ui/ErrorState";
import EmptyState from "../../components/Ui/EmptyState";
import ForbiddenState from "../../components/Ui/ForbiddenState";

/**
 * ADMIN — course templates list (GET /courses/templates).
 * Backend: no pagination/search; optional activeOnly.
 */
export default function AdminCoursesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeOnly = searchParams.get("activeOnly") === "true";
  const q = searchParams.get("q") || "";

  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [forbidden, setForbidden] = useState(false);
  const [localQ, setLocalQ] = useState(q);

  const load = useCallback(
    async (signal) => {
      setStatus("loading");
      setErrorMessage("");
      setForbidden(false);
      try {
        const data = await getCourseTemplates({ activeOnly, signal });
        setItems(Array.isArray(data?.items) ? data.items : []);
        setStatus("ready");
      } catch (err) {
        if (err?.code === "ABORTED") return;
        if (err?.status === 403 || err?.code === "FORBIDDEN") {
          setForbidden(true);
          setStatus("error");
          return;
        }
        setErrorMessage(userMessageFromApiError(err, "بارگذاری دوره‌ها ناموفق بود."));
        setStatus("error");
      }
    },
    [activeOnly],
  );

  useEffect(() => {
    const ac = new AbortController();
    load(ac.signal);
    return () => ac.abort();
  }, [load]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter(
      (t) =>
        String(t.title || "")
          .toLowerCase()
          .includes(needle) ||
        String(t.level || "")
          .toLowerCase()
          .includes(needle),
    );
  }, [items, q]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        backTo="/admin"
        backLabel="← مرکز عملیات"
        title="قالب‌های دوره"
        description="این فهرست قالب‌های قابل استفاده مجدد است — نه کلاس‌های در حال اجرا. برای نمونه‌های عملیاتی به «کلاس‌ها» بروید. حذف سخت وجود ندارد؛ غیرفعال‌سازی با ویرایش وضعیت «فعال» است و حذف نیست."
        actions={
          <Link
            to="/admin/courses/new"
            className="rounded-xl bg-cyan-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-cyan-600"
          >
            دوره جدید
          </Link>
        }
      />

      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <label className="text-sm">
          <span className="text-xs text-slate-500">جستجو در نتایج بارگذاری‌شده (محلی)</span>
          <input
            value={localQ}
            onChange={(e) => setLocalQ(e.target.value)}
            placeholder="عنوان یا سطح…"
            className="mt-1 block w-56 rounded-xl border border-slate-200 px-3 py-2"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={activeOnly}
            onChange={(e) => {
              const next = new URLSearchParams(searchParams);
              if (e.target.checked) next.set("activeOnly", "true");
              else next.delete("activeOnly");
              setSearchParams(next);
            }}
          />
          فقط دوره‌های فعال
        </label>
        <button
          type="button"
          onClick={() => {
            const next = new URLSearchParams(searchParams);
            if (localQ.trim()) next.set("q", localQ.trim());
            else next.delete("q");
            setSearchParams(next);
          }}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white"
        >
          اعمال
        </button>
      </div>

      {forbidden ? (
        <ForbiddenState title="دسترسی مجاز نیست" message="فقط ادمین می‌تواند مدیریت دوره را ببیند." />
      ) : null}
      {!forbidden && status === "loading" ? <SectionLoader label="در حال بارگذاری دوره‌ها…" /> : null}
      {!forbidden && status === "error" ? (
        <ErrorState title="خطا" message={errorMessage} onRetry={() => load()} />
      ) : null}
      {!forbidden && status === "ready" && filtered.length === 0 ? (
        <EmptyState title="دوره‌ای برای نمایش وجود ندارد." />
      ) : null}

      {!forbidden && status === "ready" && filtered.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="min-w-full text-right text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-3 py-2">عنوان</th>
                <th className="px-3 py-2">سطح</th>
                <th className="px-3 py-2">سن</th>
                <th className="px-3 py-2">جنسیت</th>
                <th className="px-3 py-2">وضعیت</th>
                <th className="px-3 py-2">ایجاد</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className="border-t border-slate-100 hover:bg-slate-50/80">
                  <td className="px-3 py-2">
                    <Link to={`/admin/courses/${t.id}`} className="font-medium text-cyan-800 hover:underline">
                      {t.title}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{t.level}</td>
                  <td className="px-3 py-2">
                    {Number(t.ageMin).toLocaleString("fa-IR")}–{Number(t.ageMax).toLocaleString("fa-IR")}
                  </td>
                  <td className="px-3 py-2">
                    {GENDER_RESTRICTION_LABELS[t.genderRestriction] || t.genderRestriction}
                  </td>
                  <td className="px-3 py-2">
                    <StatusPill tone={t.isActive ? "success" : "neutral"}>
                      {t.isActive ? "فعال" : "غیرفعال"}
                    </StatusPill>
                  </td>
                  <td className="px-3 py-2 text-slate-500">{formatDateFa(t.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
