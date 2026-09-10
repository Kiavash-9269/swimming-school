export default function ErrorState({
  title = "خطایی رخ داد",
  message = "لطفاً دوباره تلاش کنید.",
  onRetry,
  retryLabel = "تلاش مجدد",
}) {
  return (
    <div
      dir="rtl"
      className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-8 text-center text-slate-800"
      role="alert"
    >
      <h2 className="text-lg font-bold text-rose-800">{title}</h2>
      <p className="mt-2 text-sm text-slate-600">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 rounded-xl bg-rose-700 px-4 py-2 text-sm text-white hover:bg-rose-600"
        >
          {retryLabel}
        </button>
      ) : null}
    </div>
  );
}
