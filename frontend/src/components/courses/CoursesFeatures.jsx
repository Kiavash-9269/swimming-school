// src/components/CoursesFeatures.jsx
import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Users, Waves, HeartPulse, ChevronLeft } from "lucide-react";

export default function CoursesFeatures() {
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [activeTab, setActiveTab] = useState("men");
  const [enrollLoading, setEnrollLoading] = useState(null);

  // دوره‌های آقایان - فقط ۲ کارت
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

  // دوره‌های بانوان - فقط ۲ کارت (آب درمانی حذف شد)
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

  // آب درمانی آقایان
  const hydroMenCourses = [
    {
      id: 201,
      title: "آب درمانی آقایان",
      description: "تمرینات آب درمانی برای سلامتی و تناسب اندام - زیر نظر دکتر شجاعی",
      type: "hydro",
      pool: "استخر سجاد",
      location: "حامد شمالی ۱۰",
      schedule: [
        { days: "روزهای زوج", time: "۱۹:۰۰ - ۲۰:۳۰" },
      ],
    },
  ];

  const publicCourses = [
    {
      id: 301,
      title: "سانس عمومی (آقایان و بانوان)",
      description: "تمرینات عمومی و آزاد برای تمام سطوح و همه سنین",
      type: "public",
      pool: "استخر سجاد و کوثر",
      location: "هر دو شعبه",
      schedule: [
        { days: "هر روز", time: "۲۰:۳۰ - ۲۳:۳۰", pool: "استخر سجاد" },
        { days: "جمعه", time: "۱۲:۰۰ - ۲۳:۰۰", pool: "استخر کوثر" },
      ],
    },
  ];

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

  const onEnroll = async (course) => {
    setEnrollLoading(course.id);

    try {
      const response = await fetch("/api/courses/enroll", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          courseId: course.id,
          courseTitle: course.title,
          schedule: course.schedule,
        }),
      });

      if (!response.ok) {
        throw new Error("خطا در ثبت‌نام");
      }

      const result = await response.json();
      alert(`ثبت‌نام در ${course.title} با موفقیت انجام شد ✅`);
    } catch (error) {
      console.error("Error enrolling:", error);
      alert("متاسفانه در ثبت‌نام خطایی رخ داد. لطفا دوباره تلاش کنید.");
    } finally {
      setEnrollLoading(null);
      setSelectedCourse(null);
    }
  };

  const getPoolColor = (poolName) => {
    switch (poolName) {
      case "استخر سجاد":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "استخر کوثر":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      default:
        return "bg-sky-100 text-sky-700 border-sky-200";
    }
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-sky-950 p-3 sm:p-6 md:p-14 flex flex-col items-center"
    >
      <div className="w-full max-w-7xl">
        {/* Header */}
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

        {/* تب‌ها */}
        <div className="flex justify-center mb-6 sm:mb-8 px-2 sm:px-4">
          <div className="bg-white rounded-xl sm:rounded-2xl p-1.5 sm:p-2 border border-sky-200 shadow-sm w-full max-w-4xl">
            <div className="flex flex-nowrap sm:flex-wrap justify-start sm:justify-center gap-1 sm:gap-2 overflow-x-auto pb-1 sm:pb-0">
              {[
                {
                  key: "men",
                  label: "دوره‌های آقایان",
                  icon: <User className="w-4 h-4 text-blue-500" />,
                },
                {
                  key: "women",
                  label: "دوره‌های بانوان",
                  icon: <Users className="w-4 h-4 text-blue-500" />,
                },
                {
                  key: "public",
                  label: "سانس عمومی",
                  icon: <Waves className="w-4 h-4 text-blue-500" />,
                },
                {
                  key: "hydro",
                  label: "آب‌درمانی",
                  icon: <HeartPulse className="w-4 h-4 text-blue-500" />,
                },
              ].map(({ key, label, icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                    activeTab === key
                      ? "bg-sky-600 text-white shadow-sm"
                      : "text-sky-700 hover:bg-sky-100"
                  }`}
                >
                  {icon}
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* گرید کارت‌ها */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 md:gap-6 px-2 sm:px-4">
          {currentCourses.map((course, i) => (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-sky-200 hover:border-sky-300 transition-all duration-300 shadow-sm hover:shadow-md flex flex-col h-full"
            >
              <div className="relative mb-3 sm:mb-4 flex-shrink-0">
                <img
                  src={`https://picsum.photos/seed/${course.id}${activeTab}/400/200`}
                  alt={course.title}
                  className="w-full h-32 sm:h-36 md:h-40 object-cover rounded-lg sm:rounded-xl"
                />
                <div className="absolute top-2 left-2 flex flex-wrap gap-1.5">
                  {course.type === "public" && (
                    <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                      عمومی
                    </span>
                  )}
                  {course.type === "hydro" && (
                    <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full bg-sky-100 text-sky-700 border border-sky-200">
                      آب‌درمانی
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2 sm:space-y-3 flex-grow flex flex-col">
                <div className="flex-grow">
                  <h3 className="font-semibold text-sky-900 text-sm sm:text-base leading-tight mb-1.5 sm:mb-2">
                    {course.title}
                  </h3>
                  <p className="text-sky-700 text-xs sm:text-sm leading-relaxed mb-2 sm:mb-3">
                    {course.description}
                  </p>
                  
                  {/* آدرس استخر */}
                  {course.location && (
                    <div className="mb-2 sm:mb-3">
                      <div className="text-[11px] sm:text-xs text-sky-600 font-medium mb-1">
                        📍 آدرس:
                      </div>
                      <div className="text-[11px] sm:text-xs text-sky-700 bg-sky-50 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 border border-sky-100">
                        {course.location}
                      </div>
                    </div>
                  )}

                  <div className="mb-2 sm:mb-3">
                    <div className="text-[11px] sm:text-xs text-sky-600 font-medium mb-1.5 sm:mb-2">
                      📅 برنامه کلاس‌ها:
                    </div>
                    <div className="space-y-1">
                      {course.schedule.map((schedule, idx) => (
                        <div
                          key={idx}
                          className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-[10px] sm:text-xs bg-sky-50 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 border border-sky-100 gap-1 sm:gap-0"
                        >
                          <span className="truncate font-medium">
                            {schedule.days}
                          </span>
                          <span className="font-bold text-sky-700 whitespace-nowrap">
                            {schedule.time}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedCourse(course)}
                  className="w-full bg-sky-600 text-white py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium hover:bg-sky-700 transition-all duration-200 shadow-sm mt-auto"
                >
                  مشاهده جزئیات / ثبت‌نام
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* مودال */}
        <AnimatePresence>
          {selectedCourse && (
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
                <button
                  onClick={() => setSelectedCourse(null)}
                  className="absolute left-2 sm:left-3 top-2 sm:top-3 text-sky-600 hover:text-sky-800 text-xl"
                >
                  <ChevronLeft className="w-6 h-6 sm:w-7 sm:h-7" />
                </button>

                <img
                  src={`https://picsum.photos/seed/${selectedCourse.id}${activeTab}/800/400`}
                  alt={selectedCourse.title}
                  className="w-full h-32 sm:h-40 md:h-48 object-cover rounded-lg sm:rounded-xl mt-2 sm:mt-3 mb-3 sm:mb-4"
                />

                <div className="flex items-center gap-1.5 sm:gap-2 mb-3 flex-wrap">
                  {selectedCourse.type === "public" && (
                    <span className="text-[11px] sm:text-sm px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                      سانس عمومی
                    </span>
                  )}
                  {selectedCourse.type === "hydro" && (
                    <span className="text-[11px] sm:text-sm px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-sky-100 text-sky-700 border border-sky-200">
                      آب‌درمانی
                    </span>
                  )}
                </div>

                <h2 className="text-lg sm:text-xl font-bold text-sky-900 mb-1.5 sm:mb-2">
                  {selectedCourse.title}
                </h2>
                <p className="text-sky-700 text-xs sm:text-sm mb-3 sm:mb-4 leading-relaxed">
                  {selectedCourse.description}
                </p>

                {selectedCourse.location && (
                  <>
                    <h4 className="font-bold text-sky-800 mb-1.5 sm:mb-2 text-xs sm:text-sm">
                      📍 آدرس:
                    </h4>
                    <p className="text-sky-700 text-xs sm:text-sm mb-3 sm:mb-4 bg-sky-50 rounded-lg px-3 sm:px-4 py-2 border border-sky-100">
                      {selectedCourse.location}
                    </p>
                  </>
                )}

                <h4 className="font-bold text-sky-800 mb-1.5 sm:mb-2 text-xs sm:text-sm">
                  📅 برنامه زمان‌بندی:
                </h4>
                <div className="space-y-1.5 sm:space-y-2 mb-4 sm:mb-6">
                  {selectedCourse.schedule.map((schedule, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-sky-50 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 border border-sky-100 gap-1 sm:gap-2"
                    >
                      <span className="font-medium text-xs sm:text-sm">
                        {schedule.days}
                      </span>
                      <span className="bg-white px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg text-sky-700 font-semibold text-[11px] sm:text-sm">
                        {schedule.time}
                      </span>
                    </div>
                  ))}
                </div>

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
                    onClick={() => onEnroll(selectedCourse)}
                    disabled={enrollLoading === selectedCourse.id}
                    className="px-4 sm:px-6 py-1.5 sm:py-2 bg-sky-600 text-white rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium hover:bg-sky-700 transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 sm:gap-2"
                  >
                    {enrollLoading === selectedCourse.id ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                          className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full"
                        />
                        <span className="text-[11px] sm:text-xs">
                          در حال ثبت‌نام...
                        </span>
                      </>
                    ) : (
                      "ثبت‌نام در این دوره"
                    )}
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