import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  getEnrollment,
  getPayment,
  listInsurance,
  listMedicalDocuments,
  getMedicalProfile,
  uploadInsuranceDocument,
  uploadMedicalDocument,
  upsertMedicalProfile,
} from "../../features/enrollments/enrollmentsApi";
import {
  labelEligibilityReason,
  userMessageFromEnrollmentError,
  userMessageFromComplianceError,
  ENROLLMENT_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  COMPLIANCE_STATUS_LABELS,
  MEDICAL_PROFILE_APPROVAL_LABELS,
  DOCUMENT_ACCEPT,
  DOCUMENT_MAX_BYTES,
  deriveDocumentUxStatus,
  DOCUMENT_UX_LABELS,
  formatIrrAmount,
  formatExpiryFa,
} from "../../features/enrollments/enrollmentLabels";
import { SectionLoader } from "../../components/Ui/Loading";
import ErrorState from "../../components/Ui/ErrorState";
import ForbiddenState from "../../components/Ui/ForbiddenState";
import PersianDateField from "../../components/Ui/PersianDateField";
import { useToast } from "../../components/feedback/useToast";

const OBJECT_ID_RE = /^[a-f\d]{24}$/i;

/**
 * Enrollment-scoped compliance hub — data is participant-level per backend.
 * Admin review/activation is out of USER scope.
 */
export default function AppEnrollmentCompliancePage() {
  const { enrollmentId } = useParams();
  const toast = useToast();
  const validId = OBJECT_ID_RE.test(enrollmentId || "");

  const [enrollment, setEnrollment] = useState(null);
  const [payment, setPayment] = useState(null);
  const [insurance, setInsurance] = useState([]);
  const [medicalDocs, setMedicalDocs] = useState([]);
  const [medicalProfile, setMedicalProfile] = useState(null);

  const [pageStatus, setPageStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [forbidden, setForbidden] = useState(false);

  const [insFile, setInsFile] = useState(null);
  const [insProvider, setInsProvider] = useState("");
  const [insPolicy, setInsPolicy] = useState("");
  const [insExpires, setInsExpires] = useState("");
  const [insSubmitting, setInsSubmitting] = useState(false);
  const [insError, setInsError] = useState("");

  const [medFile, setMedFile] = useState(null);
  const [medExpires, setMedExpires] = useState("");
  const [medSubmitting, setMedSubmitting] = useState(false);
  const [medError, setMedError] = useState("");

  const [profileForm, setProfileForm] = useState({
    hasMedicalCondition: false,
    allergies: "",
    medications: "",
    notes: "",
  });
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [profileError, setProfileError] = useState("");

  const load = useCallback(
    async (signal) => {
      if (!validId) {
        setPageStatus("error");
        setErrorMessage("شناسه ثبت‌نام نامعتبر است.");
        return;
      }
      setPageStatus("loading");
      setErrorMessage("");
      setForbidden(false);
      try {
        const enr = await getEnrollment(enrollmentId, { signal });
        setEnrollment(enr);

        const participantId = enr.participantId;
        if (!participantId) {
          setPageStatus("error");
          setErrorMessage("شناسه شرکت‌کننده در ثبت‌نام موجود نیست.");
          return;
        }

        const [payResult, insResult, medResult, profileResult] = await Promise.allSettled([
          enr.paymentId ? getPayment(enr.paymentId, { signal }) : Promise.resolve(null),
          listInsurance(participantId, { signal }),
          listMedicalDocuments(participantId, { signal }),
          getMedicalProfile(participantId, { signal }),
        ]);

        if (signal?.aborted) return;

        if (payResult.status === "fulfilled") setPayment(payResult.value);
        else setPayment(null);

        if (insResult.status === "fulfilled") {
          setInsurance(Array.isArray(insResult.value?.items) ? insResult.value.items : []);
        } else if (insResult.reason?.status === 403) {
          setForbidden(true);
          setPageStatus("error");
          return;
        } else {
          setInsurance([]);
        }

        if (medResult.status === "fulfilled") {
          setMedicalDocs(Array.isArray(medResult.value?.items) ? medResult.value.items : []);
        } else {
          setMedicalDocs([]);
        }

        if (profileResult.status === "fulfilled") {
          const p = profileResult.value;
          setMedicalProfile(p);
          setProfileForm({
            hasMedicalCondition: Boolean(p?.hasMedicalCondition),
            allergies: p?.allergies || "",
            medications: p?.medications || "",
            notes: p?.notes || "",
          });
        } else {
          setMedicalProfile(null);
        }

        setPageStatus("ready");
      } catch (err) {
        if (err?.code === "ABORTED") return;
        if (err?.status === 403 || err?.code === "FORBIDDEN") {
          setForbidden(true);
          setPageStatus("error");
          return;
        }
        setErrorMessage(userMessageFromEnrollmentError(err, "بارگذاری ثبت‌نام ناموفق بود."));
        setPageStatus("error");
      }
    },
    [enrollmentId, validId],
  );

  useEffect(() => {
    const ac = new AbortController();
    load(ac.signal);
    return () => ac.abort();
  }, [load]);

  const reasons = enrollment?.eligibilitySnapshot?.reasons || [];
  const needsInsurance =
    reasons.includes("INSURANCE_REQUIRED") || enrollment?.status === "PENDING_COMPLIANCE";
  const needsMedical =
    reasons.includes("MEDICAL_APPROVAL_REQUIRED") || enrollment?.status === "PENDING_COMPLIANCE";

  // If snapshot explicitly lacks a reason, still show docs when PENDING_COMPLIANCE
  // but highlight sections that appear in reasons when present.
  const highlightInsurance =
    reasons.includes("INSURANCE_REQUIRED") ||
    (enrollment?.status === "PENDING_COMPLIANCE" && !reasons.length);
  const highlightMedical =
    reasons.includes("MEDICAL_APPROVAL_REQUIRED") ||
    (enrollment?.status === "PENDING_COMPLIANCE" && !reasons.length);

  async function handleInsuranceUpload(e) {
    e.preventDefault();
    if (!enrollment?.participantId || insSubmitting) return;
    if (!insFile) {
      setInsError("فایل را انتخاب کنید.");
      return;
    }
    if (insFile.size > DOCUMENT_MAX_BYTES) {
      setInsError("حجم فایل بیش از ۵ مگابایت است.");
      return;
    }
    setInsSubmitting(true);
    setInsError("");
    try {
      const fd = new FormData();
      fd.append("file", insFile);
      if (insProvider.trim()) fd.append("providerName", insProvider.trim());
      if (insPolicy.trim()) fd.append("policyRef", insPolicy.trim());
      if (insExpires) fd.append("expiresAt", insExpires);
      const data = await uploadInsuranceDocument(enrollment.participantId, fd);
      toast.success(
        data?.storage?.persisted
          ? "مدرک بیمه ارسال شد و در انتظار بررسی است."
          : "رکورد بیمه ثبت شد.",
      );
      setInsFile(null);
      await load();
    } catch (err) {
      const msg = userMessageFromComplianceError(err, "ارسال بیمه ناموفق بود.");
      setInsError(msg);
      toast.error(msg);
    } finally {
      setInsSubmitting(false);
    }
  }

  async function handleMedicalUpload(e) {
    e.preventDefault();
    if (!enrollment?.participantId || medSubmitting) return;
    if (!medFile) {
      setMedError("فایل را انتخاب کنید.");
      return;
    }
    if (medFile.size > DOCUMENT_MAX_BYTES) {
      setMedError("حجم فایل بیش از ۵ مگابایت است.");
      return;
    }
    setMedSubmitting(true);
    setMedError("");
    try {
      const fd = new FormData();
      fd.append("file", medFile);
      fd.append("documentType", "MEDICAL_CLEARANCE");
      if (medExpires) fd.append("expiresAt", medExpires);
      const data = await uploadMedicalDocument(enrollment.participantId, fd);
      toast.success(
        data?.storage?.persisted
          ? "مدرک پزشکی ارسال شد و در انتظار بررسی است."
          : "رکورد پزشکی ثبت شد.",
      );
      setMedFile(null);
      await load();
    } catch (err) {
      const msg = userMessageFromComplianceError(err, "ارسال مدرک پزشکی ناموفق بود.");
      setMedError(msg);
      toast.error(msg);
    } finally {
      setMedSubmitting(false);
    }
  }

  async function handleProfileSave(e) {
    e.preventDefault();
    if (!enrollment?.participantId || profileSubmitting) return;
    setProfileSubmitting(true);
    setProfileError("");
    try {
      const p = await upsertMedicalProfile(enrollment.participantId, {
        hasMedicalCondition: profileForm.hasMedicalCondition,
        allergies: profileForm.allergies,
        medications: profileForm.medications,
        notes: profileForm.notes,
      });
      setMedicalProfile(p);
      toast.success("پروفایل پزشکی ذخیره شد.");
    } catch (err) {
      const msg = userMessageFromComplianceError(err, "ذخیره پروفایل ناموفق بود.");
      setProfileError(msg);
      toast.error(msg);
    } finally {
      setProfileSubmitting(false);
    }
  }

  if (pageStatus === "loading") {
    return <SectionLoader label="در حال بارگذاری مدارک…" />;
  }
  if (forbidden) {
    return (
      <ForbiddenState
        title="دسترسی مجاز نیست"
        message="این ثبت‌نام یا شرکت‌کننده متعلق به حساب شما نیست."
      />
    );
  }
  if (pageStatus === "error") {
    return <ErrorState title="خطا" message={errorMessage} onRetry={() => load()} />;
  }

  const insUx = deriveDocumentUxStatus(insurance);
  const medUx = deriveDocumentUxStatus(medicalDocs);
  const payOk = payment?.status === "SUCCESS";
  const pendingCompliance = enrollment?.status === "PENDING_COMPLIANCE";
  const active = enrollment?.status === "ACTIVE";

  return (
    <div className="space-y-6">
      <div>
        {enrollment?.paymentId ? (
          <Link
            to={`/app/payments/${enrollment.paymentId}/result`}
            className="text-sm text-cyan-700 hover:underline"
          >
            ← نتیجه پرداخت
          </Link>
        ) : (
          <Link to="/app/courses" className="text-sm text-cyan-700 hover:underline">
            ← کلاس‌ها
          </Link>
        )}
        <h1 className="mt-2 text-2xl font-bold text-slate-900">مدارک و تأییدیه‌ها</h1>
        <p className="mt-1 text-sm text-slate-600">
          وضعیت بر اساس پاسخ سرور است. تأیید نهایی مدارک توسط ادمین انجام می‌شود.
        </p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-bold text-slate-900">وضعیت پرداخت و ثبت‌نام</h2>
        <dl className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-slate-400">پرداخت</dt>
            <dd>
              {payment
                ? PAYMENT_STATUS_LABELS[payment.status] || payment.status
                : enrollment?.paymentId
                  ? "—"
                  : "بدون پرداخت در پاسخ"}
              {payment?.amount != null ? ` · ${formatIrrAmount(payment.amount)}` : ""}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">ثبت‌نام</dt>
            <dd>
              {ENROLLMENT_STATUS_LABELS[enrollment?.status] || enrollment?.status || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">شناسه ثبت‌نام</dt>
            <dd className="font-mono text-xs break-all">{enrollment?.id}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">شرکت‌کننده</dt>
            <dd className="font-mono text-xs break-all">{enrollment?.participantId}</dd>
          </div>
        </dl>

        {payOk && active ? (
          <p className="mt-4 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            پرداخت موفق و ثبت‌نام فعال است.
          </p>
        ) : null}
        {payOk && pendingCompliance ? (
          <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-950">
            پرداخت با موفقیت انجام شده، اما برای نهایی‌شدن ثبت‌نام باید مدارک/تأییدیه‌های لازم تکمیل
            شود. پس از تأیید ادمین، وضعیت ثبت‌نام به‌روز می‌شود.
          </p>
        ) : null}
        {!payOk && payment ? (
          <p className="mt-4 rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700">
            پرداخت هنوز در وضعیت موفق قطعی نیست.
          </p>
        ) : null}
      </section>

      {reasons.length ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
          <h2 className="font-bold text-amber-950">دلایل واجدشرایطی (اسنپ‌شات سرور)</h2>
          <ul className="mt-2 list-disc pr-5 text-sm text-amber-950">
            {reasons.map((code) => (
              <li key={code}>{labelEligibilityReason(code)}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Insurance */}
      {(highlightInsurance || needsInsurance || insurance.length > 0) && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-bold text-slate-900">بیمه</h2>
          <p className="mt-1 text-sm text-slate-600">
            وضعیت: {DOCUMENT_UX_LABELS[insUx]}
            {reasons.includes("INSURANCE_REQUIRED") ? " (طبق اسنپ‌شات ثبت‌نام موردنیاز است)" : ""}
          </p>
          {insurance[0] ? (
            <dl className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-slate-400">آخرین وضعیت</dt>
                <dd>{COMPLIANCE_STATUS_LABELS[insurance[0].status] || insurance[0].status}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">فایل</dt>
                <dd>
                  {insurance[0].persisted
                    ? insurance[0].originalFilename || "ذخیره‌شده"
                    : insurance[0].hasDocument
                      ? "متادیتا بدون فایل پایدار"
                      : "بدون فایل"}
                </dd>
              </div>
              {insurance[0].expiresAt ? (
                <div>
                  <dt className="text-xs text-slate-400">انقضا</dt>
                  <dd>{formatExpiryFa(insurance[0].expiresAt)}</dd>
                </div>
              ) : null}
              {insurance[0].rejectionReason ? (
                <div className="sm:col-span-2">
                  <dt className="text-xs text-slate-400">دلیل رد</dt>
                  <dd className="text-rose-800">{insurance[0].rejectionReason}</dd>
                </div>
              ) : null}
            </dl>
          ) : (
            <p className="mt-3 text-sm text-slate-500">هنوز مدرک بیمه‌ای ثبت نشده است.</p>
          )}

          {insUx !== "approved" ? (
            <form onSubmit={handleInsuranceUpload} className="mt-4 space-y-3 border-t border-slate-100 pt-4">
              <p className="text-xs text-slate-500">PDF / JPEG / PNG · حداکثر ۵ مگابایت</p>
              <input
                type="file"
                accept={DOCUMENT_ACCEPT}
                onChange={(ev) => setInsFile(ev.target.files?.[0] || null)}
                className="block w-full text-sm text-slate-700"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="text-xs text-slate-500">نام بیمه‌گر (اختیاری)</span>
                  <input
                    value={insProvider}
                    onChange={(ev) => setInsProvider(ev.target.value)}
                    maxLength={120}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-xs text-slate-500">شماره بیمه‌نامه (اختیاری)</span>
                  <input
                    value={insPolicy}
                    onChange={(ev) => setInsPolicy(ev.target.value)}
                    maxLength={120}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-xs text-slate-500">تاریخ انقضا (اختیاری)</span>
                  <div className="mt-1">
                    <PersianDateField
                      value={insExpires}
                      placeholder="انتخاب تاریخ انقضا"
                      onChange={setInsExpires}
                    />
                  </div>
                </label>
              </div>
              {insError ? (
                <p className="text-sm text-rose-700" role="alert">
                  {insError}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={insSubmitting}
                className="rounded-xl bg-cyan-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-cyan-600 disabled:bg-slate-300"
              >
                {insSubmitting ? "در حال ارسال…" : "ارسال مدرک بیمه"}
              </button>
            </form>
          ) : null}
        </section>
      )}

      {/* Medical documents */}
      {(highlightMedical || needsMedical || medicalDocs.length > 0) && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-bold text-slate-900">تأییدیه پزشکی</h2>
          <p className="mt-1 text-sm text-slate-600">
            وضعیت: {DOCUMENT_UX_LABELS[medUx]}
            {reasons.includes("MEDICAL_APPROVAL_REQUIRED")
              ? " (طبق اسنپ‌شات ثبت‌نام موردنیاز است)"
              : ""}
          </p>
          {medicalDocs[0] ? (
            <dl className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-slate-400">آخرین وضعیت</dt>
                <dd>{COMPLIANCE_STATUS_LABELS[medicalDocs[0].status] || medicalDocs[0].status}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">نوع</dt>
                <dd>{medicalDocs[0].documentType || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">فایل</dt>
                <dd>
                  {medicalDocs[0].persisted
                    ? medicalDocs[0].originalFilename || "ذخیره‌شده"
                    : medicalDocs[0].hasDocument
                      ? "متادیتا بدون فایل پایدار"
                      : "بدون فایل"}
                </dd>
              </div>
              {medicalDocs[0].rejectionReason ? (
                <div className="sm:col-span-2">
                  <dt className="text-xs text-slate-400">دلیل رد</dt>
                  <dd className="text-rose-800">{medicalDocs[0].rejectionReason}</dd>
                </div>
              ) : null}
            </dl>
          ) : (
            <p className="mt-3 text-sm text-slate-500">هنوز مدرک پزشکی ثبت نشده است.</p>
          )}

          {medUx !== "approved" ? (
            <form onSubmit={handleMedicalUpload} className="mt-4 space-y-3 border-t border-slate-100 pt-4">
              <p className="text-xs text-slate-500">PDF / JPEG / PNG · حداکثر ۵ مگابایت</p>
              <input
                type="file"
                accept={DOCUMENT_ACCEPT}
                onChange={(ev) => setMedFile(ev.target.files?.[0] || null)}
                className="block w-full text-sm text-slate-700"
              />
              <label className="block text-sm sm:w-1/2">
                <span className="text-xs text-slate-500">تاریخ انقضا (اختیاری)</span>
                <div className="mt-1">
                  <PersianDateField
                    value={medExpires}
                    placeholder="انتخاب تاریخ انقضا"
                    onChange={setMedExpires}
                  />
                </div>
              </label>
              {medError ? (
                <p className="text-sm text-rose-700" role="alert">
                  {medError}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={medSubmitting}
                className="rounded-xl bg-cyan-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-cyan-600 disabled:bg-slate-300"
              >
                {medSubmitting ? "در حال ارسال…" : "ارسال مدرک پزشکی"}
              </button>
            </form>
          ) : null}
        </section>
      )}

      {/* Medical profile — supplementary; eligibility uses MedicalDocument APPROVED */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-bold text-slate-900">پروفایل پزشکی (اطلاعات)</h2>
        <p className="mt-1 text-sm text-slate-600">
          وضعیت تأیید پروفایل:{" "}
          {MEDICAL_PROFILE_APPROVAL_LABELS[medicalProfile?.approvalStatus] ||
            medicalProfile?.approvalStatus ||
            "ثبت نشده"}
          . واجدشرایطی بیمه/پزشکی بر اساس مدارک تأییدشده است، نه فقط این فرم.
        </p>
        <form onSubmit={handleProfileSave} className="mt-4 space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={profileForm.hasMedicalCondition}
              onChange={(ev) =>
                setProfileForm((f) => ({ ...f, hasMedicalCondition: ev.target.checked }))
              }
            />
            سابقه بیماری / شرایط پزشکی دارم
          </label>
          <label className="block text-sm">
            <span className="text-xs text-slate-500">آلرژی‌ها</span>
            <input
              value={profileForm.allergies}
              onChange={(ev) => setProfileForm((f) => ({ ...f, allergies: ev.target.value }))}
              maxLength={500}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="text-xs text-slate-500">داروها</span>
            <input
              value={profileForm.medications}
              onChange={(ev) => setProfileForm((f) => ({ ...f, medications: ev.target.value }))}
              maxLength={500}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="text-xs text-slate-500">توضیحات</span>
            <textarea
              value={profileForm.notes}
              onChange={(ev) => setProfileForm((f) => ({ ...f, notes: ev.target.value }))}
              maxLength={1000}
              rows={3}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            />
          </label>
          {profileError ? (
            <p className="text-sm text-rose-700" role="alert">
              {profileError}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={profileSubmitting}
            className="rounded-xl border border-cyan-700 px-4 py-2.5 text-sm font-medium text-cyan-800 hover:bg-cyan-50 disabled:opacity-50"
          >
            {profileSubmitting ? "در حال ذخیره…" : "ذخیره پروفایل پزشکی"}
          </button>
        </form>
      </section>

      <p className="text-xs text-slate-500">
        فعال‌سازی ثبت‌نام پس از تأیید مدارک توسط ادمین انجام می‌شود؛ کاربر نمی‌تواند خودش وضعیت را به
        APPROVED تغییر دهد.
      </p>
    </div>
  );
}
