// src/components/CoursesFeatures.jsx
import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Users, Waves, HeartPulse, Accessibility, ChevronLeft } from "lucide-react";

export default function CoursesFeatures() {
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [activeTab, setActiveTab] = useState("men");
  const [enrollLoading, setEnrollLoading] = useState(null);

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


  const onEnroll = async (course) => {
    setEnrollLoading(course.id);
    
    try {
   
      const response = await fetch('/api/courses/enroll', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          courseId: course.id,
          courseTitle: course.title,
          level: course.level,
          schedule: course.schedule
        })
      });

      if (!response.ok) {
        throw new Error('خطا در ثبت‌نام');
      }

      const result = await response.json();
      alert(`ثبت‌نام در ${course.title} با موفقیت انجام شد ✅`);
      
    } catch (error) {
      console.error('Error enrolling:', error);
      alert('متاسفانه در ثبت‌نام خطایی رخ داد. لطفا دوباره تلاش کنید.');
    } finally {
      setEnrollLoading(null);
      setSelectedCourse(null);
    }
  };

  const getLevelColor = (level) => {
    switch(level) {
      case 'مبتدی': return 'bg-green-100 text-green-700 border-green-200';
      case 'متوسط': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'پیشرفته': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'تخصصی': return 'bg-orange-100 text-orange-700 border-orange-200';
      default: return 'bg-sky-100 text-sky-700 border-sky-200';
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-sky-950 p-4 md:p-14 flex flex-col items-center">
      <div className="w-full max-w-7xl">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="px-4 pt-8 max-w-7xl mx-auto text-center"
        >
          <header className="text-center mt-4 mb-8 md:mb-12">
            <h1 className="text-3xl md:text-4xl font-medium text-white mb-4">دوره‌های آموزشی شنا</h1>
            <div className="w-16 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent mx-auto mb-4"></div>
            <p className="text-gray-300 max-w-2xl mx-auto">
              از مبتدی تا قهرمان — دوره‌های تخصصی برای بانوان و آقایان
            </p>
          </header>
        </motion.div>

     
        {(activeTab === "men" || activeTab === "women") && progressPathCourses.length > 0 && (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="relative mb-8 md:mb-12 bg-white/10 backdrop-blur-sm rounded-2xl p-4 md:p-6 border border-sky-200/30 mx-2 md:mx-4"
  >
    <h3 className="text-white text-base md:text-lg font-semibold text-center mb-4 md:mb-6">مسیر یادگیری شنای حرفه‌ای</h3>
    <div className="relative">
   
      <div className="hidden md:block absolute top-1/2 left-4 right-4 h-[2px] bg-sky-200/50 rounded-full transform -translate-y-1/2"></div>
      
    
      <div className="md:hidden absolute top-0 bottom-0 left-1/2 w-[2px] bg-sky-200/50 rounded-full transform -translate-x-1/2"></div>
      
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center relative z-10 gap-4 md:gap-0">
        {progressPathCourses.map((course, index) => (
          <motion.div
            key={course.id}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: index * 0.15 }}
            className={`flex flex-row md:flex-col items-center text-center flex-1 gap-3 md:gap-0 ${
              index % 2 === 0 ? 'md:translate-y-0' : 'md:-translate-y-0'
            }`}
          >
           
            <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full bg-sky-600 text-white flex items-center justify-center font-bold shadow-lg border border-sky-300 text-xs md:text-base flex-shrink-0 ${
              index % 2 === 0 ? 'order-1 md:order-none' : 'order-1 md:order-none'
            }`}>
              {course.id > 100 ? course.id - 100 : course.id}
            </div>
            
           
            <span className="text-xs font-medium text-white leading-tight px-1 min-h-[2.5rem] flex items-center justify-center flex-grow md:flex-grow-0">
              {course.title.split(" - ")[1]}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  </motion.div>
)}
        {/* Tabs */}
        <div className="flex justify-center mb-8 px-4">
          <div className="bg-white rounded-2xl p-2 border border-sky-200 shadow-sm w-full max-w-4xl">
            <div className="flex flex-wrap justify-center gap-2">
              {[
                { key: "men", label: "دوره‌های آقایان", icon: <User className="w-4 h-4" /> },
                { key: "women", label: "دوره‌های بانوان", icon: <Users className="w-4 h-4" /> },
                { key: "public", label: "سانس عمومی", icon: <Waves className="w-4 h-4" /> },
                { key: "hydro", label: "آب‌درمانی", icon: <HeartPulse className="w-4 h-4" /> },
                { key: "disabled", label: "توان‌یابان", icon: <Accessibility className="w-4 h-4" /> },
              ].map(({ key, label, icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex-1 min-w-[140px] justify-center ${
                    activeTab === key
                      ? "bg-sky-600 text-white shadow-sm"
                      : "text-sky-700 hover:bg-sky-100"
                  }`}
                >
                  {icon}
                  <span className="whitespace-nowrap">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 px-4">
          {currentCourses.map((course, i) => (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white rounded-2xl p-4 border border-sky-200 hover:border-sky-300 transition-all duration-300 shadow-sm hover:shadow-md flex flex-col h-full"
            >
              <div className="relative mb-4 flex-shrink-0">
                <img
                  src={`https://picsum.photos/seed/${course.id}${activeTab}/400/200`}
                  alt={course.title}
                  className="w-full h-40 object-cover rounded-xl"
                />
                <div className="absolute top-2 left-2 flex gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full border ${getLevelColor(course.level)}`}>
                    {course.level}
                  </span>
                  {course.type === "public" && (
                    <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                      عمومی
                    </span>
                  )}
                  {course.type === "hydro" && (
                    <span className="text-xs px-2 py-1 rounded-full bg-sky-100 text-sky-700 border border-sky-200">
                      آب‌درمانی
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-3 flex-grow flex flex-col">
                <div className="flex-grow">
                  <h3 className="font-semibold text-sky-900 text-sm leading-tight mb-2">{course.title}</h3>
                  <p className="text-sky-700 text-xs leading-relaxed mb-3">{course.description}</p>

                  <div className="mb-3">
                    <div className="text-xs text-sky-600 font-medium mb-2">📅 برنامه کلاس‌ها:</div>
                    <div className="space-y-1">
                      {course.schedule.map((schedule, idx) => (
                        <div key={idx} className="flex justify-between text-xs bg-sky-50 rounded-lg px-3 py-2 border border-sky-100">
                          <span className="truncate">روزهای {schedule.days}</span>
                          <span className="font-bold text-sky-700 whitespace-nowrap mr-2">{schedule.time}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedCourse(course)}
                  className="w-full bg-sky-600 text-white py-2 rounded-xl text-xs font-medium hover:bg-sky-700 transition-all duration-200 shadow-sm mt-auto"
                >
                  مشاهده جزئیات / ثبت‌نام
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Modal */}
        <AnimatePresence>
          {selectedCourse && (
            <motion.div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCourse(null)}
            >
              <motion.div
                className="relative bg-white rounded-2xl p-6 max-w-2xl w-full mx-auto border border-sky-200 shadow-lg max-h-[90vh] overflow-y-auto"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => setSelectedCourse(null)}
                  className="absolute left-2 top-3 text-sky-600 hover:text-sky-800 text-xl"
                >
                  <ChevronLeft className="w-7 h-7" />
                </button>

                <img
                  src={`https://picsum.photos/seed/${selectedCourse.id}${activeTab}/800/400`}
                  alt={selectedCourse.title}
                  className="w-full h-48 object-cover rounded-xl mt-3 mb-4"
                />

                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className={`text-sm px-3 py-1 rounded-full border ${getLevelColor(selectedCourse.level)}`}>
                    {selectedCourse.level}
                  </span>
                  {selectedCourse.type === "public" && (
                    <span className="text-sm px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                      سانس عمومی
                    </span>
                  )}
                  {selectedCourse.type === "hydro" && (
                    <span className="text-sm px-3 py-1 rounded-full bg-sky-100 text-sky-700 border border-sky-200">
                      آب‌درمانی
                    </span>
                  )}
                  {activeTab === "disabled" && (
                    <span className="text-sm px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">
                      توان‌یابان
                    </span>
                  )}
                </div>

                <h2 className="text-xl font-bold text-sky-900 mb-2">{selectedCourse.title}</h2>
                <p className="text-sky-700 text-sm mb-4 leading-relaxed">{selectedCourse.description}</p>

                <h4 className="font-bold text-sky-800 mb-2 text-sm">📅 برنامه زمان‌بندی:</h4>
                <div className="space-y-2 mb-6">
                  {selectedCourse.schedule.map((schedule, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-sky-50 rounded-lg px-4 py-2 border border-sky-100">
                      <span className="font-medium text-sm">روزهای {schedule.days}</span>
                      <span className="bg-white px-3 py-1 rounded-lg text-sky-700 font-semibold text-sm">{schedule.time}</span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setSelectedCourse(null)}
                    className="px-4 py-2 text-sky-600 hover:text-sky-800 text-sm font-medium transition-colors duration-200"
                  >
                    انصراف
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onEnroll(selectedCourse)}
                    disabled={enrollLoading === selectedCourse.id}
                    className="px-6 py-2 bg-sky-600 text-white rounded-xl text-sm font-medium hover:bg-sky-700 transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {enrollLoading === selectedCourse.id ? (
                      <>
                        <motion.div 
                          animate={{ rotate: 360 }} 
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }} 
                          className="w-4 h-4 border-2 border-white border-t-transparent rounded-full" 
                        />
                        در حال ثبت‌نام...
                      </>
                    ) : (
                      'ثبت‌نام در این دوره'
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