export default function EmptyState({
  title = "موردی یافت نشد",
  description,
  actionLabel,
  onAction,
}) {
  return (
    <div
      dir="rtl"
      className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center text-slate-700"
    >
      <h2 className="text-lg font-bold">{title}</h2>
      {description ? <p className="mt-2 text-sm text-slate-500">{description}</p> : null}
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 rounded-xl bg-cyan-700 px-4 py-2 text-sm text-white hover:bg-cyan-600"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
