import { useState } from "react";
import { sendPromoSms } from "../notificationsApi";
import { userMessageFromNotificationError } from "../notificationLabels";

const DEFAULT_TEST_PHONE = "09301905219";

/**
 * ADMIN — test / queue registration-discount SMS for club imports.
 */
export default function PromoSmsPanel() {
  const [testPhone, setTestPhone] = useState(DEFAULT_TEST_PHONE);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  async function run(audience) {
    setError("");
    setResult(null);
    setBusy(audience);
    try {
      const data = await sendPromoSms({
        audience,
        testPhone: testPhone.trim() || DEFAULT_TEST_PHONE,
        message: message.trim() || undefined,
        sendNow: audience === "test",
        campaignKey: audience === "club_with_phone" ? `club-${new Date().toISOString().slice(0, 10)}` : undefined,
      });
      setResult(data);
    } catch (err) {
      setError(userMessageFromNotificationError(err, "ارسال پیامک تخفیف ناموفق بود."));
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5" dir="rtl">
      <h2 className="text-base font-bold text-slate-900">پیامک تخفیف ثبت‌نام (باشگاه)</h2>
      <p className="mt-1 text-sm text-slate-600">
        اول با شمارهٔ خودتان تست کنید؛ بعد برای همهٔ اعضای واردشده از اکسس که موبایل دارند صف کنید.
        لینک داخل متن نگذارید — پنل پیامک ممکن است رد کند.
      </p>

      <div className="mt-4 space-y-3">
        <label className="block text-sm">
          <span className="text-xs text-slate-500">شماره تست</span>
          <input
            value={testPhone}
            onChange={(e) => setTestPhone(e.target.value)}
            dir="ltr"
            className="mt-1 block w-full max-w-xs rounded-xl border border-slate-200 bg-white px-3 py-2 text-left"
            placeholder={DEFAULT_TEST_PHONE}
          />
        </label>
        <label className="block text-sm">
          <span className="text-xs text-slate-500">متن سفارشی (اختیاری)</span>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            maxLength={400}
            className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            placeholder="اگر خالی باشد متن پیش‌فرض تخفیف ثبت‌نام ارسال می‌شود."
          />
        </label>
      </div>

      {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}

      {result ? (
        <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950">
          <p>
            مخاطب: {result.audience === "test" ? "تست" : "باشگاه با موبایل"} — کمپین:{" "}
            {result.campaign || "—"}
          </p>
          <ul className="mt-1 list-inside list-disc">
            <li>ارسال فوری: {Number(result.sentNow || 0).toLocaleString("fa-IR")}</li>
            <li>در صف: {Number(result.queued || 0).toLocaleString("fa-IR")}</li>
            <li>رد/تکراری: {Number(result.skipped || 0).toLocaleString("fa-IR")}</li>
            {result.recipientCount != null ? (
              <li>گیرندگان واجد شرایط: {Number(result.recipientCount).toLocaleString("fa-IR")}</li>
            ) : null}
          </ul>
          {result.bodyPreview ? (
            <p className="mt-2 text-xs text-emerald-900">پیش‌نمایش: {result.bodyPreview}</p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={Boolean(busy)}
          onClick={() => run("test")}
          className="rounded-xl bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
        >
          {busy === "test" ? "در حال ارسال تست…" : "ارسال تست به شماره من"}
        </button>
        <button
          type="button"
          disabled={Boolean(busy)}
          onClick={() => {
            if (
              !window.confirm(
                "پیامک تخفیف برای همهٔ اعضای باشگاهِ واردشده که موبایل دارند صف می‌شود. ادامه؟",
              )
            ) {
              return;
            }
            run("club_with_phone");
          }}
          className="rounded-xl border border-amber-700 bg-white px-4 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-50 disabled:opacity-50"
        >
          {busy === "club_with_phone" ? "در حال صف‌کردن…" : "صف برای همهٔ باشگاه با موبایل"}
        </button>
      </div>
    </div>
  );
}
