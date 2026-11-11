import { useRef, useState } from "react";
import { convertAccessParticipants } from "../../enrollments/enrollmentsApi";
import { userMessageFromEnrollmentError } from "../../enrollments/enrollmentLabels";

/**
 * ADMIN — upload Access DB → Excel, optionally persist rows into شاگردان
 * (fingerprint / face / card / leftover columns included).
 */
export default function AccessConvertPanel({ onImported, onClose }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [saveToStudents, setSaveToStudents] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState(null);

  async function handleSubmit(e) {
    e?.preventDefault?.();
    setError("");
    setSummary(null);
    if (!file) {
      setError("ابتدا فایل اکسس (.mdb یا .accdb) را انتخاب کنید.");
      return;
    }
    setBusy(true);
    try {
      const { blob, filename, importSummary } = await convertAccessParticipants(file, {
        importRows: saveToStudents,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename || "students-from-access.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setSummary(importSummary || { imported: saveToStudents });
      if (saveToStudents && (importSummary?.created > 0 || importSummary?.updated > 0)) {
        onImported?.(importSummary);
      }
    } catch (err) {
      setError(userMessageFromEnrollmentError(err, "تبدیل فایل اکسس ناموفق بود."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" dir="rtl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">تبدیل اکسس به اکسل</h2>
          <p className="mt-1 text-sm text-slate-600">
            فایل پایگاه‌داده اکسس را بارگذاری کنید تا به اکسل تبدیل شود. در صورت فعال بودن گزینهٔ ذخیره،
            اطلاعات شاگردان — از جمله اثر انگشت، چهره، شماره کارت و ستون‌های اضافه — در پروندهٔ شاگردان ثبت
            می‌شود.
          </p>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
          >
            بستن
          </button>
        ) : null}
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <input
            ref={inputRef}
            type="file"
            accept=".mdb,.accdb,application/vnd.ms-access,application/x-msaccess"
            className="hidden"
            onChange={(e) => {
              setFile(e.target.files?.[0] || null);
              setSummary(null);
              setError("");
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="rounded-xl border border-dashed border-cyan-400 bg-cyan-50/60 px-4 py-3 text-sm font-medium text-cyan-900 hover:bg-cyan-50 disabled:opacity-50"
          >
            {file ? file.name : "انتخاب فایل اکسس (.mdb / .accdb)"}
          </button>
        </div>

        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-cyan-700"
            checked={saveToStudents}
            disabled={busy}
            onChange={(e) => setSaveToStudents(e.target.checked)}
          />
          <span>
            ذخیره در اطلاعات شاگردان (اثر انگشت، چهره، شماره کارت و سایر ستون‌ها)
          </span>
        </label>

        {error ? <p className="text-sm text-rose-600">{error}</p> : null}

        {summary ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 text-sm text-emerald-950">
            <p className="font-medium">فایل اکسل آماده و دانلود شد.</p>
            {summary.imported ? (
              <ul className="mt-2 list-inside list-disc space-y-0.5 text-emerald-900">
                <li>
                  ایجاد شده:{" "}
                  {Number(summary.created || 0).toLocaleString("fa-IR")}
                </li>
                <li>
                  به‌روزرسانی شده:{" "}
                  {Number(summary.updated || 0).toLocaleString("fa-IR")}
                </li>
                <li>
                  با موبایل: {Number(summary.withPhone || 0).toLocaleString("fa-IR")}
                </li>
                <li>
                  بدون موبایل (تکمیل دستی):{" "}
                  {Number(summary.missingPhone || 0).toLocaleString("fa-IR")}
                </li>
                <li>
                  رد شده: {Number(summary.skipped || 0).toLocaleString("fa-IR")}
                </li>
              </ul>
            ) : (
              <p className="mt-1 text-emerald-900">فقط تبدیل انجام شد؛ ذخیره‌ای در شاگردان نبود.</p>
            )}
            {Array.isArray(summary.errors) && summary.errors.length > 0 ? (
              <details className="mt-2">
                <summary className="cursor-pointer text-amber-900">
                  جزئیات ردیف‌های ردشده ({summary.errors.length.toLocaleString("fa-IR")})
                </summary>
                <ul className="mt-1 max-h-40 space-y-1 overflow-y-auto text-xs text-amber-950">
                  {summary.errors.slice(0, 20).map((err, i) => (
                    <li key={`${err.table}-${err.row}-${i}`}>
                      {err.table !== "*" ? `جدول ${err.table}، ` : ""}
                      {err.row ? `ردیف ${err.row}: ` : ""}
                      {err.reason}
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={busy || !file}
            className="rounded-xl bg-cyan-700 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-600 disabled:opacity-50"
          >
            {busy ? "در حال تبدیل…" : "تبدیل به اکسل"}
          </button>
        </div>
      </form>
    </div>
  );
}
