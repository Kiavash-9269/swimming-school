import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";

export default function EnhancedNavbar() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <header
            dir="rtl"
            className="relative top-0 right-0 w-full z-50 transition-all duration-500 ease-out backdrop-blur-md bg-white/70 border-b border-slate-200/60"
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">

                    <Link to='/'>
                        <div className="flex items-center gap-3 group cursor-pointer">
                            <div className="relative">
                                <img
                                    src="/logo.png.webp"
                                    alt="Iran Australia Swimming School Logo"
                                    className="h-12 w-12 object-contain drop-shadow-md transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6"
                                />
                            </div>
                            <span className="text-lg font-bold text-slate-800 whitespace-nowrap bg-gradient-to-l from-teal-600 to-cyan-600 bg-clip-text text-transparent">
                                مدرسه شنا ایران استرالیا
                            </span>
                        </div>
                    </Link>

                    <nav className="hidden md:flex items-center gap-1">
                        {[{ href: "/", label: "صفحه اصلی" },
                        { href: "/about", label: "درباره ما" },
                        { href: "/courses", label: "دوره‌ها" },
                        { href: "/gallery", label: "تصاویر" },
                        { href: "/contact", label: "ارتباط با ما" },
                        { href: "/record", label:"رکورد گیری" }
                        ].map((item, index) => (
                            <Link
                                to={item.href}
                                key={index}
                                className="relative px-4 py-2 text-slate-700 font-medium group"
                            >
                                <span className="relative z-10 transition-colors duration-300 group-hover:text-teal-600">
                                    {item.label}
                                </span>
                                <div className="absolute bottom-0 right-0 w-0 h-0.5 bg-gradient-to-l from-teal-500 to-cyan-500 transition-all duration-300 group-hover:w-full" />
                            </Link>
                        ))}
                    </nav>

                    <div className="hidden md:flex items-center gap-3">
                        <Link
                            to='/auth?mode=login'
                            className="relative px-4 py-2 text-sm text-slate-700 border border-slate-300 rounded-xl hover:border-teal-300 transition-all duration-300 hover:shadow-md hover:shadow-teal-500/20 group overflow-hidden"
                        >
                            <span className="relative z-10">ورود</span>
                            <div className="absolute inset-0 bg-gradient-to-l from-teal-500/0 to-cyan-500/0 group-hover:from-teal-500/5 group-hover:to-cyan-500/5 transition-all duration-300" />
                        </Link>
                        <Link
                            to='/auth?mode=signup'
                            className="relative px-4 py-2 text-sm font-medium text-white rounded-xl bg-gradient-to-l from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 shadow-md hover:shadow-lg hover:shadow-teal-500/30 transition-all duration-300 transform hover:scale-105 group overflow-hidden"
                        >
                            <span className="relative z-10">ثبت‌نام</span>
                            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/0 to-white/0 group-hover:from-white/10 group-hover:via-white/5 group-hover:to-white/0 transition-all duration-500" />
                        </Link>
                    </div>

                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="md:hidden inline-flex items-center justify-center p-2 rounded-xl text-slate-700 hover:bg-slate-100/80 hover:shadow-md transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2"
                        aria-label="منو"
                    >
                        <div className="relative w-6 h-6">
                            <span
                                className={`absolute right-0 w-6 h-0.5 bg-slate-700 transition-all duration-300 ${isOpen ? "rotate-45 top-3" : "top-1"
                                    }`}
                            />
                            <span
                                className={`absolute right-0 w-6 h-0.5 bg-slate-700 transition-all duration-300 ${isOpen ? "opacity-0" : "top-3 opacity-100"
                                    }`}
                            />
                            <span
                                className={`absolute right-0 w-6 h-0.5 bg-slate-700 transition-all duration-300 ${isOpen ? "-rotate-45 top-3" : "top-5"
                                    }`}
                            />
                        </div>
                    </button>
                </div>
            </div>

            <div
                className={`md:hidden overflow-hidden transition-all duration-500 ease-out ${isOpen
                    ? "max-h-96 opacity-100 backdrop-blur-xl bg-white/95"
                    : "max-h-0 opacity-0"
                    }`}
            >
                <nav className="border-t border-slate-200/60 shadow-xl px-4 py-4 space-y-2 text-right">
                    {[{ href: "#home", label: "صفحه اصلی", icon: "🏠" },
                    { href: "#about", label: "درباره ما", icon: "👥" },
                    { href: "#courses", label: "دوره‌ها", icon: "🎯" },
                    { href: "#gallery", label: "تصاویر", icon: "🖼️" },
                    { href: "#contact", label: "ارتباط با ما", icon: "📞" }
                    ].map((item, index) => (
                        <a
                            key={index}
                            href={item.href}
                            className="flex items-center justify-end gap-3 px-4 py-3 text-slate-700 font-medium rounded-xl hover:bg-gradient-to-l hover:from-teal-50 hover:to-cyan-50 hover:text-teal-600 transition-all duration-300 group"
                            onClick={() => setIsOpen(false)}
                        >
                            <span>{item.label}</span>
                            <span className="text-lg opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300">
                                {item.icon}
                            </span>
                        </a>
                    ))}

                    <div className="pt-4 border-t border-slate-300/60 flex flex-col gap-3">
                        <a
                            href="#login"
                            className="px-4 py-3 text-center border border-slate-300 rounded-xl hover:border-teal-300 hover:bg-slate-50 transition-all duration-300 font-medium"
                            onClick={() => setIsOpen(false)}
                        >
                            ورود به حساب کاربری
                        </a>
                        <a
                            href="#signup"
                            className="px-4 py-3 text-center text-white rounded-xl bg-gradient-to-l from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 shadow-md hover:shadow-lg transition-all duration-300 font-medium transform hover:scale-105"
                            onClick={() => setIsOpen(false)}
                        >
                            ثبت‌نام جدید
                        </a>
                    </div>
                </nav>
            </div>

        </header>
    );
}
