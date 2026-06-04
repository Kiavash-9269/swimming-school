import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";

export default function EnhancedNavbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  const menuItems = [
    { href: "/", label: "صفحه اصلی", icon: HomeIcon },
    { href: "/about", label: "درباره ما", icon: UsersIcon },
    { href: "/courses", label: "دوره‌ها", icon: AcademicCapIcon },
    { href: "/gallery", label: "گالری", icon: PhotoIcon },
    { href: "/contact", label: "تماس با ما", icon: PhoneIcon },
    { href: "/record", label: "رکوردها", icon: TrophyIcon },
  ];

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "auto";
    return () => (document.body.style.overflow = "auto");
  }, [isOpen]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isActive = (path) => location.pathname === path;

  return (
    <>
      {/* HEADER */}
      <header
        dir="rtl"
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 text-white
        ${
          scrolled
            ? "bg-black/40 backdrop-blur-xl border-b border-white/10 shadow-lg"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4">
          <div className="h-16 flex items-center justify-between">
            {/* LOGO */}
            <Link to="/" className="flex items-center gap-3">
              <img
                src="/logo.png.webp"
                alt="logo"
                className="h-11 w-11 rounded-full ring-2 ring-cyan-400/30"
              />
              <span className="font-bold text-lg">
                مدرسه شنا ایران استرالیا
              </span>
            </Link>

            {/* DESKTOP MENU */}
            <nav className="hidden md:flex gap-7">
              {menuItems.map((item, i) => (
                <Link
                  key={i}
                  to={item.href}
                  className={`relative font-medium transition px-2 py-1
                  ${
                    isActive(item.href)
                      ? "text-cyan-300"
                      : "hover:text-cyan-300"
                  }`}
                >
                  {item.label}

                  {isActive(item.href) && (
                    <span className="absolute -bottom-1 right-0 w-full h-[2px] bg-cyan-400 rounded-full" />
                  )}
                </Link>
              ))}
            </nav>

            {/* DESKTOP AUTH */}
            <div className="hidden md:flex gap-3">
              <Link
                to="/auth?mode=login"
                className="px-4 py-2 rounded-xl border border-white/20 hover:bg-white/10 transition"
              >
                ورود
              </Link>
              <Link
                to="/auth?mode=signup"
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-600 transition shadow-lg"
              >
                ثبت‌نام
              </Link>
            </div>

            {/* MOBILE BUTTON */}
            <button
              onClick={() => setIsOpen(true)}
              className="md:hidden p-2 rounded-xl hover:bg-white/10"
            >
              <div className="space-y-1.5">
                <span className="block w-6 h-0.5 bg-white" />
                <span className="block w-6 h-0.5 bg-white" />
                <span className="block w-6 h-0.5 bg-white" />
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* OVERLAY */}
      <div
        onClick={() => setIsOpen(false)}
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition
  ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      />

      {/* MOBILE MENU (PRO VERSION) */}
      <aside
        className={`fixed bottom-0 inset-x-0 z-50
  bg-white/70 backdrop-blur-2xl
  rounded-t-[2.5rem] shadow-2xl
  border-t border-white/30
  transition-all duration-500 ease-[cubic-bezier(.22,1,.36,1)]
  ${isOpen ? "translate-y-0" : "translate-y-full"}`}
      >
        {/* HANDLE BAR */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
        </div>

        {/* HEADER */}
        <div className="px-5 pb-3 flex items-center justify-between">
          <h3 className="font-bold text-slate-800">منو</h3>

          <button
            onClick={() => setIsOpen(false)}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        {/* MENU ITEMS */}
        <nav className="px-4 pb-6 space-y-2">
          {menuItems.map((item, i) => (
            <Link
              key={i}
              to={item.href}
              onClick={() => setIsOpen(false)}
              className="group flex items-center justify-between
        px-4 py-4 rounded-2xl
        bg-white/40 hover:bg-cyan-50
        border border-white/40
        shadow-sm active:scale-[0.98]
        transition-all duration-200"
            >
              {/* LABEL */}
              <span className="font-medium text-slate-800 group-hover:text-cyan-600 transition">
                {item.label}
              </span>

              {/* ICON */}
              <div className="text-cyan-500 group-hover:scale-110 transition">
                <item.icon />
              </div>
            </Link>
          ))}

          {/* AUTH SECTION */}
          <div className="pt-5 mt-3 border-t border-white/40 space-y-3">
            <Link
              to="/auth?mode=login"
              onClick={() => setIsOpen(false)}
              className="block text-center py-3 rounded-2xl
        bg-white/60 border border-white/40
        text-slate-800 font-medium
        hover:bg-white transition"
            >
              ورود
            </Link>

            <Link
              to="/auth?mode=signup"
              onClick={() => setIsOpen(false)}
              className="block text-center py-3 rounded-2xl
        bg-gradient-to-r from-cyan-500 to-blue-500
        text-white font-semibold shadow-lg
        hover:scale-[1.02] transition"
            >
              ثبت‌نام
            </Link>
          </div>
        </nav>
      </aside>
    </>
  );
}

/* ================= ICONS ================= */

function Icon({ children }) {
  return (
    <svg
      className="w-6 h-6 text-sky-500"
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
