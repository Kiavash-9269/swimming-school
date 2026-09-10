import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  getInsuranceDocument,
  getMedicalDocument,
  reviewInsuranceDocument,
  reviewMedicalDocument,
  downloadInsuranceDocumentContent,
  downloadMedicalDocumentContent,
  activateEnrollmentCompliance,
  getAdminUser360,
} from "../../features/enrollments/enrollmentsApi";
import { getParticipant } from "../../features/participants/participantsApi";
import {
  COMPLIANCE_STATUS_LABELS,
  ENROLLMENT_STATUS_LABELS,
  userMessageFromEnrollmentError,
  formatExpiryFa,
} from "../../features/enrollments/enrollmentLabels";
import { SectionLoader } from "../../components/Ui/Loading";
import ErrorState from "../../components/Ui/ErrorState";
import ForbiddenState from "../../components/Ui/ForbiddenState";
import { useToast } from "../../components/feedback/useToast";

const OBJECT_ID_RE = /^[a-f\d]{24}$/i;
const KINDS = new Set(["insurance", "medical"]);

/**
 * ADMIN document review + optional activate-compliance for PENDING_COMPLIANCE enrollments.
 */
export default function AdminDocumentReviewPage() {
  const { kind, documentId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const valid =
    KINDS.has(kind) && OBJECT_ID_RE.test(documentId || "");

  const [doc, setDoc] = useState(null);
  const [participant, setParticipant] = useState(null);
  const [pendingEnrollments, setPendingEnrollments] = useState([]);
  const [pageStatus, setPageStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [forbidden, setForbidden] = useState(false);

  const [rejectionReason, setRejectionReason] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [activatingId, setActivatingId] = useState(null);
  const [activateError, setActivateError] = useState("");

  const load = useCallback(
    async (signal) => {
      if (!valid) {
        setPageStatus("error");
        setErrorMessage("شناسه یا نوع مدرک نامعتبر است.");
        return;
      }
      setPageStatus("loading");
      setErrorMessage("");
      setForbidden(false);
      try {
        const record =
          kind === "insurance"
            ? await getInsuranceDocument(documentId, { signal })
            : await getMedicalDocument(documentId, { signal });
        setDoc(record);

        let part = null;
        if (record?.participantId) {
          try {
            part = await getParticipant(record.participantId, { signal });
            setParticipant(part);
          } catch {
            setParticipant(null);
          }
        }

        // Find PENDING_COMPLIANCE enrollments for this participant via owner 360 (real ADMIN API).
        if (part?.ownerUserId) {
          try {
            const threeSixty = await getAdminUser360(part.ownerUserId, { signal });
            const all = threeSixty?.enrollments?.all || threeSixty?.enrollments?.active || [];
            const list = Array.isArray(all) ? all : [];
            setPendingEnrollments(
              list.filter(
                (e) =>
                  e.participantId === record.participantId &&
                  e.status === "PENDING_COMPLIANCE",
              ),
            );
          } catch {
            setPendingEnrollments([]);
          }
        } else {
          setPendingEnrollments([]);
        }

        setPageStatus("ready");
      } catch (err) {
        if (err?.code === "ABORTED") return;
        if (err?.status === 403 || err?.code === "FORBIDDEN") {
          setForbidden(true);
          setPageStatus("error");
          return;
        }
        setErrorMessage(userMessageFromEnrollmentError(err, "بارگذاری مدرک ناموفق بود."));
        setPageStatus("error");
      }
    },
    [documentId, kind, valid],
  );

  useEffect(() => {
    const ac = new AbortController();
    load(ac.signal);
    return () => ac.abort();
  }, [load]);

  async function runReview(decision) {
    if (!doc?.id || reviewing) return;
    if (decision === "REJECTED" && !String(rejectionReason || "").trim()) {
      setReviewError("دلیل رد الزامی است.");
      return;
    }
    setReviewing(true);
    setReviewError("");
    try {
      const fn = kind === "insurance" ? reviewInsuranceDocument : reviewMedicalDocument;
      const result = await fn(doc.id, {
        decision,
        rejectionReason: decision === "REJECTED" ? rejectionReason.trim() : undefined,
      });
      setDoc(result?.record || result);
      if (result?.alreadyProcessed) {
        toast.info("این مدرک قبلاً بررسی شده است.");
      } else {
        toast.success(decision === "APPROVED" ? "مدرک تأیید شد." : "مدرک رد شد.");
      }
      await load();
    } catch (err) {
      const msg = userMessageFromEnrollmentError(err, "بررسی مدرک ناموفق بود.");
      setReviewError(msg);
      toast.error(msg);
    } finally {
      setReviewing(false);
    }
  }

  async function handleDownload() {
    if (!doc?.id || downloading) return;
    if (!doc.persisted) {
      toast.error("فایل پایدار برای دانلود موجود نیست.");
      return;
    }
    setDownloading(true);
    try {
      const fn =
        kind === "insurance"
          ? downloadInsuranceDocumentContent
          : downloadMedicalDocumentContent;
      const { blob, filename, contentType } = await fn(doc.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename || doc.originalFilename || `${kind}-${doc.id}`;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      if (contentType?.includes("pdf") || contentType?.includes("image")) {
        // download only — no unauthenticated public URL
      }
    } catch (err) {
      toast.error(userMessageFromEnrollmentError(err, "دانلود ناموفق بود."));
    } finally {
      setDownloading(false);
    }
  }

  async function handleActivate(enrollmentId) {
    if (!enrollmentId || activatingId) return;
    setActivatingId(enrollmentId);
    setActivateError("");
    try {
      const updated = await activateEnrollmentCompliance(enrollmentId);
      toast.success(
        updated?.status === "ACTIVE"
          ? "ثبت‌نام فعال شد."
          : `وضعیت ثبت‌نام: ${ENROLLMENT_STATUS_LABELS[updated?.status] || updated?.status}`,
      );
      await load();
    } catch (err) {
      const msg = userMessageFromEnrollmentError(err, "فعال‌سازی ثبت‌نام ناموفق بود.");
      setActivateError(msg);
      toast.error(msg);
    } finally {
      setActivatingId(null);
    }
  }

  if (pageStatus === "loading") {
    return <SectionLoader label="در حال بارگذاری مدرک…" />;
  }
  if (forbidden) {
    return <ForbiddenState title="دسترسی مجاز نیست" message="فقط ادمین می‌تواند مدارک را بررسی کند." />;
  }
  if (pageStatus === "error") {
    return <ErrorState title="خطا" message={errorMessage} onRetry={() => load()} />;
  }

  const isPending = doc?.status === "PENDING";
  const participantName = participant
    ? `${participant.firstName || ""} ${participant.lastName || ""}`.trim()
    : "";

  return (
    <div className="space-y-6">
      <div>
        <Link to="/admin/documents/pending" className="text-sm text-cyan-700 hover:underline">
          ← بررسی مدارک
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">
          بررسی {kind === "insurance" ? "بیمه" : "پزشکی"}
        </h1>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-bold text-slate-900">مدرک</h2>
        <dl className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-slate-400">وضعیت</dt>
            <dd>{COMPLIANCE_STATUS_LABELS[doc.status] || doc.status}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">شناسه</dt>
            <dd className="font-mono text-xs break-all">{doc.id}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">شرکت‌کننده</dt>
            <dd>
              {participantName || "—"}
              <div className="font-mono text-xs break-all text-slate-500">{doc.participantId}</div>
            </dd>
          </div>
          {kind === "medical" && doc.documentType ? (
            <div>
              <dt className="text-xs text-slate-400">نوع</dt>
              <dd>{doc.documentType}</dd>
            </div>
          ) : null}
          {kind === "insurance" && doc.providerName ? (
            <div>
              <dt className="text-xs text-slate-400">بیمه‌گر</dt>
              <dd>{doc.providerName}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-xs text-slate-400">تاریخ ارسال</dt>
            <dd>{formatExpiryFa(doc.createdAt)}</dd>
          </div>
          {doc.expiresAt ? (
            <div>
              <dt className="text-xs text-slate-400">انقضا</dt>
              <dd>{formatExpiryFa(doc.expiresAt)}</dd>
            </div>
          ) : null}
          {doc.reviewedAt ? (
            <div>
              <dt className="text-xs text-slate-400">بررسی</dt>
              <dd>{formatExpiryFa(doc.reviewedAt)}</dd>
            </div>
          ) : null}
          {doc.rejectionReason ? (
            <div className="sm:col-span-2">
              <dt className="text-xs text-slate-400">دلیل رد</dt>
              <dd className="text-rose-800">{doc.rejectionReason}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-xs text-slate-400">فایل</dt>
            <dd>
              {doc.persisted
                ? `${doc.originalFilename || "فایل"} · ${doc.mimeType || ""}`
                : doc.hasDocument
                  ? "متادیتا بدون فایل پایدار (قابل تأیید نیست)"
                  : "بدون فایل"}
            </dd>
          </div>
        </dl>

        {doc.persisted ? (
          <button
            type="button"
            disabled={downloading}
            onClick={handleDownload}
            className="mt-4 rounded-xl border border-cyan-700 px-4 py-2 text-sm text-cyan-800 hover:bg-cyan-50 disabled:opacity-50"
          >
            {downloading ? "در حال دانلود…" : "دانلود / مشاهده فایل"}
          </button>
        ) : null}
      </section>

      {isPending ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-bold text-slate-900">بررسی</h2>
          <label className="mt-3 block text-sm">
            <span className="text-xs text-slate-500">دلیل رد (برای رد الزامی است)</span>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              maxLength={500}
              rows={3}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            />
          </label>
          {reviewError ? (
            <p className="mt-2 text-sm text-rose-700" role="alert">
              {reviewError}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={reviewing}
              onClick={() => runReview("APPROVED")}
              className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-600 disabled:bg-slate-300"
            >
              {reviewing ? "…" : "تأیید"}
            </button>
            <button
              type="button"
              disabled={reviewing}
              onClick={() => runReview("REJECTED")}
              className="rounded-xl bg-rose-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-rose-600 disabled:bg-slate-300"
            >
              {reviewing ? "…" : "رد"}
            </button>
          </div>
        </section>
      ) : (
        <p className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700">
          این مدرک دیگر در وضعیت در انتظار نیست؛ بررسی مجدد فقط وقتی در انتظار باشد ممکن است.
        </p>
      )}

      <section className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5">
        <h2 className="font-bold text-amber-950">فعال‌سازی ثبت‌نام (activate-compliance)</h2>
        <p className="mt-2 text-sm text-amber-900">
          تأیید مدرک به‌تنهایی ثبت‌نام را ACTIVE نمی‌کند. در صورت وجود ثبت‌نام
          PENDING_COMPLIANCE برای این شرکت‌کننده، فعال‌سازی جداگانه لازم است و سرور دوباره
          eligibility را بررسی می‌کند.
        </p>
        {activateError ? (
          <p className="mt-2 text-sm text-rose-700" role="alert">
            {activateError}
          </p>
        ) : null}
        {pendingEnrollments.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">
            ثبت‌نام PENDING_COMPLIANCE مرتبطی از طریق User 360 یافت نشد.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {pendingEnrollments.map((enr) => (
              <li
                key={enr.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-white px-4 py-3"
              >
                <div className="text-sm">
                  <div className="font-mono text-xs break-all">{enr.id}</div>
                  <div className="text-slate-600">
                    {ENROLLMENT_STATUS_LABELS[enr.status] || enr.status}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={Boolean(activatingId)}
                  onClick={() => handleActivate(enr.id)}
                  className="rounded-xl bg-cyan-700 px-3 py-2 text-sm text-white hover:bg-cyan-600 disabled:bg-slate-300"
                >
                  {activatingId === enr.id ? "در حال فعال‌سازی…" : "فعال‌سازی ثبت‌نام"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <button
        type="button"
        onClick={() => navigate("/admin/documents/pending")}
        className="text-sm text-cyan-700 hover:underline"
      >
        بازگشت به فهرست
      </button>
    </div>
  );
}
