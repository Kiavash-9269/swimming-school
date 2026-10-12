// src/components/courses/CoursesFeatures.jsx
import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  FaMale,
  FaFemale,
  FaWater,
  FaHeartbeat,
  FaClock,
  FaMapMarkerAlt,
  FaCheck,
  FaInfoCircle,
  FaShoppingCart,
  FaUsers,
  FaTag,
  FaArrowLeft,
} from "react-icons/fa";
import { GiWaterDrop } from "react-icons/gi";
import { useAuth } from "../../services/useAuth";

// ─── عکس استخرها ───
import PoolSajjad1 from "../../assets/images/IMG_1207.webp";
import PoolKosar1 from "../../assets/images/IMG_2352.webp";

// ─────────────────────────────────────────────
// TAB CONFIG — هماهنگ با تم آبی نفتی/آسمانی سایت
// ─────────────────────────────────────────────
const tabConfig = {
  men: {
    id: "men",
    label: "دوره‌های آقایان",
    icon: FaMale,
    bg: "bg-sky-50",
    bgSoft: "bg-gradient-to-br from-sky-50 to-cyan-50",
    badgeBg: "bg-sky-50",
    color: "text-sky-800",
    borderColor: "border-sky-600",
    buttonBg: "bg-sky-600",
    buttonHover: "hover:bg-sky-700",
    ring: "ring-sky-600",
    gradient: "from-sky-600 to-cyan-600",
    gradientHover: "hover:from-sky-700 hover:to-cyan-700",
    glow: "shadow-sky-200/50",
    accent: "text-sky-600",
    accentBg: "bg-sky-600",
  },
  women: {
    id: "women",
    label: "دوره‌های بانوان",
    icon: FaFemale,
    bg: "bg-cyan-50",
    bgSoft: "bg-gradient-to-br from-cyan-50 to-teal-50",
    badgeBg: "bg-cyan-50",
    color: "text-cyan-800",
    borderColor: "border-cyan-600",
    buttonBg: "bg-cyan-600",
    buttonHover: "hover:bg-cyan-700",
    ring: "ring-cyan-600",
    gradient: "from-cyan-600 to-teal-600",
    gradientHover: "hover:from-cyan-700 hover:to-teal-700",
    glow: "shadow-cyan-200/50",
    accent: "text-cyan-600",
    accentBg: "bg-cyan-600",
  },
  public: {
    id: "public",
    label: "سانس عمومی",
    icon: FaWater,
    bg: "bg-blue-50",
    bgSoft: "bg-gradient-to-br from-blue-50 to-indigo-50",
    badgeBg: "bg-blue-50",
    color: "text-blue-800",
    borderColor: "border-blue-600",
    buttonBg: "bg-blue-600",
    buttonHover: "hover:bg-blue-700",
    ring: "ring-blue-600",
    gradient: "from-blue-600 to-indigo-600",
    gradientHover: "hover:from-blue-700 hover:to-indigo-700",
    glow: "shadow-blue-200/50",
    accent: "text-blue-600",
    accentBg: "bg-blue-600",
  },
  hydro: {
    id: "hydro",
    label: "آب‌درمانی",
    icon: FaHeartbeat,
    bg: "bg-teal-50",
    bgSoft: "bg-gradient-to-br from-teal-50 to-emerald-50",
    badgeBg: "bg-teal-50",
    color: "text-teal-800",
    borderColor: "border-teal-600",
    buttonBg: "bg-teal-600",
    buttonHover: "hover:bg-teal-700",
    ring: "ring-teal-600",
    gradient: "from-teal-600 to-emerald-600",
    gradientHover: "hover:from-teal-700 hover:to-emerald-700",
    glow: "shadow-teal-200/50",
    accent: "text-teal-600",
    accentBg: "bg-teal-600",
  },
};

// ─────────────────────────────────────────────
// PRICING (تومان)
// ─────────────────────────────────────────────
const PRICING = {
  public: { price: 400_000, discountPrice: 300_000 },
  school: { price: 4_000_000, discountPrice: 3_700_000 },
  hydro: { price: 3_700_000, discountPrice: 3_700_000 },
};

function formatToman(amount) {
  return `${Number(amount).toLocaleString("fa-IR")} تومان`;
}

// ─────────────────────────────────────────────
// COURSES DATA — ساعت‌ها ۲۴ ساعته + عکس
// ─────────────────────────────────────────────
function makeSession(id, label, day, audience) {
  return { id, label, day, audience };
}

const menCourses = [
  {
    id: 1,
    classId: "men-sajjad-01",
    pool: "استخر سجاد",
    poolEmoji: "🌊",
    image: PoolSajjad1,
    location: "حامد شمالی ۱۰",
    description: "آموزش حرفه‌ای شنا از مبتدی تا پیشرفته",
    type: "school",
    schedule: [
      {
        id: "evening-1",
        days: "روزهای زوج",
        time: "۱۶:۱۵ - ۱۷:۱۵",
        sessions: [
          makeSession(
            "s1",
            "سانس ۱",
            "شنبه، دوشنبه، چهارشنبه",
            "آموزش پایه — ۵ سال تا بزرگسال"
          ),
        ],
      },
      {
        id: "evening-2",
        days: "روزهای زوج",
        time: "۱۷:۳۰ - ۱۸:۳۰",
        sessions: [
          makeSession(
            "s1",
            "سانس ۱",
            "شنبه، دوشنبه، چهارشنبه",
            "آموزش پایه — ۵ سال تا بزرگسال"
          ),
        ],
      },
      {
        id: "evening-3",
        days: "روزهای زوج",
        time: "۱۹:۰۰ - ۲۰:۰۰",
        sessions: [
          makeSession(
            "s1",
            "سانس ۱",
            "شنبه، دوشنبه، چهارشنبه",
            "آموزش پیشرفته — ۱۰ سال به بالا"
          ),
        ],
      },
    ],
  },
  {
    id: 2,
    classId: "men-kosar-01",
    pool: "استخر کوثر",
    poolEmoji: "💦",
    image: PoolKosar1,
    location: "قاسم آباد، روبروی شاهد ۷۵",
    description: "آموزش حرفه‌ای شنا از مبتدی تا پیشرفته",
    type: "school",
    schedule: [
      {
        id: "afternoon-1",
        days: "روزهای فرد",
        time: "۱۴:۳۰ - ۱۵:۰۰",
        sessions: [
          makeSession(
            "s1",
            "سانس ۱",
            "یکشنبه، سه‌شنبه، پنجشنبه",
            "آموزش پایه — ۵ سال تا بزرگسال"
          ),
        ],
      },
      {
        id: "afternoon-2",
        days: "روزهای فرد",
        time: "۱۶:۰۰ - ۱۷:۰۰",
        sessions: [
          makeSession(
            "s1",
            "سانس ۱",
            "یکشنبه، سه‌شنبه، پنجشنبه",
            "آموزش پایه — ۵ سال تا بزرگسال"
          ),
        ],
      },
      {
        id: "evening-1",
        days: "روزهای فرد",
        time: "۱۸:۰۰ - ۱۹:۰۰",
        sessions: [
          makeSession(
            "s1",
            "سانس ۱",
            "یکشنبه، سه‌شنبه، پنجشنبه",
            "آموزش پیشرفته — ۱۰ سال به بالا"
          ),
        ],
      },
      {
        id: "evening-2",
        days: "روزهای فرد",
        time: "۱۹:۰۰ - ۲۰:۰۰",
        sessions: [
          makeSession(
            "s1",
            "سانس ۱",
            "یکشنبه، سه‌شنبه، پنجشنبه",
            "آموزش پیشرفته — ۱۰ سال به بالا"
          ),
        ],
      },
    ],
  },
];

const womenCourses = [
  {
    id: 101,
    classId: "women-sajjad-01",
    pool: "استخر سجاد",
    poolEmoji: "🌊",
    image: PoolSajjad1,
    location: "حامد شمالی ۱۰",
    description: "آموزش حرفه‌ای شنا از مبتدی تا پیشرفته",
    type: "school",
    schedule: [
      {
        id: "morning-1",
        days: "روزهای فرد",
        time: "۱۰:۰۰ - ۱۲:۰۰",
        sessions: [
          makeSession(
            "s1",
            "سانس ۱",
            "شنبه، دوشنبه، چهارشنبه",
            "آموزش پایه — ۵ سال تا بزرگسال"
          ),
        ],
      },
      {
        id: "noon-1",
        days: "روزهای فرد",
        time: "۱۲:۰۰ - ۱۴:۰۰",
        sessions: [
          makeSession(
            "s1",
            "سانس ۱",
            "شنبه، دوشنبه، چهارشنبه",
            "آموزش پایه — ۵ سال تا بزرگسال"
          ),
        ],
      },
      {
        id: "afternoon-1",
        days: "روزهای فرد",
        time: "۱۴:۰۰ - ۱۶:۰۰",
        sessions: [
          makeSession(
            "s1",
            "سانس ۱",
            "شنبه، دوشنبه، چهارشنبه",
            "آموزش پیشرفته — ۱۰ سال به بالا"
          ),
        ],
      },
      {
        id: "evening-1",
        days: "روزهای فرد",
        time: "۱۶:۰۰ - ۱۸:۰۰",
        sessions: [
          makeSession(
            "s1",
            "سانس ۱",
            "شنبه، دوشنبه، چهارشنبه",
            "آموزش پیشرفته — ۱۰ سال به بالا"
          ),
        ],
      },
      {
        id: "evening-2",
        days: "روزهای فرد",
        time: "۱۸:۰۰ - ۲۰:۰۰",
        sessions: [
          makeSession(
            "s1",
            "سانس ۱",
            "شنبه، دوشنبه، چهارشنبه",
            "آموزش پیشرفته — ۱۰ سال به بالا"
          ),
        ],
      },
    ],
  },
  {
    id: 102,
    classId: "women-kosar-01",
    pool: "استخر کوثر",
    poolEmoji: "💦",
    image: PoolKosar1,
    location: "قاسم آباد، روبروی شاهد ۷۵",
    description: "آموزش حرفه‌ای شنا از مبتدی تا پیشرفته",
    type: "school",
    schedule: [
      {
        id: "morning-1",
        days: "روزهای زوج",
        time: "۱۰:۰۰ - ۱۲:۰۰",
        sessions: [
          makeSession(
            "s1",
            "سانس ۱",
            "یکشنبه، سه‌شنبه، پنجشنبه",
            "آموزش پایه — ۵ سال تا بزرگسال"
          ),
        ],
      },
      {
        id: "noon-1",
        days: "روزهای زوج",
        time: "۱۲:۰۰ - ۱۴:۰۰",
        sessions: [
          makeSession(
            "s1",
            "سانس ۱",
            "یکشنبه، سه‌شنبه، پنجشنبه",
            "آموزش پایه — ۵ سال تا بزرگسال"
          ),
        ],
      },
      {
        id: "afternoon-1",
        days: "روزهای زوج",
        time: "۱۴:۰۰ - ۱۶:۰۰",
        sessions: [
          makeSession(
            "s1",
            "سانس ۱",
            "یکشنبه، سه‌شنبه، پنجشنبه",
            "آموزش پیشرفته — ۱۰ سال به بالا"
          ),
        ],
      },
      {
        id: "evening-1",
        days: "روزهای زوج",
        time: "۱۶:۰۰ - ۱۸:۰۰",
        sessions: [
          makeSession(
            "s1",
            "سانس ۱",
            "یکشنبه، سه‌شنبه، پنجشنبه",
            "آموزش پیشرفته — ۱۰ سال به بالا"
          ),
        ],
      },
      {
        id: "evening-2",
        days: "روزهای زوج",
        time: "۱۸:۰۰ - ۲۰:۰۰",
        sessions: [
          makeSession(
            "s1",
            "سانس ۱",
            "یکشنبه، سه‌شنبه، پنجشنبه",
            "آموزش پیشرفته — ۱۰ سال به بالا"
          ),
        ],
      },
    ],
  },
];

const hydroMenCourses = [
  {
    id: 201,
    classId: "hydro-men-sajjad-01",
    pool: "استخر سجاد",
    poolEmoji: "🌊",
    image: PoolSajjad1,
    location: "حامد شمالی ۱۰",
    description: "تمرینات آب‌درمانی زیر نظر دکتر شجاعی",
    type: "hydro",
    schedule: [
      {
        id: "evening-1",
        days: "روزهای زوج",
        time: "۱۹:۰۰ - ۲۰:۳۰",
        sessions: [
          makeSession(
            "s1",
            "سانس ویژه",
            "شنبه، دوشنبه، چهارشنبه",
            "بزرگسال — با نسخه پزشک"
          ),
        ],
      },
    ],
  },
];

const publicCourses = [
  {
    id: 301,
    classId: "public-sajjad",
    pool: "استخر سجاد",
    poolEmoji: "🌊",
    image: PoolSajjad1,
    location: "حامد شمالی ۱۰",
    type: "public",
  },
  {
    id: 302,
    classId: "public-kosar",
    pool: "استخر کوثر",
    poolEmoji: "💦",
    image: PoolKosar1,
    location: "قاسم آباد، روبروی شاهد ۷۵",
    type: "public",
  },
];

// ─────────────────────────────────────────────
// POOL IMAGE — با fallback به ایموجی
// ─────────────────────────────────────────────
function PoolImage({ src, alt, emoji, className }) {
  const [errored, setErrored] = useState(false);

  if (!src || errored) {
    return (
      <div
        className={`${className} bg-slate-100 flex items-center justify-center`}
      >
        <span className="text-3xl leading-none">{emoji || "🏊"}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setErrored(true)}
      className={`${className} object-cover`}
    />
  );
}

// ─────────────────────────────────────────────
// PRICE BADGE
// ─────────────────────────────────────────────
function PriceBadge({ pricing, colorClass, accentBg }) {
  const hasDiscount = pricing.discountPrice < pricing.price;
  const percent = hasDiscount
    ? Math.round(
        ((pricing.price - pricing.discountPrice) / pricing.price) * 100
      )
    : 0;

  return (
    <div className="rounded-xl bg-slate-50/80 border border-slate-100 p-3 mb-4">
      {hasDiscount ? (
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 line-through">
              {formatToman(pricing.price)}
            </span>
            <span className={`text-base font-bold ${colorClass}`}>
              {formatToman(pricing.discountPrice)}
            </span>
          </div>
          <span
            className={`text-[10px] ${accentBg} text-white px-2 py-1 rounded-lg flex items-center gap-1 font-semibold shadow-sm`}
          >
            <FaTag className="w-2.5 h-2.5" />
            {percent}٪ تخفیف
          </span>
        </div>
      ) : (
        <span className={`text-base font-bold ${colorClass}`}>
          {formatToman(pricing.price)}
        </span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
export default function CoursesFeatures() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState("men");
  const [selectedSchedules, setSelectedSchedules] = useState({});
  const [selectedSessions, setSelectedSessions] = useState({});

  const currentCourses = useMemo(() => {
    switch (activeTab) {
      case "men":
        return menCourses;
      case "women":
        return womenCourses;
      case "public":
        return publicCourses;
      case "hydro":
        return hydroMenCourses;
      default:
        return menCourses;
    }
  }, [activeTab]);

  const currentTabConfig = tabConfig[activeTab];
  const CurrentIcon = currentTabConfig.icon;

  const toggleSchedule = (courseId, scheduleId) => {
    setSelectedSchedules((prev) => ({
      ...prev,
      [courseId]: prev[courseId] === scheduleId ? null : scheduleId,
    }));
    setSelectedSessions((prev) => ({ ...prev, [courseId]: null }));
  };

  const selectSession = (courseId, sessionId) => {
    setSelectedSessions((prev) => ({ ...prev, [courseId]: sessionId }));
  };

  const handleAction = (course) => {
    const isPublic = course.type === "public";
    const selectedScheduleId = selectedSchedules[course.id];
    const selectedSchedule = course.schedule?.find(
      (s) => s.id === selectedScheduleId
    );
    const selectedSession = selectedSchedule?.sessions?.find(
      (s) => s.id === selectedSessions[course.id]
    );

    const targetPath = isPublic
      ? `/app/courses/${course.classId}`
      : `/app/courses/${course.classId}/register`;

    if (!isAuthenticated) {
      navigate("/auth?mode=login", { state: { from: targetPath } });
      return;
    }

    navigate(targetPath, {
      state: {
        course,
        selectedSchedule,
        selectedSession,
        source: "courses-features",
      },
    });
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-sky-950 p-3 sm:p-6 md:p-14 flex flex-col items-center"
    >
      <div className="w-full max-w-7xl">
        {/* HEADER — دست نخورده */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-2 sm:px-4 pt-4 sm:pt-8 max-w-7xl mx-auto text-center"
        >
          <header className="text-center mt-12 sm:mt-4 mb-8 sm:mb-10 md:mb-12">              
        
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-medium text-white mb-3 sm:mb-4">
              دوره‌های آموزشی ما
            </h1>
            <div className="w-16 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent mx-auto mb-3 sm:mb-4" />
            <p className="text-gray-300 text-sm sm:text-base max-w-2xl mx-auto px-2">
              از مبتدی تا قهرمان — دوره‌های تخصصی شنا برای بانوان و آقایان
            </p>
          </header>
        </motion.div>

        {/* TABS */}
        <div className="flex justify-center mb-8 sm:mb-10 px-2 sm:px-4">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-1.5 border border-sky-200/50 shadow-lg w-full max-w-4xl">
            <div className="flex flex-nowrap sm:flex-wrap justify-start sm:justify-center gap-1 overflow-x-auto pb-1 sm:pb-0">
              {Object.values(tabConfig).map((tab) => {
                const TabIcon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                      isActive
                        ? `bg-gradient-to-l ${tab.gradient} text-white shadow-sm`
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <TabIcon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* COURSES GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 px-2 sm:px-4">
          {currentCourses.map((course, i) => {
            const isPublic = course.type === "public";
            const isHydro = course.type === "hydro";
            const pricing = isPublic
              ? PRICING.public
              : isHydro
                ? PRICING.hydro
                : PRICING.school;

            const selectedScheduleId = selectedSchedules[course.id];
            const selectedSchedule = course.schedule?.find(
              (s) => s.id === selectedScheduleId
            );
            const selectedSessionId = selectedSessions[course.id];
            const ready = Boolean(selectedScheduleId && selectedSessionId);

            return (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="group relative bg-white rounded-3xl overflow-hidden border border-slate-200/80 hover:border-slate-300 transition-all duration-300 shadow-sm hover:shadow-2xl hover:-translate-y-1.5 flex flex-col h-full"
              >
                {/* ─────────── عکس استخر (HERO) ─────────── */}
                <div className="relative h-44 sm:h-48 w-full overflow-hidden">
                  <PoolImage
                    src={course.image}
                    alt={course.pool}
                    emoji={course.poolEmoji}
                    className="w-full h-full transition-transform duration-500 group-hover:scale-105"
                  />

                  {/* گرادیان تیره پایین عکس برای خوانایی */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                  {/* بج نوع دوره — گوشه بالا راست */}
                  <span
                    className={`absolute top-3 right-3 text-[10px] font-semibold ${currentTabConfig.color} bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-full flex items-center gap-1 flex-shrink-0 shadow-sm`}
                  >
                    <CurrentIcon className="w-2.5 h-2.5" />
                    {currentTabConfig.label}
                  </span>

                  {/* اطلاعات روی عکس */}
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="font-bold text-white text-base sm:text-lg mb-1 drop-shadow-sm">
                      {course.pool}
                    </h3>
                    <p className="text-[11px] text-white/90 flex items-center gap-1 drop-shadow-sm">
                      <FaMapMarkerAlt className="w-2.5 h-2.5 flex-shrink-0" />
                      <span className="truncate">{course.location}</span>
                    </p>
                  </div>
                </div>

                {/* BODY */}
                <div className="relative p-5 pt-4 flex flex-col flex-grow">
                  {course.description && (
                    <p className="text-slate-600 text-xs sm:text-sm leading-relaxed mb-4">
                      {course.description}
                    </p>
                  )}

                  {isPublic ? (
                    <>
                      <div className="flex-grow">
                        <PriceBadge
                          pricing={pricing}
                          colorClass={currentTabConfig.color}
                          accentBg={currentTabConfig.accentBg}
                        />
                      </div>
                      <button
                        onClick={() => handleAction(course)}
                        className={`w-full flex items-center justify-center gap-2 bg-gradient-to-l ${currentTabConfig.gradient} ${currentTabConfig.gradientHover} text-white py-3 rounded-2xl font-semibold text-sm transition-all duration-200 shadow-md hover:shadow-lg`}
                      >
                        <FaShoppingCart className="w-3.5 h-3.5" />
                        خرید بلیط سانس عمومی
                      </button>
                    </>
                  ) : (
                    <>
                      {/* انتخاب ساعت */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wide flex items-center gap-1">
                            <FaClock className="w-3 h-3" />
                            انتخاب ساعت
                          </div>
                          {selectedSchedule && (
                            <motion.span
                              initial={{ opacity: 0, x: 10 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full"
                            >
                              <FaCheck className="w-2.5 h-2.5" />
                              انتخاب شد
                            </motion.span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {course.schedule.map((schedule) => {
                            const isSelected =
                              selectedScheduleId === schedule.id;
                            return (
                              <motion.button
                                key={schedule.id}
                                type="button"
                                whileTap={{ scale: 0.96 }}
                                onClick={() =>
                                  toggleSchedule(course.id, schedule.id)
                                }
                                className={`px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-medium transition-all duration-200 border tabular-nums ${
                                  isSelected
                                    ? `bg-gradient-to-l ${currentTabConfig.gradient} text-white border-transparent shadow-sm`
                                    : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                                }`}
                              >
                                {schedule.time}
                              </motion.button>
                            );
                          })}
                        </div>
                        {!selectedSchedule && (
                          <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
                            <FaInfoCircle className="w-2.5 h-2.5" />
                            برای ادامه، یک ساعت را انتخاب کنید
                          </p>
                        )}
                      </div>

                      {/* انتخاب سانس */}
                      <AnimatePresence initial={false}>
                        {selectedSchedule && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="mb-4 overflow-hidden"
                          >
                            <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wide mb-2 flex items-center gap-1">
                              <FaUsers className="w-3 h-3" />
                              انتخاب سانس
                            </div>
                            <div className="space-y-1.5">
                              {selectedSchedule.sessions.map((session) => {
                                const isSessionSelected =
                                  selectedSessionId === session.id;
                                return (
                                  <button
                                    key={session.id}
                                    type="button"
                                    onClick={() =>
                                      selectSession(course.id, session.id)
                                    }
                                    className={`w-full text-right px-3 py-2.5 rounded-xl border transition-all flex items-start gap-3 ${
                                      isSessionSelected
                                        ? `${currentTabConfig.borderColor} ${currentTabConfig.badgeBg}`
                                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                                    }`}
                                  >
                                    <span
                                      className={`mt-0.5 w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                                        isSessionSelected
                                          ? `${currentTabConfig.borderColor} ${currentTabConfig.buttonBg}`
                                          : "border-slate-300"
                                      }`}
                                    >
                                      {isSessionSelected && (
                                        <span className="w-1 h-1 rounded-full bg-white" />
                                      )}
                                    </span>

                                    <div className="flex-1 min-w-0">
                                      <div className="text-xs font-semibold text-slate-800">
                                        {session.label}
                                      </div>
                                      <div className="text-[10px] text-slate-400 mt-0.5">
                                        {session.day}
                                      </div>
                                      {session.audience && (
                                        <div className="text-[10px] text-slate-500 mt-1">
                                          {session.audience}
                                        </div>
                                      )}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <PriceBadge
                        pricing={pricing}
                        colorClass={currentTabConfig.color}
                        accentBg={currentTabConfig.accentBg}
                      />

                      {/* دکمه ثبت‌نام */}
                      <div className="mt-auto pt-1">
                        <motion.button
                          whileHover={ready ? { scale: 1.01 } : {}}
                          whileTap={ready ? { scale: 0.98 } : {}}
                          disabled={!ready}
                          onClick={() => handleAction(course)}
                          className={`w-full py-3 rounded-2xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                            ready
                              ? `bg-gradient-to-l ${currentTabConfig.gradient} ${currentTabConfig.gradientHover} text-white shadow-md hover:shadow-lg`
                              : "bg-slate-100 text-slate-400 cursor-not-allowed"
                          }`}
                        >
                          {ready ? (
                            <>
                              <span>
                                {isHydro
                                  ? "ادامه رزرو آب‌درمانی"
                                  : "ادامه ثبت‌نام"}
                              </span>
                              <FaArrowLeft className="w-3 h-3" />
                            </>
                          ) : (
                            <>
                              <FaClock className="w-3.5 h-3.5" />
                              <span>
                                {!selectedScheduleId
                                  ? "ابتدا ساعت را انتخاب کنید"
                                  : "حالا یک سانس را انتخاب کنید"}
                              </span>
                            </>
                          )}
                        </motion.button>

                        {!isAuthenticated && (
                          <p className="text-[10px] text-slate-400 text-center mt-2 flex items-center justify-center gap-1">
                            <FaInfoCircle className="w-2.5 h-2.5" />
                            برای ثبت‌نام ابتدا وارد حساب کاربری شوید
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}