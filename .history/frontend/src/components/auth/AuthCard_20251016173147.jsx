// src/components/auth/AuthCard.jsx
import React, { useState } from "react";

export default function AuthCard() {
    const [isFlipped, setIsFlipped] = useState(false);
    const toggleFlip = () => setIsFlipped(!isFlipped);

    return (
        <div className="relative w-[370px] h-[460px] [transform-style:preserve-3d] transition-transform duration-[900ms]"
            style={{
                transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
            }}
        >
            {/* LOGIN CARD */}
            <div className="absolute inset-0 bg-white/30 backdrop-blur-xl border border-white/40 shadow-xl rounded-2xl flex flex-col justify-center items-center backface-hidden">
                <h2 className="text-3xl font-bold mb-6 text-sky-900">ورود</h2>
                <input
                    type="email"
                    placeholder="ایمیل"
                    className="border border-sky-200 focus:border-sky-500 rounded-lg px-4 py-2 mb-3 w-3/4 focus:outline-none bg-white/60"
                />
                <input
                    type="password"
                    placeholder="رمز عبور"
                    className="border border-sky-200 focus:border-sky-500 rounded-lg px-4 py-2 mb-4 w-3/4 focus:outline-none bg-white/60"
                />
                <button className="bg-gradient-to-r from-sky-400 to-blue-500 hover:scale-105 transition-transform text-white font-medium px-8 py-2 rounded-lg shadow-md mb-3">
                    ورود
                </button>
                <p className="text-sm text-sky-900">
                    حساب نداری؟{" "}
                    <button onClick={toggleFlip} className="text-blue-600 underline ">
                        ثبت‌نام کن
                    </button>
                </p>
            </div>

            {/* SIGN UP CARD */}
            <div className="absolute inset-0 bg-white/30 backdrop-blur-xl border border-white/40 shadow-xl rounded-2xl flex flex-col justify-center items-center [transform:rotateY(180deg)] backface-hidden">
                <h2 className="text-3xl font-bold mb-6 text-sky-900">ثبت‌نام</h2>
                <input
                    type="text"
                    placeholder="نام کامل"
                    className="border border-sky-200 focus:border-sky-500 rounded-lg px-4 py-2 mb-3 w-3/4 focus:outline-none bg-white/60"
                />
                <input
                    type="email"
                    placeholder="ایمیل"
                    className="border border-sky-200 focus:border-sky-500 rounded-lg px-4 py-2 mb-3 w-3/4 focus:outline-none bg-white/60"
                />
                <input
                    type="password"
                    placeholder="رمز عبور"
                    className="border border-sky-200 focus:border-sky-500 rounded-lg px-4 py-2 mb-4 w-3/4 focus:outline-none bg-white/60"
                />
                <button className="bg-gradient-to-r from-sky-400 to-blue-500 hover:scale-105 transition-transform text-white font-medium px-8 py-2 rounded-lg shadow-md mb-3">
                    ثبت‌نام
                </button>
                <p className="text-sm text-sky-900">
                    حساب داری؟{" "}
                    <button onClick={toggleFlip} className="text-blue-600 underline ">
                        وارد شو
                    </button>
                </p>
            </div>

            {/* DECORATIVE BUBBLES */}
            <div className="absolute -z-10">
                <div className="absolute w-24 h-24 bg-sky-300/30 rounded-full blur-2xl top-0 left-0 animate-pulse"></div>
                <div className="absolute w-32 h-32 bg-blue-400/30 rounded-full blur-2xl bottom-10 right-5 animate-pulse delay-300"></div>
            </div>
        </div>
    );
}
