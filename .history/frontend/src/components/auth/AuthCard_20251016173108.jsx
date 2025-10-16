import React, { useState } from "react";
import { motion } from "framer-motion";

export default function AuthCard() {
    const [isFlipped, setIsFlipped] = useState(false);
    const toggleFlip = () => setIsFlipped(!isFlipped);

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-sky-100 to-blue-200">
            <motion.div
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
                className="relative w-[380px] h-[460px] [transform-style:preserve-3d]"
            >
                {/* FRONT - LOGIN */}
                <div className="absolute w-full h-full bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl flex flex-col justify-center items-center px-8 backface-hidden">
                    <h2 className="text-3xl font-bold mb-6 text-blue-700">ورود به حساب</h2>

                    <input
                        type="email"
                        placeholder="ایمیل"
                        className="border border-gray-300 rounded-md px-4 py-2 mb-3 w-full focus:border-blue-400 focus:ring-2 focus:ring-blue-200 outline-none"
                    />
                    <input
                        type="password"
                        placeholder="رمز عبور"
                        className="border border-gray-300 rounded-md px-4 py-2 mb-4 w-full focus:border-blue-400 focus:ring-2 focus:ring-blue-200 outline-none"
                    />

                    <button className="bg-blue-600 hover:bg-blue-700 transition text-white px-6 py-2 rounded-md w-full mb-6 shadow-md">
                        ورود
                    </button>

                    {/* Switch Button */}
                    <div className="text-sm text-gray-600">
                        حساب نداری؟{" "}
                        <button
                            onClick={toggleFlip}
                            className="relative font-semibold text-blue-600 group"
                        >
                            ثبت‌نام
                            <span className="absolute left-0 bottom-0 w-0 h-[2px] bg-blue-600 group-hover:w-full transition-all duration-300"></span>
                        </button>
                    </div>
                </div>

                {/* BACK - SIGNUP */}
                <div className="absolute w-full h-full bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl flex flex-col justify-center items-center px-8 [transform:rotateY(180deg)] backface-hidden">
                    <h2 className="text-3xl font-bold mb-6 text-blue-700">ثبت‌نام</h2>

                    <input
                        type="text"
                        placeholder="نام کامل"
                        className="border border-gray-300 rounded-md px-4 py-2 mb-3 w-full focus:border-blue-400 focus:ring-2 focus:ring-blue-200 outline-none"
                    />
                    <input
                        type="email"
                        placeholder="ایمیل"
                        className="border border-gray-300 rounded-md px-4 py-2 mb-3 w-full focus:border-blue-400 focus:ring-2 focus:ring-blue-200 outline-none"
                    />
                    <input
                        type="password"
                        placeholder="رمز عبور"
                        className="border border-gray-300 rounded-md px-4 py-2 mb-4 w-full focus:border-blue-400 focus:ring-2 focus:ring-blue-200 outline-none"
                    />

                    <button className="bg-blue-600 hover:bg-blue-700 transition text-white px-6 py-2 rounded-md w-full mb-6 shadow-md">
                        ثبت‌نام
                    </button>

                    {/* Switch Button */}
                    <div className="text-sm text-gray-600">
                        قبلاً حساب داری؟{" "}
                        <button
                            onClick={toggleFlip}
                            className="relative font-semibold text-blue-600 group"
                        >
                            ورود
                            <span className="absolute left-0 bottom-0 w-0 h-[2px] bg-blue-600 group-hover:w-full transition-all duration-300"></span>
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
