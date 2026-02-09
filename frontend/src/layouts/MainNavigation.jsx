import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export default function EnhancedNavbar() {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { href: "/", label: "صفحه اصلی", icon: HomeIcon },
    { href: "/about", label: "درباره ما", icon: UsersIcon },
    { href: "/courses", label: "دوره‌ها", icon: AcademicCapIcon },
    { href: "/gallery", label: "گالری", icon: PhotoIcon },
    { href: "/contact", label: "تماس با ما", icon: PhoneIcon },
    { href: "/record", label: "رکوردها", icon: TrophyIcon }
  ];

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "auto";
    return () => (document.body.style.overflow = "auto");
  }, [isOpen]);

  return (
    <>
      {/* HEADER */}
      <header
        dir="rtl"
        className="fixed top-0 inset-x-0 z-50 bg-white border-b border-slate-200 shadow-sm"
      >
        <div className="max-w-7xl mx-auto px-4">
          <div className="h-16 flex items-center justify-between">

            {/* LOGO */}
            <Link to="/" className="flex items-center gap-3">
              <img
                src="/logo.png.webp"
                alt="Logo"
                className="h-11 w-11 object-contain"
              />
              <span className="font-bold text-sky-600 text-lg">
                مدرسه شنا ایران استرالیا
              </span>
            </Link>

            {/* DESKTOP MENU */}
            <nav className="hidden md:flex gap-7">
              {menuItems.map((item, i) => (
                <Link
                  key={i}
                  to={item.href}
                  className="text-slate-800 font-medium hover:text-sky-600 transition"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* DESKTOP AUTH */}
            <div className="hidden md:flex gap-3">
              <Link
                to="/auth?mode=login"
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:border-sky-400 transition"
              >
                ورود
              </Link>
              <Link
                to="/auth?mode=signup"
                className="px-4 py-2 rounded-xl bg-sky-500 text-white hover:bg-sky-600 transition"
              >
                ثبت‌نام
              </Link>
            </div>

            {/* MOBILE BUTTON */}
            <button
              onClick={() => setIsOpen(true)}
              className="md:hidden p-2 rounded-xl hover:bg-slate-100 transition"
              aria-label="open menu"
            >
              <div className="space-y-1.5">
                <span className="block w-6 h-0.5 bg-slate-800" />
                <span className="block w-6 h-0.5 bg-slate-800" />
                <span className="block w-6 h-0.5 bg-slate-800" />
              </div>
            </button>

          </div>
        </div>
      </header>

      {/* OVERLAY */}
      <div
        onClick={() => setIsOpen(false)}
        className={`fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity
        ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      />

      {/* MOBILE BOTTOM SHEET */}
      <aside
        className={`fixed bottom-0 inset-x-0 z-50 bg-white rounded-t-3xl
        border-t border-slate-200 shadow-2xl
        transition-all duration-500 ease-[cubic-bezier(.22,1,.36,1)]
        ${isOpen ? "translate-y-0" : "translate-y-full pointer-events-none"}`}
      >
        <nav className="px-4 py-6 space-y-3">
          {menuItems.map((item, i) => (
            <Link
              key={i}
              to={item.href}
              onClick={() => setIsOpen(false)}
              className="group flex items-center justify-between
              px-5 py-4 rounded-2xl hover:bg-slate-100
              active:scale-[0.97] transition"
            >
              <span className="font-medium text-slate-900">
                {item.label}
              </span>
              <item.icon />
            </Link>
          ))}

          {/* AUTH */}
          <div className="pt-5 mt-5 border-t border-slate-200 space-y-3">
            <Link
              to="/auth?mode=login"
              onClick={() => setIsOpen(false)}
              className="block text-center py-3 rounded-2xl border border-slate-300 text-slate-700 hover:bg-slate-100 transition"
            >
              ورود
            </Link>
            <Link
              to="/auth?mode=signup"
              onClick={() => setIsOpen(false)}
              className="block text-center py-3 rounded-2xl bg-sky-500 text-white hover:bg-sky-600 transition"
            >
              ثبت‌نام
            </Link>
          </div>
        </nav>
      </aside>
    </>
  );
}

/* ================= ICON SYSTEM ================= */

function Icon({ children }) {
  return (
    <svg
      className="w-6 h-6 text-sky-500 group-hover:text-sky-600 transition"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      viewBox="0 0 24 24"
    >
      {children}
    </svg>
  );
}

const HomeIcon = () => (
  <Icon>
    <path d="M3 10.5L12 3l9 7.5V21a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z" />
  </Icon>
);

const UsersIcon = () => (
  <Icon>
    <circle cx="9" cy="7" r="4" />
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
  </Icon>
);

const AcademicCapIcon = () => (
  <Icon>
    <path d="M12 3l9 5-9 5-9-5 9-5z" />
    <path d="M5 10v4c0 1.5 3.5 3 7 3s7-1.5 7-3v-4" />
  </Icon>
);

const PhotoIcon = () => (
  <Icon>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M21 15l-5-5L5 21" />
  </Icon>
);

const PhoneIcon = () => (
  <Icon>
    <path d="M22 16.9V21a1 1 0 01-1 1A19 19 0 013 5a1 1 0 011-1h4" />
  </Icon>
);

const TrophyIcon = () => (
  <Icon>
    <path d="M6 4h12v3a6 6 0 01-12 0V4z" />
    <path d="M12 17v4" />
    <path d="M8 21h8" />
  </Icon>
);
