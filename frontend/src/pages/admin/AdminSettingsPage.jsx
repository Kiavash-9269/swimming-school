import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getAdminSiteSettings,
  paymentQrUrl,
  updateCardToCardSettings,
} from "../../features/site/siteApi";
import {
  confirmCardToCardPayment,
  listAdminPayments,
  rejectCardToCardPayment,
} from "../../features/payments/paymentsApi";
import { formatIrrAmount } from "../../features/payments/paymentLabels";
import { AdminPageHeader } from "../../features/courses/components/AdminCourseUi";
import { SectionLoader } from "../../components/Ui/Loading";
import ErrorState from "../../components/Ui/ErrorState";
import { useToast } from "../../components/feedback/useToast";

const EMPTY_CARD = {
  enabled: true,
  cardNumber: "",
  cardHolder: "",
  bankName: "",
  iban: "",
  instructions: "",
};

function formatDateFa(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("fa-IR");
  } catch {
    return "—";
  }
}

/** ADMIN — card-to-card details (number, holder, QR) + reported transfers to approve. */
export default function AdminSettingsPage() {
  const toast = useToast();

  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [card, setCard] = useState(EMPTY_CARD);
  const [saving, setSaving] = useState(false);
  const [payments, setPayments] = useState([]);
  const [busyId, setBusyId] = useState("");

  const load = useCallback(async (signal) => {
    setStatus("loading");
    setErrorMessage("");
    try {
      const [settingsData, paymentsData] = await Promise.all([
        getAdminSiteSettings({ signal }),
        listAdminPayments({ status: "PENDING", limit: 100, signal }),
      ]);
      setCard({ ...EMPTY_CARD, ...(settingsData?.cardToCard || {}) });
      setPayments(Array.isArray(paymentsData?.items) ? paymentsData.items : []);
      setStatus("ready");
    } catch (err) {
      if (err?.code === "ABORTED") return;
      setErrorMessage(err?.message || "بارگذاری تنظیمات ناموفق بود.");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    load(ac.signal);
    return () => ac.abort();
  }, [load]);

  const pendingManual = useMemo(
    () => payments.filter((row) => row.provider === "card_to_card"),
    [payments],
  );

  const digits = String(card.cardNumber || "").replace(/[^\d]/g, "");

  async function save(event) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const saved = await updateCardToCardSettings({
        enabled: Boolean(card.enabled),
        cardNumber: card.cardNumber,
        cardHolder: card.cardHolder,
        bankName: card.bankName,
        iban: card.iban,
        instructions: card.instructions,
      });
      setCard({ ...EMPTY_CARD, ...(saved || {}) });
      toast.success("اطلاعات کارت ذخیره شد.");
    } catch (err) {
      toast.error(err?.message || "ذخیره اطلاعات کارت ناموفق بود.");
    } finally {
      setSaving(false);
    }
  }

  async function approve(row) {
    if (busyId) return;
    setBusyId(row.id);
    try {
      await confirmCardToCardPayment(row.id);
      toast.success("پرداخت تأیید شد و ثبت‌نام نهایی شد.");
      await load();
    } catch (err) {
      toast.error(err?.message || "تأیید پرداخت ناموفق بود.");
    } finally {
      setBusyId("");
    }
  }

  async function reject(row) {
    if (busyId) return;
    const reason = window.prompt("دلیل رد پرداخت (اختیاری):", "") ?? null;
    if (reason === null) return;
    setBusyId(row.id);
    try {
      await rejectCardToCardPayment(row.id, { reason: reason.trim() || undefined });
      toast.success("پرداخت رد شد.");
      await load();
    } catch (err) {
      toast.error(err?.message || "رد پرداخت ناموفق بود.");
    } finally {
      setBusyId("");
    }
  }

  if (status === "loading") return <SectionLoader label="در حال بارگذاری تنظیمات…" />;
  if (status === "error") {
    return <ErrorState title="تنظیمات باز نشد" message={errorMessage} onRetry={() => load()} />;
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        backTo="/admin"
        backLabel="میز مدیریت"
        title="تنظیمات و کارت به کارت"
        description="شماره کارت و توضیح واریز را اینجا وارد کنید؛ همان اطلاعات با کد QR در پنل خانواده‌ها نمایش داده می‌شود. پرداخت‌های گزارش‌شده را هم از همین صفحه تأیید کنید."
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-bold text-slate-900">اطلاعات کارت‌به‌کارت</h2>
        <form onSubmit={save} className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={Boolean(card.enabled)}
                onChange={(event) => setCard({ ...card, enabled: event.target.checked })}
                className="h-4 w-4 rounded border-slate-400"
              />
              پرداخت کارت‌به‌کارت در پنل فعال باشد
            </label>

            <label className="text-sm sm:col-span-2">
              <span className="text-xs text-slate-500">شماره کارت (۱۶ رقم)</span>
              <input
                value={card.cardNumber}
                onChange={(event) => setCard({ ...card, cardNumber: event.target.value })}
                dir="ltr"
                placeholder="6037-0000-0000-0000"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 font-mono"
              />
            </label>

            <label className="text-sm">
              <span className="text-xs text-slate-500">نام صاحب کارت</span>
              <input
                value={card.cardHolder}
                onChange={(event) => setCard({ ...card, cardHolder: event.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="text-xs text-slate-500">بانک</span>
              <input
                value={card.bankName}
                onChange={(event) => setCard({ ...card, bankName: event.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="text-xs text-slate-500">شماره شبا (اختیاری)</span>
              <input
                value={card.iban}
                onChange={(event) => setCard({ ...card, iban: event.target.value })}
                dir="ltr"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 font-mono"
              />
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="text-xs text-slate-500">توضیح برای خانواده‌ها</span>
              <textarea
                value={card.instructions}
                onChange={(event) => setCard({ ...card, instructions: event.target.value })}
                rows={3}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
              />
            </label>

            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-cyan-700 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-600 disabled:opacity-50"
              >
                {saving ? "در حال ذخیره…" : "ذخیره اطلاعات کارت"}
              </button>
            </div>
          </div>

          <figure className="justify-self-center rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
            {digits.length >= 16 ? (
              <>
                <img
                  src={paymentQrUrl(digits.slice(-4))}
                  alt="پیش‌نمایش کد QR پرداخت"
                  className="mx-auto h-40 w-40 rounded-xl bg-white p-2"
                />
                <figcaption className="mt-2 text-xs text-slate-500">
                  کد QR پس از ذخیره، در پنل خانواده و صفحه کلینیک نمایش داده می‌شود.
                </figcaption>
              </>
            ) : (
              <figcaption className="text-xs text-slate-500">
                پس از وارد کردن شماره کارت، پیش‌نمایش QR اینجا ساخته می‌شود.
              </figcaption>
            )}
          </figure>
        </form>
      </section>

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-bold text-slate-900">پرداخت‌های کارت‌به‌کارت در انتظار تأیید</h2>
          <button
            type="button"
            onClick={() => load()}
            className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs text-slate-700"
          >
            بازخوانی
          </button>
        </div>

        {pendingManual.length === 0 ? (
          <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
            پرداخت کارت‌به‌کارت در انتظار تأیید نیست.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="min-w-full text-right text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-3 py-2">مبلغ</th>
                  <th className="px-3 py-2">کد پیگیری</th>
                  <th className="px-3 py-2">ثبت‌نام</th>
                  <th className="px-3 py-2">زمان گزارش</th>
                  <th className="px-3 py-2">اقدام</th>
                </tr>
              </thead>
              <tbody>
                {pendingManual.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-medium">{formatIrrAmount(row.amount)}</td>
                    <td className="px-3 py-2" dir="ltr">
                      {row.cardToCard?.trackingCode || "—"}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{row.enrollmentId}</td>
                    <td className="px-3 py-2 text-xs text-slate-500">
                      {formatDateFa(row.cardToCard?.reportedAt || row.createdAt)}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => approve(row)}
                          disabled={busyId === row.id}
                          className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs text-white disabled:opacity-50"
                        >
                          تأیید واریز
                        </button>
                        <button
                          type="button"
                          onClick={() => reject(row)}
                          disabled={busyId === row.id}
                          className="rounded-lg border border-rose-300 px-2.5 py-1 text-xs text-rose-700 disabled:opacity-50"
                        >
                          رد
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
