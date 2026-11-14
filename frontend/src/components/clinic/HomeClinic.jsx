import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getClinicInfo } from "../../features/clinic/clinicApi";

function formatToman(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n) || n <= 0) return "—";
  return `${n.toLocaleString("fa-IR")} تومان`;
}

/** Homepage clinic block — hidden until an admin enables the program. */
export default function HomeClinic() {
  const [info, setInfo] = useState(null);

  useEffect(() => {
    const ac = new AbortController();
    getClinicInfo({ signal: ac.signal })
      .then((data) => setInfo(data))
      .catch(() => setInfo(null));
    return () => ac.abort();
  }, []);

  const clinic = info?.clinic;
  if (!clinic?.title && !clinic?.description) return null;

  return (
    <section className="relative bg-[#071826] px-4 py-12 text-white sm:px-6 md:py-16" dir="rtl">
      <div className="mx-auto max-w-6xl">
        <div className="overflow-hidden rounded-3xl border border-cyan-400/20 bg-gradient-to-l from-cyan-500/15 via-sky-500/5 to-transparent p-6 md:p-10">
          <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-center">
            <div className="space-y-4">
              <span className="inline-flex rounded-full bg-cyan-400/15 px-3 py-1 text-xs font-semibold text-cyan-200">
                کلینیک تخصصی شنا
              </span>
              <h2 className="text-2xl font-bold md:text-3xl">{clinic.title}</h2>
              {clinic.subtitle ? (
                <p className="text-sm text-cyan-200">{clinic.subtitle}</p>
              ) : null}
              <p className="leading-8 text-white/75">{clinic.description}</p>

              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-xl bg-white/5 px-3 py-2">
                  <dt className="text-xs text-white/50">هزینه ثبت‌نام</dt>
                  <dd className="mt-1 font-bold text-cyan-200">{formatToman(clinic.priceToman)}</dd>
                </div>
                <div className="rounded-xl bg-white/5 px-3 py-2">
                  <dt className="text-xs text-white/50">ظرفیت باقی‌مانده</dt>
                  <dd className="mt-1 font-bold text-cyan-200">
                    {info?.remaining == null
                      ? "نامحدود"
                      : `${Number(info.remaining).toLocaleString("fa-IR")} نفر`}
                  </dd>
                </div>
                {clinic.startDate || clinic.endDate ? (
                  <div className="rounded-xl bg-white/5 px-3 py-2">
                    <dt className="text-xs text-white/50">بازه برگزاری</dt>
                    <dd className="mt-1">
                      {[clinic.startDate, clinic.endDate].filter(Boolean).join(" تا ")}
                    </dd>
                  </div>
                ) : null}
                {clinic.schedule ? (
                  <div className="rounded-xl bg-white/5 px-3 py-2">
                    <dt className="text-xs text-white/50">زمان جلسات</dt>
                    <dd className="mt-1">{clinic.schedule}</dd>
                  </div>
                ) : null}
                {clinic.location ? (
                  <div className="rounded-xl bg-white/5 px-3 py-2 sm:col-span-2">
                    <dt className="text-xs text-white/50">محل برگزاری</dt>
                    <dd className="mt-1">{clinic.location}</dd>
                  </div>
                ) : null}
              </dl>

              {clinic.notice ? (
                <p className="rounded-xl bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
                  {clinic.notice}
                </p>
              ) : null}

              <div className="flex flex-wrap items-center gap-3 pt-1">
                {clinic.enabled ? (
                  <Link
                    to="/clinic"
                    className="rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-bold text-slate-900 transition hover:bg-cyan-400"
                  >
                    ثبت‌نام در کلینیک
                  </Link>
                ) : (
                  <span className="rounded-xl bg-white/10 px-5 py-2.5 text-sm font-bold text-white/80">
                    ثبت‌نام فعلاً بسته است
                  </span>
                )}
                <span className="text-xs text-white/60">
                  {clinic.title ? "جزئیات و شرایط را در صفحه کلینیک ببینید." : null}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-white/75">
              <h3 className="font-bold text-white">چطور ثبت‌نام کنم؟</h3>
              <ol className="mt-3 list-decimal space-y-2 pr-5">
                <li>فرم ثبت‌نام کلینیک را پر کنید.</li>
                <li>مبلغ را به شماره کارت مدرسه واریز کنید.</li>
                <li>در پنل، تیک «پرداخت را انجام دادم» را بزنید.</li>
                <li>مدیر پرداخت را تأیید می‌کند و ثبت‌نام نهایی می‌شود.</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
