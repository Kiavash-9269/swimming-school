import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listParticipants } from "../../features/participants/participantsApi";
import {
  listInsurance,
  listMedicalDocuments,
  uploadInsuranceDocument,
  uploadMedicalDocument,
} from "../../features/enrollments/enrollmentsApi";
import PersianDateField from "../../components/Ui/PersianDateField";
import { SectionLoader, ButtonSpinner } from "../../components/Ui/Loading";
import ErrorState from "../../components/Ui/ErrorState";
import { useToast } from "../../components/feedback/useToast";

const DOC_STATUS_LABELS = {
  PENDING: "در انتظار بررسی",
  PENDING_REVIEW: "در انتظار بررسی",
  APPROVED: "تأیید شده",
  VERIFIED: "تأیید شده",
  REJECTED: "رد شده",
  EXPIRED: "منقضی",
};

function statusLabel(value) {
  return DOC_STATUS_LABELS[value] || value || "—";
}

function formatDateFa(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("fa-IR");
  } catch {
    return "—";
  }
}

function DocumentList({ items, emptyText }) {
  if (!items?.length) {
    return <p className="text-xs text-slate-500">{emptyText}</p>;
  }
  return (
    <ul className="space-y-1 text-xs text-slate-600">
      {items.map((doc) => (
        <li key={doc.id || doc.documentId} className="flex flex-wrap items-center gap-2">
          <span className="rounded-lg bg-slate-100 px-2 py-0.5">
            {doc.documentType || doc.kind || "مدرک"}
          </span>
          <span>{statusLabel(doc.status)}</span>
          {doc.expiresAt ? <span>انقضا: {formatDateFa(doc.expiresAt)}</span> : null}
        </li>
      ))}
    </ul>
  );
}

function ParticipantDocuments({ participant, onChanged }) {
  const toast = useToast();
  const [docs, setDocs] = useState({ insurance: [], medical: [] });
  const [loading, setLoading] = useState(true);

  const [insuranceFile, setInsuranceFile] = useState(null);
  const [providerName, setProviderName] = useState("");
  const [policyRef, setPolicyRef] = useState("");
  const [insuranceExpires, setInsuranceExpires] = useState("");
  const [insuranceBusy, setInsuranceBusy] = useState(false);

  const [medicalFile, setMedicalFile] = useState(null);
  const [medicalExpires, setMedicalExpires] = useState("");
  const [medicalBusy, setMedicalBusy] = useState(false);

  const load = useCallback(async (signal) => {
    setLoading(true);
    try {
      const [insurance, medical] = await Promise.all([
        listInsurance(participant.id, { signal }).catch(() => ({ items: [] })),
        listMedicalDocuments(participant.id, { signal }).catch(() => ({ items: [] })),
      ]);
      setDocs({
        insurance: Array.isArray(insurance?.items) ? insurance.items : [],
        medical: Array.isArray(medical?.items) ? medical.items : [],
      });
    } finally {
      setLoading(false);
    }
  }, [participant.id]);

  useEffect(() => {
    const ac = new AbortController();
    load(ac.signal);
    return () => ac.abort();
  }, [load]);

  async function submitInsurance(event) {
    event.preventDefault();
    if (!insuranceFile || insuranceBusy) return;
    setInsuranceBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", insuranceFile);
      if (providerName.trim()) fd.append("providerName", providerName.trim());
      if (policyRef.trim()) fd.append("policyRef", policyRef.trim());
      if (insuranceExpires) fd.append("expiresAt", insuranceExpires);
      await uploadInsuranceDocument(participant.id, fd);
      toast.success("مدرک بیمه ارسال شد و در انتظار بررسی است.");
      setInsuranceFile(null);
      setProviderName("");
      setPolicyRef("");
      setInsuranceExpires("");
      await load();
      onChanged?.();
    } catch (err) {
      toast.error(err?.message || "ارسال مدرک بیمه ناموفق بود.");
    } finally {
      setInsuranceBusy(false);
    }
  }

  async function submitMedical(event) {
    event.preventDefault();
    if (!medicalFile || medicalBusy) return;
    setMedicalBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", medicalFile);
      fd.append("documentType", "MEDICAL_CLEARANCE");
      if (medicalExpires) fd.append("expiresAt", medicalExpires);
      await uploadMedicalDocument(participant.id, fd);
      toast.success("مدرک پزشکی ارسال شد و در انتظار بررسی است.");
      setMedicalFile(null);
      setMedicalExpires("");
      await load();
      onChanged?.();
    } catch (err) {
      toast.error(err?.message || "ارسال مدرک پزشکی ناموفق بود.");
    } finally {
      setMedicalBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-bold text-slate-900">
          {`${participant.firstName} ${participant.lastName}`}
          {participant.age != null ? ` · ${participant.age.toLocaleString("fa-IR")} سال` : ""}
        </h2>
        <Link
          to={`/app/participants/${participant.id}`}
          className="text-xs text-cyan-700 hover:underline"
        >
          مشخصات این فرد
        </Link>
      </div>

      {loading ? (
        <p className="mt-3 text-xs text-slate-500">در حال بارگذاری مدارک…</p>
      ) : (
        <div className="mt-3 grid gap-4 lg:grid-cols-2">
          <div className="space-y-2 rounded-xl bg-slate-50 p-3">
            <h3 className="text-sm font-semibold text-slate-800">بیمه‌نامه</h3>
            <DocumentList items={docs.insurance} emptyText="بیمه‌نامه‌ای ثبت نشده است." />
            <form onSubmit={submitInsurance} className="space-y-2">
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(event) => setInsuranceFile(event.target.files?.[0] || null)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs"
              />
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  value={providerName}
                  onChange={(event) => setProviderName(event.target.value)}
                  placeholder="نام شرکت بیمه"
                  className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs"
                />
                <input
                  value={policyRef}
                  onChange={(event) => setPolicyRef(event.target.value)}
                  placeholder="شماره بیمه‌نامه"
                  className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs"
                />
              </div>
              <label className="block text-xs text-slate-500">
                تاریخ انقضا (اختیاری)
                <div className="mt-1">
                  <PersianDateField value={insuranceExpires} onChange={setInsuranceExpires} />
                </div>
              </label>
              <button
                type="submit"
                disabled={!insuranceFile || insuranceBusy}
                className="inline-flex items-center gap-2 rounded-lg bg-cyan-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
              >
                {insuranceBusy ? <ButtonSpinner /> : null}
                ارسال بیمه‌نامه
              </button>
            </form>
          </div>

          <div className="space-y-2 rounded-xl bg-slate-50 p-3">
            <h3 className="text-sm font-semibold text-slate-800">گواهی پزشکی</h3>
            <DocumentList items={docs.medical} emptyText="گواهی پزشکی ثبت نشده است." />
            <form onSubmit={submitMedical} className="space-y-2">
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(event) => setMedicalFile(event.target.files?.[0] || null)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs"
              />
              <label className="block text-xs text-slate-500">
                تاریخ انقضا (اختیاری)
                <div className="mt-1">
                  <PersianDateField value={medicalExpires} onChange={setMedicalExpires} />
                </div>
              </label>
              <button
                type="submit"
                disabled={!medicalFile || medicalBusy}
                className="inline-flex items-center gap-2 rounded-lg bg-cyan-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
              >
                {medicalBusy ? <ButtonSpinner /> : null}
                ارسال گواهی پزشکی
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

/** Documents hub — upload insurance and medical papers per participant. */
export default function AppDocumentsPage() {
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [participants, setParticipants] = useState([]);

  const load = useCallback(async (signal) => {
    setStatus("loading");
    setErrorMessage("");
    try {
      const data = await listParticipants({ signal });
      setParticipants(Array.isArray(data?.items) ? data.items : []);
      setStatus("ready");
    } catch (err) {
      if (err?.code === "ABORTED") return;
      setErrorMessage(err?.message || "بارگذاری افراد ناموفق بود.");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    load(ac.signal);
    return () => ac.abort();
  }, [load]);

  if (status === "loading") return <SectionLoader label="در حال بارگذاری مدارک…" />;
  if (status === "error") {
    return <ErrorState title="مدارک باز نشد" message={errorMessage} onRetry={() => load()} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">بارگذاری مدارک</h1>
          <p className="mt-1 text-sm text-slate-600">
            بیمه‌نامه و گواهی پزشکی هر فرد را از همین‌جا ارسال کنید.
          </p>
        </div>
        <Link to="/app" className="text-sm text-cyan-700 hover:underline">
          بازگشت به پنل
        </Link>
      </div>

      {participants.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
          ابتدا از بخش «مشخصات و ویرایش» فردی را ثبت کنید.
        </p>
      ) : (
        participants.map((participant) => (
          <ParticipantDocuments key={participant.id} participant={participant} />
        ))
      )}
    </div>
  );
}
