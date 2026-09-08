import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  FaLock,
  FaUser,
  FaEye,
  FaEyeSlash,
  FaPhone,
  FaShieldAlt,
  FaHome,
  FaArrowRight,
} from "react-icons/fa";
import { authApi } from "../../services/apiClient";
import { useAuth } from "../../services/authContext";

const STEPS = {
  PHONE: "phone",
  LOGIN_PASSWORD: "login_password",
  REGISTER_OTP: "register_otp",
  REGISTER_PROFILE: "register_profile",
  RESET_OTP: "reset_otp",
  RESET_PASSWORD: "reset_password",
};

function toEnglishDigits(value) {
  const map = {
    "۰": "0",
    "۱": "1",
    "۲": "2",
    "۳": "3",
    "۴": "4",
    "۵": "5",
    "۶": "6",
    "۷": "7",
    "۸": "8",
    "۹": "9",
  };
  return String(value || "").replace(/[۰-۹]/g, (d) => map[d] || d);
}

function normalizePhoneInput(value) {
  let phone = toEnglishDigits(value).replace(/[\s()-]/g, "");
  if (phone.startsWith("+98")) phone = `0${phone.slice(3)}`;
  if (phone.startsWith("98") && phone.length === 12) phone = `0${phone.slice(2)}`;
  return phone;
}

export default function AuthCard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loginWithSession } = useAuth();

  const initialMode = searchParams.get("mode") === "signup" ? "register" : "login";

  const [step, setStep] = useState(STEPS.PHONE);
  const [intent, setIntent] = useState(initialMode); // login | register | reset
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [registrationToken, setRegistrationToken] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [devOtpHint, setDevOtpHint] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const mode = searchParams.get("mode");
    if (mode === "signup") {
      setIntent("register");
    } else if (mode === "reset") {
      setIntent("reset");
    } else {
      setIntent("login");
    }
  }, [searchParams]);

  const title = useMemo(() => {
    switch (step) {
      case STEPS.LOGIN_PASSWORD:
        return "ورود";
      case STEPS.REGISTER_OTP:
      case STEPS.RESET_OTP:
        return "تأیید کد";
      case STEPS.REGISTER_PROFILE:
        return "تکمیل ثبت‌نام";
      case STEPS.RESET_PASSWORD:
        return "رمز جدید";
      default:
        return intent === "reset" ? "بازیابی رمز" : "ورود / ثبت‌نام";
    }
  }, [step, intent]);

  const resetFormSecrets = () => {
    setPassword("");
    setConfirmPassword("");
    setOtp("");
    setDevOtpHint("");
    setError("");
    setInfo("");
  };

  const handleBackToHome = () => navigate("/");

  const handlePhoneContinue = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    const normalized = normalizePhoneInput(phone);
    setPhone(normalized);

    if (!/^09\d{9}$/.test(normalized)) {
      setError("فرمت شماره موبایل معتبر نیست");
      return;
    }

    setIsLoading(true);
    try {
      if (intent === "reset") {
        const result = await authApi.sendPasswordOtp(normalized);
        // No existence leak via `eligible` — always continue to OTP step.
        setDevOtpHint(import.meta.env.DEV ? result.devOtp || "" : "");
        setInfo(result.message || "اگر حسابی با این شماره وجود داشته باشد، کد بازیابی ارسال می‌شود");
        setStep(STEPS.RESET_OTP);
        return;
      }

      const { exists } = await authApi.checkPhone(normalized);

      if (exists) {
        setIntent("login");
        setStep(STEPS.LOGIN_PASSWORD);
        setInfo("حساب شما پیدا شد. رمز عبور را وارد کنید.");
        return;
      }

      const otpResult = await authApi.sendRegisterOtp(normalized);
      setIntent("register");
      setDevOtpHint(import.meta.env.DEV ? otpResult.devOtp || "" : "");
      setInfo("کد تأیید ارسال شد");
      setStep(STEPS.REGISTER_OTP);
    } catch (err) {
      setError(err.message || "خطا در ارتباط با سرور");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    if (!password) {
      setError("رمز عبور را وارد کنید");
      return;
    }

    setIsLoading(true);
    try {
      const session = await authApi.login({ phone, password });
      loginWithSession(session);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message || "ورود ناموفق بود");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyRegisterOtp = async (e) => {
    e.preventDefault();
    setError("");
    const code = toEnglishDigits(otp).trim();
    if (!/^\d{5}$/.test(code)) {
      setError("کد باید ۵ رقم باشد");
      return;
    }

    setIsLoading(true);
    try {
      const result = await authApi.verifyRegisterOtp(phone, code);
      setRegistrationToken(result.registrationToken);
      setStep(STEPS.REGISTER_PROFILE);
      setInfo("شماره تأیید شد. اطلاعات حساب را تکمیل کنید.");
    } catch (err) {
      setError(err.message || "تأیید کد ناموفق بود");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    if (!firstName.trim() || !lastName.trim()) {
      setError("نام و نام خانوادگی الزامی است");
      return;
    }
    if (password.length < 8) {
      setError("رمز عبور باید حداقل ۸ کاراکتر باشد");
      return;
    }
    if (password !== confirmPassword) {
      setError("رمز عبور و تکرار آن یکسان نیستند");
      return;
    }

    setIsLoading(true);
    try {
      const session = await authApi.register({
        registrationToken,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        password,
        confirmPassword,
      });
      loginWithSession(session);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message || "ثبت‌نام ناموفق بود");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyResetOtp = async (e) => {
    e.preventDefault();
    setError("");
    const code = toEnglishDigits(otp).trim();
    if (!/^\d{5}$/.test(code)) {
      setError("کد باید ۵ رقم باشد");
      return;
    }

    setIsLoading(true);
    try {
      const result = await authApi.verifyPasswordOtp(phone, code);
      setResetToken(result.resetToken);
      setStep(STEPS.RESET_PASSWORD);
      setInfo("کد تأیید شد. رمز جدید را وارد کنید.");
    } catch (err) {
      setError(err.message || "تأیید کد ناموفق بود");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("رمز عبور باید حداقل ۸ کاراکتر باشد");
      return;
    }
    if (password !== confirmPassword) {
      setError("رمز عبور و تکرار آن یکسان نیستند");
      return;
    }

    setIsLoading(true);
    try {
      const session = await authApi.resetPassword({
        resetToken,
        password,
        confirmPassword,
      });
      loginWithSession(session);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message || "بازیابی رمز ناموفق بود");
    } finally {
      setIsLoading(false);
    }
  };

  const goToPhoneStep = (nextIntent = "login") => {
    setIntent(nextIntent);
    setStep(STEPS.PHONE);
    resetFormSecrets();
  };

  const fadeVariant = {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
  };

  return (
    <div className="relative w-[370px] min-h-[520px] bg-gradient-to-br from-white/40 to-white/20 backdrop-blur-xl border border-white/30 shadow-2xl rounded-2xl flex justify-center items-center overflow-hidden p-4">
      <button
        onClick={handleBackToHome}
        className="absolute top-4 left-4 z-20 bg-white/80 backdrop-blur-md border border-sky-200 text-sky-700 hover:bg-white hover:text-sky-900 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 shadow-md hover:shadow-lg"
        title="بازگشت به صفحه اصلی"
        type="button"
      >
        <FaHome className="text-sm" />
      </button>

      {step !== STEPS.PHONE && (
        <button
          type="button"
          onClick={() => goToPhoneStep(intent === "reset" ? "reset" : "login")}
          className="absolute top-4 right-4 z-20 bg-white/80 backdrop-blur-md border border-sky-200 text-sky-700 w-10 h-10 rounded-full flex items-center justify-center shadow-md"
          title="بازگشت"
        >
          <FaArrowRight className="text-sm" />
        </button>
      )}

      <AnimatePresence mode="wait">
        <motion.form
          key={step}
          variants={fadeVariant}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={{ duration: 0.25 }}
          onSubmit={
            step === STEPS.PHONE
              ? handlePhoneContinue
              : step === STEPS.LOGIN_PASSWORD
                ? handleLogin
                : step === STEPS.REGISTER_OTP
                  ? handleVerifyRegisterOtp
                  : step === STEPS.REGISTER_PROFILE
                    ? handleRegister
                    : step === STEPS.RESET_OTP
                      ? handleVerifyResetOtp
                      : handleResetPassword
          }
          className="w-full flex flex-col items-center"
        >
          <h2 className="text-2xl font-bold mb-2 text-sky-900">{title}</h2>
          <p className="text-xs text-sky-700/80 mb-4 text-center px-4">
            مدرسه شنا ایران استرالیا
          </p>

          {error && (
            <div className="w-3/4 mb-3 p-3 bg-red-100 border border-red-300 rounded-lg">
              <p className="text-red-700 text-sm text-center">{error}</p>
            </div>
          )}

          {info && !error && (
            <div className="w-3/4 mb-3 p-3 bg-sky-50 border border-sky-200 rounded-lg">
              <p className="text-sky-800 text-sm text-center">{info}</p>
            </div>
          )}

          {import.meta.env.DEV &&
            devOtpHint &&
            (step === STEPS.REGISTER_OTP || step === STEPS.RESET_OTP) && (
              <div className="w-3/4 mb-3 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-amber-800 text-xs text-center">
                  کد توسعه (فقط محیط توسعه): {devOtpHint}
                </p>
              </div>
            )}

          {step === STEPS.PHONE && (
            <>
              <div className="relative w-3/4 mb-4">
                <FaPhone className="absolute left-3 top-3 text-sky-500" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="09xxxxxxxxx"
                  className="pl-10 pr-4 py-2 rounded-lg w-full bg-white/70 border border-sky-200 focus:border-sky-500 focus:outline-none"
                  disabled={isLoading}
                  autoFocus
                />
              </div>

              <button
                type="submit"
                className="bg-gradient-to-r from-sky-400 to-blue-500 hover:scale-105 transition-transform text-white font-semibold px-8 py-2 rounded-lg shadow-lg mb-3 w-3/4 disabled:opacity-50"
                disabled={isLoading}
              >
                {isLoading ? "لطفا صبر کنید..." : "ادامه"}
              </button>

              <div className="flex flex-col gap-2 mt-2 text-sm text-sky-700">
                <button
                  type="button"
                  className="text-blue-700 font-medium"
                  onClick={() => {
                    setIntent("reset");
                    setInfo("شماره موبایل حساب خود را وارد کنید");
                  }}
                  disabled={isLoading}
                >
                  بازیابی رمز عبور
                </button>
              </div>
            </>
          )}

          {step === STEPS.LOGIN_PASSWORD && (
            <>
              <p className="text-sm text-sky-800 mb-3">{phone}</p>
              <div className="relative w-3/4 mb-4">
                <FaLock className="absolute left-3 top-3 text-sky-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="رمز عبور"
                  className="pl-10 pr-10 py-2 rounded-lg w-full bg-white/70 border border-sky-200 focus:border-sky-500 focus:outline-none"
                  disabled={isLoading}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-3 text-sky-500"
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>

              <button
                type="submit"
                className="bg-gradient-to-r from-sky-400 to-blue-500 hover:scale-105 transition-transform text-white font-semibold px-8 py-2 rounded-lg shadow-lg mb-3 w-3/4 disabled:opacity-50"
                disabled={isLoading}
              >
                {isLoading ? "در حال ورود..." : "ورود"}
              </button>

              <button
                type="button"
                className="text-sm text-blue-700"
                onClick={() => {
                  setIntent("reset");
                  setStep(STEPS.PHONE);
                  resetFormSecrets();
                }}
              >
                رمز را فراموش کرده‌ام
              </button>
            </>
          )}

          {(step === STEPS.REGISTER_OTP || step === STEPS.RESET_OTP) && (
            <>
              <p className="text-sm text-sky-800 mb-3">{phone}</p>
              <div className="relative w-3/4 mb-4">
                <FaShieldAlt className="absolute left-3 top-3 text-sky-500" />
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={5}
                  value={otp}
                  onChange={(e) => setOtp(toEnglishDigits(e.target.value).replace(/\D/g, "").slice(0, 5))}
                  placeholder="کد ۵ رقمی"
                  className="pl-10 pr-4 py-2 rounded-lg w-full bg-white/70 border border-sky-200 focus:border-sky-500 focus:outline-none tracking-[0.35em] text-center"
                  disabled={isLoading}
                  autoFocus
                />
              </div>
              <button
                type="submit"
                className="bg-gradient-to-r from-sky-400 to-blue-500 hover:scale-105 transition-transform text-white font-semibold px-8 py-2 rounded-lg shadow-lg mb-3 w-3/4 disabled:opacity-50"
                disabled={isLoading}
              >
                {isLoading ? "در حال تأیید..." : "تأیید کد"}
              </button>
            </>
          )}

          {step === STEPS.REGISTER_PROFILE && (
            <>
              <div className="relative w-3/4 mb-2">
                <FaUser className="absolute left-3 top-3 text-sky-500" />
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="نام"
                  className="pl-10 pr-4 py-2 rounded-lg w-full bg-white/70 border border-sky-200 focus:border-sky-500 focus:outline-none"
                  disabled={isLoading}
                />
              </div>
              <div className="relative w-3/4 mb-2">
                <FaUser className="absolute left-3 top-3 text-sky-500" />
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="نام خانوادگی"
                  className="pl-10 pr-4 py-2 rounded-lg w-full bg-white/70 border border-sky-200 focus:border-sky-500 focus:outline-none"
                  disabled={isLoading}
                />
              </div>
              <div className="relative w-3/4 mb-2">
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
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-3 text-sky-500"
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              <div className="relative w-3/4 mb-4">
                <FaLock className="absolute left-3 top-3 text-sky-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="تکرار رمز عبور"
                  className="pl-10 pr-4 py-2 rounded-lg w-full bg-white/70 border border-sky-200 focus:border-sky-500 focus:outline-none"
                  disabled={isLoading}
                />
              </div>
              <button
                type="submit"
                className="bg-gradient-to-r from-sky-400 to-blue-500 hover:scale-105 transition-transform text-white font-semibold px-8 py-2 rounded-lg shadow-lg mb-3 w-3/4 disabled:opacity-50"
                disabled={isLoading}
              >
                {isLoading ? "در حال ثبت‌نام..." : "ثبت‌نام و ورود"}
              </button>
            </>
          )}

          {step === STEPS.RESET_PASSWORD && (
            <>
              <div className="relative w-3/4 mb-2">
                <FaLock className="absolute left-3 top-3 text-sky-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="رمز عبور جدید"
                  className="pl-10 pr-10 py-2 rounded-lg w-full bg-white/70 border border-sky-200 focus:border-sky-500 focus:outline-none"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-3 text-sky-500"
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              <div className="relative w-3/4 mb-4">
                <FaLock className="absolute left-3 top-3 text-sky-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="تکرار رمز عبور جدید"
                  className="pl-10 pr-4 py-2 rounded-lg w-full bg-white/70 border border-sky-200 focus:border-sky-500 focus:outline-none"
                  disabled={isLoading}
                />
              </div>
              <button
                type="submit"
                className="bg-gradient-to-r from-sky-400 to-blue-500 hover:scale-105 transition-transform text-white font-semibold px-8 py-2 rounded-lg shadow-lg mb-3 w-3/4 disabled:opacity-50"
                disabled={isLoading}
              >
                {isLoading ? "در حال ذخیره..." : "ذخیره رمز و ورود"}
              </button>
            </>
          )}
        </motion.form>
      </AnimatePresence>

      <div className="absolute -z-10">
        <div className="absolute w-24 h-24 bg-sky-300/40 rounded-full blur-2xl top-0 left-0 animate-pulse" />
        <div className="absolute w-32 h-32 bg-blue-400/40 rounded-full blur-2xl bottom-10 right-5 animate-pulse delay-300" />
      </div>
    </div>
  );
}
