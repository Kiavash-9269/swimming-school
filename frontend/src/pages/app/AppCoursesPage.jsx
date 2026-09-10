import { useCallback, useEffect, useMemo, useState } from "react";
import { getCourseClasses } from "../../features/courses/coursesApi";
import ClassCard from "../../features/courses/components/ClassCard";
import { CLASS_STATUS_LABELS, userMessageFromApiError } from "../../features/courses/courseLabels";
import { SectionLoader } from "../../components/Ui/Loading";
import ErrorState from "../../components/Ui/ErrorState";
import EmptyState from "../../components/Ui/EmptyState";

/** Statuses visible in the school catalog (not draft/cancelled/archived). */
const CATALOG_STATUSES = ["REGISTRATION_OPEN", "PUBLISHED", "REGISTRATION_CLOSED", "IN_PROGRESS"];

/**
 * Product course discovery — live classes for members ("کلاس‌های مجموعه").
 */
export default function AppCoursesPage() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [tab, setTab] = useState("all");

  const load = useCallback(async (signal) => {
    setStatus("loading");
    setErrorMessage("");
    try {
      const settled = await Promise.allSettled(
        CATALOG_STATUSES.map((st) => getCourseClasses({ status: st, signal })),
      );
      if (signal?.aborted) return;
      const map = new Map();
      for (const result of settled) {
        if (result.status !== "fulfilled") continue;
        const list = Array.isArray(result.value?.items) ? result.value.items : [];
        for (const row of list) {
          if (row?.id) map.set(row.id, row);
        }
      }
      const failedAll = settled.every((r) => r.status === "rejected");
      if (failedAll) {
        const err = settled.find((r) => r.status === "rejected")?.reason;
        throw err || new Error("load failed");
      }
      setItems([...map.values()].sort((a, b) => String(a.title || "").localeCompare(String(b.title || ""), "fa")));
      setStatus("ready");
    } catch (err) {
      if (err?.code === "ABORTED") return;
      setErrorMessage(userMessageFromApiError(err, "بارگذاری کلاس‌ها ناموفق بود."));
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    load(ac.signal);
    return () => ac.abort();
  }, [load]);

  const filtered = useMemo(() => {
    if (tab === "open") return items.filter((c) => c.status === "REGISTRATION_OPEN");
    if (tab === "running") return items.filter((c) => c.status === "IN_PROGRESS");
    return items;
  }, [items, tab]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">کلاس‌های مجموعه</h1>
        <p className="mt-2 text-sm text-slate-600">
          کلاس‌های فعال مدرسه. برای ثبت‌نام فقط کلاس‌هایی با وضعیت «ثبت‌نام باز» دکمه ثبت‌نام دارند.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {[
          { id: "all", label: "همه" },
          { id: "open", label: "ثبت‌نام باز" },
          { id: "running", label: "در حال برگزاری" },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-xl px-3 py-1.5 text-sm ${
              tab === t.id ? "bg-cyan-700 font-bold text-white" : "border border-slate-200 bg-white text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
        <span className="self-center text-xs text-slate-400">
          {Number(filtered.length).toLocaleString("fa-IR")} کلاس
        </span>
      </div>

      {status === "loading" ? <SectionLoader label="در حال دریافت کلاس‌های مجموعه…" /> : null}

      {status === "error" ? (
        <ErrorState title="خطا در دریافت کلاس‌ها" message={errorMessage} onRetry={() => load()} />
      ) : null}

      {status === "ready" && filtered.length === 0 ? (
        <EmptyState
          title="کلاسی برای نمایش نیست"
          description={
            tab === "open"
              ? "هنوز کلاسی با ثبت‌نام باز وجود ندارد. ادمین باید برای کلاس «باز کردن ثبت‌نام» را بزند."
              : "کلاس‌های منتشر/فعال هنوز در سیستم ثبت نشده‌اند."
          }
        />
      ) : null}

      {status === "ready" && filtered.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <ClassCard key={c.id} courseClass={c} />
          ))}
        </div>
      ) : null}

      {status === "ready" && items.length > 0 ? (
        <p className="text-xs text-slate-400">
          وضعیت‌های نمایش‌داده‌شده:{" "}
          {CATALOG_STATUSES.map((s) => CLASS_STATUS_LABELS[s] || s).join("، ")}.
        </p>
      ) : null}
    </div>
  );
}
