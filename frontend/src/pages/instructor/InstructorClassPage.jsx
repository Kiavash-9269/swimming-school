import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  getCourseClassById,
  getClassCapacity,
  getClassSchedule,
  getClassSessions,
  getClassRoster,
  listClassAttendance,
} from "../../features/instructor/instructorApi";
import {
  CLASS_STATUS_LABELS,
  SESSION_STATUS_LABELS,
  ENROLLMENT_STATUS_LABELS,
  GENDER_LABELS,
  formatDateFa,
  formatDaysOfWeek,
  formatIrr,
  formatExpiryFa,
  classStatusTone,
  classifySessionTiming,
  ATTENDANCE_STATUS_LABELS,
  userMessageFromInstructorError,
} from "../../features/instructor/instructorLabels";
import { StatusPill } from "../../features/courses/components/AdminCourseUi";
import { OpsTabs, DetailSection } from "../../features/ops/OpsUi";
import { SectionLoader } from "../../components/Ui/Loading";
import ErrorState from "../../components/Ui/ErrorState";
import EmptyState from "../../components/Ui/EmptyState";
import ForbiddenState from "../../components/Ui/ForbiddenState";

const TABS = [
  { id: "overview", label: "نمای کلی" },
  { id: "sessions", label: "جلسات" },
  { id: "participants", label: "شرکت‌کنندگان" },
  { id: "attendance", label: "حضور" },
];

/**
 * Class operational workspace for owning instructor.
 */
export default function InstructorClassPage() {
  const { classId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "overview";

  const [courseClass, setCourseClass] = useState(null);
  const [capacity, setCapacity] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [roster, setRoster] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [rosterQ, setRosterQ] = useState("");
  const [status, setStatus] = useState("loading");
  const [forbidden, setForbidden] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const setTab = (id) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", id);
    setSearchParams(next);
  };

  const load = useCallback(
    async (signal) => {
      setStatus("loading");
      setForbidden(false);
      setErrorMessage("");
      try {
        const [cls, cap, sched, sess] = await Promise.all([
          getCourseClassById(classId, { signal }),
          getClassCapacity(classId, { signal }).catch(() => null),
          getClassSchedule(classId, { signal }).catch(() => null),
          getClassSessions(classId, { signal }),
        ]);
        setCourseClass(cls);
        setCapacity(cap);
        setSchedule(sched);
        setSessions(Array.isArray(sess?.items) ? sess.items : Array.isArray(sess) ? sess : []);

        try {
          const [ros, att] = await Promise.all([
            getClassRoster(classId, { signal }),
            listClassAttendance(classId, { limit: 200 }, { signal }),
          ]);
          setRoster(Array.isArray(ros?.items) ? ros.items : []);
          setAttendance(Array.isArray(att?.items) ? att.items : []);
        } catch (err) {
          if (err?.code === "ABORTED") return;
          if (err?.status === 403 || err?.code === "FORBIDDEN") {
            setForbidden(true);
            setRoster([]);
            setAttendance([]);
          } else {
            throw err;
          }
        }
        setStatus("ready");
      } catch (err) {
        if (err?.code === "ABORTED") return;
        if (err?.status === 404 || err?.code === "CLASS_NOT_FOUND") {
          setErrorMessage("کلاس یافت نشد.");
        } else {
          setErrorMessage(userMessageFromInstructorError(err, "بارگذاری کلاس ناموفق بود."));
        }
        setStatus("error");
      }
    },
    [classId],
  );

  useEffect(() => {
    const ac = new AbortController();
    load(ac.signal);
    return () => ac.abort();
  }, [load]);

  const filteredRoster = useMemo(() => {
    const needle = rosterQ.trim().toLowerCase();
    if (!needle) return roster;
    return roster.filter((r) =>
      `${r.firstName || ""} ${r.lastName || ""}`.toLowerCase().includes(needle),
    );
  }, [roster, rosterQ]);

  const sessionsByTiming = useMemo(() => {
    const today = [];
    const upcoming = [];
    const past = [];
    for (const s of sessions) {
      const t = classifySessionTiming(s);
      if (t === "today") today.push(s);
      else if (t === "upcoming") upcoming.push(s);
      else past.push(s);
    }
    return { today, upcoming, past };
  }, [sessions]);

  if (status === "loading") return <SectionLoader label="در حال بارگذاری فضای کلاس…" />;
  if (status === "error") {
    return <ErrorState title="خطا" message={errorMessage} onRetry={() => load()} />;
  }
  if (!courseClass) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/instructor/classes" className="text-sm text-teal-800 hover:underline">
            ← کلاس‌های من
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">{courseClass.title}</h1>
          <div className="mt-2">
            <StatusPill tone={classStatusTone(courseClass.status)}>
              {CLASS_STATUS_LABELS[courseClass.status] || courseClass.status}
            </StatusPill>
          </div>
        </div>
        <Link
          to={`/instructor/classes/${classId}/attendance`}
          className="rounded-xl bg-teal-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-700"
        >
          حضور و غیاب جلسه
        </Link>
      </div>

      <p className="rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3 text-sm text-amber-950">
        مربی نمی‌تواند انتشار/لغو/بایگانی/تولید جلسات انجام دهد. این اقدامات فقط در پنل ادمین است.
      </p>

      {forbidden ? (
        <ForbiddenState
          title="مالکیت کلاس تأیید نشد"
          message="سرور اجازهٔ فهرست شرکت‌کنندگان / حضور این کلاس را نداد."
          homeTo="/instructor/classes"
        />
      ) : null}

      <OpsTabs tabs={TABS} activeId={tab} onChange={setTab} />

      {tab === "overview" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <DetailSection title="هویت کلاس">
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-xs text-slate-500">قیمت</dt>
                <dd>{formatIrr(courseClass.price)}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">بازه</dt>
                <dd>
                  {formatDateFa(courseClass.startDate)} – {formatDateFa(courseClass.endDate)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">روز / ساعت</dt>
                <dd>
                  {formatDaysOfWeek(courseClass.daysOfWeek)} · {courseClass.startTime}–{courseClass.endTime}
                </dd>
              </div>
              {schedule ? (
                <div>
                  <dt className="text-xs text-slate-500">منطقه زمانی</dt>
                  <dd>{schedule.timezone || "—"}</dd>
                </div>
              ) : null}
            </dl>
          </DetailSection>
          <DetailSection title="ظرفیت (سرور)">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-slate-500">ظرفیت</dt>
                <dd className="text-lg font-bold">
                  {Number(capacity?.capacity ?? courseClass.capacity ?? 0).toLocaleString("fa-IR")}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">تأییدشده</dt>
                <dd className="text-lg font-bold">
                  {Number(capacity?.confirmed ?? courseClass.confirmedCount ?? 0).toLocaleString("fa-IR")}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">آزاد</dt>
                <dd>{Number(capacity?.available ?? courseClass.availableSeats ?? 0).toLocaleString("fa-IR")}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">رزرو موقت</dt>
                <dd>{Number(capacity?.held ?? courseClass.heldCount ?? 0).toLocaleString("fa-IR")}</dd>
              </div>
            </dl>
            {!forbidden ? (
              <p className="mt-3 text-xs text-slate-500">
                تعداد ردیف فهرست شرکت‌کنندگان: {Number(roster.length).toLocaleString("fa-IR")}
              </p>
            ) : null}
          </DetailSection>
        </div>
      ) : null}

      {tab === "sessions" ? (
        <div className="space-y-4">
          {[
            { key: "today", title: "امروز", list: sessionsByTiming.today },
            { key: "upcoming", title: "پیش‌رو", list: sessionsByTiming.upcoming },
            { key: "past", title: "گذشته", list: sessionsByTiming.past },
          ].map((group) => (
            <DetailSection key={group.key} title={group.title}>
              {group.list.length === 0 ? (
                <EmptyState title={`جلسه‌ای در دسته «${group.title}» نیست.`} />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {group.list.map((s) => (
                    <li
                      key={s.id}
                      className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm first:pt-0 last:pb-0"
                    >
                      <div>
                        <p className="font-medium">
                          جلسه {Number(s.sessionNumber).toLocaleString("fa-IR")} · {formatDateFa(s.date)}
                        </p>
                        <p className="text-slate-500">
                          {s.startTime}–{s.endTime} · {SESSION_STATUS_LABELS[s.status] || s.status}
                        </p>
                      </div>
                      <Link
                        to={`/instructor/classes/${classId}/attendance?sessionId=${s.id}`}
                        className="rounded-lg bg-teal-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700"
                      >
                        حضور این جلسه
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </DetailSection>
          ))}
        </div>
      ) : null}

      {tab === "participants" ? (
        <DetailSection title="شرکت‌کنندگان" hint="فهرست شرکت‌کنندگان از سرور (محدود به مالکیت مربی)">
          {forbidden ? null : (
            <>
              <label className="block text-sm">
                <span className="text-xs text-slate-500">جستجوی محلی نام</span>
                <input
                  value={rosterQ}
                  onChange={(e) => setRosterQ(e.target.value)}
                  className="mt-1 block w-full max-w-sm rounded-xl border border-slate-200 px-3 py-2"
                  placeholder="نام…"
                />
              </label>
              {filteredRoster.length === 0 ? (
                <EmptyState title="شرکت‌کننده‌ای در فهرست نیست." />
              ) : (
                <div className="mt-3 overflow-x-auto rounded-xl border border-slate-100">
                  <table className="min-w-full text-right text-sm">
                    <thead className="bg-slate-50 text-xs text-slate-500">
                      <tr>
                        <th className="px-3 py-2">نام</th>
                        <th className="px-3 py-2">وضعیت ثبت‌نام</th>
                        <th className="px-3 py-2">جنسیت</th>
                        <th className="px-3 py-2">تولد</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRoster.map((r) => (
                        <tr key={r.enrollmentId || r.participantId} className="border-t border-slate-100">
                          <td className="px-3 py-2 font-medium">
                            {`${r.firstName || ""} ${r.lastName || ""}`.trim() || r.participantId}
                          </td>
                          <td className="px-3 py-2">
                            {ENROLLMENT_STATUS_LABELS[r.enrollmentStatus] || r.enrollmentStatus}
                          </td>
                          <td className="px-3 py-2">{GENDER_LABELS[r.gender] || r.gender || "—"}</td>
                          <td className="px-3 py-2">{formatDateFa(r.birthDate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </DetailSection>
      ) : null}

      {tab === "attendance" ? (
        <DetailSection
          title="خلاصه حضور"
          hint="برای ثبت جلسه، به فضای حضور بروید"
          actions={
            <Link
              to={`/instructor/classes/${classId}/attendance`}
              className="rounded-xl bg-teal-800 px-3 py-2 text-xs font-medium text-white hover:bg-teal-700"
            >
              فضای ثبت حضور
            </Link>
          }
        >
          {forbidden ? null : attendance.length === 0 ? (
            <EmptyState title="هنوز رکورد حضوری ثبت نشده." />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="min-w-full text-right text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="px-3 py-2">شرکت‌کننده</th>
                    <th className="px-3 py-2">جلسه</th>
                    <th className="px-3 py-2">وضعیت</th>
                    <th className="px-3 py-2">ثبت</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.map((row) => {
                    const person = roster.find((r) => r.participantId === row.participantId);
                    const name = person
                      ? `${person.firstName || ""} ${person.lastName || ""}`.trim()
                      : row.participantId;
                    return (
                      <tr key={row.id} className="border-t border-slate-100">
                        <td className="px-3 py-2">{name}</td>
                        <td className="px-3 py-2 font-mono text-xs">{row.sessionId}</td>
                        <td className="px-3 py-2">
                          {ATTENDANCE_STATUS_LABELS[row.status] || row.status}
                        </td>
                        <td className="px-3 py-2">{formatExpiryFa(row.markedAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <Link
            to={`/instructor/classes/${classId}/attendance`}
            className="mt-3 inline-flex text-sm font-medium text-teal-800 hover:underline"
          >
            رفتن به فضای ثبت حضور جلسه →
          </Link>
        </DetailSection>
      ) : null}
    </div>
  );
}
