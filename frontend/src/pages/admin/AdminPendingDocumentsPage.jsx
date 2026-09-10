import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listPendingDocuments } from "../../features/enrollments/enrollmentsApi";
import {
  COMPLIANCE_STATUS_LABELS,
  userMessageFromEnrollmentError,
  formatExpiryFa,
} from "../../features/enrollments/enrollmentLabels";
import { SectionLoader } from "../../components/Ui/Loading";
import ErrorState from "../../components/Ui/ErrorState";
import EmptyState from "../../components/Ui/EmptyState";
import ForbiddenState from "../../components/Ui/ForbiddenState";

/**
 * ADMIN — GET /enrollments/admin/documents/pending
 */
export default function AdminPendingDocumentsPage() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [forbidden, setForbidden] = useState(false);

  const load = useCallback(
    async (signal) => {
      setStatus("loading");
      setErrorMessage("");
      setForbidden(false);
      try {
        const res = await listPendingDocuments({ page, limit: 20, signal });
        setData(res);
        setStatus("ready");
      } catch (err) {
        if (err?.code === "ABORTED") return;
        if (err?.status === 403 || err?.code === "FORBIDDEN") {
          setForbidden(true);
          setStatus("error");
          return;
        }
        setErrorMessage(userMessageFromEnrollmentError(err, "بارگذاری مدارک در انتظار ناموفق بود."));
        setStatus("error");
      }
    },
    [page],
  );

  useEffect(() => {
    const ac = new AbortController();
    load(ac.signal);
    return () => ac.abort();
  }, [load]);

  if (status === "loading") {
    return <SectionLoader label="در حال بارگذاری مدارک…" />;
  }
  if (forbidden) {
    return <ForbiddenState title="دسترسی مجاز نیست" message="فقط ادمین می‌تواند مدارک را بررسی کند." />;
  }
  if (status === "error") {
    return <ErrorState title="خطا" message={errorMessage} onRetry={() => load()} />;
  }

  const insurance = Array.isArray(data?.insurance) ? data.insurance : [];
  const medical = Array.isArray(data?.medical) ? data.medical : [];
  const totalPending = (data?.insuranceTotal || 0) + (data?.medicalTotal || 0);
  const limit = data?.limit || 20;

  if (totalPending === 0 && insurance.length === 0 && medical.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-slate-900">بررسی مدارک</h1>
        <EmptyState title="مدرک در انتظاری برای بررسی وجود ندارد." description="" />
      </div>
    );
  }

  function DocRow({ kind, doc }) {
    return (
      <li>
        <Link
          to={`/admin/documents/${kind}/${doc.id}`}
          className="block rounded-2xl border border-slate-200 bg-white p-4 hover:border-cyan-300"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <span className="font-medium text-slate-900">
              {kind === "insurance" ? "بیمه" : "پزشکی"}
              {doc.documentType ? ` · ${doc.documentType}` : ""}
            </span>
            <span className="rounded-lg bg-amber-100 px-2 py-0.5 text-xs text-amber-900">
              {COMPLIANCE_STATUS_LABELS[doc.status] || doc.status}
            </span>
          </div>
          <dl className="mt-2 grid gap-1 text-sm text-slate-600 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-slate-400">شرکت‌کننده</dt>
              <dd className="font-mono text-xs break-all">{doc.participantId}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">ارسال</dt>
              <dd>{formatExpiryFa(doc.createdAt)}</dd>
            </div>
            {doc.expiresAt ? (
              <div>
                <dt className="text-xs text-slate-400">انقضا</dt>
                <dd>{formatExpiryFa(doc.expiresAt)}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-xs text-slate-400">فایل</dt>
              <dd>
                {doc.persisted
                  ? doc.originalFilename || "ذخیره‌شده"
                  : doc.hasDocument
                    ? "متادیتا بدون فایل پایدار"
                    : "بدون فایل"}
              </dd>
            </div>
          </dl>
        </Link>
      </li>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to="/admin" className="text-sm text-cyan-700 hover:underline">
          ← پنل مدیریت
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">بررسی مدارک</h1>
        <p className="mt-1 text-sm text-slate-600">
          بیمه در انتظار: {(data?.insuranceTotal || 0).toLocaleString("fa-IR")} · پزشکی در انتظار:{" "}
          {(data?.medicalTotal || 0).toLocaleString("fa-IR")}
        </p>
      </div>

      {insurance.length ? (
        <section className="space-y-3">
          <h2 className="font-bold text-slate-900">بیمه</h2>
          <ul className="space-y-3">
            {insurance.map((doc) => (
              <DocRow key={doc.id} kind="insurance" doc={doc} />
            ))}
          </ul>
        </section>
      ) : null}

      {medical.length ? (
        <section className="space-y-3">
          <h2 className="font-bold text-slate-900">پزشکی</h2>
          <ul className="space-y-3">
            {medical.map((doc) => (
              <DocRow key={doc.id} kind="medical" doc={doc} />
            ))}
          </ul>
        </section>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-40"
        >
          قبلی
        </button>
        <span>
          صفحه {page.toLocaleString("fa-IR")} (حداکثر {limit.toLocaleString("fa-IR")} در هر نوع)
        </span>
        <button
          type="button"
          disabled={insurance.length < limit && medical.length < limit}
          onClick={() => setPage((p) => p + 1)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-40"
        >
          بعدی
        </button>
      </div>
    </div>
  );
}
