import { Link } from "react-router-dom";
import { GENDER_LABELS, RELATION_LABELS, formatDateFa } from "../participantLabels";

export default function ParticipantCard({ participant }) {
  return (
    <article className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-slate-900">
        {participant.firstName} {participant.lastName}
      </h2>
      <dl className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
        <div>
          <dt className="text-xs text-slate-400">نسبت</dt>
          <dd>{RELATION_LABELS[participant.relation] || participant.relation}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-400">جنسیت</dt>
          <dd>{GENDER_LABELS[participant.gender] || participant.gender}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-400">تاریخ تولد</dt>
          <dd>{formatDateFa(participant.birthDate)}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-400">سن (سرور)</dt>
          <dd>{participant.age != null ? participant.age.toLocaleString("fa-IR") : "—"}</dd>
        </div>
      </dl>
      <div className="mt-5 grow" />
      <Link
        to={`/app/participants/${participant.id}`}
        className="inline-flex items-center justify-center rounded-xl bg-cyan-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-cyan-600"
      >
        جزئیات
      </Link>
    </article>
  );
}
