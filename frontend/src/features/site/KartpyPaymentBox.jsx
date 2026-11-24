import kartpyQr from "../../assets/images/kartpy-qr.webp";

/**
 * Kartpy card-to-card payment page: a scannable QR plus the payable link.
 * Shared by the family payment box and the public clinic page.
 */
export default function KartpyPaymentBox({ paymentLink, tone = "light" }) {
  const link = String(paymentLink || "").trim();
  if (!link) return null;
  const isDark = tone === "dark";

  return (
    <div
      className={`grid gap-3 rounded-2xl border p-4 sm:grid-cols-[1fr_auto] ${
        isDark
          ? "border-cyan-400/20 bg-white/10 backdrop-blur-sm"
          : "border-emerald-200 bg-emerald-50/70"
      }`}
    >
      <div className="space-y-2 text-sm">
        <p
          className={`text-xs font-semibold ${isDark ? "text-emerald-200" : "text-emerald-900"}`}
        >
          پرداخت کارت‌به‌کارت (درگاه کارت‌پی)
        </p>
        <p className={`text-xs leading-6 ${isDark ? "text-white/70" : "text-slate-600"}`}>
          کد QR را با دوربین یا اپلیکیشن بانکی اسکن کنید، یا لینک زیر را در مرورگر باز کنید.
        </p>
        <a
          href={link}
          target="_blank"
          rel="noreferrer"
          dir="ltr"
          className={`inline-flex max-w-full items-center gap-2 break-all rounded-xl px-3 py-2 font-mono text-xs font-semibold transition ${
            isDark
              ? "bg-cyan-400/20 text-cyan-100 hover:bg-cyan-400/30"
              : "bg-emerald-700 text-white hover:bg-emerald-600"
          }`}
        >
          {link}
        </a>
      </div>
      <figure className="justify-self-center text-center">
        <img
          src={kartpyQr}
          alt="کد QR پرداخت کارت به کارت کارت‌پی"
          className="h-32 w-32 rounded-xl border border-emerald-200 bg-white p-1.5"
          loading="lazy"
        />
        <figcaption
          className={`mt-1 text-[11px] ${isDark ? "text-white/60" : "text-slate-500"}`}
        >
          برای پرداخت اسکن کنید
        </figcaption>
      </figure>
    </div>
  );
}
