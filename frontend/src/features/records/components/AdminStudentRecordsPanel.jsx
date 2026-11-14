import { useCallback, useEffect, useMemo, useState } from "react";
import {
  STROKE_LABELS,
  STROKE_OPTIONS,
  createAdminRecord,
  deleteAdminRecord,
  listAdminRecords,
  searchRecordParticipants,
} from "../recordsApi";
import PersianDateField from "../../../components/Ui/PersianDateField";
import { useToast } from "../../../components/feedback/useToast";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function formatDateFa(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("fa-IR");
  } catch {
    return "—";
  }
}

/**
 * ADMIN — enter and manage school records (per student, with stroke and time).
 * These rows are what each family sees in their panel.
 */
export default function AdminStudentRecordsPanel() {
  const toast = useToast();

  const [records, setRecords] = useState([]);
  const [recordsError, setRecordsError] = useState("");
  const [loading, setLoading] = useState(true);

  const [studentQuery, setStudentQuery] = useState("");
  const [students, setStudents] = useState([]);
  const [participant, setParticipant] = useState(null);

  const [stroke, setStroke] = useState("FREESTYLE");
  const [distance, setDistance] = useState("25");
  const [minutes, setMinutes] = useState("");
  const [seconds, setSeconds] = useState("");
  const [recordDate, setRecordDate] = useState(todayIso());
  const [location, setLocation] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");

  const loadRecords = useCallback(async (signal) => {
    setLoading(true);
    setRecordsError("");
    try {
      const data = await listAdminRecords({ limit: 100, signal });
      setRecords(Array.isArray(data?.items) ? data.items : []);
    } catch (err) {
      if (err?.code === "ABORTED") return;
      setRecordsError(err?.message || "بارگذاری رکوردها ناموفق بود.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    loadRecords(ac.signal);
    return () => ac.abort();
  }, [loadRecords]);

  useEffect(() => {
    // Keep the picked student visible instead of re-opening the search list.
    if (
      participant &&
      studentQuery === `${participant.firstName} ${participant.lastName}`
    ) {
      return undefined;
    }
    const ac = new AbortController();
    const timer = window.setTimeout(() => {
      const query = studentQuery.trim();
      searchRecordParticipants({ ...(query ? { q: query } : {}), limit: 15, signal: ac.signal })
        .then((data) => setStudents(Array.isArray(data?.items) ? data.items : []))
        .catch(() => setStudents([]));
    }, 300);
    return () => {
      window.clearTimeout(timer);
      ac.abort();
    };
  }, [studentQuery, participant]);

  const timeSeconds = useMemo(() => {
    const m = Number(minutes || 0);
    const s = Number(seconds || 0);
    if (!Number.isFinite(m) || !Number.isFinite(s)) return 0;
    return Math.max(0, Math.round((m * 60 + s) * 100) / 100);
  }, [minutes, seconds]);

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setFormError("");
    if (!participant) {
      setFormError("ابتدا شاگرد را انتخاب کنید.");
      return;
    }
    if (!(Number(distance) > 0)) {
      setFormError("مسافت را وارد کنید.");
      return;
    }
    if (!(timeSeconds > 0)) {
      setFormError("زمان ثبت‌شده باید بیشتر از صفر باشد.");
      return;
    }
    setBusy(true);
    try {
      await createAdminRecord({
        participantId: participant.id,
        stroke,
        distance: Number(distance),
        timeSeconds,
        recordDate: recordDate || undefined,
        location: location.trim() || undefined,
        note: note.trim() || undefined,
      });
      toast.success("رکورد ثبت شد و در پنل خانواده نمایش داده می‌شود.");
      setMinutes("");
      setSeconds("");
      setNote("");
      await loadRecords();
    } catch (err) {
      setFormError(err?.message || "ثبت رکورد ناموفق بود.");
    } finally {
      setBusy(false);
    }
  }

  async function removeRecord(row) {
    if (!window.confirm(`رکورد ${row.firstName} ${row.lastName} حذف شود؟`)) return;
    try {
      await deleteAdminRecord(row.id);
      toast.success("رکورد حذف شد.");
      await loadRecords();
    } catch (err) {
      toast.error(err?.message || "حذف رکورد ناموفق بود.");
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <div>
        <h2 className="font-bold text-slate-900">ثبت رکورد شناگران</h2>
        <p className="mt-1 text-xs text-slate-500">
          نام و فامیل، سن، ماده و زمان هر شناگر اینجا ثبت می‌شود و همان رکورد در پنل خانواده نمایش
          داده می‌شود.
        </p>
      </div>

      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <span className="text-xs text-slate-500">شاگرد</span>
          <input
            value={studentQuery}
            onChange={(event) => {
              setStudentQuery(event.target.value);
              setParticipant(null);
            }}
            placeholder="جستجوی نام یا فامیل شاگرد…"
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
          <p className="mt-1 text-[11px] text-slate-400">
            با خالی‌گذاشتن کادر، فهرست شناگران فعال نمایش داده می‌شود.
          </p>
          {students.length ? (
            <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-1">
              {students.map((student) => (
                <li key={student.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setParticipant(student);
                      setStudentQuery(`${student.firstName} ${student.lastName}`);
                      setStudents([]);
                    }}
                    className="w-full rounded-lg px-2 py-1.5 text-right text-sm hover:bg-cyan-50"
                  >
                    {student.firstName} {student.lastName}
                    {student.age != null ? ` · ${student.age.toLocaleString("fa-IR")} سال` : ""}
                    {student.phone ? ` · ${student.phone}` : ""}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {participant ? (
            <p className="mt-2 rounded-lg bg-emerald-50 px-2 py-1 text-xs text-emerald-900">
              انتخاب شد: {participant.firstName} {participant.lastName}
              {participant.age != null ? ` · ${participant.age.toLocaleString("fa-IR")} سال` : ""}
            </p>
          ) : null}
        </div>

        <label className="text-sm">
          <span className="text-xs text-slate-500">ماده شنا</span>
          <select
            value={stroke}
            onChange={(event) => setStroke(event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
          >
            {STROKE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <span className="text-xs text-slate-500">مسافت (متر)</span>
          <input
            value={distance}
            onChange={(event) => setDistance(event.target.value.replace(/[^\d]/g, ""))}
            inputMode="numeric"
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
          />
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label className="text-sm">
            <span className="text-xs text-slate-500">دقیقه</span>
            <input
              value={minutes}
              onChange={(event) => setMinutes(event.target.value.replace(/[^\d]/g, ""))}
              inputMode="numeric"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="text-xs text-slate-500">ثانیه</span>
            <input
              value={seconds}
              onChange={(event) => setSeconds(event.target.value.replace(/[^\d.]/g, ""))}
              inputMode="decimal"
              placeholder="مثلاً 41.25"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
            />
          </label>
        </div>

        <label className="text-sm">
          <span className="text-xs text-slate-500">تاریخ ثبت</span>
          <div className="mt-1">
            <PersianDateField value={recordDate} onChange={setRecordDate} />
          </div>
        </label>

        <label className="text-sm">
          <span className="text-xs text-slate-500">محل / مسابقه (اختیاری)</span>
          <input
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
          />
        </label>

        <label className="text-sm">
          <span className="text-xs text-slate-500">توضیح (اختیاری)</span>
          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
          />
        </label>

        {formError ? (
          <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-800 sm:col-span-2">
            {formError}
          </p>
        ) : null}

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-cyan-700 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-600 disabled:opacity-50"
          >
            {busy ? "در حال ثبت…" : "ثبت رکورد"}
          </button>
        </div>
      </form>

      <div className="overflow-x-auto rounded-xl border border-slate-100">
        {loading ? (
          <p className="p-4 text-sm text-slate-500">در حال بارگذاری رکوردها…</p>
        ) : recordsError ? (
          <p className="p-4 text-sm text-rose-700">{recordsError}</p>
        ) : records.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">هنوز رکوردی ثبت نشده است.</p>
        ) : (
          <table className="min-w-full text-right text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-3 py-2">شناگر</th>
                <th className="px-3 py-2">سن</th>
                <th className="px-3 py-2">ماده</th>
                <th className="px-3 py-2">مسافت</th>
                <th className="px-3 py-2">زمان</th>
                <th className="px-3 py-2">تاریخ</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {records.map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-medium">{`${row.firstName} ${row.lastName}`}</td>
                  <td className="px-3 py-2">{row.age != null ? row.age.toLocaleString("fa-IR") : "—"}</td>
                  <td className="px-3 py-2">{STROKE_LABELS[row.stroke] || row.stroke}</td>
                  <td className="px-3 py-2">{row.distance.toLocaleString("fa-IR")} متر</td>
                  <td className="px-3 py-2 font-mono tabular-nums" dir="ltr">
                    {row.timeLabel}
                  </td>
                  <td className="px-3 py-2">{formatDateFa(row.recordDate)}</td>
                  <td className="px-3 py-2 text-left">
                    <button
                      type="button"
                      onClick={() => removeRecord(row)}
                      className="text-xs text-rose-700 hover:underline"
                    >
                      حذف
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
