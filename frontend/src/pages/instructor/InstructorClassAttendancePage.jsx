import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  getClassSessions,
  getClassRoster,
  listClassAttendance,
  markAttendance,
} from "../../features/instructor/instructorApi";
import {
  ATTENDANCE_STATUS_LABELS,
  formatDateFa,
  classifySessionTiming,
  userMessageFromInstructorError,
} from "../../features/instructor/instructorLabels";
import { AttendanceStatusChips, DetailSection, ActionBar } from "../../features/ops/OpsUi";
import { SectionLoader } from "../../components/Ui/Loading";
import ErrorState from "../../components/Ui/ErrorState";
import EmptyState from "../../components/Ui/EmptyState";
import ForbiddenState from "../../components/Ui/ForbiddenState";
import { useToast } from "../../components/feedback/useToast";

/**
 * Session-first attendance — one POST per participant, no optimistic success.
 * Chip tap saves immediately; failed rows stay marked until retry succeeds.
 */
export default function InstructorClassAttendancePage() {
  const { classId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();

  const [sessions, setSessions] = useState([]);
  const [roster, setRoster] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [sessionId, setSessionId] = useState(searchParams.get("sessionId") || "");
  const [status, setStatus] = useState("loading");
  const [forbidden, setForbidden] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [savingMap, setSavingMap] = useState({});
  const [failedMap, setFailedMap] = useState({});

  const load = useCallback(
    async (signal) => {
      setStatus("loading");
      setForbidden(false);
      setErrorMessage("");
      try {
        const [sess, ros, att] = await Promise.all([
          getClassSessions(classId, { signal }),
          getClassRoster(classId, { signal }),
          listClassAttendance(classId, { limit: 200 }, { signal }),
        ]);
        const sessionList = Array.isArray(sess?.items) ? sess.items : Array.isArray(sess) ? sess : [];
        setSessions(sessionList);
        setRoster(Array.isArray(ros?.items) ? ros.items : []);
        setAttendance(Array.isArray(att?.items) ? att.items : []);

        setSessionId((prev) => {
          if (prev && sessionList.some((s) => s.id === prev)) return prev;
          const fromQuery = new URLSearchParams(window.location.search).get("sessionId");
          if (fromQuery && sessionList.some((s) => s.id === fromQuery)) return fromQuery;
          const today = sessionList.find((s) => classifySessionTiming(s) === "today");
          if (today) return today.id;
          const upcoming = sessionList.find((s) => classifySessionTiming(s) === "upcoming");
          return upcoming?.id || sessionList[0]?.id || "";
        });
        setStatus("ready");
      } catch (err) {
        if (err?.code === "ABORTED") return;
        if (err?.status === 403 || err?.code === "FORBIDDEN") {
          setForbidden(true);
          setStatus("error");
          return;
        }
        setErrorMessage(userMessageFromInstructorError(err, "بارگذاری حضور ناموفق بود."));
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

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (sessionId) next.set("sessionId", sessionId);
    else next.delete("sessionId");
    if (next.get("sessionId") !== searchParams.get("sessionId")) {
      setSearchParams(next, { replace: true });
    }
  }, [sessionId, searchParams, setSearchParams]);

  const statusByParticipant = useMemo(() => {
    const map = {};
    for (const row of attendance) {
      if (sessionId && row.sessionId === sessionId) {
        map[row.participantId] = row.status;
      }
    }
    return map;
  }, [attendance, sessionId]);

  async function saveOne(participantId, nextStatus) {
    if (!sessionId || savingMap[participantId]) return;
    const current = statusByParticipant[participantId] || "UNKNOWN";
    if (nextStatus === current && !failedMap[participantId]) return;

    setSavingMap((m) => ({ ...m, [participantId]: true }));
    setFailedMap((m) => {
      const copy = { ...m };
      delete copy[participantId];
      return copy;
    });
    try {
      const saved = await markAttendance({
        classId,
        sessionId,
        participantId,
        status: nextStatus,
      });
      setAttendance((prev) => {
        const others = prev.filter(
          (r) => !(r.sessionId === sessionId && r.participantId === participantId),
        );
        return [
          ...others,
          {
            id: saved.id,
            classId: saved.classId,
            sessionId: saved.sessionId,
            participantId: saved.participantId,
            status: saved.status,
            markedAt: saved.markedAt,
          },
        ];
      });
      toast.success(
        nextStatus === "ABSENT"
          ? "غایب ثبت شد؛ پیامک غیبت صف می‌شود."
          : "حضور ذخیره شد.",
      );
    } catch (err) {
      setFailedMap((m) => ({
        ...m,
        [participantId]: userMessageFromInstructorError(err, "ذخیره ناموفق"),
      }));
      toast.error(userMessageFromInstructorError(err, "ذخیره حضور ناموفق بود."));
    } finally {
      setSavingMap((m) => {
        const copy = { ...m };
        delete copy[participantId];
        return copy;
      });
    }
  }

  if (forbidden) {
    return (
      <ForbiddenState
        title="دسترسی مجاز نیست"
        message="فقط مربی مالک این کلاس یا ادمین می‌تواند حضور را مدیریت کند."
        homeTo="/instructor/classes"
      />
    );
  }
  if (status === "loading") return <SectionLoader label="در حال آماده‌سازی حضور…" />;
  if (status === "error") {
    return <ErrorState title="خطا" message={errorMessage} onRetry={() => load()} />;
  }

  const selected = sessions.find((s) => s.id === sessionId);

  return (
    <div className="space-y-6">
      <div>
        <Link to={`/instructor/classes/${classId}`} className="text-sm text-teal-800 hover:underline">
          ← فضای کلاس
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">حضور و غیاب جلسه</h1>
        <p className="mt-1 text-sm text-slate-600">
          جلسه را انتخاب کنید، سپس با یک لمس وضعیت را ثبت کنید. هر ذخیره یک درخواست جدا به سرور است — تا پاسخ موفق،
          موفق فرض نمی‌شود.
        </p>
      </div>

      <ActionBar tone="teacher">
        <label className="block min-w-[16rem] flex-1 text-sm">
          <span className="text-xs text-teal-900/70">۱ · انتخاب جلسه</span>
          {sessions.length === 0 ? (
            <p className="mt-2 text-sm text-amber-900">جلسه‌ای برای این کلاس ثبت نشده.</p>
          ) : (
            <select
              value={sessionId}
              onChange={(e) => {
                setSessionId(e.target.value);
                setFailedMap({});
              }}
              className="mt-1 block w-full rounded-xl border border-teal-200 bg-white px-3 py-2.5"
            >
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  #{s.sessionNumber} · {formatDateFa(s.date)} · {s.startTime}–{s.endTime}
                  {classifySessionTiming(s) === "today" ? " · امروز" : ""}
                </option>
              ))}
            </select>
          )}
        </label>
        {selected ? (
          <p className="text-xs text-teal-900/80">
            جلسه {Number(selected.sessionNumber).toLocaleString("fa-IR")} · {formatDateFa(selected.date)}
          </p>
        ) : null}
      </ActionBar>

      {!sessionId || sessions.length === 0 ? (
        <EmptyState title="جلسه برای ثبت حضور انتخاب نشده است." />
      ) : roster.length === 0 ? (
        <EmptyState title="فهرست شرکت‌کنندگان خالی است — کسی برای علامت‌گذاری نیست." />
      ) : (
        <DetailSection
          title="۲ · علامت‌گذاری شرکت‌کنندگان"
          hint={`${Number(roster.length).toLocaleString("fa-IR")} نفر در فهرست شرکت‌کنندگان · لمس = ذخیره فوری`}
        >
          <ul className="divide-y divide-slate-100">
            {roster.map((r) => {
              const pid = r.participantId;
              const current = statusByParticipant[pid] || "UNKNOWN";
              const saving = Boolean(savingMap[pid]);
              const failed = failedMap[pid];
              return (
                <li
                  key={pid}
                  className={`flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between ${
                    failed ? "rounded-xl bg-rose-50 px-2" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900">
                      {`${r.firstName || ""} ${r.lastName || ""}`.trim() || pid}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {saving
                        ? "در حال ذخیره…"
                        : failed
                          ? `ناموفق: ${failed}`
                          : `ذخیره‌شده: ${ATTENDANCE_STATUS_LABELS[current] || current}`}
                    </p>
                  </div>
                  <AttendanceStatusChips
                    value={current}
                    disabled={saving || !sessionId}
                    labels={ATTENDANCE_STATUS_LABELS}
                    onSelect={(s) => saveOne(pid, s)}
                  />
                </li>
              );
            })}
          </ul>
        </DetailSection>
      )}
    </div>
  );
}
