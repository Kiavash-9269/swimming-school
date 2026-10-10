import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  CalendarDays,
  ChartColumn,
  ClipboardCheck,
  CreditCard,
  FileCheck2,
  Layers,
  LayoutDashboard,
  Menu,
  ShieldCheck,
  UserRound,
  Users,
  Waves,
} from "lucide-react";
import { appConfig } from "../config/env";

const NAV = [
  {
    label: "نمای کلی",
    items: [{ to: "/admin", end: true, label: "میز مدیریت", icon: LayoutDashboard }],
  },
  {
    label: "آموزش",
    items: [
      { to: "/admin/courses", label: "دوره‌ها", icon: Layers },
      { to: "/admin/classes", label: "کلاس‌ها", icon: CalendarDays },
      { to: "/admin/instructors", label: "مربیان", icon: Users },
      { to: "/admin/attendance", label: "حضور و غیاب", icon: ClipboardCheck },
    ],
  },
  {
    label: "خانواده‌ها",
    items: [
      { to: "/admin/participants", label: "شاگردان", icon: UserRound },
      { to: "/admin/documents/pending", label: "مدارک", icon: FileCheck2 },
    ],
  },
  {
    label: "تصمیم‌گیری",
    items: [
      { to: "/admin/payments", label: "پرداخت‌ها", icon: CreditCard },
      { to: "/admin/notifications", label: "پیام‌ها", icon: Bell },
      { to: "/admin/reports", label: "گزارش مدیریت", icon: ChartColumn },
    ],
  },
  {
    label: "دسترسی‌ها",
    superAdminOnly: true,
    items: [{ to: "/admin/admins", label: "مدیران", icon: ShieldCheck }],
  },
];

function displayName(user) {
  const name = `${user?.firstName || ""} ${user?.lastName || ""}`.trim();
  return name || "مدیر مدرسه";
}

function initial(user) {
  const source = user?.firstName || user?.lastName || "م";
  return source.trim().slice(0, 1);
}

export default function AdminShell({ user, logout, children }) {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div dir="rtl" lang="fa" className={`admin-shell ${open ? "is-nav-open" : ""}`}>
      <button
        type="button"
        className="admin-scrim"
        aria-label="بستن منو"
        tabIndex={open ? 0 : -1}
        onClick={() => setOpen(false)}
      />

      <aside className="admin-sidebar" aria-label="ناوبری مدیریت">
        <Link to="/admin" className="admin-brand">
          <span className="admin-mark" aria-hidden="true">
            <Waves className="admin-mark-icon" strokeWidth={1.75} />
          </span>
          <span className="min-w-0">
            <strong>{appConfig.appName}</strong>
            <small>دفتر مدیریت</small>
          </span>
        </Link>

        <nav className="admin-nav">
          {NAV.filter((group) => !group.superAdminOnly || user?.isSuperAdmin).map((group) => (
            <div key={group.label} className="admin-nav-group">
              <p className="admin-nav-label">{group.label}</p>
              {group.items.map((item) => {
                const ItemIcon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) => `admin-nav-link${isActive ? " is-active" : ""}`}
                  >
                    {({ isActive }) => (
                      <>
                        {isActive ? (
                          <motion.span
                            layoutId="admin-nav-pill"
                            className="admin-nav-pill"
                            transition={{ type: "spring", stiffness: 380, damping: 34 }}
                          />
                        ) : null}
                        <ItemIcon className="admin-nav-icon" strokeWidth={1.75} aria-hidden="true" />
                        <span>{item.label}</span>
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="admin-side-foot">
          <Link to="/instructor" className="admin-side-link">
            فضای مربی
          </Link>
          <Link to="/app/courses" className="admin-side-link">
            نمای خانواده‌ها از کلاس‌ها
          </Link>
          <Link to="/" className="admin-side-link">
            سایت عمومی
          </Link>
        </div>
      </aside>

      <div className="admin-stage">
        <header className="admin-topbar">
          <div className="admin-topbar-start">
            <button type="button" className="admin-menu-btn" onClick={() => setOpen(true)}>
              <Menu className="h-4 w-4" aria-hidden="true" />
              منو
            </button>
            <div>
              <p className="admin-kicker">مدیریت مدرسه</p>
              <p className="admin-top-title">تصمیم‌ها، ظرفیت و آرامش خانواده‌ها</p>
            </div>
          </div>
          <div className="admin-topbar-end">
            <div className="admin-user">
              <span className="admin-avatar" aria-hidden="true">
                {initial(user)}
              </span>
              <span className="admin-user-copy">
                <strong>{displayName(user)}</strong>
                <small>مدیر مدرسه</small>
              </span>
            </div>
            <button type="button" className="admin-logout" onClick={() => logout()}>
              خروج
            </button>
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.main
            key={pathname}
            className="admin-page"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
          >
            {children}
          </motion.main>
        </AnimatePresence>
      </div>
    </div>
  );
}
