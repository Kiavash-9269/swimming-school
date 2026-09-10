import { Link } from "react-router-dom";
import { CLASS_STATUS_LABELS, formatDateFa, formatIrr, resolveRegistrationUx } from "../courseLabels";

const BADGE = {
  open: "bg-emerald-100 text-emerald-800 border-emerald-200",
  full: "bg-amber-100 text-amber-900 border-amber-200",
  closed: "bg-slate-200 text-slate-700 border-slate-300",
  unavailable: "bg-rose-100 text-rose-800 border-rose-200",
};

export default function ClassCard({ courseClass }) {
  const ux = resolveRegistrationUx(null, courseClass);

  return (
    <article className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="text-lg font-bold text-slate-900">{courseClass.title}</h2>
        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${BADGE[ux.key]}`}>
          {ux.label}
        </span>
      </div>

      <dl className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
        <div>
          <dt className="text-xs text-slate-400">قیمت</dt>
          <dd className="font-medium text-slate-800">{formatIrr(courseClass.price)}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-400">ظرفیت باقی‌مانده</dt>
          <dd className="font-medium text-slate-800">
            {courseClass.availableSeats != null ? courseClass.availableSeats.toLocaleString("fa-IR") : "—"}
            {courseClass.capacity != null ? (
              <span className="text-slate-400"> / {courseClass.capacity.toLocaleString("fa-IR")}</span>
            ) : null}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-400">شروع</dt>
          <dd>{formatDateFa(courseClass.startDate)}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-400">پایان</dt>
          <dd>{formatDateFa(courseClass.endDate)}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs text-slate-400">ساعت</dt>
          <dd>
            {courseClass.startTime} – {courseClass.endTime}
            {courseClass.timezone ? ` (${courseClass.timezone})` : ""}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs text-slate-400">وضعیت سیستم</dt>
          <dd>{CLASS_STATUS_LABELS[courseClass.status] || courseClass.status}</dd>
        </div>
      </dl>

      <div className="mt-5 grow" />
      <Link
        to={`/app/courses/${courseClass.id}`}
        className="inline-flex items-center justify-center rounded-xl bg-cyan-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-cyan-600"
      >
        جزئیات کلاس
      </Link>
    </article>
  );
}
