import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { searchAdminParticipants } from "../../features/enrollments/enrollmentsApi";
import { getCourseClasses } from "../../features/courses/coursesApi";
import {
  ENROLLMENT_STATUS_LABELS,
  userMessageFromEnrollmentError,
} from "../../features/enrollments/enrollmentLabels";
import { formatDateFa } from "../../features/participants/participantLabels";
import { GENDER_RESTRICTION_LABELS } from "../../features/courses/courseLabels";
import { StatusPill, AdminPageHeader } from "../../features/courses/components/AdminCourseUi";
import { SectionLoader } from "../../components/Ui/Loading";
import ErrorState from "../../components/Ui/ErrorState";
import EmptyState from "../../components/Ui/EmptyState";
import ForbiddenState from "../../components/Ui/ForbiddenState";
import PersianDateField from "../../components/Ui/PersianDateField";
import AdminParticipantCreatePanel from "../../features/participants/components/AdminParticipantCreatePanel";

const GENDER_OPTIONS = ["MALE", "FEMALE"];
const PAGE_SIZE = 20;

const ENROLLMENT_TONES = {
  ACTIVE: "success",
  PAID: "success",
  COMPLETED: "info",
  PENDING: "warn",
  PAYMENT_PENDING: "warn",
  PENDING_COMPLIANCE: "warn",
  WAITLISTED: "info",
  CANCELLED: "neutral",
  EXPIRED: "neutral",
  PAYMENT_FAILED: "danger",
  REFUNDED: "neutral",
};

/**
 * ADMIN — everyone who registered for a class, via GET /enrollments/admin/participants/search.
 */
export default function AdminParticipantsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const qParam = searchParams.get("q") || "";
  const page = Number(searchParams.get("page") || 1) || 1;
  const gender = searchParams.get("gender") || "";
  const isActiveParam = searchParams.get("isActive");
  const classId = searchParams.get("classId") || "";
  const showAll = searchParams.get("scope") === "all";
  const registeredFrom = searchParams.get("from") || "";
  const registeredTo = searchParams.get("to") || "";

  const [qInput, setQInput] = useState(qParam);
  const [createOpen, setCreateOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [classes, setClasses] = useState([]);
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    const ac = new AbortController();
    getCourseClasses({ signal: ac.signal })
      .then((data) => setClasses(Array.isArray(data?.items) ? data.items : []))
      .catch(() => {});
    return () => ac.abort();
  }, []);

  const load = useCallback(
    async (signal) => {
      setStatus("loading");
      setForbidden(false);
      try {
        let isActive;
        if (isActiveParam === "true") isActive = true;
        if (isActiveParam === "false") isActive = false;
        const data = await searchAdminParticipants({
          q: qParam || undefined,
          page,
          limit: PAGE_SIZE,
          gender: gender || undefined,
          isActive,
          enrolled: showAll ? undefined : true,
          classId: classId || undefined,
          registeredFrom: registeredFrom || undefined,
          registeredTo: registeredTo || undefined,
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
        setErrorMessage(userMessageFromEnrollmentError(err, "فهرست شاگردان بارگذاری نشد."));
        setStatus("error");
      }
    },
    [qParam, page, gender, isActiveParam, classId, showAll, registeredFrom, registeredTo],
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
    next.set("page", "1");
    setSearchParams(next);
  }

  function submitSearch(e) {
    e?.preventDefault?.();
    setFilter("q", qInput.trim());
  }

  function goToPage(nextPage) {
    const next = new URLSearchParams(searchParams);
    next.set("page", String(nextPage));
    setSearchParams(next);
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE) || 1);
  const hasFilters = Boolean(
    qParam || gender || isActiveParam != null || classId || registeredFrom || registeredTo,
  );

  function handleCreated() {
    // Admin-added students often have no enrollment yet, so switch to the full list to show them.
    if (showAll && page === 1) {
      load();
      return;
    }
    const next = new URLSearchParams(searchParams);
    next.set("scope", "all");
    next.set("page", "1");
    setSearchParams(next);
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        backTo="/admin"
        backLabel="میز مدیریت"
        title="شاگردان"
        description="همه کسانی که برای کلاس‌ها ثبت‌نام کرده‌اند، با کلاس و وضعیت ثبت‌نامشان. با نام، شماره تماس، کلاس یا بازه تاریخ عضویت فهرست را محدود کنید."
      />

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setCreateOpen((v) => !v)}
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
        >
          {createOpen ? "بستن فرم افزودن" : "+ افزودن شاگرد"}
        </button>
      </div>

      {createOpen ? (
        <AdminParticipantCreatePanel onCreated={handleCreated} onClose={() => setCreateOpen(false)} />
      ) : null}

      <form
        onSubmit={submitSearch}
        className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4"
      >
        <label className="text-sm">
          <span className="text-xs text-slate-500">نام یا شماره تماس</span>
          <input
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="نام یا تلفن…"
            className="mt-1 block w-56 rounded-xl border border-slate-200 px-3 py-2"
          />
        </label>
        <label className="text-sm">
          <span className="text-xs text-slate-500">کلاس</span>
          <select
            value={classId}
            onChange={(e) => setFilter("classId", e.target.value)}
            className="mt-1 block min-w-48 rounded-xl border border-slate-200 px-3 py-2"
          >
            <option value="">همه کلاس‌ها</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="text-xs text-slate-500">جنسیت</span>
          <select
            value={gender}
            onChange={(e) => setFilter("gender", e.target.value)}
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
          <span className="text-xs text-slate-500">وضعیت پرونده</span>
          <select
            value={isActiveParam ?? ""}
            onChange={(e) => setFilter("isActive", e.target.value)}
            className="mt-1 block rounded-xl border border-slate-200 px-3 py-2"
          >
            <option value="">همه</option>
            <option value="true">فعال</option>
            <option value="false">غیرفعال</option>
          </select>
        </label>
        <div className="text-sm">
          <span className="text-xs text-slate-500">عضویت از تاریخ</span>
          <div className="mt-1 w-40">
            <PersianDateField
              value={registeredFrom}
              placeholder="از…"
              onChange={(v) => setFilter("from", v)}
            />
          </div>
        </div>
        <div className="text-sm">
          <span className="text-xs text-slate-500">تا تاریخ</span>
          <div className="mt-1 w-40">
            <PersianDateField
              value={registeredTo}
              placeholder="تا…"
              onChange={(v) => setFilter("to", v)}
            />
          </div>
        </div>
        {registeredFrom || registeredTo ? (
          <button
            type="button"
            onClick={() => {
              const next = new URLSearchParams(searchParams);
              next.delete("from");
              next.delete("to");
              next.set("page", "1");
              setSearchParams(next);
            }}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            حذف فیلتر تاریخ
          </button>
        ) : null}
        <button type="submit" className="rounded-xl bg-cyan-700 px-4 py-2 text-sm text-white hover:bg-cyan-600">
          جستجو
        </button>
        <label className="mr-auto flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={showAll}
            onChange={(e) => setFilter("scope", e.target.checked ? "all" : "")}
          />
          نمایش پرونده‌های بدون ثبت‌نام هم
        </label>
      </form>

      {forbidden ? <ForbiddenState title="دسترسی مجاز نیست" message="فقط مدیر به فهرست شاگردان دسترسی دارد." /> : null}
      {!forbidden && status === "loading" ? <SectionLoader label="در حال آماده کردن فهرست شاگردان…" /> : null}
      {!forbidden && status === "error" ? (
        <ErrorState title="فهرست باز نشد" message={errorMessage} onRetry={() => load()} />
      ) : null}
      {!forbidden && status === "ready" && items.length === 0 ? (
        <EmptyState
          title={hasFilters ? "شاگردی با این فیلترها پیدا نشد." : "هنوز کسی برای کلاس‌ها ثبت‌نام نکرده است."}
        />
      ) : null}

      {!forbidden && status === "ready" && items.length > 0 ? (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            {Number(total).toLocaleString("fa-IR")} {showAll ? "پرونده" : "شاگرد ثبت‌نام‌شده"}
          </p>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="min-w-full text-right text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-3 py-2">نام</th>
                  <th className="px-3 py-2">تلفن</th>
                  <th className="px-3 py-2">جنسیت</th>
                  <th className="px-3 py-2">سن</th>
                  <th className="px-3 py-2">کلاس‌ها و وضعیت ثبت‌نام</th>
                  <th className="px-3 py-2">پرونده</th>
                  <th className="px-3 py-2">تاریخ عضویت</th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => {
                  const enrollments = Array.isArray(p.enrollments) ? p.enrollments : [];
                  return (
                    <tr key={p.id} className="border-t border-slate-100 align-top hover:bg-slate-50/60">
                      <td className="px-3 py-2">
                        <Link
                          to={`/admin/participants/${p.id}`}
                          className="font-medium text-cyan-800 hover:underline"
                        >
                          {`${p.firstName || ""} ${p.lastName || ""}`.trim() || p.id}
                        </Link>
                      </td>
                      <td className="px-3 py-2">
                        <div>{p.phone || p.owner?.phone || "—"}</div>
                        {p.owner?.phone && p.owner.phone !== p.phone ? (
                          <div className="text-xs text-slate-400">
                            حساب: {p.owner.phone}
                            {p.owner.firstName ? ` (${p.owner.firstName} ${p.owner.lastName || ""})` : ""}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-3 py-2">
                        {GENDER_RESTRICTION_LABELS[p.gender] || p.gender || "—"}
                      </td>
                      <td className="px-3 py-2">
                        {p.age != null ? Number(p.age).toLocaleString("fa-IR") : "—"}
                      </td>
                      <td className="px-3 py-2">
                        {enrollments.length ? (
                          <ul className="space-y-1.5">
                            {enrollments.map((e) => (
                              <li key={e.id} className="flex flex-wrap items-center gap-2">
                                <Link
                                  to={`/admin/enrollments/${e.id}`}
                                  className="text-slate-800 hover:text-cyan-800 hover:underline"
                                >
                                  {e.classTitle || "کلاس حذف‌شده"}
                                </Link>
                                <StatusPill tone={ENROLLMENT_TONES[e.status] || "neutral"}>
                                  {ENROLLMENT_STATUS_LABELS[e.status] || e.status}
                                </StatusPill>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-slate-400">بدون ثبت‌نام</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <StatusPill tone={p.isActive ? "success" : "neutral"}>
                          {p.isActive ? "فعال" : "غیرفعال"}
                        </StatusPill>
                      </td>
                      <td className="px-3 py-2 text-slate-500">
                        {formatDateFa(p.registeredAt || p.createdAt)}
                        {p.createdByAdmin ? (
                          <div className="text-xs text-slate-400">افزوده‌شده توسط مدیر</div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {totalPages > 1 ? (
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => goToPage(page - 1)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-40"
              >
                قبلی
              </button>
              <span>
                صفحه {Number(page).toLocaleString("fa-IR")} از {Number(totalPages).toLocaleString("fa-IR")}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => goToPage(page + 1)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-40"
              >
                بعدی
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
