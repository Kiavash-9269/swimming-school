import { Link } from "react-router-dom";

/**
 * Shown when the server reports no active instructor profile for this account.
 */
export function InstructorNotLinkedState({ message }) {
  return (
    <div
      dir="rtl"
      className="mx-auto max-w-lg rounded-[1.4rem] border border-teal-200/80 bg-gradient-to-b from-white to-teal-50/50 px-6 py-10 text-center shadow-sm"
      role="status"
    >
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-100 text-teal-800">
        <span className="text-2xl font-bold" aria-hidden>
          !
        </span>
      </div>
      <h1 className="text-xl font-extrabold tracking-tight text-slate-900">فضای مربی فعال نیست</h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">
        {message ||
          "حساب شما هنوز به یک پروفایل مربی فعال متصل نشده است. برای ورود به فضای مربی، مدیر مدرسه باید این اتصال را در بخش مربیان برقرار کند."}
      </p>
      <ul className="mt-5 space-y-2 rounded-2xl border border-teal-100 bg-white/80 px-4 py-3 text-right text-xs leading-relaxed text-slate-600">
        <li>تا زمان اتصال، کلاس‌ها و حضور و غیاب مربی در دسترس نیست.</li>
        <li>اگر فکر می‌کنید باید دسترسی داشته باشید، با مدیریت تماس بگیرید.</li>
      </ul>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <Link
          to="/app"
          className="rounded-xl bg-teal-800 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-teal-700"
        >
          بازگشت به حساب کاربری
        </Link>
        <Link
          to="/"
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
        >
          صفحه اصلی سایت
        </Link>
      </div>
    </div>
  );
}
