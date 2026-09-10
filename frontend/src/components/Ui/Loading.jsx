export function PageLoader({ label = "در حال بارگذاری…" }) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-slate-900 text-white"
      role="status"
      aria-busy="true"
      aria-label={label}
    >
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/30 border-t-white" />
      <p className="text-sm text-white/70">{label}</p>
    </div>
  );
}

export function SectionLoader({ label = "در حال بارگذاری…" }) {
  return (
    <div
      className="flex min-h-40 flex-col items-center justify-center gap-3 py-10 text-slate-600"
      role="status"
      aria-busy="true"
    >
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-cyan-600" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function ButtonSpinner({ className = "h-4 w-4" }) {
  return (
    <span
      className={`inline-block animate-spin rounded-full border-2 border-white/40 border-t-white ${className}`}
      aria-hidden="true"
    />
  );
}
