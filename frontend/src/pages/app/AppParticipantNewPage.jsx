import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createParticipant } from "../../features/participants/participantsApi";
import ParticipantFormFields from "../../features/participants/components/ParticipantFormFields";
import {
  buildParticipantPayload,
  userMessageFromParticipantError,
  validateParticipantForm,
} from "../../features/participants/participantLabels";
import { useToast } from "../../components/feedback/useToast";
import { ButtonSpinner } from "../../components/Ui/Loading";

const empty = {
  firstName: "",
  lastName: "",
  birthDate: "",
  gender: "",
  relation: "SELF",
  phone: "",
  emergencyContact: { name: "", phone: "", relationship: "" },
};

export default function AppParticipantNewPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [values, setValues] = useState(empty);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    const nextErrors = validateParticipantForm(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSubmitting(true);
    setFormError("");
    try {
      const created = await createParticipant(buildParticipantPayload(values));
      toast.success("شرکت‌کننده ثبت شد.");
      navigate(`/app/participants/${created.id}`, { replace: true });
    } catch (err) {
      setFormError(userMessageFromParticipantError(err, "ثبت شرکت‌کننده ناموفق بود."));
      if (err?.details && typeof err.details === "object") {
        // keep field errors if backend sends structured details later
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link to="/app/participants" className="text-sm text-cyan-700 hover:underline">
          ← فهرست شرکت‌کنندگان
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">افزودن شرکت‌کننده</h1>
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
          {submitting ? "در حال ثبت…" : "ثبت شرکت‌کننده"}
        </button>
      </form>
    </div>
  );
}
