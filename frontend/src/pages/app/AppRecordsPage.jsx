import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMyRecords, STROKE_LABELS } from "../../features/records/recordsApi";
import { SectionLoader } from "../../components/Ui/Loading";
import ErrorState from "../../components/Ui/ErrorState";

function formatDateFa(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("fa-IR");
  } catch {
    return "—";
  }
}

/** My records — entered by the school, read-only for members. */
export default function AppRecordsPage() {
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [records, setRecords] = useState([]);

  const load = useCallback(async (signal) => {
    setStatus("loading");
    setErrorMessage("");
    try {
      const data = await getMyRecords({ signal });
      setRecords(Array.isArray(data?.items) ? data.items : []);
      setStatus("ready");
    } catch (err) {
      if (err?.code === "ABORTED") return;
      setErrorMessage(err?.message || "بارگذاری رکوردها ناموفق بود.");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    load(ac.signal);
    return () => ac.abort();
  }, [load]);

  if (status === "loading") return <SectionLoader label="در حال بارگذاری رکوردها…" />;
  if (status === "error") {
    return <ErrorState title="رکوردها باز نشد" message={errorMessage} onRetry={() => load()} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">رکوردهای من</h1>
          <p className="mt-1 text-sm text-slate-600">
            رکوردهای ثبت‌شده توسط مدرسه برای شما و فرزندانتان.
          </p>
        </div>
        <Link to="/app" className="text-sm text-cyan-700 hover:underline">
          بازگشت به پنل
        </Link>
      </div>

      {records.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
          هنوز رکوردی برای شما ثبت نشده است.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="min-w-full text-right text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-2">نام و فامیل</th>
                <th className="px-4 py-2">سن</th>
                <th className="px-4 py-2">ماده</th>
                <th className="px-4 py-2">مسافت</th>
                <th className="px-4 py-2">زمان</th>
                <th className="px-4 py-2">تاریخ</th>
              </tr>
            </thead>
            <tbody>
              {records.map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-4 py-2 font-medium">{`${row.firstName} ${row.lastName}`}</td>
                  <td className="px-4 py-2">{row.age != null ? row.age.toLocaleString("fa-IR") : "—"}</td>
                  <td className="px-4 py-2">{STROKE_LABELS[row.stroke] || row.stroke}</td>
                  <td className="px-4 py-2">{row.distance.toLocaleString("fa-IR")} متر</td>
                  <td className="px-4 py-2 font-mono tabular-nums" dir="ltr">
                    {row.timeLabel}
                  </td>
                  <td className="px-4 py-2">{formatDateFa(row.recordDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
