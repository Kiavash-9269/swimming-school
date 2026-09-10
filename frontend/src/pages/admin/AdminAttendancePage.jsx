import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  getAdminAttendanceReport,
  exportAdminAttendanceReport,
  submitSessionAttendance,
  listClassAttendance,
} from "../../features/attendance/attendanceApi";
import {
  ATTENDANCE_STATUS_LABELS,
  ATTENDANCE_STATUS_OPTIONS,
  formatExpiryFa,
  userMessageFromAttendanceError,
} from "../../features/attendance/attendanceLabels";
import { getClassSessions, getCourseClasses, listInstructors } from "../../features/courses/coursesApi";
import { formatDateFa, GENDER_RESTRICTION_LABELS } from "../../features/courses/courseLabels";
import { getClassRoster } from "../../features/enrollments/enrollmentsApi";
import { AdminPageHeader } from "../../features/courses/components/AdminCourseUi";
import { AttendanceStatusChips, DetailSection, ActionBar } from "../../features/ops/OpsUi";
import { SectionLoader } from "../../components/Ui/Loading";
import ErrorState from "../../components/Ui/ErrorState";
import EmptyState from "../../components/Ui/EmptyState";
import PersianDateField from "../../components/Ui/PersianDateField";
import { useToast } from "../../components/feedback/useToast";

const OBJECT_ID_RE = /^[a-fA-F0-9]{24}$/;

const MARK_LABELS = {
  PRESENT: ATTENDANCE_STATUS_LABELS.PRESENT,
  ABSENT: ATTENDANCE_STATUS_LABELS.ABSENT,
  LATE: ATTENDANCE_STATUS_LABELS.LATE,
  EXCUSED: ATTENDANCE_STATUS_LABELS.EXCUSED,
};

const MARKABLE_STATUSES = Object.keys(MARK_LABELS);

function toLocalDayKey(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function MetricCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-2 text-xl font-bold text-slate-900">{value}</dd>
    </div>
  );
}

function Pagination({ pagination, page, setPage }) {
  if (!pagination) return null;
  const totalPages = pagination.totalPages || 0;
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => setPage((p) => Math.max(1, p - 1))}
        className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-40"
      >
        قبلی
      </button>
      <span>
        صفحه {Number(page).toLocaleString("fa-IR")}
        {totalPages ? ` از ${Number(totalPages).toLocaleString("fa-IR")}` : ""}
        {pagination.total != null
          ? ` · جمع ${Number(pagination.total).toLocaleString("fa-IR")}`
          : ""}
      </span>
      <button
        type="button"
        disabled={totalPages ? page >= totalPages : false}
        onClick={() => setPage((p) => p + 1)}
        className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-40"
      >
        بعدی
      </button>
    </div>
  );
}

/**
 * Primary ADMIN attendance workspace:
 * class (+ instructor) → session → student roster chips.
 * Report/export remains secondary.
 */
export default function AdminAttendancePage() {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [markClassId, setMarkClassId] = useState(searchParams.get("classId") || "");
  const [markSessionId, setMarkSessionId] = useState(searchParams.get("sessionId") || "");
  const [genderFilter, setGenderFilter] = useState(
    searchParams.get("gender") === "FEMALE" ? "FEMALE" : "MALE",
  );
  const [dayFilter, setDayFilter] = useState(searchParams.get("day") || toLocalDayKey(new Date()));
  const [dayClassRows, setDayClassRows] = useState([]);
  const [dayLoading, setDayLoading] = useState(false);
  const [classOptions, setClassOptions] = useState([]);
  const [instructorById, setInstructorById] = useState({});
  const [classesLoading, setClassesLoading] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [roster, setRoster] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [workspaceError, setWorkspaceError] = useState("");
  const [workspaceTick, setWorkspaceTick] = useState(0);
  const [draftByParticipant, setDraftByParticipant] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [showReport, setShowReport] = useState(false);
  const [fromDate, setFromDate] = useState(searchParams.get("fromDate") || "");
  const [toDate, setToDate] = useState(searchParams.get("toDate") || "");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "");
  const [page, setPage] = useState(Number(searchParams.get("page") || 1) || 1);
  const [filterTick, setFilterTick] = useState(0);
  const [report, setReport] = useState(null);
  const [reportStatus, setReportStatus] = useState("idle");
  const [reportError, setReportError] = useState("");
  const [exporting, setExporting] = useState(false);

  const selectedClass = useMemo(
    () =>
      dayClassRows.find((r) => r.courseClass.id === markClassId)?.courseClass ||
      classOptions.find((c) => c.id === markClassId) ||
      null,
    [dayClassRows, classOptions, markClassId],
  );
  const instructorName = selectedClass
    ? instructorById[selectedClass.instructorId] || "بدون مربی"
    : "";

  const statusByParticipant = useMemo(() => {
    const map = {};
    for (const row of attendance) {
      if (markSessionId && row.sessionId === markSessionId) {
        map[row.participantId] = row.status;
      }
    }
    return map;
  }, [attendance, markSessionId]);

  /** Draft overlay for the selected session day. */
  const draftStatus = useCallback(
    (participantId) => {
      if (Object.prototype.hasOwnProperty.call(draftByParticipant, participantId)) {
        return draftByParticipant[participantId];
      }
      return statusByParticipant[participantId] || "UNKNOWN";
    },
    [draftByParticipant, statusByParticipant],
  );

  const dirtyMarks = useMemo(() => {
    const marks = [];
    for (const r of roster) {
      const pid = r.participantId;
      const next = draftStatus(pid);
      if (!MARKABLE_STATUSES.includes(next)) continue;
      const saved = statusByParticipant[pid] || "UNKNOWN";
      if (next !== saved) marks.push({ participantId: pid, status: next });
    }
    return marks;
  }, [roster, draftStatus, statusByParticipant]);

  const draftAbsentCount = useMemo(() => {
    let n = 0;
    for (const r of roster) {
      if (draftStatus(r.participantId) === "ABSENT") n += 1;
    }
    return n;
  }, [roster, draftStatus]);

  const newAbsentCount = useMemo(() => {
    let n = 0;
    for (const m of dirtyMarks) {
      if (m.status !== "ABSENT") continue;
      if ((statusByParticipant[m.participantId] || "UNKNOWN") === "ABSENT") continue;
      n += 1;
    }
    return n;
  }, [dirtyMarks, statusByParticipant]);

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (markClassId) next.set("classId", markClassId);
    else next.delete("classId");
    if (markSessionId) next.set("sessionId", markSessionId);
    else next.delete("sessionId");
    if (genderFilter) next.set("gender", genderFilter);
    if (dayFilter) next.set("day", dayFilter);
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [markClassId, markSessionId, genderFilter, dayFilter, searchParams, setSearchParams]);

  useEffect(() => {
    const ac = new AbortController();
    setClassesLoading(true);
    Promise.all([
      getCourseClasses({ signal: ac.signal }),
      listInstructors({ activeOnly: false, signal: ac.signal }).catch(() => ({ items: [] })),
    ])
      .then(([classesData, instructorsData]) => {
        const list = Array.isArray(classesData?.items) ? classesData.items : [];
        setClassOptions(
          [...list].sort((a, b) => String(a.title || "").localeCompare(String(b.title || ""), "fa")),
        );
        const map = {};
        for (const i of instructorsData?.items || []) {
          if (i?.id) map[i.id] = i.name || "—";
        }
        setInstructorById(map);
      })
      .catch((err) => {
        if (err?.code === "ABORTED") return;
        setClassOptions([]);
      })
      .finally(() => setClassesLoading(false));
    return () => ac.abort();
  }, []);

  /** Classes of selected gender that have a session on selected day. */
  useEffect(() => {
    if (!dayFilter || !genderFilter || !classOptions.length) {
      setDayClassRows([]);
      return undefined;
    }
    const gendered = classOptions.filter((c) => (c.genderRestriction || "MALE") === genderFilter);
    if (!gendered.length) {
      setDayClassRows([]);
      return undefined;
    }
    const ac = new AbortController();
    setDayLoading(true);
    Promise.all(
      gendered.map(async (c) => {
        try {
          const sess = await getClassSessions(c.id, { signal: ac.signal });
          const list = Array.isArray(sess?.items) ? sess.items : Array.isArray(sess) ? sess : [];
          const session = list.find((s) => toLocalDayKey(s.date) === dayFilter) || null;
          return session ? { courseClass: c, session, sessions: list } : null;
        } catch (err) {
          if (err?.code === "ABORTED") return null;
          return null;
        }
      }),
    )
      .then((rows) => {
        if (ac.signal.aborted) return;
        const available = rows.filter(Boolean);
        setDayClassRows(available);
        setMarkClassId((prev) => {
          if (prev && available.some((r) => r.courseClass.id === prev)) return prev;
          return available[0]?.courseClass.id || "";
        });
      })
      .finally(() => {
        if (!ac.signal.aborted) setDayLoading(false);
      });
    return () => ac.abort();
  }, [classOptions, genderFilter, dayFilter]);

  useEffect(() => {
    const row = dayClassRows.find((r) => r.courseClass.id === markClassId);
    if (!row) {
      setSessions([]);
      setMarkSessionId("");
      return;
    }
    setSessions(row.sessions || []);
    setMarkSessionId(row.session?.id || "");
    setDraftByParticipant({});
    setSubmitError("");
  }, [dayClassRows, markClassId]);

  useEffect(() => {
    if (!markClassId || !OBJECT_ID_RE.test(markClassId)) {
      setRoster([]);
      setAttendance([]);
      setWorkspaceError("");
      return undefined;
    }
    const ac = new AbortController();
    setWorkspaceLoading(true);
    setWorkspaceError("");
    setDraftByParticipant({});
    setSubmitError("");

    Promise.all([
      getClassRoster(markClassId, { signal: ac.signal }),
      listClassAttendance(markClassId, { limit: 200 }, { signal: ac.signal }),
    ])
      .then(([ros, att]) => {
        setRoster(Array.isArray(ros?.items) ? ros.items : []);
        setAttendance(Array.isArray(att?.items) ? att.items : []);
      })
      .catch((err) => {
        if (err?.code === "ABORTED") return;
        setRoster([]);
        setAttendance([]);
        setWorkspaceError(userMessageFromAttendanceError(err, "بارگذاری فهرست کلاس ناموفق بود."));
      })
      .finally(() => setWorkspaceLoading(false));

    return () => ac.abort();
  }, [markClassId, workspaceTick]);

  const listParams = useMemo(() => {
    const p = { page, limit: 20 };
    if (fromDate) p.fromDate = fromDate;
    if (toDate) p.toDate = toDate;
    if (statusFilter) p.status = statusFilter;
    if (markClassId && OBJECT_ID_RE.test(markClassId)) p.classId = markClassId;
    if (markSessionId && OBJECT_ID_RE.test(markSessionId)) p.sessionId = markSessionId;
    return p;
  }, [page, fromDate, toDate, statusFilter, markClassId, markSessionId]);

  const loadReport = useCallback(
    async (signal) => {
      if (!showReport) return;
      if (fromDate && toDate && fromDate > toDate) {
        setReportStatus("error");
        setReportError("تاریخ پایان باید بعد از تاریخ شروع باشد.");
        return;
      }
      setReportStatus("loading");
      setReportError("");
      try {
        const data = await getAdminAttendanceReport(listParams, { signal });
        setReport(data);
        setReportStatus("ready");
      } catch (err) {
        if (err?.code === "ABORTED") return;
        setReportError(userMessageFromAttendanceError(err, "بارگذاری گزارش ناموفق بود."));
        setReportStatus("error");
      }
    },
    [listParams, fromDate, toDate, showReport],
  );

  useEffect(() => {
    if (!showReport) return undefined;
    const ac = new AbortController();
    loadReport(ac.signal);
    return () => ac.abort();
  }, [loadReport, filterTick, showReport]);

  async function handleSubmitSession() {
    if (!OBJECT_ID_RE.test(markClassId) || !OBJECT_ID_RE.test(markSessionId)) {
      toast.error("کلاس و جلسه را انتخاب کنید.");
      return;
    }
    if (!dirtyMarks.length) {
      toast.error("تغییری برای ثبت نیست. ابتدا وضعیت شاگردان را مشخص کنید.");
      return;
    }
    if (submitting) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const result = await submitSessionAttendance({
        classId: markClassId,
        sessionId: markSessionId,
        marks: dirtyMarks,
      });
      setAttendance((prev) => {
        const others = prev.filter((r) => r.sessionId !== markSessionId);
        const kept = prev.filter(
          (r) =>
            r.sessionId === markSessionId &&
            !result.items.some((i) => i.participantId === r.participantId),
        );
        return [...others, ...kept, ...result.items];
      });
      setDraftByParticipant({});
      const notified = Number(result.absentNotified || 0);
      if (notified > 0) {
        toast.success(
          `حضور ثبت شد. پیامک غیبت برای ${notified.toLocaleString("fa-IR")} نفر صف شد.`,
        );
      } else {
        toast.success("حضور این جلسه ثبت شد.");
      }
      if (showReport) setFilterTick((n) => n + 1);
    } catch (err) {
      const msg = userMessageFromAttendanceError(err);
      setSubmitError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  function setDraftStatus(participantId, status) {
    setDraftByParticipant((prev) => ({ ...prev, [participantId]: status }));
    setSubmitError("");
  }

  function markAllPresentDraft() {
    const next = {};
    for (const r of roster) next[r.participantId] = "PRESENT";
    setDraftByParticipant(next);
    setSubmitError("");
  }

  async function handleExport() {
    setExporting(true);
    try {
      const params = { ...listParams };
      delete params.page;
      delete params.limit;
      const { blob, filename } = await exportAdminAttendanceReport(params);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename || "attendance-report.xlsx";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("خروجی آماده شد.");
    } catch (err) {
      toast.error(userMessageFromAttendanceError(err, "خروجی ناموفق بود."));
    } finally {
      setExporting(false);
    }
  }

  function participantLabel(r) {
    return `${r.firstName || ""} ${r.lastName || ""}`.trim() || "بدون نام";
  }

  const selectedSession = sessions.find((s) => s.id === markSessionId);
  const summary = report?.summary;
  const items = report?.items || [];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        backTo="/admin"
        backLabel="← مرکز عملیات"
        title="حضور و غیاب"
        description="اول دوره مردانه یا زنانه را انتخاب کنید، بعد روز، بعد کلاس همان روز. با «ثبت» ذخیره و پیامک غایبین انجام می‌شود."
      />

      <section className="rounded-2xl border border-cyan-200/80 bg-gradient-to-b from-cyan-50/40 to-white p-5 shadow-sm">
        <h2 className="text-lg font-extrabold text-slate-900">ثبت حضور جلسه</h2>
        <p className="mt-1 text-sm text-slate-600">
          دوره‌ها فقط مردانه یا زنانه هستند. وضعیت‌ها پیش‌نویس‌اند تا دکمه ثبت زده شود.
        </p>

        <div className="mt-4">
        <ActionBar tone="primary">
          <div className="flex w-full flex-wrap gap-3">
            <div className="text-sm">
              <span className="text-xs font-semibold text-slate-500">۱ · نوع دوره</span>
              <div className="mt-1 flex gap-2">
                {[
                  { id: "MALE", label: "مردانه" },
                  { id: "FEMALE", label: "زنانه" },
                ].map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => {
                      setGenderFilter(g.id);
                      setMarkClassId("");
                      setMarkSessionId("");
                      setDraftByParticipant({});
                    }}
                    className={`rounded-xl px-4 py-2 text-sm font-bold ${
                      genderFilter === g.id
                        ? "bg-cyan-700 text-white"
                        : "border border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="min-w-[10rem] flex-1 text-sm sm:max-w-[14rem]">
              <span className="text-xs font-semibold text-slate-500">۲ · روز جلسه</span>
              <div className="mt-1">
                <PersianDateField
                  value={dayFilter}
                  onChange={(v) => {
                    setDayFilter(v);
                    setMarkClassId("");
                    setMarkSessionId("");
                    setDraftByParticipant({});
                  }}
                  placeholder="روز"
                />
              </div>
            </label>

            <label className="block min-w-[16rem] flex-1 text-sm">
              <span className="text-xs font-semibold text-slate-500">۳ · کلاس همان روز</span>
              {classesLoading || dayLoading ? (
                <p className="mt-2 text-xs text-slate-400">در حال یافتن کلاس‌های این روز…</p>
              ) : (
                <select
                  value={markClassId}
                  onChange={(e) => {
                    setMarkClassId(e.target.value);
                    setDraftByParticipant({});
                    setSubmitError("");
                  }}
                  className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5"
                >
                  <option value="">
                    {dayClassRows.length ? "انتخاب کلاس" : "کلاسی در این روز نیست"}
                  </option>
                  {dayClassRows.map(({ courseClass: c, session }) => {
                    const name = instructorById[c.instructorId];
                    return (
                      <option key={c.id} value={c.id}>
                        {c.title}
                        {name ? ` · مربی: ${name}` : ""}
                        {session?.startTime ? ` · ${session.startTime}` : ""}
                      </option>
                    );
                  })}
                </select>
              )}
            </label>
          </div>
        </ActionBar>
        </div>

        {selectedClass ? (
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <span className="rounded-xl bg-white px-3 py-1.5 border border-slate-200 text-slate-800">
              نوع:{" "}
              <strong>
                {GENDER_RESTRICTION_LABELS[selectedClass.genderRestriction] ||
                  GENDER_RESTRICTION_LABELS[genderFilter]}
              </strong>
            </span>
            <span className="rounded-xl bg-white px-3 py-1.5 border border-slate-200 text-slate-800">
              کلاس: <strong>{selectedClass.title}</strong>
            </span>
            <span className="rounded-xl bg-white px-3 py-1.5 border border-slate-200 text-slate-800">
              مربی: <strong>{instructorName}</strong>
            </span>
            {selectedSession ? (
              <span className="rounded-xl bg-white px-3 py-1.5 border border-slate-200 text-slate-800">
                جلسه {Number(selectedSession.sessionNumber || 0).toLocaleString("fa-IR")} ·{" "}
                {formatDateFa(selectedSession.date)} · {selectedSession.startTime}–{selectedSession.endTime}
              </span>
            ) : null}
            <Link
              to={`/admin/classes/${selectedClass.id}`}
              className="rounded-xl border border-cyan-200 px-3 py-1.5 text-cyan-800 hover:bg-cyan-50"
            >
              جزئیات کلاس
            </Link>
          </div>
        ) : null}

        {!genderFilter ? (
          <div className="mt-6">
            <EmptyState title="نوع دوره (مردانه / زنانه) را انتخاب کنید." />
          </div>
        ) : !dayFilter ? (
          <div className="mt-6">
            <EmptyState title="روز جلسه را انتخاب کنید." />
          </div>
        ) : dayLoading || classesLoading ? (
          <div className="mt-6">
            <SectionLoader label="در حال یافتن کلاس‌های این روز…" />
          </div>
        ) : !markClassId || dayClassRows.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              title="کلاسی برای این روز و نوع دوره نیست"
              description="روز یا نوع دوره را عوض کنید، یا برای کلاس‌ها جلسه تولید کنید."
            />
          </div>
        ) : workspaceLoading ? (
          <div className="mt-6">
            <SectionLoader label="در حال آماده‌سازی فهرست شاگردان…" />
          </div>
        ) : workspaceError ? (
          <div className="mt-6">
            <ErrorState title="خطا" message={workspaceError} onRetry={() => setWorkspaceTick((n) => n + 1)} />
          </div>
        ) : !markSessionId ? (
          <div className="mt-6">
            <EmptyState title="جلسه‌ای برای این روز ثبت نشده است." />
          </div>
        ) : roster.length === 0 ? (
          <div className="mt-6">
            <EmptyState title="شاگردی در فهرست این کلاس نیست" description="فقط ثبت‌نام‌های فعال هم‌جنس با دوره در فهرست می‌آیند." />
          </div>
        ) : (
          <DetailSection
            className="mt-6"
            title="۳ · شاگردان این جلسه"
            hint={`${Number(roster.length).toLocaleString("fa-IR")} نفر · وضعیت را انتخاب کنید · ذخیره فقط با دکمه ثبت`}
          >
            <div className="mb-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={submitting}
                onClick={markAllPresentDraft}
                className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-900 disabled:opacity-50"
              >
                همه حاضر
              </button>
              <button
                type="button"
                disabled={submitting || !Object.keys(draftByParticipant).length}
                onClick={() => setDraftByParticipant({})}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 disabled:opacity-50"
              >
                بازگردانی پیش‌نویس
              </button>
            </div>
            <ul className="divide-y divide-slate-100">
              {roster.map((r) => {
                const pid = r.participantId;
                const current = draftStatus(pid);
                const saved = statusByParticipant[pid] || "UNKNOWN";
                const dirty = current !== saved;
                return (
                  <li
                    key={pid}
                    className={`flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between ${
                      dirty ? "rounded-xl bg-amber-50/70 px-2" : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900">{participantLabel(r)}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {dirty
                          ? `پیش‌نویس: ${ATTENDANCE_STATUS_LABELS[current] || current} (ذخیره نشده)`
                          : `ذخیره‌شده: ${ATTENDANCE_STATUS_LABELS[current] || current}`}
                      </p>
                    </div>
                    <AttendanceStatusChips
                      value={current}
                      disabled={submitting || !markSessionId}
                      labels={MARK_LABELS}
                      onSelect={(s) => setDraftStatus(pid, s)}
                    />
                  </li>
                );
              })}
            </ul>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-slate-600">
                  <p>
                    تغییرات آماده‌ثبت:{" "}
                    <strong>{Number(dirtyMarks.length).toLocaleString("fa-IR")}</strong>
                    {" · "}
                    غایب در پیش‌نویس:{" "}
                    <strong>{Number(draftAbsentCount).toLocaleString("fa-IR")}</strong>
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    با ثبت، برای{" "}
                    <strong>{Number(newAbsentCount).toLocaleString("fa-IR")}</strong> غایب جدید پیامک صف
                    می‌شود.
                  </p>
                  {submitError ? <p className="mt-2 text-xs text-rose-700">{submitError}</p> : null}
                </div>
                <button
                  type="button"
                  disabled={submitting || dirtyMarks.length === 0}
                  onClick={handleSubmitSession}
                  className="rounded-xl bg-cyan-700 px-6 py-3 text-sm font-bold text-white hover:bg-cyan-600 disabled:opacity-50"
                >
                  {submitting ? "در حال ثبت…" : "ثبت"}
                </button>
              </div>
            </div>
          </DetailSection>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-slate-900">گزارش و خروجی</h2>
            <p className="mt-1 text-xs text-slate-500">اختیاری — برای مرور تاریخچه و اکسل.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowReport((v) => !v)}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            {showReport ? "بستن گزارش" : "نمایش گزارش"}
          </button>
        </div>

        {showReport ? (
          <div className="mt-4 space-y-4">
            <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
              <label className="min-w-[10rem] flex-1 text-sm sm:max-w-[14rem]">
                <span className="text-xs text-slate-500">از تاریخ</span>
                <div className="mt-1">
                  <PersianDateField value={fromDate} onChange={setFromDate} placeholder="از تاریخ" />
                </div>
              </label>
              <label className="min-w-[10rem] flex-1 text-sm sm:max-w-[14rem]">
                <span className="text-xs text-slate-500">تا تاریخ</span>
                <div className="mt-1">
                  <PersianDateField value={toDate} onChange={setToDate} placeholder="تا تاریخ" />
                </div>
              </label>
              <label className="text-sm">
                <span className="text-xs text-slate-500">وضعیت</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="mt-1 block rounded-xl border border-slate-200 px-3 py-2"
                >
                  <option value="">همه</option>
                  {ATTENDANCE_STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {ATTENDANCE_STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() => {
                  setPage(1);
                  setFilterTick((n) => n + 1);
                }}
                className="rounded-xl bg-cyan-700 px-4 py-2 text-sm text-white hover:bg-cyan-600"
              >
                اعمال فیلتر
              </button>
              <button
                type="button"
                disabled={exporting}
                onClick={handleExport}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-700 disabled:opacity-50"
              >
                {exporting ? "در حال خروجی…" : "خروجی اکسل"}
              </button>
            </div>

            {reportStatus === "loading" ? <SectionLoader label="در حال بارگذاری گزارش…" /> : null}
            {reportStatus === "error" ? (
              <ErrorState title="خطا" message={reportError} onRetry={() => loadReport()} />
            ) : null}
            {reportStatus === "ready" ? (
              <div className="space-y-4">
                {summary ? (
                  <dl className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
                    {ATTENDANCE_STATUS_OPTIONS.map((s) => (
                      <MetricCard
                        key={s}
                        label={ATTENDANCE_STATUS_LABELS[s]}
                        value={Number(summary[s] || 0).toLocaleString("fa-IR")}
                      />
                    ))}
                  </dl>
                ) : null}
                {!items.length ? (
                  <EmptyState title="رکوردی برای نمایش وجود ندارد." />
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="min-w-full text-right text-sm">
                      <thead className="bg-slate-50 text-xs text-slate-500">
                        <tr>
                          <th className="px-3 py-2">شرکت‌کننده</th>
                          <th className="px-3 py-2">وضعیت</th>
                          <th className="px-3 py-2">کلاس</th>
                          <th className="px-3 py-2">جلسه</th>
                          <th className="px-3 py-2">ثبت</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((row) => (
                          <tr key={row.id} className="border-t border-slate-100">
                            <td className="px-3 py-2">
                              {row.participantName || (
                                <span className="font-mono text-xs">{row.participantId}</span>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              {ATTENDANCE_STATUS_LABELS[row.status] || row.status}
                            </td>
                            <td className="px-3 py-2 font-mono text-xs">{row.classId}</td>
                            <td className="px-3 py-2 font-mono text-xs">{row.sessionId}</td>
                            <td className="px-3 py-2">{formatExpiryFa(row.markedAt || row.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <Pagination
                  pagination={report?.pagination}
                  page={page}
                  setPage={(updater) => {
                    setPage((p) => (typeof updater === "function" ? updater(p) : updater));
                    setFilterTick((n) => n + 1);
                  }}
                />
              </div>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}
