import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getParticipant, updateParticipant } from "../../features/participants/participantsApi";
import ParticipantFormFields from "../../features/participants/components/ParticipantFormFields";
import {
  buildParticipantPayload,
  formatDateInput,
  userMessageFromParticipantError,
  validateParticipantForm,
} from "../../features/participants/participantLabels";
import { SectionLoader, ButtonSpinner } from "../../components/Ui/Loading";
import ErrorState from "../../components/Ui/ErrorState";
import ForbiddenState from "../../components/Ui/ForbiddenState";
import { useToast } from "../../components/feedback/useToast";

const OBJECT_ID_RE = /^[a-f\d]{24}$/i;

export default function AppParticipantEditPage() {
  const { participantId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const validId = OBJECT_ID_RE.test(participantId || "");

  const [values, setValues] = useState(null);
  const [errors, setErrors] = useState({});
  const [loadStatus, setLoadStatus] = useState("loading");
  const [loadError, setLoadError] = useState("");
  const [forbidden, setForbidden] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const load = useCallback(
    async (signal) => {
      if (!validId) {
        setLoadStatus("error");
        setLoadError("شناسه نامعتبر است.");
        return;
      }
      setLoadStatus("loading");
      setForbidden(false);
      try {
        const p = await getParticipant(participantId, { signal });
        setValues({
          firstName: p.firstName || "",
          lastName: p.lastName || "",
          birthDate: formatDateInput(p.birthDate),
          gender: p.gender || "",
          relation: p.relation || "SELF",
          phone: p.phone || "",
          emergencyContact: {
            name: p.emergencyContact?.name || "",
            phone: p.emergencyContact?.phone || "",
            relationship: p.emergencyContact?.relationship || "",
          },
        });
        setLoadStatus("ready");
      } catch (err) {
        if (err?.code === "ABORTED") return;
        if (err?.status === 403 || err?.code === "FORBIDDEN") {
          setForbidden(true);
          setLoadStatus("error");
          return;
        }
        setLoadError(userMessageFromParticipantError(err));
        setLoadStatus("error");
      }
    },
    [participantId, validId],
  );

  useEffect(() => {
    const ac = new AbortController();
    load(ac.signal);
    return () => ac.abort();
  }, [load]);

  async function onSubmit(e) {
    e.preventDefault();
    if (submitting || !values) return;
    const nextErrors = validateParticipantForm(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSubmitting(true);
    setFormError("");
    try {
      await updateParticipant(participantId, buildParticipantPayload(values));
      toast.success("تغییرات ذخیره شد.");
      navigate(`/app/participants/${participantId}`, { replace: true });
    } catch (err) {
      setFormError(userMessageFromParticipantError(err, "ذخیره ناموفق بود."));
    } finally {
      setSubmitting(false);
    }
  }

  if (loadStatus === "loading") {
    return <SectionLoader label="بارگذاری فرم…" />;
  }

  if (forbidden) {
    return <ForbiddenState homeTo="/app/participants" />;
  }

  if (loadStatus === "error") {
    return (
      <div className="space-y-4">
        <ErrorState title="خطا" message={loadError} onRetry={() => load()} />
        <Link to="/app/participants" className="text-sm text-cyan-700 hover:underline">
          بازگشت
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          to={`/app/participants/${participantId}`}
          className="text-sm text-cyan-700 hover:underline"
        >
          ← جزئیات
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">ویرایش شرکت‌کننده</h1>
      </div>

      <form onSubmit={onSubmit} className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5">
        <ParticipantFormFields
          values={values}
          errors={errors}
          onChange={setValues}
          disabled={submitting}
        />
        {formError ? (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert">
            {formError}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-cyan-600 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {submitting ? <ButtonSpinner /> : null}
          {submitting ? "در حال ذخیره…" : "ذخیره تغییرات"}
        </button>
      </form>
    </div>
  );
}
