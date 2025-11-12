// src/components/auth/AuthCard.jsx
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "react-router-dom";
import {
    FaEnvelope,
    FaLock,
    FaUser,
    FaEye,
    FaEyeSlash,
    FaPhone,
    FaShieldAlt,
    FaCheckCircle,
    FaHome
} from "react-icons/fa";

export default function AuthCard() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [isLogin, setIsLogin] = useState(true);
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [phone, setPhone] = useState("");
    const [errors, setErrors] = useState({});
    const [showRecovery, setShowRecovery] = useState(false);
    const [recoverySent, setRecoverySent] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // بررسی پارامتر URL هنگام لود کامپوننت
    useEffect(() => {
        const mode = searchParams.get('mode');
        if (mode === 'signup') {
            setIsLogin(false);
        } else {
            setIsLogin(true);
        }
    }, [searchParams]);

    const togglePassword = () => setShowPassword(!showPassword);

    const fadeVariant = {
        hidden: { opacity: 0, scale: 0.95 },
        visible: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.95 },
    };

    const handleBackToHome = () => {
        window.location.href = "/"; 
    };

    // تابع برای تغییر حالت بین ورود و ثبت‌نام
    const switchMode = (mode) => {
        setIsLogin(mode === 'login');
        setSearchParams({ mode });
    };

    const apiLogin = async (email, password) => {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        });
        return await response.json();
    };

    const apiSignup = async (fullName, email, password) => {
        const response = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ fullName, email, password })
        });
        return await response.json();
    };

    const apiRecovery = async (phone) => {
        const response = await fetch('/api/auth/recovery', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ phone })
        });
        return await response.json();
    };

    const validateLogin = () => {
        const newErrors = {};
        if (!email) newErrors.email = "ایمیل را وارد کنید";
        else if (!/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) newErrors.email = "فرمت ایمیل معتبر نیست";

        if (!password) newErrors.password = "رمز عبور را وارد کنید";
        else if (password.length < 6) newErrors.password = "رمز باید حداقل ۶ کاراکتر باشد";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const validateSignup = () => {
        const newErrors = {};
        if (!fullName) newErrors.fullName = "نام کامل را وارد کنید";
        if (!email) newErrors.email = "ایمیل را وارد کنید";
        else if (!/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) newErrors.email = "فرمت ایمیل معتبر نیست";
        if (!password) newErrors.password = "رمز عبور را وارد کنید";
        else if (password.length < 6) newErrors.password = "رمز باید حداقل ۶ کاراکتر باشد";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const validateRecovery = () => {
        if (!phone.trim()) return "شماره تلفن را وارد کنید";
        if (!/^09\d{9}$/.test(phone)) return "فرمت شماره معتبر نیست";
        return "";
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        if (!validateLogin()) return;

        setIsLoading(true);
        try {
            const result = await apiLogin(email, password);
            if (result.success) {
                localStorage.setItem('token', result.token);
                alert("ورود موفق!");
                window.location.href = "/dashboard";
            } else {
                setErrors({ general: result.message });
            }
        } catch (error) {
            setErrors({ general: "خطا در ارتباط با سرور" });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSignup = async (e) => {
        e.preventDefault();
        if (!validateSignup()) return;

        setIsLoading(true);
        try {
            const result = await apiSignup(fullName, email, password);
            if (result.success) {
                alert("ثبت‌نام موفق!");
                switchMode('login'); // برو به صفحه لاگین
            } else {
                setErrors({ general: result.message });
            }
        } catch (error) {
            setErrors({ general: "خطا در ارتباط با سرور" });
        } finally {
            setIsLoading(false);
        }
    };

    const handleRecovery = async (e) => {
        e.preventDefault();
        const error = validateRecovery();
        if (error) {
            setErrors({ phone: error });
            return;
        }

        setIsLoading(true);
        try {
            const result = await apiRecovery(phone);
            if (result.success) {
                setRecoverySent(true);
                setTimeout(() => {
                    setRecoverySent(false);
                    setShowRecovery(false);
                }, 3000);
            } else {
                setErrors({ phone: result.message });
            }
        } catch (error) {
            setErrors({ phone: "خطا در ارسال کد" });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="relative w-[370px] min-h-[520px] bg-gradient-to-br from-white/40 to-white/20 backdrop-blur-xl border border-white/30 shadow-2xl rounded-2xl flex justify-center items-center overflow-hidden p-4">
            
            <button 
                onClick={handleBackToHome}
                className="absolute top-4 left-4 z-20 bg-white/80 backdrop-blur-md border border-sky-200 text-sky-700 hover:bg-white hover:text-sky-900 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 shadow-md hover:shadow-lg"
                title="بازگشت به صفحه اصلی"
            >
                <FaHome className="text-sm" />
            </button>

            <AnimatePresence mode="wait">
                {isLogin ? (
                    <motion.form
                        key="login"
                        variants={fadeVariant}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        transition={{ duration: 0.5 }}
                        onSubmit={handleLogin}
                        className="w-full flex flex-col items-center"
                    >
                        <h2 className="text-3xl font-bold mb-6 text-sky-900">ورود</h2>

                        {errors.general && (
                            <div className="w-3/4 mb-4 p-3 bg-red-100 border border-red-300 rounded-lg">
                                <p className="text-red-700 text-sm text-center">{errors.general}</p>
                            </div>
                        )}

                        <div className="relative w-3/4 mb-2">
                            <FaEnvelope className="absolute left-3 top-3 text-sky-500" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="ایمیل"
                                className="pl-10 pr-4 py-2 rounded-lg w-full bg-white/70 border border-sky-200 focus:border-sky-500 focus:outline-none"
                                disabled={isLoading}
                            />
                            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                        </div>

                        <div className="relative w-3/4 mb-1">
                            <FaLock className="absolute left-3 top-3 text-sky-500" />
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="رمز عبور"
                                className="pl-10 pr-10 py-2 rounded-lg w-full bg-white/70 border border-sky-200 focus:border-sky-500 focus:outline-none"
                                disabled={isLoading}
                            />
                            <button
                                type="button"
                                onClick={togglePassword}
                                className="absolute right-3 top-3 text-sky-500"
                                disabled={isLoading}
                            >
                                {showPassword ? <FaEyeSlash /> : <FaEye />}
                            </button>
                            {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
                        </div>

                        <div className="w-3/4 text-right mb-6 mt-4 flex items-center justify-center">
                            <motion.button
                                type="button"
                                onClick={() => setShowRecovery(!showRecovery)}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="text-sm text-blue-700 hover:text-blue-900 transition-colors flex items-center gap-2 bg-blue-50/80 hover:bg-blue-100/80 px-4 py-2 rounded-xl border border-blue-200/60 backdrop-blur-sm shadow-sm"
                                disabled={isLoading}
                            >
                                <FaShieldAlt className="text-blue-600 text-base" />
                                بازیابی رمز با تلفن همراه
                            </motion.button>
                        </div>

                        {showRecovery && (
                            <motion.div
                                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                transition={{ duration: 0.4, ease: "easeOut" }}
                                className="w-3/4 mb-4 p-4 bg-gradient-to-br from-white/60 to-blue-50/40 backdrop-blur-lg rounded-2xl border border-blue-200/50 shadow-lg"
                            >
                                {recoverySent ? (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="text-center py-3"
                                    >
                                        <FaCheckCircle className="text-green-500 text-2xl mx-auto mb-2" />
                                        <p className="text-green-600 font-semibold text-sm">کد بازیابی ارسال شد!</p>
                                        <p className="text-sky-600 text-xs mt-1">لطفا پیامک خود را بررسی کنید</p>
                                    </motion.div>
                                ) : (
                                    <>
                                        <div className="relative mb-3">
                                            <FaPhone className="absolute left-3 top-3 text-blue-500" />
                                            <input
                                                type="tel"
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                                placeholder="09xxxxxxxxx"
                                                className="pl-10 pr-4 py-2 rounded-lg w-full bg-white/80 border border-blue-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200/50"
                                                disabled={isLoading}
                                            />
                                            {errors.phone && (
                                                <p className="text-red-500 text-xs mt-1 mr-1 flex items-center gap-1">
                                                    ⚠️ {errors.phone}
                                                </p>
                                            )}
                                        </div>
                                        <motion.button
                                            type="button"
                                            onClick={handleRecovery}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            className="w-full bg-gradient-to-r from-blue-500 to-sky-500 hover:from-blue-600 hover:to-sky-600 text-white py-2.5 rounded-xl font-semibold shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2"
                                            disabled={isLoading}
                                        >
                                            {isLoading ? (
                                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            ) : (
                                                <>
                                                    <FaShieldAlt className="text-white text-sm" />
                                                    ارسال کد بازیابی
                                                </>
                                            )}
                                        </motion.button>
                                    </>
                                )}
                            </motion.div>
                        )}

                        <button 
                            type="submit" 
                            className="bg-gradient-to-r from-sky-400 to-blue-500 hover:scale-105 transition-transform text-white font-semibold px-8 py-2 rounded-lg shadow-lg mb-3 w-3/4 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <div className="flex items-center justify-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    در حال ورود...
                                </div>
                            ) : (
                                "ورود"
                            )}
                        </button>

                        <p className="text-sm text-sky-700 mt-3">
                            عضو نیستید؟{" "}
                            <button 
                                onClick={() => switchMode('signup')} 
                                className="text-blue-600 font-semibold hover:text-blue-800 transition-colors duration-200 border-b-2 border-blue-300 hover:border-blue-600 pb-0.5"
                                disabled={isLoading}
                            >
                                همین حالا ثبت‌نام کنید
                            </button>
                        </p>
                    </motion.form>
                ) : (
                    <motion.form
                        key="signup"
                        variants={fadeVariant}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        transition={{ duration: 0.5 }}
                        onSubmit={handleSignup}
                        className="w-full flex flex-col items-center"
                    >
                        <h2 className="text-3xl font-bold mb-6 text-sky-900">ثبت‌نام</h2>

                        {errors.general && (
                            <div className="w-3/4 mb-4 p-3 bg-red-100 border border-red-300 rounded-lg">
                                <p className="text-red-700 text-sm text-center">{errors.general}</p>
                            </div>
                        )}

                        <div className="relative w-3/4 mb-2">
                            <FaUser className="absolute left-3 top-3 text-sky-500" />
                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                placeholder="نام کامل"
                                className="pl-10 pr-4 py-2 rounded-lg w-full bg-white/70 border border-sky-200 focus:border-sky-500 focus:outline-none"
                                disabled={isLoading}
                            />
                            {errors.fullName && <p className="text-red-500 text-sm mt-1">{errors.fullName}</p>}
                        </div>

                        <div className="relative w-3/4 mb-2">
                            <FaEnvelope className="absolute left-3 top-3 text-sky-500" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="ایمیل"
                                className="pl-10 pr-4 py-2 rounded-lg w-full bg-white/70 border border-sky-200 focus:border-sky-500 focus:outline-none"
                                disabled={isLoading}
                            />
                            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                        </div>

                        <div className="relative w-3/4 mb-4">
                            <FaLock className="absolute left-3 top-3 text-sky-500" />
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="رمز عبور"
                                className="pl-10 pr-10 py-2 rounded-lg w-full bg-white/70 border border-sky-200 focus:border-sky-500 focus:outline-none"
                                disabled={isLoading}
                            />
                            <button
                                type="button"
                                onClick={togglePassword}
                                className="absolute right-3 top-3 text-sky-500"
                                disabled={isLoading}
                            >
                                {showPassword ? <FaEyeSlash /> : <FaEye />}
                            </button>
                            {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
                        </div>

                        <button
                            type="submit"
                            className="bg-gradient-to-r from-sky-400 to-blue-500 hover:scale-105 transition-transform text-white font-semibold px-8 py-2 rounded-lg shadow-lg mb-3 w-3/4 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <div className="flex items-center justify-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    در حال ثبت‌نام...
                                </div>
                            ) : (
                                "ثبت‌نام"
                            )}
                        </button>

                        <p className="text-sm text-sky-700 mt-4">
                            از قبل عضو شده‌اید؟{" "}
                            <button 
                                onClick={() => switchMode('login')} 
                                className="text-blue-600 font-semibold hover:text-blue-800 transition-colors duration-200 border-b-2 border-blue-300 hover:border-blue-600 pb-0.5"
                                disabled={isLoading}
                            >
                                ورود به حساب
                            </button>
                        </p>
                    </motion.form>
                )}
            </AnimatePresence>

            {/* DECORATIVE BUBBLES */}
            <div className="absolute -z-10">
                <div className="absolute w-24 h-24 bg-sky-300/40 rounded-full blur-2xl top-0 left-0 animate-pulse"></div>
                <div className="absolute w-32 h-32 bg-blue-400/40 rounded-full blur-2xl bottom-10 right-5 animate-pulse delay-300"></div>
            </div>
        </div>
    );
}