// src/components/CoursesFeatures.jsx
import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Users, Waves, HeartPulse, ChevronLeft, Ticket, Clock, MapPin, Construction } from "lucide-react";

// TAB CONFIG //
const tabConfig = {
  men: {
    id: "men",
    label: "دوره‌های آقایان",
    icon: User,
    bg: "bg-blue-50",
    badgeBg: "bg-blue-50",
    color: "text-blue-700",
    darkColor: "text-blue-800",
    borderColor: "border-blue-500",
    buttonBg: "bg-blue-600",
    buttonHover: "hover:bg-blue-700",
  },
  women: {
    id: "women",
    label: "دوره‌های بانوان",
    icon: Users,
    bg: "bg-violet-50",
    badgeBg: "bg-violet-50",
    color: "text-violet-700",
    darkColor: "text-violet-800",
    borderColor: "border-violet-500",
    buttonBg: "bg-violet-600",
    buttonHover: "hover:bg-violet-700",
  },
  public: {
    id: "public",
    label: "سانس عمومی",
    icon: Waves,
    bg: "bg-amber-50",
    badgeBg: "bg-amber-50",
    color: "text-amber-700",
    darkColor: "text-amber-800",
    borderColor: "border-amber-500",
    buttonBg: "bg-amber-600",
    buttonHover: "hover:bg-amber-700",
  },
  hydro: {
    id: "hydro",
    label: "آب‌درمانی",
    icon: HeartPulse,
    bg: "bg-teal-50",
    badgeBg: "bg-teal-50",
    color: "text-teal-700",
    darkColor: "text-teal-800",
    borderColor: "border-teal-500",
    buttonBg: "bg-teal-600",
    buttonHover: "hover:bg-teal-700",
  },
};

// MEN COURSES //
const menCourses = [
  {
    id: 1,
    title: "دوره‌های آموزشی آقایان | استخر سجاد",
    description: "آموزش حرفه‌ای شنا از مبتدی تا پیشرفته - استخر سجاد",
    location: "حامد شمالی ۱۰",
    pool: "استخر سجاد",
    schedule: [
      { days: "روزهای زوج", time: "۰۸:۰۰ - ۱۰:۰۰" },
      { days: "روزهای زوج", time: "۱۰:۰۰ - ۱۲:۰۰" },
      { days: "روزهای زوج", time: "۱۲:۰۰ - ۱۴:۰۰" },
      { days: "روزهای زوج", time: "۱۶:۰۰ - ۱۷:۳۰" },
      { days: "روزهای زوج", time: "۱۷:۳۰ - ۱۹:۰۰" },
      { days: "روزهای زوج", time: "۱۹:۰۰ - ۲۰:۳۰" },
    ],
  },
  {
    id: 2,
    title: "دوره‌های آموزشی آقایان | استخر کوثر",
    description: "آموزش حرفه‌ای شنا از مبتدی تا پیشرفته - استخر کوثر",
    location: "قاسم آباد، روبروی شاهد ۷۵",
    pool: "استخر کوثر",
    schedule: [
      { days: "روزهای فرد", time: "۱۰:۰۰ - ۱۲:۰۰" },
      { days: "روزهای فرد", time: "۱۶:۰۰ - ۱۸:۰۰" },
      { days: "روزهای فرد", time: "۱۸:۰۰ - ۲۰:۰۰" },
    ],
  },
];

// WOMEN COURSES //
const womenCourses = [
  {
    id: 101,
    title: "دوره‌های آموزشی بانوان | استخر سجاد",
    description: "آموزش حرفه‌ای شنا از مبتدی تا پیشرفته - استخر سجاد",
    location: "حامد شمالی ۱۰",
    pool: "استخر سجاد",
    schedule: [
      { days: "روزهای فرد", time: "۱۰:۰۰ - ۱۲:۰۰" },
      { days: "روزهای فرد", time: "۱۲:۰۰ - ۱۴:۰۰" },
      { days: "روزهای فرد", time: "۱۴:۰۰ - ۱۶:۰۰" },
      { days: "روزهای فرد", time: "۱۶:۰۰ - ۱۸:۰۰" },
      { days: "روزهای فرد", time: "۱۸:۰۰ - ۲۰:۰۰" },
    ],
  },
  {
    id: 102,
    title: "دوره‌های آموزشی بانوان | استخر کوثر",
    description: "آموزش حرفه‌ای شنا از مبتدی تا پیشرفته - استخر کوثر",
    location: "قاسم آباد، روبروی شاهد ۷۵",
    pool: "استخر کوثر",
    schedule: [
      { days: "روزهای زوج", time: "۱۴:۰۰ - ۱۶:۰۰" },
      { days: "روزهای زوج", time: "۱۶:۰۰ - ۱۸:۰۰" },
      { days: "روزهای زوج", time: "۱۸:۰۰ - ۲۰:۰۰" },
    ],
  },
];

// HYDRO COURSES //
const hydroMenCourses = [
  {
    id: 201,
    title: "آب درمانی آقایان",
    description: "تمرینات آب درمانی برای سلامتی و تناسب اندام - زیر نظر دکتر شجاعی",
    type: "hydro",
    pool: "استخر سجاد",
    location: "حامد شمالی ۱۰",
    schedule: [{ days: "روزهای زوج", time: "۱۹:۰۰ - ۲۰:۳۰" }],
  },
];

// PUBLIC COURSES //
const publicCourses = [
  {
    id: 301,
    title: "سانس عمومی | استخر سجاد",
    pool: "استخر سجاد",
    location: "حامد شمالی ۱۰",
    type: "public",
    ticketUrl: "https://www.poolticket.org/pool/استخر-سجاد-مشهد-mashhad-sajjad-pool",
  },
  {
    id: 302,
    title: "سانس عمومی | استخر کوثر",
    pool: "استخر کوثر",
    location: "قاسم آباد، روبروی شاهد ۷۵",
    type: "public",
    ticketUrl: "https://www.poolticket.org/pool/استخر-کوثر-مشهد",
  },
];

// MAIN COMPONENT //
export default function CoursesFeatures() {
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [activeTab, setActiveTab] = useState("men");

  // GET CURRENT COURSES //
  const currentCourses = useMemo(() => {
    switch (activeTab) {
      case "men": return menCourses;
      case "women": return womenCourses;
      case "public": return publicCourses;
      case "hydro": return hydroMenCourses;
      default: return menCourses;
    }
  }, [activeTab]);

  const currentTabConfig = tabConfig[activeTab];
  const CurrentIcon = currentTabConfig.icon;

  // ENROLL (TEMPORARY - COMING SOON) //
  const onEnroll = () => {
    alert("🚧 ثبت‌نام آنلاین به‌زودی در دسترس قرار می‌گیرد.\nبرای اطلاعات بیشتر با مجموعه تماس بگیرید.");
  };

  return (
    <div dir="rtl" className="min-h-screen bg-sky-950 p-3 sm:p-6 md:p-14 flex flex-col items-center">
      <div className="w-full max-w-7xl">

        {/* HEADER */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-2 sm:px-4 pt-4 sm:pt-8 max-w-7xl mx-auto text-center"
        >
          <header className="text-center mt-12 sm:mt-4 mb-6 sm:mb-8 md:mb-12">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-medium text-white mb-3 sm:mb-4">
              دوره‌های آموزشی ما
            </h1>
            <div className="w-16 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent mx-auto mb-3 sm:mb-4"></div>
            <p className="text-gray-300 text-sm sm:text-base max-w-2xl mx-auto px-2">
              از مبتدی تا قهرمان — دوره‌های تخصصی شنا برای بانوان و آقایان
            </p>
          </header>
        </motion.div>

        {/* TABS */}
        <div className="flex justify-center mb-6 sm:mb-8 px-2 sm:px-4">
          <div className="bg-white rounded-xl sm:rounded-2xl p-1.5 sm:p-2 border border-sky-200 shadow-sm w-full max-w-4xl">
            <div className="flex flex-nowrap sm:flex-wrap justify-start sm:justify-center gap-1 sm:gap-2 overflow-x-auto pb-1 sm:pb-0">
              {Object.values(tabConfig).map((tab) => {
                const TabIcon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                      activeTab === tab.id
                        ? `${tab.bg} ${tab.color} shadow-sm`
                        : "text-sky-700 hover:bg-sky-100"
                    }`}
                  >
                    <TabIcon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* COURSES GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 md:gap-6 px-2 sm:px-4">
          {currentCourses.map((course, i) => {
            const isPublic = course.type === "public";
            const isHydro = course.type === "hydro";

            return (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`bg-white/95 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-5 border-r-4 ${currentTabConfig.borderColor} border border-sky-200 hover:border-sky-300 transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-1 flex flex-col h-full`}
              >
                {/* CARD HEADER */}
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-sky-100">
                  <div className={`w-14 h-14 rounded-2xl ${currentTabConfig.bg} flex items-center justify-center`}>
                    <CurrentIcon className={`w-7 h-7 ${currentTabConfig.color}`} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sky-900 text-base sm:text-lg">{course.pool}</h3>
                    <p className="text-[11px] sm:text-xs text-sky-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {course.location}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 sm:space-y-4 flex-grow flex flex-col">
                  {/* PUBLIC SECTION */}
                  {isPublic ? (
                    <>
                      <div className="flex-grow">
                        <p className="text-sky-700 text-sm sm:text-base leading-relaxed mb-4">
                          برای خرید بلیط و اطلاع از ساعت‌های سانس عمومی می‌توانید از لینک زیر اقدام نمایید.
                        </p>
                      </div>
                      <a
                        href={course.ticketUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white py-3 rounded-xl font-semibold hover:from-amber-600 hover:to-amber-700 transition-all duration-200 shadow-sm"
                      >
                        <Ticket className="w-4 h-4" />
                        خرید بلیط و مشاهده سانس‌ها
                      </a>
                    </>
                  ) : (
                    <>
                      {/* SCHEDULES */}
                      <div>
                        <div className="text-[11px] sm:text-xs text-sky-600 font-medium mb-2 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          📅 برنامه کلاس‌ها:
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {course.schedule.map((schedule, idx) => (
                            <span
                              key={idx}
                              className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl ${currentTabConfig.badgeBg} border border-sky-100 text-[11px] sm:text-xs ${currentTabConfig.color} font-medium`}
                            >
                              {schedule.days} • {schedule.time}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* LOCATION */}
                      <div className="text-[11px] sm:text-xs text-sky-600 flex items-start gap-1">
                        <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <span>{course.location}</span>
                      </div>

                      {/* DESCRIPTION */}
                      <p className="text-sky-700 text-xs sm:text-sm leading-relaxed">
                        {course.description}
                      </p>

                      {/* ACTION BUTTON - COMING SOON */}
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={onEnroll}
                        className={`w-full ${currentTabConfig.buttonBg} ${currentTabConfig.buttonHover} text-white py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 shadow-sm mt-auto flex items-center justify-center gap-2 opacity-90`}
                      >
                        <Construction className="w-4 h-4" />
                        {isHydro ? "رزرو نوبت آب‌درمانی (به‌زودی)" : "رزرو کلاس (به‌زودی)"}
                      </motion.button>
                    </>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* MODAL - ONLY FOR REGULAR COURSES */}
        <AnimatePresence>
          {selectedCourse && selectedCourse.type !== "public" && (
            <motion.div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-2 sm:p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCourse(null)}
            >
              <motion.div
                className="relative bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 max-w-2xl w-full mx-auto border border-sky-200 shadow-lg max-h-[90vh] overflow-y-auto"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* CLOSE BUTTON */}
                <button
                  onClick={() => setSelectedCourse(null)}
                  className="absolute left-2 sm:left-3 top-2 sm:top-3 text-sky-600 hover:text-sky-800 text-xl"
                >
                  <ChevronLeft className="w-6 h-6 sm:w-7 sm:h-7" />
                </button>

                {/* MODAL HEADER */}
                <div className="flex items-center gap-3 mb-4 mt-2 pt-2 pb-3 border-b border-sky-100">
                  <div className={`w-14 h-14 rounded-2xl ${currentTabConfig.bg} flex items-center justify-center`}>
                    <CurrentIcon className={`w-7 h-7 ${currentTabConfig.color}`} />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-sky-900">{selectedCourse.pool}</h2>
                    <p className="text-xs sm:text-sm text-sky-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {selectedCourse.location}
                    </p>
                  </div>
                </div>

                {/* HYDRO BADGE */}
                {selectedCourse.type === "hydro" && (
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-3 flex-wrap">
                    <span className="text-[11px] sm:text-sm px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-teal-100 text-teal-700 border border-teal-200">
                      آب‌درمانی
                    </span>
                  </div>
                )}

                {/* DESCRIPTION */}
                <p className="text-sky-700 text-xs sm:text-sm mb-4 sm:mb-5 leading-relaxed">
                  {selectedCourse.description}
                </p>

                {/* SCHEDULES */}
                <h4 className="font-bold text-sky-800 mb-2 sm:mb-3 text-xs sm:text-sm">
                  📅 برنامه زمان‌بندی:
                </h4>
                <div className="flex flex-wrap gap-2 mb-5 sm:mb-6">
                  {selectedCourse.schedule.map((schedule, idx) => (
                    <span
                      key={idx}
                      className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl ${currentTabConfig.badgeBg} border border-sky-100 text-xs sm:text-sm ${currentTabConfig.color} font-medium`}
                    >
                      {schedule.days} • {schedule.time}
                    </span>
                  ))}
                </div>

                {/* MODAL ACTIONS */}
                <div className="flex justify-end gap-2 sm:gap-3">
                  <button
                    onClick={() => setSelectedCourse(null)}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 text-sky-600 hover:text-sky-800 text-xs sm:text-sm font-medium transition-colors duration-200"
                  >
                    انصراف
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onEnroll}
                    className={`px-4 sm:px-6 py-1.5 sm:py-2 ${currentTabConfig.buttonBg} ${currentTabConfig.buttonHover} text-white rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 shadow-sm flex items-center gap-2 opacity-90`}
                  >
                    <Construction className="w-4 h-4" />
                    ثبت‌نام (به‌زودی)
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}