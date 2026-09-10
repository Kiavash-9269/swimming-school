import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  getMyInstructor,
  getMyInstructorClasses,
  getClassSessions,
} from "../../features/instructor/instructorApi";
import {
  CLASS_STATUS_LABELS,
  formatDateFa,
  classStatusTone,
  classifySessionTiming,
  userMessageFromInstructorError,
} from "../../features/instructor/instructorLabels";
import { StatusPill } from "../../features/courses/components/AdminCourseUi";
import { InstructorNotLinkedState } from "../../features/instructor/components/InstructorNotLinkedState";
import { MetricTile, EntityCard, DetailSection, ActionBar } from "../../features/ops/OpsUi";
import { SectionLoader } from "../../components/Ui/Loading";
import ErrorState from "../../components/Ui/ErrorState";
import EmptyState from "../../components/Ui/EmptyState";

const SESSION_PREVIEW_LIMIT = 8;

/**
 * Instructor dashboard — driven by /instructors/me + /instructors/me/classes only.
 * Session preview loads per-class with Promise.allSettled (no fake KPIs).
 */
export default function InstructorHomePage() {
  const [instructor, setInstructor] = useState(null);
  const [classes, setClasses] = useState([]);
  const [sessionPreview, setSessionPreview] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [notLinked, setNotLinked] = useState(false);

  const load = useCallback(async (signal) => {
    setStatus("loading");
    setNotLinked(false);
    setErrorMessage("");
    try {
      const me = await getMyInstructor({ signal });
      setInstructor(me);
      const cls = await getMyInstructorClasses({ signal });
      const items = Array.isArray(cls?.items) ? cls.items : [];
      setClasses(items);
      setStatus("ready");

      if (!items.length) {
        setSessionPreview([]);
        return;
      }

      setSessionsLoading(true);
      const settled = await Promise.allSettled(
        items.slice(0, 6).map(async (c) => {
          const sess = await getClassSessions(c.id, { signal });
          const list = Array.isArray(sess?.items) ? sess.items : Array.isArray(sess) ? sess : [];
          return list.map((s) => ({ ...s, classId: c.id, classTitle: c.title }));
        }),
      );
      if (signal?.aborted) return;
      const flat = settled
        .filter((r) => r.status === "fulfilled")
        .flatMap((r) => r.value)
        .sort((a, b) => new Date(a.date) - new Date(b.date));
      setSessionPreview(flat);
    } catch (err) {
      if (err?.code === "ABORTED") return;
      if (err?.status === 404 || err?.code === "INSTRUCTOR_NOT_FOUND") {
        setNotLinked(true);
        setStatus("error");
        return;
      }
      setErrorMessage(userMessageFromInstructorError(err, "بارگذاری داشبورد مربی ناموفق بود."));
      setStatus("error");
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    load(ac.signal);
    return () => ac.abort();
  }, [load]);

  const byStatus = useMemo(() => {
    const map = {};
    for (const c of classes) {
      map[c.status] = (map[c.status] || 0) + 1;
    }
    return map;
  }, [classes]);

  const todaySessions = useMemo(
    () => sessionPreview.filter((s) => classifySessionTiming(s) === "today"),
    [sessionPreview],
  );
  const upcomingAll = useMemo(
    () => sessionPreview.filter((s) => classifySessionTiming(s) === "upcoming"),
    [sessionPreview],
  );
  const upcomingSessions = useMemo(
    () => upcomingAll.slice(0, SESSION_PREVIEW_LIMIT),
    [upcomingAll],
  );

  if (status === "loading") return <SectionLoader label="در حال بارگذاری فضای مربی…" />;
  if (notLinked) return <InstructorNotLinkedState />;
  if (status === "error") {
    return <ErrorState title="خطا" message={errorMessage} onRetry={() => load()} />;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs text-slate-500">سلام مربی</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">{instructor?.name || "—"}</h1>
            <p className="mt-2 text-sm text-slate-600">
              {instructor?.phone ? `تلفن: ${instructor.phone}` : "تلفن ثبت نشده"}
              {instructor?.isActive === false ? " · غیرفعال" : ""}
            </p>
            {instructor?.bio ? (
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">{instructor.bio}</p>
            ) : null}
          </div>
          <StatusPill tone={instructor?.isActive ? "success" : "neutral"}>
            {instructor?.isActive ? "فعال" : "غیرفعال"}
          </StatusPill>
        </div>
      </section>

      <DetailSection
        title="الان چه کار کنم؟"
        hint="میان‌برهای عملیاتی برای کلاس‌ها و ثبت حضور — بدون ابزار مدیریت چرخهٔ عمر"
      >
        <ActionBar tone="teacher">
          <Link
            to="/instructor/classes"
            className="rounded-xl bg-teal-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-700"
          >
            کلاس‌های من
          </Link>
          {classes[0] ? (
            <Link
              to={`/instructor/classes/${classes[0].id}/attendance`}
              className="rounded-xl border border-teal-700 bg-white px-4 py-2.5 text-sm font-medium text-teal-800 hover:bg-teal-50"
            >
              حضور سریع (اولین کلاس)
            </Link>
          ) : null}
          {todaySessions[0] ? (
            <Link
              to={`/instructor/classes/${todaySessions[0].classId}/attendance?sessionId=${todaySessions[0].id}`}
              className="rounded-xl border border-teal-700 bg-white px-4 py-2.5 text-sm font-medium text-teal-800 hover:bg-teal-50"
            >
              حضور جلسهٔ امروز
            </Link>
          ) : null}
        </ActionBar>
      </DetailSection>

      <section>
        <h2 className="mb-3 text-sm font-bold text-slate-700">خلاصه از دادهٔ بارگذاری‌شده</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <MetricTile
            label="تعداد کلاس‌های من"
            value={Number(classes.length).toLocaleString("fa-IR")}
            hint="از دادهٔ بارگذاری‌شده"
            to="/instructor/classes"
          />
          <MetricTile
            label="جلسات امروز"
            value={sessionsLoading ? "…" : Number(todaySessions.length).toLocaleString("fa-IR")}
            hint="از دادهٔ بارگذاری‌شده"
          />
          <MetricTile
            label="جلسات پیش‌رو"
            value={sessionsLoading ? "…" : Number(upcomingAll.length).toLocaleString("fa-IR")}
            hint="از دادهٔ بارگذاری‌شده"
          />
        </div>
      </section>

      <DetailSection
        title="وضعیت کلاس‌ها"
        hint={`${Number(classes.length).toLocaleString("fa-IR")} کلاس از سرور · بدون KPI تحلیلی`}
      >
        {classes.length === 0 ? (
          <EmptyState title="کلاسی به شما تخصیص داده نشده." />
        ) : (
          <ul className="flex flex-wrap gap-2">
            {Object.entries(byStatus).map(([st, count]) => (
              <li key={st}>
                <StatusPill tone={classStatusTone(st)}>
                  {CLASS_STATUS_LABELS[st] || st}: {Number(count).toLocaleString("fa-IR")}
                </StatusPill>
              </li>
            ))}
          </ul>
        )}
      </DetailSection>

      <DetailSection title="جلسات امروز" hint="ثبت حضور برای جلسات امروز از پیش‌نمایش بارگذاری‌شده">
        {sessionsLoading ? <SectionLoader label="در حال بارگذاری جلسات…" /> : null}
        {!sessionsLoading && todaySessions.length === 0 ? (
          <EmptyState title="جلسه‌ای برای امروز در کلاس‌های بارگذاری‌شده نیست." />
        ) : null}
        {!sessionsLoading && todaySessions.length > 0 ? (
          <div className="space-y-3">
            {todaySessions.map((s) => (
              <EntityCard
                key={`${s.classId}-${s.id}`}
                title={s.classTitle}
                meta={`جلسه ${Number(s.sessionNumber).toLocaleString("fa-IR")} · ${s.startTime}–${s.endTime}`}
                actions={
                  <Link
                    to={`/instructor/classes/${s.classId}/attendance?sessionId=${s.id}`}
                    className="rounded-lg bg-teal-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700"
                  >
                    حضور
                  </Link>
                }
              />
            ))}
          </div>
        ) : null}
      </DetailSection>

      <DetailSection title="جلسات پیش‌رو" hint="پیش‌نمایش جلسات آینده از همان دادهٔ بارگذاری‌شده">
        {!sessionsLoading && upcomingSessions.length === 0 ? (
          <EmptyState title="جلسه پیش‌رویی در پیش‌نمایش نیست." />
        ) : null}
        {!sessionsLoading && upcomingSessions.length > 0 ? (
          <div className="space-y-3">
            {upcomingSessions.map((s) => (
              <EntityCard
                key={`${s.classId}-${s.id}`}
                title={s.classTitle}
                meta={`${formatDateFa(s.date)} · جلسه ${Number(s.sessionNumber).toLocaleString("fa-IR")}`}
                actions={
                  <Link
                    to={`/instructor/classes/${s.classId}`}
                    className="text-xs font-medium text-teal-800 hover:underline"
                  >
                    جزئیات کلاس
                  </Link>
                }
              />
            ))}
          </div>
        ) : null}
      </DetailSection>
    </div>
  );
}
