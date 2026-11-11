import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../services/useAuth";
import { getMyEnrollments, getPayment } from "../features/enrollments/enrollmentsApi";
import { getCourseClassById } from "../features/courses/coursesApi";
import { listParticipants } from "../features/participants/participantsApi";
import { getMyRecords, STROKE_LABELS } from "../features/records/recordsApi";
import { getMyClinicRegistrations, reportClinicPaid } from "../features/clinic/clinicApi";
import { getPublicSiteSettings, paymentQrUrl } from "../features/site/siteApi";
import { startCardToCardPayment } from "../features/payments/paymentsApi";
import { ENROLLMENT_STATUS_LABELS } from "../features/enrollments/enrollmentLabels";
import { SectionLoader } from "../components/Ui/Loading";
import ErrorState from "../components/Ui/ErrorState";
import { useToast } from "../components/feedback/useToast";

const CLINIC_STATUS_LABELS = {
  PENDING: "در انتظار تأیید",
  CONFIRMED: "تأیید شده",
  CANCELLED: "لغو شده",
  DONE: "برگزار شده",
};

const CLINIC_PAYMENT_LABELS = {
  UNPAID: "پرداخت نشده",
  AWAITING_REVIEW: "در انتظار تأیید پرداخت",
  PAID: "پرداخت تأیید شد",
};

function formatToman(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n) || n <= 0) return "—";
  return `${n.toLocaleString("fa-IR")} تومان`;
}

function formatDateFa(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("fa-IR");
  } catch {
    return "—";
  }
}

/** Card details + scannable QR, shared by class payments and the clinic. */
function CardTransferBox({ cardToCard }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  if (!cardToCard?.enabled || !cardToCard?.cardNumber) {
    return (
      <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
        شماره کارت هنوز توسط مدیر ثبت نشده است. لطفاً با پشتیبانی تماس بگیرید.
      </p>
    );
  }

  const digits = String(cardToCard.cardNumber).replace(/[^\d]/g, "");

  async function copyCard() {
    try {
      await navigator.clipboard.writeText(digits);
      setCopied(true);
      toast.success("شماره کارت کپی شد.");
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("کپی خودکار ممکن نشد؛ شماره کارت را دستی بردارید.");
    }
  }

  return (
    <div className="grid gap-4 rounded-2xl border border-cyan-200 bg-cyan-50/60 p-4 sm:grid-cols-[1fr_auto]">
      <div className="space-y-2">
        <div>
          <p className="text-xs text-slate-500">شماره کارت برای واریز</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span dir="ltr" className="font-mono text-lg font-bold tracking-wider text-slate-900">
              {cardToCard.cardNumber}
            </span>
            <button
              type="button"
              onClick={copyCard}
              className="rounded-lg border border-cyan-300 bg-white px-2.5 py-1 text-xs text-cyan-800 hover:bg-cyan-100"
            >
              {copied ? "کپی شد" : "کپی"}
            </button>
          </div>
        </div>
        <p className="text-sm text-slate-700">
          {[cardToCard.cardHolder, cardToCard.bankName].filter(Boolean).join(" · ") || "—"}
        </p>
        {cardToCard.instructions ? (
          <p className="text-xs leading-6 text-slate-600">{cardToCard.instructions}</p>
        ) : null}
      </div>
      {digits.length >= 16 ? (
        <figure className="justify-self-center text-center">
          <img
            src={paymentQrUrl(digits.slice(-4))}
            alt="کد QR پرداخت کارت به کارت"
            className="h-32 w-32 rounded-xl border border-cyan-200 bg-white p-1.5"
            loading="lazy"
          />
          <figcaption className="mt-1 text-[11px] text-slate-500">
            برای پرداخت اسکن کنید
          </figcaption>
        </figure>
      ) : null}
    </div>
  );
}

/** One unpaid class registration: report the card transfer with an explicit tick. */
function EnrollmentPayBox({ enrollment, title, cardToCard, onReported }) {
  const toast = useToast();
  const [trackingCode, setTrackingCode] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (!confirmed || busy) return;
    setBusy(true);
    try {
      await startCardToCardPayment({
        enrollmentId: enrollment.id,
        trackingCode: trackingCode.trim() || undefined,
      });
      toast.success("پرداخت شما ثبت شد و پس از تأیید مدیر، ثبت‌نام نهایی می‌شود.");
      setConfirmed(false);
      setTrackingCode("");
      onReported?.();
    } catch (err) {
      toast.error(err?.message || "ثبت پرداخت کارت‌به‌کارت ناموفق بود.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-bold text-slate-900">{title}</h3>
        <span className="rounded-lg bg-amber-100 px-2 py-1 text-xs text-amber-900">
          {formatToman(enrollment.finalAmount || enrollment.priceCharged || 0)}
        </span>
      </div>

      <CardTransferBox cardToCard={cardToCard} />

      <form onSubmit={submit} className="space-y-3">
        <label className="block text-sm">
          <span className="text-slate-600">کد پیگیری / شماره رسید (اختیاری)</span>
          <input
            value={trackingCode}
            onChange={(event) => setTrackingCode(event.target.value)}
            maxLength={60}
            placeholder="مثلاً ۱۲۳۴۵۶۷۸"
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-400"
          />
          <span>
            مبلغ را کارت‌به‌کارت واریز کردم و تأیید می‌کنم این پرداخت مربوط به همین ثبت‌نام است.
          </span>
        </label>

        <button
          type="submit"
          disabled={!confirmed || busy}
          className="rounded-xl bg-cyan-700 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "در حال ثبت…" : "ثبت پرداخت برای تأیید مدیر"}
        </button>
      </form>
    </div>
  );
}

function ClinicPayBox({ registration, cardToCard, onReported }) {
  const toast = useToast();
  const [trackingCode, setTrackingCode] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (!confirmed || busy) return;
    setBusy(true);
    try {
      await reportClinicPaid(registration.id, { trackingCode: trackingCode.trim() || undefined });
      toast.success("پرداخت کلینیک ثبت شد و در انتظار تأیید مدیر است.");
      setConfirmed(false);
      setTrackingCode("");
      onReported?.();
    } catch (err) {
      toast.error(err?.message || "ثبت پرداخت کلینیک ناموفق بود.");
    } finally {
      setBusy(false);
    }
  }

  if (registration.paymentStatus === "AWAITING_REVIEW") {
    return (
      <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
        پرداخت شما ثبت شده و در انتظار تأیید مدیر است.
      </p>
    );
  }
  if (registration.paymentStatus === "PAID") {
    return (
      <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
        پرداخت شما تأیید شده است.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <CardTransferBox cardToCard={cardToCard} />
      <form onSubmit={submit} className="space-y-3">
        <input
          value={trackingCode}
          onChange={(event) => setTrackingCode(event.target.value)}
          maxLength={60}
          placeholder="کد پیگیری / شماره رسید (اختیاری)"
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
        />
        <label className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-400"
          />
          <span>مبلغ کلینیک را کارت‌به‌کارت واریز کردم.</span>
        </label>
        <button
          type="submit"
          disabled={!confirmed || busy}
          className="rounded-xl bg-cyan-700 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-600 disabled:opacity-50"
        >
          {busy ? "در حال ثبت…" : "ثبت پرداخت کلینیک"}
        </button>
      </form>
    </div>
  );
}

/**
 * Member dashboard — deliberately small: profile, documents, records,
 * class/payment status and the card-to-card tick.
 */
export default function AppHomePage() {
  const { user } = useAuth();

  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [enrollments, setEnrollments] = useState([]);
  const [classes, setClasses] = useState({});
  const [payments, setPayments] = useState({});
  const [participants, setParticipants] = useState([]);
  const [records, setRecords] = useState([]);
  const [clinicRegistrations, setClinicRegistrations] = useState([]);
  const [cardToCard, setCardToCard] = useState(null);

  const load = useCallback(async (signal) => {
    setStatus("loading");
    setErrorMessage("");
    try {
      const [enrData, partData, recordData, siteData, clinicData] = await Promise.all([
        getMyEnrollments({ signal }),
        listParticipants({ signal }),
        getMyRecords({ signal }),
        getPublicSiteSettings({ signal }),
        getMyClinicRegistrations({ signal }).catch(() => ({ items: [] })),
      ]);

      if (signal?.aborted) return;

      const list = Array.isArray(enrData?.items) ? enrData.items : [];
      setEnrollments(list);
      setParticipants(Array.isArray(partData?.items) ? partData.items : []);
      setRecords(Array.isArray(recordData?.items) ? recordData.items : []);
      setClinicRegistrations(Array.isArray(clinicData?.items) ? clinicData.items : []);
      setCardToCard(siteData?.cardToCard || null);

      const classIds = [...new Set(list.map((row) => row.classId).filter(Boolean))];
      const classEntries = await Promise.all(
        classIds.map(async (id) => {
          try {
            const cls = await getCourseClassById(id, { signal });
            return [id, cls];
          } catch {
            return [id, null];
          }
        }),
      );

      const paymentIds = [...new Set(list.map((row) => row.paymentId).filter(Boolean))];
      const paymentEntries = await Promise.all(
        paymentIds.map(async (id) => {
          try {
            const payment = await getPayment(id, { signal });
            return [id, payment];
          } catch {
            return [id, null];
          }
        }),
      );

      if (signal?.aborted) return;

      setClasses(Object.fromEntries(classEntries));
      setPayments(Object.fromEntries(paymentEntries));
      setStatus("ready");
    } catch (err) {
      if (err?.code === "ABORTED") return;
      setErrorMessage(err?.message || "بارگذاری پنل ناموفق بود.");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    load(ac.signal);
    return () => ac.abort();
  }, [load]);

  const participantNames = useMemo(
    () =>
      Object.fromEntries(
        participants.map((p) => [p.id, `${p.firstName || ""} ${p.lastName || ""}`.trim()]),
      ),
    [participants],
  );

  const unpaid = useMemo(
    () =>
      enrollments.filter(
        (row) => ["PENDING", "PAYMENT_PENDING", "PAYMENT_FAILED"].includes(row.status),
      ),
    [enrollments],
  );

  const activeClinic = useMemo(
    () => clinicRegistrations.filter((row) => row.status !== "CANCELLED"),
    [clinicRegistrations],
  );

  if (user?.role === "ADMIN") {
    return <Navigate to="/admin" replace />;
  }

  if (status === "loading") {
    return <SectionLoader label="در حال آماده‌سازی پنل شما…" />;
  }

  if (status === "error") {
    return (
      <ErrorState title="پنل باز نشد" message={errorMessage} onRetry={() => load()} />
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            سلام{user?.firstName ? `، ${user.firstName}` : ""}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            مشخصات، مدارک، رکوردها و وضعیت پرداخت شما در یک نگاه.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/app/participants"
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
          >
            مشخصات و ویرایش
          </Link>
          <Link
            to="/app/documents"
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
          >
            بارگذاری مدارک
          </Link>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-bold text-slate-900">مشخصات</h2>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-slate-400">نام و نام خانوادگی</dt>
            <dd>{[user?.firstName, user?.lastName].filter(Boolean).join(" ") || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">موبایل</dt>
            <dd dir="ltr" className="text-right">{user?.phone || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">افراد ثبت‌شده</dt>
            <dd>{participants.length.toLocaleString("fa-IR")} نفر</dd>
          </div>
        </dl>
        {participants.length ? (
          <ul className="mt-3 flex flex-wrap gap-2">
            {participants.map((p) => (
              <li key={p.id}>
                <Link
                  to={`/app/participants/${p.id}`}
                  className="inline-flex rounded-xl bg-slate-100 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-200"
                >
                  {`${p.firstName || ""} ${p.lastName || ""}`.trim()}
                  {p.age != null ? ` · ${p.age.toLocaleString("fa-IR")} سال` : ""}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-slate-500">
            هنوز فردی ثبت نکرده‌اید. از بخش «مشخصات و ویرایش» اضافه کنید.
          </p>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-slate-900">وضعیت کلاس و پرداخت</h2>
          <Link to="/app/enrollments" className="text-sm text-cyan-700 hover:underline">
            همه ثبت‌نام‌ها
          </Link>
        </div>

        {enrollments.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
            هنوز در کلاسی ثبت‌نام نکرده‌اید.
          </p>
        ) : (
          <ul className="space-y-2">
            {enrollments.map((row) => {
              const payment = row.paymentId ? payments[row.paymentId] : null;
              return (
                <li
                  key={row.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                >
                  <span className="font-medium text-slate-900">
                    {classes[row.classId]?.title || "کلاس"}
                    {participantNames[row.participantId]
                      ? ` · ${participantNames[row.participantId]}`
                      : ""}
                  </span>
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-700">
                      {ENROLLMENT_STATUS_LABELS[row.status] || row.status}
                    </span>
                    {payment ? (
                      <span className="text-xs text-slate-500">
                        {payment.provider === "card_to_card" && payment.status === "PENDING"
                          ? "در انتظار تأیید پرداخت کارت‌به‌کارت"
                          : `پرداخت: ${payment.status}`}
                      </span>
                    ) : null}
                    <Link
                      to={`/app/enrollments/${row.id}`}
                      className="text-xs text-cyan-700 hover:underline"
                    >
                      جزئیات
                    </Link>
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        {unpaid.length ? (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              برای نهایی‌شدن ثبت‌نام، مبلغ را کارت‌به‌کارت واریز کنید و تیک تأیید را بزنید.
            </p>
            {unpaid.map((row) => (
              <EnrollmentPayBox
                key={row.id}
                enrollment={row}
                title={classes[row.classId]?.title || "ثبت‌نام کلاس"}
                cardToCard={cardToCard}
                onReported={() => load()}
              />
            ))}
          </div>
        ) : null}
      </section>

      {activeClinic.length ? (
        <section className="space-y-3">
          <h2 className="font-bold text-slate-900">کلینیک من</h2>
          {activeClinic.map((row) => (
            <div key={row.id} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-medium text-slate-900">
                  {row.clinicTitle || "کلینیک"} — {`${row.firstName} ${row.lastName}`}
                </span>
                <span className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-lg bg-slate-100 px-2 py-1">
                    {CLINIC_STATUS_LABELS[row.status] || row.status}
                  </span>
                  <span className="rounded-lg bg-slate-100 px-2 py-1">
                    {CLINIC_PAYMENT_LABELS[row.paymentStatus] || row.paymentStatus}
                  </span>
                  <span className="rounded-lg bg-cyan-50 px-2 py-1 text-cyan-900">
                    {formatToman(row.priceToman)}
                  </span>
                </span>
              </div>
              {row.status !== "CANCELLED" ? (
                <ClinicPayBox
                  registration={row}
                  cardToCard={cardToCard}
                  onReported={() => load()}
                />
              ) : null}
            </div>
          ))}
        </section>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-slate-900">رکوردهای من</h2>
          <Link to="/app/records" className="text-sm text-cyan-700 hover:underline">
            همه رکوردها
          </Link>
        </div>
        {records.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
            هنوز رکوردی برای شما ثبت نشده است؛ رکوردها را مدرسه وارد می‌کند.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
            {records.slice(0, 3).map((row) => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <span className="font-medium text-slate-900">
                  {`${row.firstName} ${row.lastName}`}
                  {row.age != null ? ` · ${row.age.toLocaleString("fa-IR")} سال` : ""}
                </span>
                <span className="text-slate-600">
                  {STROKE_LABELS[row.stroke] || row.stroke} · {row.distance.toLocaleString("fa-IR")} متر ·{" "}
                  <span dir="ltr" className="font-mono">{row.timeLabel}</span> · {formatDateFa(row.recordDate)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
