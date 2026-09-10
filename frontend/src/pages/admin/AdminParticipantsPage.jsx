import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { searchAdminParticipants } from "../../features/enrollments/enrollmentsApi";
import {
  formatExpiryFa,
  userMessageFromEnrollmentError,
} from "../../features/enrollments/enrollmentLabels";
import { GENDER_RESTRICTION_LABELS } from "../../features/courses/courseLabels";
import { StatusPill, AdminPageHeader } from "../../features/courses/components/AdminCourseUi";
import { SectionLoader } from "../../components/Ui/Loading";
import ErrorState from "../../components/Ui/ErrorState";
import EmptyState from "../../components/Ui/EmptyState";
import ForbiddenState from "../../components/Ui/ForbiddenState";

const GENDER_OPTIONS = ["MALE", "FEMALE"];

/**
 * ADMIN participant discovery — GET /enrollments/admin/participants/search only.
 * Explicit search action (no request spam).
 */
export default function AdminParticipantsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const qParam = searchParams.get("q") || "";
  const page = Number(searchParams.get("page") || 1) || 1;
  const gender = searchParams.get("gender") || "";
  const isActiveParam = searchParams.get("isActive");

  const [qInput, setQInput] = useState(qParam);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState(qParam || gender || isActiveParam != null ? "loading" : "idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [forbidden, setForbidden] = useState(false);
  const [searched, setSearched] = useState(Boolean(qParam || gender || isActiveParam != null));

  const load = useCallback(
    async (signal) => {
      if (!qParam && !gender && isActiveParam == null) {
        setItems([]);
        setTotal(0);
        setStatus("idle");
        setSearched(false);
        return;
      }
      setStatus("loading");
      setForbidden(false);
      setSearched(true);
      try {
        let isActive;
        if (isActiveParam === "true") isActive = true;
        if (isActiveParam === "false") isActive = false;
        const data = await searchAdminParticipants({
          q: qParam || undefined,
          page,
          limit: 20,
          gender: gender || undefined,
          isActive,
          signal,
        });
        setItems(Array.isArray(data?.items) ? data.items : []);
        setTotal(Number(data?.total || 0));
        setStatus("ready");
      } catch (err) {
        if (err?.code === "ABORTED") return;
        if (err?.status === 403 || err?.code === "FORBIDDEN") {
          setForbidden(true);
          setStatus("error");
          return;
        }
        setErrorMessage(userMessageFromEnrollmentError(err, "جستجوی شرکت‌کننده ناموفق بود."));
        setStatus("error");
      }
    },
    [qParam, page, gender, isActiveParam],
  );

  useEffect(() => {
    const ac = new AbortController();
    load(ac.signal);
    return () => ac.abort();
  }, [load]);

  function submitSearch(e) {
    e?.preventDefault?.();
    const next = new URLSearchParams();
    if (qInput.trim()) next.set("q", qInput.trim());
    if (gender) next.set("gender", gender);
    if (isActiveParam === "true" || isActiveParam === "false") next.set("isActive", isActiveParam);
    next.set("page", "1");
    setSearchParams(next);
  }

  const totalPages = Math.max(1, Math.ceil(total / 20) || 1);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        backTo="/admin"
        backLabel="← مرکز عملیات"
        title="شرکت‌کنندگان"
        description="جستجوی ادمین روی نام/نام‌خانوادگی یا تلفن دقیق. ساخت یا حذف مستقیم شرکت‌کننده توسط ادمین وجود ندارد."
      />

      <form
        onSubmit={submitSearch}
        className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4"
      >
        <label className="text-sm">
          <span className="text-xs text-slate-500">جستجو (q)</span>
          <input
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="نام یا تلفن…"
            className="mt-1 block w-56 rounded-xl border border-slate-200 px-3 py-2"
          />
        </label>
        <label className="text-sm">
          <span className="text-xs text-slate-500">جنسیت</span>
          <select
            value={gender}
            onChange={(e) => {
              const next = new URLSearchParams(searchParams);
              if (e.target.value) next.set("gender", e.target.value);
              else next.delete("gender");
              next.set("page", "1");
              setSearchParams(next);
            }}
            className="mt-1 block rounded-xl border border-slate-200 px-3 py-2"
          >
            <option value="">همه</option>
            {GENDER_OPTIONS.map((g) => (
              <option key={g} value={g}>
                {GENDER_RESTRICTION_LABELS[g] || g}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="text-xs text-slate-500">فعال</span>
          <select
            value={isActiveParam ?? ""}
            onChange={(e) => {
              const next = new URLSearchParams(searchParams);
              if (e.target.value === "") next.delete("isActive");
              else next.set("isActive", e.target.value);
              next.set("page", "1");
              setSearchParams(next);
            }}
            className="mt-1 block rounded-xl border border-slate-200 px-3 py-2"
          >
            <option value="">همه</option>
            <option value="true">فعال</option>
            <option value="false">غیرفعال</option>
          </select>
        </label>
        <button type="submit" className="rounded-xl bg-cyan-700 px-4 py-2 text-sm text-white hover:bg-cyan-600">
          جستجو
        </button>
      </form>

      {forbidden ? <ForbiddenState title="دسترسی مجاز نیست" message="فقط ادمین." /> : null}
      {!forbidden && status === "idle" ? (
        <EmptyState title="برای شروع جستجو کنید." description="حداقل یک فیلتر یا عبارت جستجو لازم است." />
      ) : null}
      {!forbidden && status === "loading" ? <SectionLoader label="در حال جستجو…" /> : null}
      {!forbidden && status === "error" ? (
        <ErrorState title="خطا" message={errorMessage} onRetry={() => load()} />
      ) : null}
      {!forbidden && status === "ready" && searched && items.length === 0 ? (
        <EmptyState title="نتیجه‌ای یافت نشد." />
      ) : null}

      {!forbidden && status === "ready" && items.length > 0 ? (
        <div className="space-y-3">
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="min-w-full text-right text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-3 py-2">نام</th>
                  <th className="px-3 py-2">تلفن</th>
                  <th className="px-3 py-2">جنسیت</th>
                  <th className="px-3 py-2">سن</th>
                  <th className="px-3 py-2">وضعیت</th>
                  <th className="px-3 py-2">ایجاد</th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                    <td className="px-3 py-2">
                      <Link
                        to={`/admin/participants/${p.id}`}
                        className="font-medium text-cyan-800 hover:underline"
                      >
                        {`${p.firstName || ""} ${p.lastName || ""}`.trim() || p.id}
                      </Link>
                    </td>
                    <td className="px-3 py-2">{p.phone || "—"}</td>
                    <td className="px-3 py-2">
                      {GENDER_RESTRICTION_LABELS[p.gender] || p.gender || "—"}
                    </td>
                    <td className="px-3 py-2">
                      {p.age != null ? Number(p.age).toLocaleString("fa-IR") : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <StatusPill tone={p.isActive ? "success" : "neutral"}>
                        {p.isActive ? "فعال" : "غیرفعال"}
                      </StatusPill>
                    </td>
                    <td className="px-3 py-2 text-slate-500">{formatExpiryFa(p.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => {
                const next = new URLSearchParams(searchParams);
                next.set("page", String(page - 1));
                setSearchParams(next);
              }}
              className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-40"
            >
              قبلی
            </button>
            <span>
              صفحه {Number(page).toLocaleString("fa-IR")} / {Number(totalPages).toLocaleString("fa-IR")} · جمع{" "}
              {Number(total).toLocaleString("fa-IR")}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => {
                const next = new URLSearchParams(searchParams);
                next.set("page", String(page + 1));
                setSearchParams(next);
              }}
              className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-40"
            >
              بعدی
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
