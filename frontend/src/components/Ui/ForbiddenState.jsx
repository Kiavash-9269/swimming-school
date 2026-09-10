import { Link } from "react-router-dom";

export default function ForbiddenState({
  title = "دسترسی مجاز نیست",
  message = "برای این بخش مجوز کافی ندارید. در صورت نیاز با مدیر سیستم تماس بگیرید.",
  homeTo = "/",
}) {
  return (
    <div
      dir="rtl"
      className="mx-auto max-w-lg rounded-2xl border border-amber-200 bg-amber-50 px-5 py-10 text-center text-slate-800"
      role="alert"
    >
      <h1 className="text-xl font-bold text-amber-900">{title}</h1>
      <p className="mt-3 text-sm text-slate-600">{message}</p>
      <p className="mt-2 text-xs text-slate-500">
        مجوز نهایی را سرور تعیین می‌کند؛ این صفحه فقط راهنمای رابط کاربری است.
      </p>
      <Link
        to={homeTo}
        className="mt-6 inline-block rounded-xl bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700"
      >
        بازگشت
      </Link>
    </div>
  );
}
