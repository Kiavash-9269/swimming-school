import { Link } from "react-router-dom";

/**
 * Shared Admin course/class UI components only (react-refresh).
 */

export function StatusPill({ children, tone = "neutral" }) {
  const tones = {
    neutral: "bg-slate-100/90 text-slate-700 ring-1 ring-slate-200/80",
    success: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80",
    warn: "bg-amber-50 text-amber-950 ring-1 ring-amber-200/80",
    danger: "bg-rose-50 text-rose-800 ring-1 ring-rose-200/80",
    info: "bg-cyan-50 text-cyan-950 ring-1 ring-cyan-200/80",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-tight ${
        tones[tone] || tones.neutral
      }`}
    >
      {children}
    </span>
  );
}

export function Field({ label, children, hint, error }) {
  return (
    <label className="block text-sm">
      <span className="text-xs font-semibold text-slate-600">{label}</span>
      <div className="mt-1.5">{children}</div>
      {hint ? <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{hint}</p> : null}
      {error ? <p className="mt-1.5 text-xs text-rose-600">{error}</p> : null}
    </label>
  );
}

export function ConfirmBanner({ title, message, confirmLabel, onConfirm, onCancel, busy }) {
  return (
    <div className="rounded-2xl border border-rose-200/90 bg-gradient-to-l from-rose-50 to-white p-4 text-sm text-rose-950 shadow-sm">
      <p className="font-bold">{title}</p>
      <p className="mt-1 leading-relaxed text-rose-800">{message}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={onConfirm}
          className="rounded-xl bg-rose-700 px-4 py-2 text-white shadow-sm hover:bg-rose-600 disabled:opacity-50"
        >
          {busy ? "در حال انجام…" : confirmLabel}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onCancel}
          className="rounded-xl border border-rose-200 bg-white px-4 py-2 text-rose-900 disabled:opacity-50"
        >
          انصراف
        </button>
      </div>
    </div>
  );
}

/** Consistent page chrome for Admin operational screens. */
export function AdminPageHeader({ backTo, backLabel = "بازگشت", title, description, actions }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200/80 pb-5">
      <div className="min-w-0">
        {backTo ? (
          <Link to={backTo} className="text-sm font-medium text-cyan-800 hover:underline">
            {backLabel}
          </Link>
        ) : null}
        <h1 className={`text-2xl font-extrabold tracking-tight text-slate-900 ${backTo ? "mt-2" : ""}`}>
          {title}
        </h1>
        {description ? (
          <div className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">{description}</div>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
