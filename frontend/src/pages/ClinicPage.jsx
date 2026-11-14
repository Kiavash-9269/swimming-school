import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  MapPin,
  Calendar,
  Clock,
  Users,
  Wallet,
  Phone,
  CreditCard,
} from "lucide-react";
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
      <p className="rounded-xl bg-amber-400/10 border border-amber-400/20 px-3 py-2 text-sm text-amber-200">
        اطلاعات کارت هنوز ثبت نشده است؛ با پشتیبانی تماس بگیرید.
      </p>
    );
  }
  const digits = String(cardToCard.cardNumber).replace(/[^\d]/g, "");
  return (
    <div className="grid gap-3 rounded-2xl border border-cyan-400/20 bg-white/10 backdrop-blur-sm p-4 sm:grid-cols-[1fr_auto]">
      <div className="space-y-1 text-sm">
        <p className="flex items-center gap-1.5 text-xs text-white/50">
          <CreditCard className="w-3.5 h-3.5" />
          شماره کارت
        </p>
        <p dir="ltr" className="font-mono text-lg font-bold text-cyan-200">
          {cardToCard.cardNumber}
        </p>
        <p className="text-sky-100">
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
          className="rounded-lg border border-cyan-400/30 bg-white/10 px-2.5 py-1 text-xs text-cyan-200 transition hover:bg-white/20"
        >
          کپی شماره کارت
        </button>
        {cardToCard.instructions ? (
          <p className="text-xs leading-6 text-white/60">{cardToCard.instructions}</p>
        ) : null}
      </div>
      {digits.length >= 16 ? (
        <img
          src={paymentQrUrl(digits.slice(-4))}
          alt="کد QR پرداخت"
          className="h-28 w-28 justify-self-center rounded-xl border border-white/20 bg-white p-1.5"
        />
      ) : null}
    </div>
  );
}

function ClinicCard({ clinic, selected, onSelect }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border p-5 text-sm leading-8 backdrop-blur-sm transition ${
        selected
          ? "border-cyan-400/60 bg-cyan-400/10 text-white"
          : "border-white/20 bg-white/10 text-sky-100"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">{clinic.title}</h2>
          {clinic.subtitle ? (
            <p className="text-sm text-sky-200">{clinic.subtitle}</p>
          ) : null}
        </div>
        <span className="rounded-xl bg-white/10 border border-white/10 px-3 py-1 text-sm text-white/80">
          هزینه: <strong className="text-cyan-200">{formatToman(clinic.priceToman)}</strong>
        </span>
      </div>

      {clinic.description ? (
        <p className="mt-3 text-sky-100">{clinic.description}</p>
      ) : null}

      <div className="mt-3 grid gap-2 sm:grid-cols-2 text-sky-100">
        {clinic.schedule ? (
          <p className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-cyan-300" />
            زمان: {clinic.schedule}
          </p>
        ) : null}
        {clinic.location ? (
          <p className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-cyan-300" />
            محل: {clinic.location}
          </p>
        ) : null}
        {clinic.startDate || clinic.endDate ? (
          <p className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-cyan-300" />
            بازه: {[clinic.startDate, clinic.endDate].filter(Boolean).join(" تا ")}
          </p>
        ) : null}
        <p className="flex items-center gap-1.5">
          <Users className="w-4 h-4 text-cyan-300" />
          ظرفیت باقی‌مانده:{" "}
          {clinic.remaining == null
            ? "نامحدود"
            : `${Number(clinic.remaining).toLocaleString("fa-IR")} نفر`}
        </p>
        {clinic.phone ? (
          <p dir="ltr" className="flex items-center gap-1.5 text-left sm:text-right">
            <Phone className="w-4 h-4 text-cyan-300" />
            تماس: {clinic.phone}
          </p>
        ) : null}
      </div>

      {clinic.notice ? (
        <p className="mt-3 rounded-xl bg-amber-400/10 border border-amber-400/20 px-3 py-2 text-xs text-amber-200">
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
    </motion.section>
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
    <div
      dir="rtl"
      className="min-h-screen bg-sky-950 p-4 md:p-8 flex flex-col items-center"
    >
      <div className="w-full max-w-7xl">
        {/* HEADER */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 pt-8 max-w-7xl mx-auto text-center"
        >
          <header className="text-center mt-8 mb-8 md:mb-12">
            <h1 className="text-3xl md:text-4xl font-medium text-white mb-4">
              کلینیک‌های شنا
            </h1>
            <div className="w-16 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent mx-auto mb-4"></div>
            <p className="text-gray-300 max-w-4xl mx-auto text-sm md:text-base leading-relaxed">
              جلسات تخصصی و متمرکز برای اصلاح تکنیک؛ کلینیک مناسب را انتخاب کنید.
            </p>
          </header>
        </motion.div>

        <div className="mx-auto max-w-4xl space-y-6 px-4">
          {clinics.length === 0 ? (
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-sm p-6 text-sm text-sky-100"
            >
              هنوز کلینیکی ثبت نشده است. برای اطلاع از زمان شروع با مدرسه تماس بگیرید.
            </motion.p>
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
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-sm p-6 md:p-8 text-white"
              >
                <h2 className="font-bold text-white text-xl">
                  فرم ثبت‌نام — {selectedClinic.title}
                </h2>
                <div className="w-full h-px bg-white/20 my-4"></div>
                <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="text-sm">
                    <span className="text-sky-200">نام</span>
                    <input
                      value={firstName}
                      onChange={(event) => setFirstName(event.target.value)}
                      className="mt-1 w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:border-cyan-400/60"
                      required
                    />
                  </label>
                  <label className="text-sm">
                    <span className="text-sky-200">نام خانوادگی</span>
                    <input
                      value={lastName}
                      onChange={(event) => setLastName(event.target.value)}
                      className="mt-1 w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:border-cyan-400/60"
                      required
                    />
                  </label>
                  <label className="text-sm">
                    <span className="text-sky-200">موبایل</span>
                    <input
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      dir="ltr"
                      placeholder="09xxxxxxxxx"
                      className="mt-1 w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-right text-white placeholder:text-white/40 focus:outline-none focus:border-cyan-400/60"
                      required
                    />
                  </label>
                  <label className="text-sm">
                    <span className="text-sky-200">تاریخ تولد</span>
                    <div className="mt-1">
                      <PersianDateField value={birthDate} onChange={setBirthDate} />
                    </div>
                  </label>
                  <label className="text-sm">
                    <span className="text-sky-200">جنسیت (اختیاری)</span>
                    <select
                      value={gender}
                      onChange={(event) => setGender(event.target.value)}
                      className="mt-1 w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-white focus:outline-none focus:border-cyan-400/60"
                    >
                      <option value="">انتخاب کنید</option>
                      <option value="MALE">آقا</option>
                      <option value="FEMALE">خانم</option>
                    </select>
                  </label>
                  <label className="text-sm sm:col-span-2">
                    <span className="text-sky-200">توضیح (اختیاری)</span>
                    <textarea
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      rows={2}
                      className="mt-1 w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:border-cyan-400/60"
                    />
                  </label>
                  {formError ? (
                    <p className="rounded-xl bg-rose-500/10 border border-rose-400/30 px-3 py-2 text-sm text-rose-200 sm:col-span-2">
                      {formError}
                    </p>
                  ) : null}
                  <button
                    type="submit"
                    disabled={busy}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-bold text-slate-900 transition hover:bg-cyan-400 disabled:opacity-60 sm:col-span-2"
                  >
                    {busy ? <ButtonSpinner /> : null}
                    ثبت‌نام در {selectedClinic.title}
                  </button>
                </form>
              </motion.section>
            ) : (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-sm p-5 text-sm text-sky-100"
              >
                برای ثبت‌نام در کلینیک ابتدا وارد حساب خود شوید.
                <Link
                  to="/auth?from=/clinic"
                  className="mr-2 inline-flex rounded-xl bg-cyan-500 px-4 py-2 text-xs font-bold text-slate-900 transition hover:bg-cyan-400"
                >
                  ورود / ثبت‌نام
                </Link>
              </motion.section>
            )
          ) : null}

          {registrations.length ? (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3 rounded-2xl border border-white/20 bg-white/10 backdrop-blur-sm p-6 text-white"
            >
              <h2 className="font-bold text-white text-lg">ثبت‌نام‌های کلینیک من</h2>
              <div className="w-full h-px bg-white/20 my-2"></div>
              {registrations.map((row) => (
                <div
                  key={row.id}
                  className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-white">
                      {row.firstName} {row.lastName}
                      {row.clinicTitle ? (
                        <span className="mr-2 rounded-lg bg-cyan-400/15 px-2 py-0.5 text-xs text-cyan-200">
                          {row.clinicTitle}
                        </span>
                      ) : null}
                    </span>
                    <span className="flex flex-wrap gap-2 text-xs">
                      <span className="rounded-lg bg-white/10 px-2 py-1 text-sky-100">
                        {STATUS_LABELS[row.status] || row.status}
                      </span>
                      <span className="rounded-lg bg-white/10 px-2 py-1 text-sky-100">
                        {PAYMENT_LABELS[row.paymentStatus] || row.paymentStatus}
                      </span>
                    </span>
                  </div>

                  {row.paymentStatus !== "PAID" && row.status !== "CANCELLED" ? (
                    <div className="mt-3 space-y-3">
                      <CardBox cardToCard={cardToCard} />
                      {row.paymentStatus === "AWAITING_REVIEW" ? (
                        <p className="rounded-xl bg-amber-400/10 border border-amber-400/20 px-3 py-2 text-xs text-amber-200">
                          پرداخت شما ثبت شده و در انتظار تأیید مدیر است.
                        </p>
                      ) : (
                        <label className="flex items-start gap-2 rounded-xl bg-white/5 border border-white/10 p-3 text-xs text-sky-100">
                          <input
                            type="checkbox"
                            onChange={(event) => {
                              if (event.target.checked) reportPaid(row);
                              event.target.checked = false;
                            }}
                            className="mt-0.5 h-4 w-4 rounded border-white/40 accent-cyan-500"
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
            </motion.section>
          ) : null}
        </div>
      </div>
    </div>
  );
}