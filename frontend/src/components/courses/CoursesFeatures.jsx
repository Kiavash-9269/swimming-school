// src/components/CoursesFeatures.jsx
import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Users, Waves, HeartPulse, Accessibility } from "lucide-react";

export default function CoursesFeatures() {
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [activeTab, setActiveTab] = useState("men");

  const menCourses = [
    {
      id: 1,
      title: "ترم ۱ - آموزش کرال سینه (مقدماتی)",
      description: "آموزش حرکات دست و پا",
      duration: "۳ هفته",
      level: "مبتدی",
      schedule: [
        { days: "زوج", time: "۱۶:۰۰ - ۱۷:۳۰" },
        { days: "زوج", time: "۱۷:۳۰ - ۱۹:۰۰" },
        { days: "زوج", time: "۱۹:۰۰ - ۲۰:۳۰" },
        { days: "فرد", time: "۱۸:۰۰ - ۱۹:۳۰" }
      ]
    },
    {
      id: 2,
      title: "ترم ۲ - آموزش کرال سینه و شروع کرال پشت",
      description: "آموزش دست کرال سینه و هواگیری + شروع کرال پشت",
      duration: "۴ هفته",
      level: "مبتدی",
      schedule: [
        { days: "زوج", time: "۱۶:۰۰ - ۱۷:۳۰" },
        { days: "فرد", time: "۱۸:۰۰ - ۱۹:۳۰" }
      ]
    },
    {
      id: 3,
      title: "ترم ۳ - تکمیل کرال سینه و پشت + شروع قورباغه",
      description: "تکمیل کرال سینه و پشت + شروع آموزش قورباغه",
      duration: "۵ هفته",
      level: "متوسط",
      schedule: [
        { days: "زوج", time: "۱۷:۳۰ - ۱۹:۰۰" },
        { days: "فرد", time: "۱۸:۰۰ - ۱۹:۳۰" }
      ]
    },
    {
      id: 4,
      title: "ترم ۴ - تکمیل آموزش‌ها + تمرینات هوازی",
      description: "تکمیل کرال سینه، پشت و قورباغه + شروع تمرینات هوازی",
      duration: "۴ هفته",
      level: "متوسط",
      schedule: [
        { days: "زوج", time: "۱۹:۰۰ - ۲۰:۳۰" },
        { days: "فرد", time: "۱۸:۰۰ - ۱۹:۳۰" }
      ]
    },
    {
      id: 5,
      title: "ترم ۵ - پروانه و مهارت‌های برگشت",
      description: "شروع آموزش شنای پروانه و مهارت‌های برگشت از دیواره",
      duration: "۶ هفته",
      level: "پیشرفته",
      schedule: [
        { days: "زوج", time: "۱۷:۳۰ - ۱۹:۰۰" },
        { days: "فرد", time: "۱۸:۰۰ - ۱۹:۳۰" }
      ]
    },
    {
      id: 6,
      title: "ترم ۶ - تکمیل چهار شنا + مهارت‌های مسابقه",
      description: "تکمیل چهار شنا و شروع آموزش مهارت‌های مسابقه‌ای",
      duration: "۶ هفته",
      level: "پیشرفته",
      schedule: [
        { days: "زوج", time: "۱۹:۰۰ - ۲۰:۳۰" },
        { days: "فرد", time: "۱۸:۰۰ - ۱۹:۳۰" }
      ]
    },
    {
      id: 7,
      title: "ترم ۷ - سنجش و توسعه ورزشی",
      description: "تست‌های آنتروپومتریک، آزمون آمادگی جسمانی و شناسنامه ورزشی",
      duration: "۴ هفته",
      level: "تخصصی",
      schedule: [
        { days: "پنجشنبه", time: "۱۶:۰۰ - ۱۸:۰۰" }
      ]
    },
    {
      id: 8,
      title: "شیفت عمومی آقایان",
      description: "تمرینات عمومی و آزاد برای تمام سطوح",
      duration: "۸ هفته",
      level: "همه سطوح",
      type: "public",
      schedule: [
        { days: "هر شب", time: "۲۰:۳۰ - ۲۳:۳۰" },
        { days: "جمعه", time: "۱۲:۰۰ - ۲۳:۰۰" }
      ]
    }
  ];

  const womenCourses = [
    {
      id: 101,
      title: "ترم ۱ - آموزش کرال سینه (مقدماتی)",
      description: "آموزش حرکات دست و پا",
      duration: "۳ هفته",
      level: "مبتدی",
      schedule: [
        { days: "فرد", time: "۰۹:۰۰ - ۱۰:۳۰" },
        { days: "فرد", time: "۱۰:۳۰ - ۱۲:۰۰" }
      ]
    },
    {
      id: 102,
      title: "ترم ۲ - آموزش کرال سینه و شروع کرال پشت",
      description: "آموزش دست کرال سینه، هواگیری و شروع کرال پشت",
      duration: "۴ هفته",
      level: "مبتدی",
      schedule: [
        { days: "فرد", time: "۰۹:۰۰ - ۱۰:۳۰" },
        { days: "فرد", time: "۱۲:۰۰ - ۱۳:۳۰" }
      ]
    },
    {
      id: 103,
      title: "ترم ۳ - تکمیل کرال سینه و پشت + شروع قورباغه",
      description: "تکمیل کرال سینه و پشت و شروع آموزش قورباغه",
      duration: "۵ هفته",
      level: "متوسط",
      schedule: [
        { days: "فرد", time: "۱۰:۳۰ - ۱۲:۰۰" },
        { days: "فرد", time: "۱۲:۰۰ - ۱۳:۳۰" }
      ]
    },
    {
      id: 104,
      title: "ترم ۴ - تکمیل آموزش‌ها + تمرینات هوازی",
      description: "تکمیل کرال سینه، پشت و قورباغه + شروع تمرینات هوازی",
      duration: "۴ هفته",
      level: "متوسط",
      schedule: [
        { days: "فرد", time: "۰۹:۰۰ - ۱۰:۳۰" },
        { days: "فرد", time: "۱۳:۳۰ - ۱۵:۰۰" }
      ]
    },
    {
      id: 105,
      title: "ترم ۵ - پروانه و مهارت‌های برگشت",
      description: "شروع آموزش شنای پروانه و مهارت‌های برگشت از دیواره",
      duration: "۶ هفته",
      level: "پیشرفته",
      schedule: [
        { days: "فرد", time: "۱۲:۰۰ - ۱۳:۳۰" },
        { days: "فرد", time: "۱۳:۳۰ - ۱۵:۰۰" }
      ]
    },
    {
      id: 106,
      title: "ترم ۶ - تکمیل چهار شنا + مهارت‌های مسابقه",
      description: "تکمیل چهار شنا و شروع آموزش مهارت‌های مسابقه‌ای",
      duration: "۶ هفته",
      level: "پیشرفته",
      schedule: [
        { days: "فرد", time: "۱۴:۰۰ - ۱۶:۰۰" }
      ]
    },
    {
      id: 107,
      title: "ترم ۷ - سنجش و توسعه ورزشی",
      description: "تست‌های آنتروپومتریک، آزمون آمادگی جسمانی و شناسنامه ورزشی",
      duration: "۴ هفته",
      level: "تخصصی",
      schedule: [
        { days: "پنجشنبه", time: "۱۰:۰۰ - ۱۲:۰۰" }
      ]
    },
    {
      id: 108,
      title: "مدرسه شنا دختران",
      description: "دوره تخصصی مدرسه شنا برای دختران",
      duration: "۸ هفته",
      level: "همه سطوح",
      type: "public",
      schedule: [
        { days: "فرد", time: "۱۴:۰۰ - ۱۶:۰۰" },
        { days: "فرد", time: "۱۶:۰۰ - ۱۸:۰۰" }
      ]
    },
    {
      id: 109,
      title: "آب درمانی بانوان",
      description: "تمرینات آب درمانی برای سلامتی و تناسب اندام",
      duration: "۴ هفته",
      level: "همه سطوح",
      type: "hydro",
      schedule: [
        { days: "فرد", time: "۱۰:۰۰ - ۱۱:۳۰" }
      ]
    }
  ];

  const disabledCourses = [
    {
      id: 201,
      title: "شنا درمانی توان‌یابان",
      description: "تمرینات ویژه برای افراد با نیازهای ویژه",
      duration: "۸ هفته",
      level: "همه سطوح",
      schedule: [
        { days: "شنبه و سه‌شنبه", time: "۱۴:۰۰ - ۱۵:۳۰" }
      ]
    },
    {
      id: 202,
      title: "آب‌درمانی توان‌یابان",
      description: "تمرینات آب‌درمانی برای بهبود حرکتی",
      duration: "۶ هفته",
      level: "همه سطوح",
      schedule: [
        { days: "یکشنبه و چهارشنبه", time: "۱۵:۰۰ - ۱۶:۳۰" }
      ]
    }
  ];


  const currentCourses = useMemo(() => {
    switch(activeTab) {
      case "men":
        return menCourses.filter(course => !course.type || course.type === "public");
      
      case "women":
        return womenCourses.filter(course => !course.type || course.type === "public");
      
      case "public":
        const menPublic = menCourses.filter(course => course.type === "public");
        const womenPublic = womenCourses.filter(course => course.type === "public");
        return [...menPublic, ...womenPublic];
      
      case "hydro":
        const menHydro = menCourses.filter(course => course.type === "hydro");
        const womenHydro = womenCourses.filter(course => course.type === "hydro");
        return [...menHydro, ...womenHydro];
      
      case "disabled":
        return disabledCourses;
      
      default:
        return menCourses;
    }
  }, [activeTab]);

  const progressPathCourses = useMemo(() => {
    return currentCourses.filter(course => {
      if (activeTab === "men") {
        return course.id >= 1 && course.id <= 7;
      } else if (activeTab === "women") {
        return course.id >= 101 && course.id <= 107;
      }
      return false;
    });
  }, [currentCourses, activeTab]);

  const onEnroll = (course) => alert(`ثبت‌نام در ${course.title} انجام شد ✅`);

  const getLevelColor = (level) => {
    switch(level) {
      case 'مبتدی': return 'from-green-400 to-green-600';
      case 'متوسط': return 'from-blue-400 to-blue-600';
      case 'پیشرفته': return 'from-purple-400 to-purple-600';
      case 'تخصصی': return 'from-orange-400 to-orange-600';
      default: return 'from-gray-400 to-gray-600';
    }
  };

  return (
    <section dir="rtl" className="max-w-7xl mx-auto px-6 py-16 text-sky-900 relative">
      
      <div className="text-center mb-16">
        <h1 className="text-4xl font-extrabold text-sky-900 mb-3">
          مسیر یادگیری شنای حرفه‌ای
        </h1>
        <p className="text-sky-700 text-sm md:text-base">
          از مبتدی تا قهرمان — دوره‌های تخصصی برای بانوان و آقایان
        </p>
      </div>

      
      {(activeTab === "men" || activeTab === "women") && (
        <div className="relative mb-20">
          <div className="absolute top-1/2 left-0 right-0 h-[3px] bg-sky-100 rounded-full"></div>
          <div className="flex flex-wrap justify-between items-center relative z-10">
            {progressPathCourses.map((course, index) => (
              <motion.div
                key={course.id}
                initial={{ y: 60, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: index * 0.15 }}
                className={`flex flex-col items-center text-center w-1/7 ${index % 2 === 0 ? "translate-y-12" : "-translate-y-12"}`}
              >
                <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${getLevelColor(course.level)} text-white flex items-center justify-center font-bold shadow-lg`}>
                  {course.id > 100 ? course.id - 100 : course.id}
                </div>
                <span className="mt-3 text-xs font-medium text-sky-800 w-24 leading-tight">
                  {course.title.split(" - ")[1]}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      
      <div className="flex justify-center mb-12">
        <div className="relative bg-white/50 backdrop-blur-2xl border border-white/30 rounded-3xl shadow-xl p-3 overflow-hidden">
          <div className="flex flex-wrap justify-center gap-2 sm:gap-4 relative">
            {[
              { key: "men", label: "دوره‌های آقایان", icon: <User className="w-5 h-5 sm:w-6 sm:h-6" />, gradient: "from-blue-500 to-cyan-500" },
              { key: "women", label: "دوره‌های بانوان", icon: <Users className="w-5 h-5 sm:w-6 sm:h-6" />, gradient: "from-pink-500 to-rose-500" },
              { key: "public", label: "سانس عمومی", icon: <Waves className="w-5 h-5 sm:w-6 sm:h-6" />, gradient: "from-emerald-500 to-teal-500" },
              { key: "hydro", label: "آب‌درمانی", icon: <HeartPulse className="w-5 h-5 sm:w-6 sm:h-6" />, gradient: "from-sky-500 to-blue-600" },
              { key: "disabled", label: "توان‌یابان", icon: <Accessibility className="w-5 h-5 sm:w-6 sm:h-6" />, gradient: "from-indigo-500 to-violet-600" },
            ].map(({ key, label, icon, gradient }) => (
              <div key={key} className="relative">
                <button
                  onClick={() => setActiveTab(key)}
                  className={`relative flex items-center gap-2 px-6 sm:px-8 py-3 rounded-xl font-semibold text-sm sm:text-base transition-all duration-300 overflow-hidden
                    ${
                      activeTab === key
                        ? `text-white scale-[1.05]`
                        : "text-sky-700 hover:text-sky-900 hover:bg-white/40"
                    }`}
                >
                  {activeTab === key && (
                    <motion.span
                      layoutId="active-tab-bg"
                      className={`absolute inset-0 bg-gradient-to-r ${gradient} shadow-lg rounded-xl`}
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    />
                  )}
                  {activeTab === key && (
                    <motion.span
                      layoutId="active-tab-glow"
                      className={`absolute inset-0 bg-gradient-to-r ${gradient} opacity-30 blur-xl rounded-xl`}
                      transition={{ type: "spring", stiffness: 200, damping: 30 }}
                    />
                  )}
                  <span className="relative flex items-center gap-2 z-10">
                    {icon}
                    <span>{label}</span>
                  </span>
                </button>
              </div>
            ))}
          </div>
          <div className="absolute -inset-10 bg-gradient-to-r from-cyan-400/10 via-pink-300/10 to-violet-400/10 blur-3xl"></div>
        </div>
      </div>

      
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {currentCourses.map((course, i) => (
          <motion.div
            key={course.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white/80 backdrop-blur-xl border border-white/30 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
          >
            <div className="relative">
              <img
                src={`https://picsum.photos/seed/${course.id}${activeTab}/400/200`}
                alt={course.title}
                className="w-full h-44 object-cover"
              />
              <div className="absolute top-2 left-2 flex gap-2">
                <span className={`text-xs px-2 py-1 rounded-full shadow text-white bg-gradient-to-r ${getLevelColor(course.level)}`}>
                  {course.level}
                </span>
                {course.type === "public" && (
                  <span className="text-xs px-2 py-1 rounded-full shadow text-white bg-gradient-to-r from-emerald-400 to-emerald-600">
                    عمومی
                  </span>
                )}
                {course.type === "hydro" && (
                  <span className="text-xs px-2 py-1 rounded-full shadow text-white bg-gradient-to-r from-sky-400 to-sky-600">
                    آب‌درمانی
                  </span>
                )}
              </div>
            </div>

            <div className="p-5">
              <h3 className="text-lg font-semibold text-sky-900 mb-2 leading-tight">{course.title}</h3>
              <p className="text-sky-600 text-sm mb-3 leading-relaxed">{course.description}</p>

              <div className="mb-4">
                <div className="text-xs text-sky-600 font-medium mb-2">📅 برنامه کلاس‌ها:</div>
                <div className="space-y-1">
                  {course.schedule.map((schedule, idx) => (
                    <div key={idx} className="flex justify-between text-xs bg-sky-50 rounded-lg px-3 py-2">
                      <span>روزهای {schedule.days}</span>
                      <span className="font-bold">{schedule.time}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setSelectedCourse(course)}
                className="w-full bg-gradient-to-r from-sky-400 to-blue-500 text-white py-2 rounded-xl shadow-md hover:scale-[1.02] transition-transform text-sm font-medium"
              >
                مشاهده جزئیات / ثبت‌نام
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      
      <AnimatePresence>
        {selectedCourse && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-md flex justify-center items-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedCourse(null)}
          >
            <motion.div
              className="relative bg-white/90 backdrop-blur-xl rounded-3xl p-8 max-w-2xl w-full mx-auto border border-white/40 shadow-2xl max-h-[90vh] overflow-y-auto"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setSelectedCourse(null)}
                className="absolute left-4 top-4 text-sky-600 hover:text-sky-800 text-2xl"
              >
                ✕
              </button>

              <img
                src={`https://picsum.photos/seed/${selectedCourse.id}${activeTab}/800/400`}
                alt={selectedCourse.title}
                className="w-full h-48 object-cover rounded-2xl mb-5 shadow"
              />

              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <span className={`text-lg px-3 py-1 rounded-full text-white bg-gradient-to-r ${getLevelColor(selectedCourse.level)}`}>
                  {selectedCourse.level}
                </span>
                {selectedCourse.type === "public" && (
                  <span className="text-sm px-3 py-1 rounded-full bg-emerald-100 text-emerald-800">
                    سانس عمومی
                  </span>
                )}
                {selectedCourse.type === "hydro" && (
                  <span className="text-sm px-3 py-1 rounded-full bg-sky-100 text-sky-800">
                    آب‌درمانی
                  </span>
                )}
                {activeTab === "disabled" && (
                  <span className="text-sm px-3 py-1 rounded-full bg-indigo-100 text-indigo-800">
                    توان‌یابان
                  </span>
                )}
              </div>

              <h2 className="text-2xl font-bold text-sky-900 mb-3">{selectedCourse.title}</h2>
              <p className="text-sky-700 text-lg mb-6 leading-relaxed">{selectedCourse.description}</p>

              <h4 className="font-bold text-sky-800 mb-3 text-lg">📅 برنامه زمان‌بندی:</h4>
              <div className="space-y-3 mb-6">
                {selectedCourse.schedule.map((schedule, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-sky-50 rounded-xl px-4 py-3">
                    <span className="font-medium">روزهای {schedule.days}</span>
                    <span className="bg-white/70 px-3 py-1 rounded-lg text-sky-700 font-semibold">{schedule.time}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => onEnroll(selectedCourse)}
                  className="px-6 py-3 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl font-medium shadow-lg hover:scale-[1.02] transition-transform"
                >
                  ثبت‌نام در این دوره
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}