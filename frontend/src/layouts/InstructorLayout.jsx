import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../services/useAuth";
import { appConfig } from "../config/env";

/**
 * Teacher operational shell — teal visual identity, distinct from Admin.
 */
export default function InstructorLayout() {
  const { user, logout } = useAuth();

  const linkClass = ({ isActive }) =>
    `ops-nav-link rounded-xl px-3 py-1.5 text-sm ${
      isActive
        ? "bg-teal-700 font-bold text-white shadow-sm shadow-teal-900/25"
        : "text-slate-700 hover:bg-teal-50 hover:text-teal-900"
    }`;

  return (
    <div dir="rtl" lang="fa" className="ops-shell ops-shell-teacher min-h-screen text-slate-900">
      <header className="ops-header sticky top-0 z-40">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3.5">
          <div className="flex flex-wrap items-center gap-1 sm:gap-2">
            <Link
              to="/instructor"
              className="ml-1 rounded-xl bg-teal-800 px-2.5 py-1 text-xs font-bold text-white shadow-sm"
            >
              فضای مربی
            </Link>
            <Link to="/" className="px-2 text-sm text-slate-500 hover:text-teal-800">
              سایت
            </Link>
            <span className="text-slate-300">|</span>
            <NavLink to="/instructor" end className={linkClass}>
              خانه
            </NavLink>
            <NavLink to="/instructor/classes" className={linkClass}>
              کلاس‌های من
            </NavLink>
            <Link to="/app" className="px-2 text-sm text-slate-600 hover:text-teal-800">
              حساب کاربری
            </Link>
            {user?.role === "ADMIN" ? (
              <Link to="/admin" className="px-2 text-sm text-slate-600 hover:text-teal-800">
                مدیریت
              </Link>
            ) : null}
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-slate-600 sm:inline">
              {user?.firstName} {user?.lastName}
            </span>
            <button
              type="button"
              onClick={() => logout()}
              className="rounded-xl border border-slate-200 bg-white/80 px-3 py-1.5 shadow-sm hover:bg-white"
            >
              خروج
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <p className="mb-5 text-xs text-teal-900/55">{appConfig.appName} · عملیات روزانه مربی</p>
        <div className="ops-main-card rounded-[1.35rem] p-4 sm:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
