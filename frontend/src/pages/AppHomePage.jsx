import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../services/useAuth";

/**
 * Authenticated home — points to real F3 courses discovery.
 * Admins are sent to the ops panel (they should not land on the member shell).
 */
export default function AppHomePage() {
  const { user } = useAuth();

  if (user?.role === "ADMIN") {
    return <Navigate to="/admin" replace />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">سلام، {user?.firstName}</h1>
        <p className="mt-2 text-sm text-slate-600">
          کلاس‌ها، شرکت‌کنندگان و ثبت‌نام‌های خود را از اینجا مدیریت کنید.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          to="/app/courses"
          className="inline-flex rounded-xl bg-cyan-700 px-5 py-3 text-sm font-medium text-white hover:bg-cyan-600"
        >
          مشاهده کلاس‌ها
        </Link>
        <Link
          to="/app/enrollments"
          className="inline-flex rounded-xl border border-cyan-700 px-5 py-3 text-sm font-medium text-cyan-800 hover:bg-cyan-50"
        >
          ثبت‌نام‌های من
        </Link>
        <Link
          to="/app/participants"
          className="inline-flex rounded-xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-800 hover:bg-slate-50"
        >
          شرکت‌کنندگان
        </Link>
        <Link
          to="/instructor"
          className="inline-flex rounded-xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-800 hover:bg-slate-50"
        >
          فضای مربی
        </Link>
      </div>

      <div className="flex flex-wrap gap-3 text-sm">
        <Link to="/" className="text-cyan-700 hover:underline">
          بازگشت به صفحه اصلی
        </Link>
      </div>
    </div>
  );
}
