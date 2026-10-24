import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { createParticipant, updateParticipant } from "../../features/participants/participantsApi";
import ParticipantFormFields from "../../features/participants/components/ParticipantFormFields";
import {
  buildParticipantPayload,
  validateParticipantForm,
  userMessageFromParticipantError,
} from "../../features/participants/participantLabels";
import { getCourseClassById } from "../../features/courses/coursesApi";
import { GENDER_LABELS, RELATION_LABELS } from "../../features/participants/participantLabels";
import {
  checkEligibility,
  getClassAvailability,
  createReservation,
  joinWaitlist,
  confirmEnrollment,
  makeIdempotencyKey,
  stashCheckoutContext,
} from "../../features/enrollments/enrollmentsApi";
import {
  labelEligibilityReason,
  formatExpiryFa,
  secondsUntil,
  formatCountdown,
  userMessageFromEnrollmentError,
  formatIrrAmount,
  ENROLLMENT_STATUS_LABELS,
} from "../../features/enrollments/enrollmentLabels";
import { WAITLIST_STATUS_LABELS } from "../../features/reports/reportLabels";
import { SectionLoader } from "../../components/Ui/Loading";
import ErrorState from "../../components/Ui/ErrorState";
import ForbiddenState from "../../components/Ui/ForbiddenState";
import { useToast } from "../../components/feedback/useToast";

/** Mongo ObjectId or marketing catalogKey */
const CLASS_REF_RE = /^([a-f\d]{24}|[a-z0-9][\w:.-]{1,119})$/i;

const INITIAL_FORM = {
  firstName: "",
  lastName: "",
  birthDate: "",
  gender: "",
  relation: "SELF",
  fatherOccupation: "",
  phone: "",
  medicalConfirmed: false,
  emergencyContact: { name: "", phone: "", relationship: "" },
};

/**
 * F5: class → participant → eligibility → availability → HELD → confirm/checkout.
 * Compliance upload out of scope.
 */
export default function AppClassRegisterPage() {
  const { classId } = useParams();
  const toast = useToast();
  const validId = CLASS_REF_RE.test(classId || "");
  const confirmKeyRef = useRef(null);
  const [courseClass, setCourseClass] = useState(null);
  const [bootStatus, setBootStatus] = useState("loading");
  const [bootError, setBootError] = useState("");
  const [bootForbidden, setBootForbidden] = useState(false);

  const [selectedId, setSelectedId] = useState(null);
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [editing, setEditing] = useState(true);
  const [formValues, setFormValues] = useState(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const [eligibility, setEligibility] = useState(null);
  const [eligibilityStatus, setEligibilityStatus] = useState("idle");
  const [eligibilityError, setEligibilityError] = useState("");

  const [availability, setAvailability] = useState(null);
  const [availabilityStatus, setAvailabilityStatus] = useState("idle");
  const [availabilityError, setAvailabilityError] = useState("");

  const [actionStatus, setActionStatus] = useState("idle");
  const [actionError, setActionError] = useState("");

  const [reservation, setReservation] = useState(null);
  const [waitlistEntry, setWaitlistEntry] = useState(null);
  const [holdSecondsLeft, setHoldSecondsLeft] = useState(null);
  const [checkoutStatus, setCheckoutStatus] = useState("idle");
  const [checkoutError, setCheckoutError] = useState("");
  const [confirmedEnrollment, setConfirmedEnrollment] = useState(null);
  const [confirmedQuote, setConfirmedQuote] = useState(null);

  const loadBoot = useCallback(
    async (signal) => {
      if (!validId) {
        setBootStatus("error");
        setBootError("شناسه کلاس نامعتبر است.");
        return;
      }
      setBootStatus("loading");
      setBootError("");
      setBootForbidden(false);
      try {
        const cls = await getCourseClassById(classId, { signal });
        setCourseClass(cls);
        setBootStatus("ready");
      } catch (err) {
        if (err?.code === "ABORTED") return;
        if (err?.status === 403 || err?.code === "FORBIDDEN") {
          setBootForbidden(true);
          setBootStatus("error");
          return;
        }
        setBootError(userMessageFromEnrollmentError(err, "بارگذاری کلاس ناموفق بود."));
        setBootStatus("error");
      }
    },
    [classId, validId],
  );

  const loadAvailability = useCallback(
    async (signal) => {
      if (!validId) return;
      setAvailabilityStatus("loading");
      setAvailabilityError("");
      try {
        const data = await getClassAvailability(classId, { signal });
        setAvailability(data);
        setAvailabilityStatus("ready");
        return data;
      } catch (err) {
        if (err?.code === "ABORTED") return null;
        setAvailabilityError(userMessageFromEnrollmentError(err, "بررسی ظرفیت ناموفق بود."));
        setAvailabilityStatus("error");
        return null;
      }
    },
    [classId, validId],
  );

  const runEligibility = useCallback(
    async (participantId, signal) => {
      setEligibilityStatus("loading");
      setEligibilityError("");
      setEligibility(null);
      try {
        const data = await checkEligibility(classId, participantId, { signal });
        setEligibility(data);
        setEligibilityStatus("ready");
        return data;
      } catch (err) {
        if (err?.code === "ABORTED") return null;
        if (err?.status === 403 || err?.code === "FORBIDDEN") {
          setEligibilityError("دسترسی به این شرکت‌کننده مجاز نیست.");
        } else {
          setEligibilityError(userMessageFromEnrollmentError(err, "بررسی شرایط ناموفق بود."));
        }
        setEligibilityStatus("error");
        return null;
      }
    },
    [classId],
  );

  useEffect(() => {
    const ac = new AbortController();
    loadBoot(ac.signal);
    loadAvailability(ac.signal);
    return () => ac.abort();
  }, [loadBoot, loadAvailability]);

  useEffect(() => {
    if (!selectedId) {
      setEligibility(null);
      setEligibilityStatus("idle");
      setEligibilityError("");
      setActionError("");
      return;
    }
    const ac = new AbortController();
    runEligibility(selectedId, ac.signal);
    return () => ac.abort();
  }, [selectedId, runEligibility]);

  useEffect(() => {
    if (!reservation?.expiresAt) {
      setHoldSecondsLeft(null);
      return;
    }
    const tick = () => setHoldSecondsLeft(secondsUntil(reservation.expiresAt));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [reservation?.expiresAt]);

  const selected = selectedParticipant;
  const eligible = eligibilityStatus === "ready" && eligibility?.eligible === true;
  const availReady = availabilityStatus === "ready" && availability;
  const registrationOpen = availReady ? availability.registrationOpen === true : false;
  const isFull = availReady ? availability.isFull === true : false;
  const seatsAvailable = availReady && registrationOpen && !isFull;
  const submitting = actionStatus === "reserving" || actionStatus === "waitlisting";
  const confirming = checkoutStatus === "confirming" || checkoutStatus === "redirecting";
  const outcome = confirmedEnrollment
    ? "enrolled"
    : reservation
      ? "held"
      : waitlistEntry
        ? "waitlisted"
        : null;

  const canReserve =
    Boolean(selectedId) &&
    eligible &&
    seatsAvailable &&
    !submitting &&
    !confirming &&
    eligibilityStatus !== "loading" &&
    availabilityStatus !== "loading" &&
    !outcome;

  const canWaitlist =
    Boolean(selectedId) &&
    eligible &&
    registrationOpen &&
    isFull &&
    !submitting &&
    !confirming &&
    eligibilityStatus !== "loading" &&
    availabilityStatus !== "loading" &&
    !outcome;

  const canCheckout =
    Boolean(reservation?.id) &&
    !holdExpiredClient(reservation, holdSecondsLeft) &&
    !confirming &&
    !confirmedEnrollment;

  function holdExpiredClient(res, secondsLeft) {
    if (!res?.expiresAt) return false;
    if (secondsLeft === 0) return true;
    return secondsUntil(res.expiresAt) <= 0;
  }

  async function handleReserve() {
    if (!canReserve || !selectedId) return;
    setActionStatus("reserving");
    setActionError("");
    const key = makeIdempotencyKey("res");
    try {
      const data = await createReservation(classId, selectedId, key);
      setReservation(data);
      setWaitlistEntry(null);
      setActionStatus("idle");
      toast.success("جای شما موقتاً نگه داشته شد.");
      await loadAvailability();
    } catch (err) {
      setActionStatus("idle");
      const msg = userMessageFromEnrollmentError(err, "رزرو ناموفق بود.");
      setActionError(msg);

      if (err?.code === "COURSE_FULL") {
        toast.error(msg);
        const next = await loadAvailability();
        if (next?.isFull) {
          /* waitlist CTA appears via canWaitlist */
        }
        return;
      }
      if (err?.code === "ELIGIBILITY_FAILED") {
        toast.error(msg);
        await runEligibility(selectedId);
        const reasons = err?.details?.reasons;
        if (Array.isArray(reasons) && reasons.length) {
          setEligibility({
            eligible: false,
            reasons,
            age: eligibility?.age,
            evaluatedAt: new Date().toISOString(),
            ruleVersion: eligibility?.ruleVersion,
          });
          setEligibilityStatus("ready");
        }
        return;
      }
      if (err?.code === "REGISTRATION_CLOSED") {
        toast.error(msg);
        await loadAvailability();
        return;
      }
      toast.error(msg);
    }
  }

  async function handleWaitlist() {
    if (!canWaitlist || !selectedId) return;
    setActionStatus("waitlisting");
    setActionError("");
    try {
      const data = await joinWaitlist(classId, selectedId);
      setWaitlistEntry(data);
      setReservation(null);
      setActionStatus("idle");
      toast.success("به لیست انتظار اضافه شدید.");
    } catch (err) {
      setActionStatus("idle");
      const msg = userMessageFromEnrollmentError(err, "پیوستن به لیست انتظار ناموفق بود.");
      setActionError(msg);
      if (err?.code === "COURSE_NOT_FULL") {
        toast.error(msg);
        await loadAvailability();
        return;
      }
      if (err?.code === "ELIGIBILITY_FAILED") {
        toast.error(msg);
        await runEligibility(selectedId);
        return;
      }
      toast.error(msg);
    }
  }

  async function handleCheckout() {
    if (!reservation?.id || confirming || confirmedEnrollment) return;
    if (holdExpiredClient(reservation, holdSecondsLeft)) {
      setCheckoutError(
        "مدت نگه‌داری جا به پایان رسیده است؛ در صورت نیاز دوباره ثبت‌نام کنید.",
      );
      return;
    }

    if (!confirmKeyRef.current) {
      confirmKeyRef.current = makeIdempotencyKey("confirm");
    }

    setCheckoutStatus("confirming");
    setCheckoutError("");

    try {
      const data = await confirmEnrollment(reservation.id, {
        idempotencyKey: confirmKeyRef.current,
      });

      const enrollment = data?.enrollment;
      const payment = data?.payment;
      const gateway = data?.gateway;
      const quote = data?.quote;

      if (gateway?.zeroAmount || gateway?.requiresRedirect === false) {
        setConfirmedQuote(quote || null);
        setConfirmedEnrollment(enrollment);
        setReservation(null);
        setCheckoutStatus("idle");
        confirmKeyRef.current = null;
        toast.success("ثبت‌نام تأیید شد.");
        return;
      }

      if (gateway?.requiresRedirect && gateway?.redirectUrl) {
        stashCheckoutContext({
          paymentId: payment?.id,
          enrollmentId: enrollment?.id,
          classId,
          reservationId: reservation.id,
          authority: gateway.authority || payment?.authority || null,
        });
        setCheckoutStatus("redirecting");
        toast.info("در حال انتقال به درگاه پرداخت…");
        window.location.assign(gateway.redirectUrl);
        return;
      }

      setCheckoutStatus("idle");
      setCheckoutError("پاسخ درگاه پرداخت ناقص بود. پرداخت جدیدی از این صفحه ساخته نشد.");
      toast.error("پاسخ درگاه ناقص بود.");
    } catch (err) {
      setCheckoutStatus("idle");
      const msg = userMessageFromEnrollmentError(err, "شروع پرداخت ناموفق بود.");
      setCheckoutError(msg);

      if (err?.code === "RESERVATION_EXPIRED" || err?.code === "RESERVATION_NOT_FOUND") {
        toast.error(msg);
        setReservation(null);
        confirmKeyRef.current = null;
        await loadAvailability();
        return;
      }
      if (err?.code === "NOT_ELIGIBLE" || err?.code === "ELIGIBILITY_FAILED") {
        toast.error(msg);
        if (selectedId) await runEligibility(selectedId);
        return;
      }
      if (err?.code === "ENROLLMENT_ALREADY_EXISTS") {
        toast.error(msg);
        confirmKeyRef.current = null;
        return;
      }
      toast.error(msg);
    }
  }

  async function handleParticipantSubmit(e) {
    e.preventDefault();
    if (formSubmitting) return;
    const errs = validateParticipantForm(formValues, { requireMedical: true });
    setFormErrors(errs);
    if (Object.keys(errs).length) return;

    setFormSubmitting(true);
    setFormError("");
    try {
      const payload = buildParticipantPayload(formValues);
      const isUpdate = Boolean(selectedId);
      const saved = isUpdate
        ? await updateParticipant(selectedId, payload)
        : await createParticipant(payload);
      setSelectedParticipant(saved);
      setSelectedId(saved.id);
      setEditing(false);
      setFormErrors({});
      toast.success(isUpdate ? "اطلاعات شرکت‌کننده به‌روزرسانی شد." : "اطلاعات شرکت‌کننده ثبت شد.");
      if (isUpdate) runEligibility(saved.id);
    } catch (err) {
      setFormError(
        userMessageFromParticipantError(err, "ثبت اطلاعات شرکت‌کننده ناموفق بود."),
      );
    } finally {
      setFormSubmitting(false);
    }
  }

  function resetOutcome() {
    setReservation(null);
    setWaitlistEntry(null);
    setActionError("");
    setHoldSecondsLeft(null);
    setCheckoutError("");
    setCheckoutStatus("idle");
    setConfirmedEnrollment(null);
    setConfirmedQuote(null);
    confirmKeyRef.current = null;
    loadAvailability();
    if (selectedId) runEligibility(selectedId);
  }

  if (bootStatus === "loading") {
    return <SectionLoader label="در حال بارگذاری…" />;
  }

  if (bootForbidden) {
    return <ForbiddenState title="دسترسی مجاز نیست" message="امکان مشاهده این کلاس وجود ندارد." />;
  }

  if (bootStatus === "error") {
    return (
      <ErrorState title="خطا" message={bootError} onRetry={() => loadBoot()} />
    );
  }

  const holdExpired = reservation && holdSecondsLeft === 0;

  return (
    <div className="space-y-6">
      <div>
        <Link to={`/app/courses/${classId}`} className="text-sm text-cyan-700 hover:underline">
          ← بازگشت به جزئیات کلاس
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">شروع ثبت‌نام</h1>
        <p className="mt-1 text-sm text-slate-600">
          {courseClass?.title || "کلاس"} — تکمیل اطلاعات، بررسی شرایط و ثبت‌نام موقت
        </p>
        <p className="mt-2 text-xs text-amber-800">
          پس از ثبت‌نام موقت می‌توانید پرداخت را انجام دهید. تا پرداخت موفق، ثبت‌نام قطعی نیست.
        </p>
      </div>

      {/* Availability */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-bold text-slate-900">ظرفیت کلاس</h2>
          <button
            type="button"
            onClick={() => loadAvailability()}
            disabled={availabilityStatus === "loading"}
            className="text-sm text-cyan-700 hover:underline disabled:opacity-50"
          >
            به‌روزرسانی
          </button>
        </div>
        {availabilityStatus === "loading" ? (              <p className="mt-3 text-sm text-slate-500">در حال بررسی ظرفیت…</p>
        ) : null}
        {availabilityStatus === "error" ? (
          <ErrorState title="خطا" message={availabilityError} onRetry={() => loadAvailability()} />
        ) : null}
        {availReady ? (
          <dl className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-slate-400">وضعیت ثبت‌نام</dt>
              <dd>
                {availability.registrationOpen
                  ? "باز"
                  : "بسته"}
                {availability.status ? (
                  <span className="text-slate-400"> ({availability.status})</span>
                ) : null}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">کل / قطعی / در انتظار پرداخت / باقی‌مانده</dt>
              <dd>
                {[availability.capacity, availability.confirmed, availability.held, availability.available]
                  .map((n) => (n != null ? Number(n).toLocaleString("fa-IR") : "—"))
                  .join(" / ")}
              </dd>
            </div>
            <div className="sm:col-span-2">
              {!availability.registrationOpen ? (
                <p className="rounded-xl bg-slate-100 px-3 py-2 text-slate-700">ثبت‌نام این کلاس باز نیست.</p>
              ) : availability.isFull ? (
                <p className="rounded-xl bg-amber-50 px-3 py-2 text-amber-900">
                  کلاس پر است — در صورت واجدشرایطی می‌توانید به لیست انتظار بپیوندید.
                </p>
              ) : (
                <p className="rounded-xl bg-emerald-50 px-3 py-2 text-emerald-900">
                  ظرفیت خالی دارد؛ می‌توانید ثبت‌نام کنید.
                </p>
              )}
            </div>
          </dl>
        ) : null}
      </section>

      {/* Outcome: confirmed enrollment (e.g. zero-amount) */}
      {confirmedEnrollment ? (
        <section className="rounded-2xl border border-emerald-300 bg-emerald-50 p-5">
          <h2 className="font-bold text-emerald-950">
            {confirmedEnrollment.status === "PENDING_COMPLIANCE"
              ? "پرداخت موفق — در انتظار مدارک"
              : "ثبت‌نام با موفقیت انجام شد"}
          </h2>
          <p className="mt-2 text-sm text-emerald-900">
            وضعیت ثبت‌نام:
            {confirmedEnrollment.status
              ? ` ${ENROLLMENT_STATUS_LABELS[confirmedEnrollment.status] || confirmedEnrollment.status}`
              : ""}
          </p>
          {confirmedEnrollment.status === "PENDING_COMPLIANCE" ? (
            <p className="mt-2 text-sm text-amber-900">
              پرداخت با موفقیت انجام شده، اما برای نهایی‌شدن ثبت‌نام باید مدارک/تأییدیه‌های لازم تکمیل
              شود.
            </p>
          ) : null}
          <dl className="mt-4 grid gap-2 text-sm text-emerald-950 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-emerald-700/80">شناسه ثبت‌نام</dt>
              <dd className="font-mono text-xs break-all">{confirmedEnrollment.id}</dd>
            </div>
            {confirmedQuote?.finalPrice != null ? (
              <div>
                <dt className="text-xs text-emerald-700/80">مبلغ نهایی</dt>
                <dd>{formatIrrAmount(confirmedQuote.finalPrice)}</dd>
              </div>
            ) : null}
          </dl>
          <div className="mt-4 flex flex-wrap gap-3">
            {confirmedEnrollment.status === "PENDING_COMPLIANCE" ? (
              <Link
                to={`/app/enrollments/${confirmedEnrollment.id}/compliance`}
                className="rounded-xl bg-cyan-700 px-4 py-2 text-sm text-white hover:bg-cyan-600"
              >
                تکمیل مدارک
              </Link>
            ) : null}
            <Link
              to={`/app/courses/${classId}`}
              className="rounded-xl border border-emerald-300 bg-white px-4 py-2 text-sm text-emerald-900"
            >
              بازگشت به کلاس
            </Link>
            <button
              type="button"
              onClick={resetOutcome}
              className="rounded-xl border border-emerald-300 bg-white px-4 py-2 text-sm text-emerald-900"
            >
              ثبت‌نام دیگر
            </button>
          </div>
        </section>
      ) : null}

      {/* Outcome: held */}
      {reservation && !confirmedEnrollment ? (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <h2 className="font-bold text-emerald-950">در انتظار پرداخت</h2>
          <p className="mt-2 text-sm text-emerald-900">
            جای شما موقتاً نگه داشته شده است؛ هنوز ثبت‌نام قطعی نیست. برای قطعی‌شدن، پرداخت را
            انجام دهید.
          </p>
          <dl className="mt-4 grid gap-2 text-sm text-emerald-950 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-emerald-700/80">کد پیگیری موقت</dt>
              <dd className="font-mono text-xs break-all">{reservation.id}</dd>
            </div>
            <div>
              <dt className="text-xs text-emerald-700/80">وضعیت</dt>
              <dd>
                {reservation.status === "HELD" || !reservation.status
                  ? "نگه‌داشته شده"
                  : reservation.status}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-emerald-700/80">انقضا</dt>
              <dd>{formatExpiryFa(reservation.expiresAt)}</dd>
            </div>
            <div>
              <dt className="text-xs text-emerald-700/80">زمان باقی‌مانده</dt>
              <dd>
                {holdExpired
                  ? "ممکن است منقضی شده باشد"
                  : holdSecondsLeft != null
                    ? formatCountdown(holdSecondsLeft)
                    : "—"}
              </dd>
            </div>
            {selected ? (
              <div className="sm:col-span-2">
                <dt className="text-xs text-emerald-700/80">شرکت‌کننده</dt>
                <dd>
                  {selected.firstName} {selected.lastName}
                </dd>
              </div>
            ) : null}
          </dl>
          {holdExpired ? (
            <p className="mt-3 text-sm text-amber-900">
              مدت نگه‌داری جا به پایان رسیده و پرداخت غیرفعال شده است؛ در صورت نیاز دوباره ثبت‌نام
              کنید.
            </p>
          ) : null}
          {checkoutError ? (
            <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert">
              {checkoutError}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={!canCheckout}
              onClick={handleCheckout}
              className="rounded-xl bg-cyan-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-cyan-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
            >
              {checkoutStatus === "redirecting"
                ? "انتقال به درگاه…"
                : checkoutStatus === "confirming"
                  ? "در حال شروع پرداخت…"
                  : "پرداخت و قطعی‌کردن ثبت‌نام"}
            </button>
            <button
              type="button"
              onClick={resetOutcome}
              disabled={confirming}
              className="rounded-xl border border-emerald-300 bg-white px-4 py-2 text-sm text-emerald-900 hover:bg-emerald-100 disabled:opacity-50"
            >
              شروع مجدد
            </button>
          </div>
        </section>
      ) : null}

      {/* Outcome: waitlist */}
      {waitlistEntry && !confirmedEnrollment ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="font-bold text-amber-950">در لیست انتظار</h2>
          <p className="mt-2 text-sm text-amber-900">
            جایی برای شما رزرو نشده است. در صورت آزاد شدن ظرفیت، درخواست شما به‌صورت خودکار
            پیگیری می‌شود.
          </p>
          <dl className="mt-4 grid gap-2 text-sm text-amber-950 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-amber-800/80">وضعیت</dt>
              <dd>
                {WAITLIST_STATUS_LABELS[waitlistEntry.status] ||
                  WAITLIST_STATUS_LABELS.WAITING}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-amber-800/80">موقعیت</dt>
              <dd>
                {waitlistEntry.position != null
                  ? Number(waitlistEntry.position).toLocaleString("fa-IR")
                  : "—"}
              </dd>
            </div>
            {selected ? (
              <div className="sm:col-span-2">
                <dt className="text-xs text-amber-800/80">شرکت‌کننده</dt>
                <dd>
                  {selected.firstName} {selected.lastName}
                </dd>
              </div>
            ) : null}
          </dl>
          <button
            type="button"
            onClick={resetOutcome}
            className="mt-4 rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm text-amber-950 hover:bg-amber-100"
          >
            بازگشت به انتخاب
          </button>
        </section>
      ) : null}

      {!outcome ? (
        <>
          {/* Participant details — inline form */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-bold text-slate-900">۱. اطلاعات شرکت‌کننده</h2>
              {selected && !editing ? (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  disabled={submitting || confirming}
                  className="text-sm text-cyan-700 hover:underline disabled:opacity-50"
                >
                  ویرایش اطلاعات
                </button>
              ) : null}
            </div>

            {!selected || editing ? (
              <form onSubmit={handleParticipantSubmit} className="mt-4 space-y-5">
                <p className="text-sm text-slate-600">
                  اطلاعات خود یا فرزندتان را همین‌جا وارد کنید؛ نیازی به ثبت جداگانه نیست.
                </p>
                <ParticipantFormFields
                  values={formValues}
                  errors={formErrors}
                  onChange={setFormValues}
                  disabled={formSubmitting}
                />
                {formError ? (
                  <p
                    className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
                    role="alert"
                  >
                    {formError}
                  </p>
                ) : null}
                <button
                  type="submit"
                  disabled={formSubmitting || submitting || confirming}
                  className="inline-flex w-full items-center justify-center rounded-xl bg-cyan-700 px-5 py-3 text-sm font-medium text-white hover:bg-cyan-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600 sm:w-auto"
                >
                  {formSubmitting ? "در حال ثبت اطلاعات…" : "بررسی شرایط و ادامه"}
                </button>
              </form>
            ) : (
              <div className="mt-4 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-950">
                <span className="font-medium">
                  {selected.firstName} {selected.lastName}
                </span>
                <span className="text-cyan-800">
                  {" · "}
                  {RELATION_LABELS[selected.relation] || selected.relation}
                  {" · "}
                  {GENDER_LABELS[selected.gender] || selected.gender}
                </span>
              </div>
            )}
          </section>

          {/* Eligibility */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-bold text-slate-900">۲. بررسی شرایط</h2>
            {!selectedId ? (
              <p className="mt-3 text-sm text-slate-500">
                ابتدا اطلاعات شرکت‌کننده را کامل کنید تا شرایط بررسی شود.
              </p>
            ) : null}
            {selectedId && eligibilityStatus === "loading" ? (
              <p className="mt-3 text-sm text-slate-500">در حال بررسی شرایط…</p>
            ) : null}
            {selectedId && eligibilityStatus === "error" ? (
              <ErrorState
                title="خطا"
                message={eligibilityError}
                onRetry={() => runEligibility(selectedId)}
              />
            ) : null}
            {selectedId && eligibilityStatus === "ready" && eligibility ? (
              <div className="mt-3 space-y-3">
                {eligibility.eligible ? (
                  <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                    واجد شرایط است
                    {eligibility.age != null
                      ? ` (سن ارزیابی‌شده: ${Number(eligibility.age).toLocaleString("fa-IR")})`
                      : ""}
                  </p>
                ) : (
                  <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-900">
                    <p className="font-medium">واجد شرایط نیست</p>
                    <ul className="mt-2 list-disc pr-5">
                      {(eligibility.reasons || []).map((code) => (
                        <li key={code}>{labelEligibilityReason(code)}</li>
                      ))}
                      {!(eligibility.reasons || []).length ? (
                        <li>شرایط ثبت‌نام احراز نشد.</li>
                      ) : null}
                    </ul>
                    <p className="mt-2 text-xs text-rose-800/80">
                      در صورت نیاز به مدرک، پس از پرداخت از صفحهٔ مدارک ثبت‌نام بارگذاری کنید. برای
                      تأییدیه پزشکی، تیک مربوطه در اطلاعات شرکت‌کننده را بزنید.
                    </p>
                  </div>
                )}
              </div>
            ) : null}
          </section>

          {/* Actions */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-bold text-slate-900">۳. ادامه ثبت‌نام</h2>
            {actionError ? (
              <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert">
                {actionError}
              </p>
            ) : null}

            {!registrationOpen && availReady ? (
              <p className="mt-3 text-sm text-slate-600">تا باز بودن ثبت‌نام، اقدام ممکن نیست.</p>
            ) : null}

            {seatsAvailable ? (
              <button
                type="button"
                disabled={!canReserve}
                onClick={handleReserve}
                className="mt-4 w-full rounded-xl bg-cyan-700 px-4 py-3 text-sm font-medium text-white hover:bg-cyan-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600 sm:w-auto"
              >
                {actionStatus === "reserving" ? "در حال ثبت…" : "ثبت‌نام موقت"}
              </button>
            ) : null}

            {canWaitlist || (eligible && registrationOpen && isFull) ? (
              <button
                type="button"
                disabled={!canWaitlist}
                onClick={handleWaitlist}
                className="mt-4 w-full rounded-xl border border-amber-600 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-950 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50 sm:mr-3 sm:w-auto"
              >
                {actionStatus === "waitlisting" ? "در حال ثبت…" : "پیوستن به لیست انتظار"}
              </button>
            ) : null}

            {eligible && seatsAvailable === false && registrationOpen && !isFull && availReady ? (
              <p className="mt-3 text-sm text-slate-500">وضعیت ظرفیت در حال هم‌خوانی است…</p>
            ) : null}
          </section>
        </>
      ) : null}
    </div>
  );
}
