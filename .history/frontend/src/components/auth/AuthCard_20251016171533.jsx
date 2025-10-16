// src/components/auth/AuthCard.jsx
import React, { useState } from "react";
import { FaUserGraduate, FaEnvelope, FaLock } from "react-icons/fa";

export default function AuthCard() {
    const [isFlipped, setIsFlipped] = useState(false);
    const toggleFlip = () => setIsFlipped(!isFlipped);

    return (
        <div className="relative w-[360px] h-[460px] transition-transform duration-700 ease-in-out [transform-style:preserve-3d]"
            style={{ transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
        >
            {/* FRONT - LOGIN */}
            <div className="absolute w-full h-full bg-gradient-to-br from-indigo-100 via-white to-pink-100 rounded-2xl shadow-xl flex flex-col justify-center items-center [backface-visibility:hidden] px-6">
                <img src="/school-logo.png" alt="School Logo" className="w-16 mb-2" />
                <h2 className="text-2xl font-bold text-indigo-700 font-sans">ورود دانش‌آموز</h2>
                <p className="text-sm text-gray-600 mb-4">به پنل دانش‌آموزی خوش آمدید</p>

                <div className="relative w-full mb-3">
                    <FaEnvelope className="absolute left-3 top-3 text-gray-400" />
                    <input type="email" placeholder="ایمیل"
                        className="pl-10 pr-4 py-2 border rounded-md w-full focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                </div>

                <div className="relative w-full mb-4">
                    <FaLock className="absolute left-3 top-3 text-gray-400" />
                    <input type="password" placeholder="رمز عبور"
                        className="pl-10 pr-4 py-2 border rounded-md w-full focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                </div>

                <button className="bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-2 rounded-md w-full mb-3">
                    ورود
                </button>

                <p className="text-sm text-gray-700">
                    حساب کاربری ندارید؟{" "}
                    <button onClick={toggleFlip} className="text-indigo-600 underline">ثبت‌نام</button>
                </p>
            </div>

            {/* BACK - SIGNUP */}
            <div className="absolute w-full h-full bg-gradient-to-br from-pink-100 via-white to-indigo-100 rounded-2xl shadow-xl flex flex-col justify-center items-center [transform:rotateY(180deg)] [backface-visibility:hidden] px-6">
                <img src="/school-logo.png" alt="School Logo" className="w-16 mb-2" />
                <h2 className="text-2xl font-bold text-pink-700 font-sans">ثبت‌نام دانش‌آموز</h2>
                <p className="text-sm text-gray-600 mb-4">فرم ثبت‌نام برای دانش‌آموزان جدید</p>

                <div className="relative w-full mb-3">
                    <FaUserGraduate className="absolute left-3 top-3 text-gray-400" />
                    <input type="text" placeholder="نام کامل"
                        className="pl-10 pr-4 py-2 border rounded-md w-full focus:outline-none focus:ring-2 focus:ring-pink-300" />
                </div>

                <div className="relative w-full mb-3">
                    <FaEnvelope className="absolute left-3 top-3 text-gray-400" />
                    <input type="email" placeholder="ایمیل"
                        className="pl-10 pr-4 py-2 border rounded-md w-full focus:outline-none focus:ring-2 focus:ring-pink-300" />
                </div>

                <div className="relative w-full mb-4">
                    <FaLock className="absolute left-3 top-3 text-gray-400" />
                    <input type="password" placeholder="رمز عبور"
                        className="pl-10 pr-4 py-2 border rounded-md w-full focus:outline-none focus:ring-2 focus:ring-pink-300" />
                </div>

                <button className="bg-pink-500 hover:bg-pink-600 text-white px-6 py-2 rounded-md w-full mb-3">
                    ثبت‌نام
                </button>

                <p className="text-sm text-gray-700">
                    قبلاً ثبت‌نام کرده‌اید؟{" "}
                    <button onClick={toggleFlip} className="text-pink-600 underline">ورود</button>
                </p>
            </div>
        </div>
    );
}