import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../services/useAuth";
import { appConfig } from "../config/env";
import AdminShell from "./AdminShell";

/**
 * Authenticated product shell — no fake KPIs or unimplemented feature links.
 * variant: "user" | "admin"
 */
export default function ProductAppLayout({ variant = "user" }) {
  const { user, logout } = useAuth();
  const isAdmin = variant === "admin";

  if (isAdmin) {
    return (
      <AdminShell user={user} logout={logout}>
        <Outlet />
      </AdminShell>
    );
  }

  const linkClass = ({ isActive }) =>
    `ops-nav-link whitespace-nowrap rounded-xl px-2.5 py-1.5 text-sm ${
      isActive
        ? "bg-cyan-700 font-bold text-white shadow-sm shadow-cyan-900/20"
        : "text-slate-700 hover:bg-cyan-50 hover:text-cyan-900"
    }`;

  return (
    <div dir="rtl" lang="fa" className="ops-shell min-h-screen text-slate-900">
      <header className="ops-header sticky top-0 z-40">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <nav className="flex max-w-full flex-wrap items-center gap-1 overflow-x-auto pb-0.5">
            <Link
              to="/app"
              className="ml-1 rounded-xl bg-slate-900 px-2.5 py-1 text-xs font-bold text-white"
            >
              حساب
            </Link>
            <Link to="/" className="px-2 text-sm text-slate-500 hover:text-cyan-800">
              سایت
            </Link>
            <span className="text-slate-300">|</span>
            <NavLink to="/app" end className={linkClass}>
              خانه حساب
            </NavLink>
            <NavLink to="/app/courses" className={linkClass}>
              کلاس‌ها
            </NavLink>
            <NavLink to="/app/participants" className={linkClass}>
              شرکت‌کنندگان
            </NavLink>
            <NavLink to="/app/enrollments" className={linkClass}>
              ثبت‌نام‌ها
            </NavLink>
            <NavLink to="/instructor" className={linkClass}>
              فضای مربی
            </NavLink>
          </nav>

          <div className="flex shrink-0 items-center gap-3 text-sm">
            <span className="hidden text-slate-600 sm:inline">
              {user?.firstName} {user?.lastName}
              {user?.role === "ADMIN" ? (
                <span className="mr-2 rounded-lg bg-cyan-800 px-2 py-0.5 text-xs text-white">مدیر</span>
              ) : null}
            </span>
            {user?.role === "ADMIN" ? (
              <Link to="/admin" className="text-cyan-800 hover:underline">
                مدیریت
              </Link>
            ) : null}
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
        <p className="mb-5 text-xs text-cyan-900/55">
          {appConfig.appName} · پنل کاربری
        </p>
        <div className="ops-main-card rounded-[1.35rem] p-4 sm:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
