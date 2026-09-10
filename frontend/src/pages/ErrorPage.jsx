import { Link, useRouteError, isRouteErrorResponse } from "react-router-dom";

export default function ErrorPage() {
  const error = useRouteError();

  let title = "صفحه پیدا نشد";
  let message = "مسیر مورد نظر وجود ندارد یا جابه‌جا شده است.";

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      title = "۴۰۴ — پیدا نشد";
      message = error.statusText || message;
    } else {
      title = `خطا ${error.status}`;
      message = error.statusText || "خطایی در مسیریابی رخ داد.";
    }
  } else if (error instanceof Error && error.message) {
    title = "خطای برنامه";
    message = "لطفاً صفحه را تازه کنید. اگر ادامه داشت با پشتیبانی تماس بگیرید.";
  }

  return (
    <div
      dir="rtl"
      lang="fa"
      className="flex min-h-screen flex-col items-center justify-center bg-slate-900 px-4 text-center text-white"
    >
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="mt-3 max-w-md text-sm text-white/70">{message}</p>
      <Link
        to="/"
        className="mt-8 rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-medium hover:bg-cyan-500"
      >
        بازگشت به خانه
      </Link>
    </div>
  );
}
