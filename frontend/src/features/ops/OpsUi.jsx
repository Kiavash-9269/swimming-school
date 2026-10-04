/**
 * Shared operational UI primitives for Admin + Teacher panels (no new deps).
 */
import { Link } from "react-router-dom";
import { ATTENDANCE_CHIP_TONES } from "./opsHelpers";

export function OpsTabs({ tabs, activeId, onChange }) {
  return (
    <div className="flex flex-wrap gap-1 rounded-2xl border border-slate-200/70 bg-white/80 p-1.5 shadow-sm backdrop-blur">
      {tabs.map((t) => {
        const active = t.id === activeId;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={`rounded-xl px-3.5 py-2 text-sm transition ${
              active
                ? "bg-slate-900 font-bold text-white shadow-md shadow-slate-900/20"
                : "text-slate-700 hover:bg-white"
            }`}
          >
            {t.label}
            {t.count != null ? (
              <span className={`mr-1.5 text-xs ${active ? "text-slate-300" : "text-slate-400"}`}>
                ({Number(t.count).toLocaleString("fa-IR")})
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function DetailSection({ title, hint, actions, children, className = "" }) {
  return (
    <section
      className={`rounded-[1.35rem] border border-slate-200/70 bg-white/90 p-5 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.55)] ${className}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-extrabold tracking-tight text-slate-900">{title}</h2>
          {hint ? <p className="mt-1 text-xs leading-relaxed text-slate-500">{hint}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function ActionBar({ children, tone = "default" }) {
  const tones = {
    default: "border-slate-200/80 bg-white shadow-sm",
    primary: "border-cyan-200 bg-gradient-to-l from-cyan-50 to-white shadow-sm",
    teacher: "border-teal-200 bg-gradient-to-l from-teal-50 to-white shadow-sm",
  };
  return (
    <div className={`rounded-2xl border p-4 ${tones[tone] || tones.default}`}>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

export function MetricTile({ label, value, hint, to }) {
  const body = (
    <>
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">{value}</p>
      {hint ? <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">{hint}</p> : null}
    </>
  );
  const shell =
    "relative block overflow-hidden rounded-[1.25rem] border border-slate-200/70 bg-white p-4 shadow-[0_16px_34px_-28px_rgba(15,23,42,0.65)] before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-gradient-to-l before:from-teal-600 before:to-amber-200";
  if (to) {
    return (
      <Link to={to} className={`${shell} transition hover:-translate-y-1 hover:border-teal-200`}>
        {body}
      </Link>
    );
  }
  return <div className={shell}>{body}</div>;
}

export function EntityCard({ title, meta, status, actions, children, to }) {
  const inner = (
    <>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-extrabold tracking-tight text-slate-900">{title}</p>
          {meta ? <p className="mt-1 text-xs leading-relaxed text-slate-500">{meta}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {status}
          {actions}
        </div>
      </div>
      {children ? <div className="mt-3">{children}</div> : null}
    </>
  );
  const shell =
    "rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/50 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md";
  if (to) {
    return (
      <Link to={to} className={`block ${shell}`}>
        {inner}
      </Link>
    );
  }
  return <div className={shell}>{inner}</div>;
}

export function AttendanceStatusChips({ value, disabled, onSelect, labels }) {
  const options = Object.keys(labels || {});
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((s) => {
        const active = value === s;
        return (
          <button
            key={s}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(s)}
            className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition disabled:opacity-40 ${
              active
                ? ATTENDANCE_CHIP_TONES[s] || ATTENDANCE_CHIP_TONES.UNKNOWN
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {labels[s] || s}
          </button>
        );
      })}
    </div>
  );
}
