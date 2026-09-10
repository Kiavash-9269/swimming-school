import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getMyInstructor, getMyInstructorClasses } from "../../features/instructor/instructorApi";
import {
  CLASS_STATUS_LABELS,
  CLASS_STATUS_OPTIONS,
  formatDateFa,
  formatDaysOfWeek,
  formatIrr,
  classStatusTone,
  userMessageFromInstructorError,
} from "../../features/instructor/instructorLabels";
import { StatusPill } from "../../features/courses/components/AdminCourseUi";
import { InstructorNotLinkedState } from "../../features/instructor/components/InstructorNotLinkedState";
import { EntityCard } from "../../features/ops/OpsUi";
import { SectionLoader } from "../../components/Ui/Loading";
import ErrorState from "../../components/Ui/ErrorState";
import EmptyState from "../../components/Ui/EmptyState";

/**
 * My Classes — ONLY GET /courses/instructors/me/classes
 */
export default function InstructorClassesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get("status") || "";
  const q = searchParams.get("q") || "";

  const [items, setItems] = useState([]);
  const [localQ, setLocalQ] = useState(q);
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [notLinked, setNotLinked] = useState(false);

  const load = useCallback(
    async (signal) => {
      setStatus("loading");
      setNotLinked(false);
      try {
        await getMyInstructor({ signal });
        const data = await getMyInstructorClasses({
          status: statusFilter || undefined,
          signal,
        });
        setItems(Array.isArray(data?.items) ? data.items : []);
        setStatus("ready");
      } catch (err) {
        if (err?.code === "ABORTED") return;
        if (err?.status === 404 || err?.code === "INSTRUCTOR_NOT_FOUND") {
          setNotLinked(true);
          setStatus("error");
          return;
        }
        setErrorMessage(userMessageFromInstructorError(err, "بارگذاری کلاس‌های من ناموفق بود."));
        setStatus("error");
      }
    },
    [statusFilter],
  );

  useEffect(() => {
    const ac = new AbortController();
    load(ac.signal);
    return () => ac.abort();
  }, [load]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((c) => String(c.title || "").toLowerCase().includes(needle));
  }, [items, q]);

  if (status === "loading") return <SectionLoader label="در حال بارگذاری کلاس‌های من…" />;
  if (notLinked) return <InstructorNotLinkedState />;
  if (status === "error") {
    return <ErrorState title="خطا" message={errorMessage} onRetry={() => load()} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to="/instructor" className="text-sm text-teal-800 hover:underline">
          ← داشبورد
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">کلاس‌های من</h1>
        <p className="mt-1 text-sm text-slate-600">
          فقط کلاس‌هایی که سرور با مالکیت مربی شما برمی‌گرداند — بدون فیلتر کاتالوگ عمومی.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <label className="text-sm">
          <span className="text-xs text-slate-500">وضعیت (سرور)</span>
          <select
            value={statusFilter}
            onChange={(e) => {
              const next = new URLSearchParams(searchParams);
              if (e.target.value) next.set("status", e.target.value);
              else next.delete("status");
              setSearchParams(next);
            }}
            className="mt-1 block rounded-xl border border-slate-200 px-3 py-2"
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
          <span className="text-xs text-slate-500">جستجوی محلی در نتایج</span>
          <input
            value={localQ}
            onChange={(e) => setLocalQ(e.target.value)}
            placeholder="عنوان کلاس…"
            className="mt-1 block w-56 rounded-xl border border-slate-200 px-3 py-2"
          />
        </label>
        <button
          type="button"
          onClick={() => {
            const next = new URLSearchParams(searchParams);
            if (localQ.trim()) next.set("q", localQ.trim());
            else next.delete("q");
            setSearchParams(next);
          }}
          className="rounded-xl bg-teal-800 px-4 py-2 text-sm text-white hover:bg-teal-700"
        >
          اعمال
        </button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="کلاسی برای نمایش وجود ندارد." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((c) => {
            const courseLabel = c.courseTitle || c.templateTitle || null;
            return (
              <EntityCard
                key={c.id}
                title={c.title}
                meta={
                  courseLabel
                    ? `دوره: ${courseLabel}`
                    : `${formatDaysOfWeek(c.daysOfWeek)} · ${c.startTime}–${c.endTime}`
                }
                status={
                  <StatusPill tone={classStatusTone(c.status)}>
                    {CLASS_STATUS_LABELS[c.status] || c.status}
                  </StatusPill>
                }
                actions={
                  <div className="flex flex-wrap gap-2">
                    <Link
                      to={`/instructor/classes/${c.id}`}
                      className="rounded-xl bg-teal-800 px-3 py-2 text-xs font-medium text-white hover:bg-teal-700"
                    >
                      فضای کلاس
                    </Link>
                    <Link
                      to={`/instructor/classes/${c.id}/attendance`}
                      className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50"
                    >
                      حضور و غیاب
                    </Link>
                  </div>
                }
              >
                <dl className="space-y-1 text-sm text-slate-600">
                  {courseLabel ? (
                    <div>
                      <dt className="inline text-xs text-slate-400">برنامه: </dt>
                      <dd className="inline">
                        {formatDaysOfWeek(c.daysOfWeek)} · {c.startTime}–{c.endTime}
                      </dd>
                    </div>
                  ) : null}
                  <div>
                    <dt className="inline text-xs text-slate-400">بازه: </dt>
                    <dd className="inline">
                      {formatDateFa(c.startDate)} – {formatDateFa(c.endDate)}
                    </dd>
                  </div>
                  <div>
                    <dt className="inline text-xs text-slate-400">ظرفیت: </dt>
                    <dd className="inline">
                      {Number(c.confirmedCount || 0).toLocaleString("fa-IR")} /{" "}
                      {Number(c.capacity || 0).toLocaleString("fa-IR")}
                      {c.availableSeats != null
                        ? ` (آزاد ${Number(c.availableSeats).toLocaleString("fa-IR")})`
                        : ""}
                    </dd>
                  </div>
                  <div>
                    <dt className="inline text-xs text-slate-400">قیمت: </dt>
                    <dd className="inline">{formatIrr(c.price)}</dd>
                  </div>
                </dl>
              </EntityCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
