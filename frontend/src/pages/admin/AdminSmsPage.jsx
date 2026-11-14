import { Link } from "react-router-dom";
import { useState } from "react";
import { sendAdminSms } from "../../features/notifications/notificationsApi";
import { AdminPageHeader } from "../../features/courses/components/AdminCourseUi";
import { useToast } from "../../components/feedback/useToast";

const AUDIENCES = [
  { value: "user", label: "یک نفر (با شماره موبایل)" },
  { value: "clinic", label: "ثبت‌نام‌کنندگان همهٔ کلینیک‌ها" },
  { value: "all", label: "همه کاربران سایت" },
];

/** ADMIN — one-off SMS, single recipient or a group. */
export default function AdminSmsPage() {
  const toast = useToast();
  const [audience, setAudience] = useState("user");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setError("");
    setResult(null);

    const text = message.trim();
    if (!text) {
      setError("متن پیامک را بنویسید.");
      return;
    }
    if (audience === "user" && !/^09\d{9}$/.test(phone.trim())) {
      setError("شماره موبایل باید با 09 شروع شود و ۱۱ رقم باشد.");
      return;
    }
    if (audience === "all" && !window.confirm("پیامک برای همه کاربران سایت ارسال شود؟")) {
      return;
    }

    setBusy(true);
    try {
      const data = await sendAdminSms({
        audience,
        phone: audience === "user" ? phone.trim() : undefined,
        message: text,
      });
      setResult(data);
      setMessage("");
      toast.success("پیامک در صف ارسال قرار گرفت.");
    } catch (err) {
      setError(err?.message || "ارسال پیامک ناموفق بود.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        backTo="/admin"
        backLabel="میز مدیریت"
        title="ارسال پیامک"
        description="گاهی یک پیام اختصاصی برای یک نفر و گاهی یک پیام گروهی؛ هر دو از همین صفحه. تاریخچه ارسال‌ها در بخش پیام‌ها ثبت می‌شود."
      />

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-2">
              <span className="text-xs text-slate-500">گیرنده</span>
              <div className="flex flex-wrap gap-2">
                {AUDIENCES.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setAudience(option.value)}
                    className={`rounded-xl px-3 py-2 text-sm ${
                      audience === option.value
                        ? "bg-cyan-700 text-white"
                        : "border border-slate-300 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {audience === "user" ? (
              <label className="block text-sm">
                <span className="text-xs text-slate-500">شماره موبایل</span>
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  dir="ltr"
                  placeholder="09xxxxxxxxx"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-right"
                />
              </label>
            ) : null}

            <label className="block text-sm">
              <span className="text-xs text-slate-500">متن پیامک</span>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={4}
                maxLength={400}
                placeholder="متن فارسی، حداکثر ۴۰۰ کاراکتر"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
              />
              <span className="mt-1 block text-left text-xs text-slate-400">
                {message.length.toLocaleString("fa-IR")} / ۴۰۰
              </span>
            </label>

            {error ? (
              <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p>
            ) : null}

            <button
              type="submit"
              disabled={busy}
              className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {busy ? "در حال ارسال…" : "ارسال پیامک"}
            </button>
          </form>

          {result ? (
            <div className="mt-4 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
              {Number(result.queued || 0).toLocaleString("fa-IR")} پیامک در صف قرار گرفت
              {result.deliveredNow
                ? ` (${Number(result.deliveredNow).toLocaleString("fa-IR")} مورد همین حالا ارسال شد)`
                : ""}
              {result.skipped
                ? ` · ${Number(result.skipped).toLocaleString("fa-IR")} گیرنده بدون شماره معتبر رد شد`
                : ""}
              .
            </div>
          ) : null}
        </section>

        <aside className="space-y-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-5 text-sm text-slate-700">
          <h2 className="font-bold text-slate-900">نکته‌ها</h2>
          <ul className="list-disc space-y-2 pr-5">
            <li>پیام‌ها از خط پیامک مدرسه ارسال می‌شوند؛ لینک در متن نگذارید.</li>
            <li>ارسال گروهی ممکن است چند دقیقه طول بکشد؛ وضعیت هر پیام در بخش «پیام‌ها» است.</li>
            <li>برای پیام به شاگردان یک کلاس، از صفحه همان کلاس استفاده کنید.</li>
          </ul>
          <Link to="/admin/notifications" className="inline-block text-cyan-700 hover:underline">
            مشاهده تاریخچه پیام‌ها
          </Link>
        </aside>
      </div>
    </div>
  );
}
