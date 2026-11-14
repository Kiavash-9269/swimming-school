import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../services/useAuth";
import {
  getClinicInfo,
  getMyClinicRegistrations,
  registerClinic,
  reportClinicPaid,
} from "../features/clinic/clinicApi";
import { getPublicSiteSettings, paymentQrUrl } from "../features/site/siteApi";
import PersianDateField from "../components/Ui/PersianDateField";
import { SectionLoader, ButtonSpinner } from "../components/Ui/Loading";
import { useToast } from "../components/feedback/useToast";

const STATUS_LABELS = {
  PENDING: "در انتظار تأیید",
  CONFIRMED: "تأیید شده",
  CANCELLED: "لغو شده",
  DONE: "برگزار شده",
};

const PAYMENT_LABELS = {
  UNPAID: "پرداخت نشده",
  AWAITING_REVIEW: "در انتظار تأیید پرداخت",
  PAID: "پرداخت تأیید شده",
};

function formatToman(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n) || n <= 0) return "—";
  return `${n.toLocaleString("fa-IR")} تومان`;
}

function CardBox({ cardToCard }) {
  const toast = useToast();
  if (!cardToCard?.enabled || !cardToCard?.cardNumber) {
    return (
      <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
        اطلاعات کارت هنوز ثبت نشده است؛ با پشتیبانی تماس بگیرید.
      </p>
    );
  }
  const digits = String(cardToCard.cardNumber).replace(/[^\d]/g, "");
  return (
    <div className="grid gap-3 rounded-2xl border border-cyan-200 bg-cyan-50/60 p-4 sm:grid-cols-[1fr_auto]">
      <div className="space-y-1 text-sm">
        <p className="text-xs text-slate-500">شماره کارت</p>
        <p dir="ltr" className="font-mono text-lg font-bold text-slate-900">
          {cardToCard.cardNumber}
        </p>
        <p className="text-slate-700">
          {[cardToCard.cardHolder, cardToCard.bankName].filter(Boolean).join(" · ") || "—"}
        </p>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard
              ?.writeText(digits)
              .then(() => toast.success("شماره کارت کپی شد."))
              .catch(() => toast.error("کپی ممکن نشد."));
          }}
          className="rounded-lg border border-cyan-300 bg-white px-2.5 py-1 text-xs text-cyan-800"
        >
          کپی شماره کارت
        </button>
        {cardToCard.instructions ? (
          <p className="text-xs leading-6 text-slate-600">{cardToCard.instructions}</p>
        ) : null}
      </div>
      {digits.length >= 16 ? (
        <img
          src={paymentQrUrl(digits.slice(-4))}
          alt="کد QR پرداخت"
          className="h-28 w-28 justify-self-center rounded-xl border border-cyan-200 bg-white p-1.5"
        />
      ) : null}
    </div>
  );
}

function ClinicCard({ clinic, selected, onSelect }) {
  return (
    <section
      className={`rounded-2xl border p-5 text-sm leading-8 ${
        selected
          ? "border-cyan-400/60 bg-cyan-400/10 text-white"
          : "border-white/10 bg-white/5 text-white/80"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">{clinic.title}</h2>
          {clinic.subtitle ? (
            <p className="text-sm text-cyan-200">{clinic.subtitle}</p>
          ) : null}
        </div>
        <span className="rounded-xl bg-white/10 px-3 py-1 text-sm">
          هزینه: <strong className="text-cyan-200">{formatToman(clinic.priceToman)}</strong>
        </span>
      </div>

      {clinic.description ? <p className="mt-3">{clinic.description}</p> : null}

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {clinic.schedule ? <p>زمان: {clinic.schedule}</p> : null}
        {clinic.location ? <p>محل: {clinic.location}</p> : null}
        {clinic.startDate || clinic.endDate ? (
          <p>بازه: {[clinic.startDate, clinic.endDate].filter(Boolean).join(" تا ")}</p>
        ) : null}
        <p>
          ظرفیت باقی‌مانده:{" "}
          {clinic.remaining == null
            ? "نامحدود"
            : `${Number(clinic.remaining).toLocaleString("fa-IR")} نفر`}
        </p>
        {clinic.phone ? (
          <p dir="ltr" className="text-left sm:text-right">
            تماس: {clinic.phone}
          </p>
        ) : null}
      </div>

      {clinic.notice ? (
        <p className="mt-3 rounded-xl bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
          {clinic.notice}
        </p>
      ) : null}

      <div className="mt-4">
        {clinic.enabled ? (
          <button
            type="button"
            onClick={onSelect}
            className="rounded-xl bg-cyan-500 px-5 py-2 text-sm font-bold text-slate-900 transition hover:bg-cyan-400"
          >
            {selected ? "در حال ثبت‌نام" : "ثبت‌نام در این کلینیک"}
          </button>
        ) : (
          <span className="rounded-xl bg-white/10 px-4 py-2 text-xs text-white/70">
            ثبت‌نام این کلینیک فعلاً بسته است.
          </span>
        )}
      </div>
    </section>
  );
}

/** Public clinic sign-up page (auth required to submit). */
export default function ClinicPage() {
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();
  const toast = useToast();

  const [status, setStatus] = useState("loading");
  const [clinics, setClinics] = useState([]);
  const [cardToCard, setCardToCard] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [selectedId, setSelectedId] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");

  const load = useCallback(async (signal) => {
    setStatus("loading");
    try {
      const [clinicInfo, site] = await Promise.all([
        getClinicInfo({ signal }),
        getPublicSiteSettings({ signal }),
      ]);
      const list = Array.isArray(clinicInfo?.clinics) ? clinicInfo.clinics : [];
      setClinics(list);
      setCardToCard(site?.cardToCard || null);

      if (isAuthenticated) {
        const mine = await getMyClinicRegistrations({ signal }).catch(() => ({ items: [] }));
        setRegistrations(Array.isArray(mine?.items) ? mine.items : []);
      } else {
        setRegistrations([]);
      }
      setStatus("ready");
    } catch {
      setStatus("ready");
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const ac = new AbortController();
    load(ac.signal);
    return () => ac.abort();
  }, [load]);

  useEffect(() => {
    if (!user) return;
    setFirstName((v) => v || user.firstName || "");
    setLastName((v) => v || user.lastName || "");
    setPhone((v) => v || user.phone || "");
  }, [user]);

  const selectedClinic = useMemo(
    () => clinics.find((row) => row.id === selectedId) || null,
    [clinics, selectedId],
  );

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setFormError("");
    if (!selectedClinic) {
      setFormError("ابتدا کلینیکی را که می‌خواهید انتخاب کنید.");
      return;
    }
    if (!firstName.trim() || !lastName.trim()) {
      setFormError("نام و نام خانوادگی را کامل کنید.");
      return;
    }
    if (!/^09\d{9}$/.test(phone.trim())) {
      setFormError("شماره موبایل باید با 09 شروع شود و ۱۱ رقم باشد.");
      return;
    }
    if (!birthDate) {
      setFormError("تاریخ تولد را انتخاب کنید.");
      return;
    }
    setBusy(true);
    try {
      await registerClinic({
        clinicId: selectedClinic.id,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        birthDate,
        gender: gender || undefined,
        note: note.trim() || undefined,
      });
      toast.success("ثبت‌نام کلینیک انجام شد. حالا مبلغ را واریز کنید و تیک تأیید را بزنید.");
      setNote("");
      await load();
    } catch (err) {
      setFormError(err?.message || "ثبت‌نام کلینیک ناموفق بود.");
    } finally {
      setBusy(false);
    }
  }

  async function reportPaid(registration) {
    try {
      await reportClinicPaid(registration.id, {});
      toast.success("پرداخت ثبت شد و در انتظار تأیید مدیر است.");
      await load();
    } catch (err) {
      toast.error(err?.message || "ثبت پرداخت ناموفق بود.");
    }
  }

  if (status === "loading") return <SectionLoader label="در حال بارگذاری کلینیک‌ها…" />;

  return (
    <div dir="rtl" className="min-h-screen bg-[#071826] px-4 py-10 text-white sm:px-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <Link to="/" className="text-xs text-cyan-300 hover:underline">
            ← بازگشت به صفحه اصلی
          </Link>
          <h1 className="mt-2 text-2xl font-bold md:text-3xl">کلینیک‌های شنا</h1>
          <p className="mt-1 text-sm text-cyan-200">
            جلسات تخصصی و متمرکز برای اصلاح تکنیک؛ کلینیک مناسب را انتخاب کنید.
          </p>
        </div>

        {clinics.length === 0 ? (
          <p className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/75">
            هنوز کلینیکی ثبت نشده است. برای اطلاع از زمان شروع با مدرسه تماس بگیرید.
          </p>
        ) : (
          clinics.map((clinic) => (
            <ClinicCard
              key={clinic.id}
              clinic={clinic}
              selected={selectedId === clinic.id}
              onSelect={() => {
                setSelectedId(clinic.id);
                setFormError("");
              }}
            />
          ))
        )}

        {selectedClinic?.enabled ? (
          authLoading ? null : isAuthenticated ? (
            <section className="rounded-2xl border border-white/10 bg-white p-5 text-slate-900">
              <h2 className="font-bold">فرم ثبت‌نام — {selectedClinic.title}</h2>
              <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="text-sm">
                  <span className="text-slate-600">نام</span>
                  <input
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
                    required
                  />
                </label>
                <label className="text-sm">
                  <span className="text-slate-600">نام خانوادگی</span>
                  <input
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
                    required
                  />
                </label>
                <label className="text-sm">
                  <span className="text-slate-600">موبایل</span>
                  <input
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    dir="ltr"
                    placeholder="09xxxxxxxxx"
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-right"
                    required
                  />
                </label>
                <label className="text-sm">
                  <span className="text-slate-600">تاریخ تولد</span>
                  <div className="mt-1">
                    <PersianDateField value={birthDate} onChange={setBirthDate} />
                  </div>
                </label>
                <label className="text-sm">
                  <span className="text-slate-600">جنسیت (اختیاری)</span>
                  <select
                    value={gender}
                    onChange={(event) => setGender(event.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
                  >
                    <option value="">انتخاب کنید</option>
                    <option value="MALE">آقا</option>
                    <option value="FEMALE">خانم</option>
                  </select>
                </label>
                <label className="text-sm sm:col-span-2">
                  <span className="text-slate-600">توضیح (اختیاری)</span>
                  <textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    rows={2}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
                  />
                </label>
                {formError ? (
                  <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-800 sm:col-span-2">
                    {formError}
                  </p>
                ) : null}
                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-cyan-600 disabled:opacity-60 sm:col-span-2"
                >
                  {busy ? <ButtonSpinner /> : null}
                  ثبت‌نام در {selectedClinic.title}
                </button>
              </form>
            </section>
          ) : (
            <section className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-white/80">
              برای ثبت‌نام در کلینیک ابتدا وارد حساب خود شوید.
              <Link
                to="/auth?from=/clinic"
                className="mr-2 inline-flex rounded-xl bg-cyan-500 px-4 py-2 text-xs font-bold text-slate-900"
              >
                ورود / ثبت‌نام
              </Link>
            </section>
          )
        ) : null}

        {registrations.length ? (
          <section className="space-y-3 rounded-2xl border border-white/10 bg-white p-5 text-slate-900">
            <h2 className="font-bold">ثبت‌نام‌های کلینیک من</h2>
            {registrations.map((row) => (
              <div key={row.id} className="rounded-xl border border-slate-200 p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">
                    {row.firstName} {row.lastName}
                    {row.clinicTitle ? (
                      <span className="mr-2 rounded-lg bg-cyan-50 px-2 py-0.5 text-xs text-cyan-800">
                        {row.clinicTitle}
                      </span>
                    ) : null}
                  </span>
                  <span className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded-lg bg-slate-100 px-2 py-1">
                      {STATUS_LABELS[row.status] || row.status}
                    </span>
                    <span className="rounded-lg bg-slate-100 px-2 py-1">
                      {PAYMENT_LABELS[row.paymentStatus] || row.paymentStatus}
                    </span>
                  </span>
                </div>

                {row.paymentStatus !== "PAID" && row.status !== "CANCELLED" ? (
                  <div className="mt-3 space-y-3">
                    <CardBox cardToCard={cardToCard} />
                    {row.paymentStatus === "AWAITING_REVIEW" ? (
                      <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">
                        پرداخت شما ثبت شده و در انتظار تأیید مدیر است.
                      </p>
                    ) : (
                      <label className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-700">
                        <input
                          type="checkbox"
                          onChange={(event) => {
                            if (event.target.checked) reportPaid(row);
                            event.target.checked = false;
                          }}
                          className="mt-0.5 h-4 w-4 rounded border-slate-400"
                        />
                        <span>
                          مبلغ {formatToman(row.priceToman)} را کارت‌به‌کارت واریز کردم و تأیید
                          می‌کنم.
                        </span>
                      </label>
                    )}
                  </div>
                ) : null}
              </div>
            ))}
          </section>
        ) : null}
      </div>
    </div>
  );
}
