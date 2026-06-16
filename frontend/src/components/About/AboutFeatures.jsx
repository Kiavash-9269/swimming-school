// src/components/AboutUs.jsx
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, ChevronLeft, ChevronRight } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

import { Award, Target, Heart, Shield, Globe, UserCheck } from "lucide-react";

// IMAGES //
import HamidrezaImage from "../../assets/images/IMG_5297.jpeg";
import HamedImage from "../../assets/images/BBC0FE2F-5758-462E-B5C9-EF4BD61CC2BE.jpeg";

// POOL GALLERY //
import PoolSajjad1 from "../../assets/images/IMG_1207.webp";
import PoolSajjad2 from "../../assets/images/IMG_1208.webp";
import PoolSajjad3 from "../../assets/images/photo_2026-06-04_11-18-42.jpg";
import PoolKosar1 from "../../assets/images/IMG_2352.webp";
import PoolKosar2 from "../../assets/images/IMG_2357.webp";
import PoolKosar3 from "../../assets/images/IMG_2361.webp";

// LEADERS DATA //
const leaders = [
  {
    id: 1,
    name: "حامد مبرز",
    role: "مؤسس، بنیان‌گذار و سرمربی مجموعه",
    title: "بنیان‌گذار مدرسه شنای ایران استرالیا",
    image: HamedImage,
    description:
      "حامد مبرز، مؤسس و بنیان‌گذار برند ایران استرالیا، از پیشگامان راه‌اندازی مدارس شنای خصوصی در کشور به شمار می‌رود و نخستین مدرسه شنای خصوصی ایران را با نام «ایران استرالیا» بنیان‌گذاری و ثبت نمود.",
    details:
      "ایشان طی مسیری نزدیک به دو دهه، با تلاش مستمر، آموزش حرفه‌ای و توسعه ساختار اصولی شنا، برند ایران استرالیا را به یکی از شناخته‌شده‌ترین مجموعه‌های آموزشی شنا تبدیل کرده‌اند. حامد مبرز که از مربیان منتخب کشور و دعوت‌شده به اردوهای تیم ملی بوده است، در حال حاضر مسئولیت سرمربیگری مجموعه را بر عهده دارد و به‌صورت مستقیم بر اجرای صحیح متدهای آموزشی، کیفیت تمرینات و عملکرد مربیان نظارت می‌کند.",
  },
  {
    id: 2,
    name: "حمیدرضا مبرز",
    role: "مشاور و مدیر فنی مجموعه",
    title: "مدیریت فنی در سطح بین‌المللی",
    image: HamidrezaImage,
    description:
      "مدرسه شنای ایران استرالیا با افتخار تحت نظارت و مشاوره فنی حمیدرضا مبرز، کاپیتان اسبق تیم ملی شنا و تنها شناگر ایرانی حاضر در المپیک ۲۰۰۰ سیدنی فعالیت می‌کند.",
    details:
      "حضور ایشان به‌عنوان مشاور و مدیر فنی مجموعه، پلی میان استانداردهای روز شنای جهان و آموزش حرفه‌ای در مشهد ایجاد کرده است. حمیدرضا مبرز که هم‌اکنون در کشور استرالیا اقامت دارند، مسئولیت ارتقای دانش فنی مربیان، انتقال متدهای نوین آموزشی و به‌روزرسانی مداوم سیستم تمرینی مدرسه را بر عهده دارند تا هنرجویان ایران استرالیا، آموزش شنا را با استانداردی فراتر از یک آموزش معمولی تجربه کنند.",
  },
];

// POOLS DATA //
const pools = [
  {
    name: "استخر سجاد",
    location: "بلوار سجاد، حامد شمالی۱۰، مجموعه ورزشی سجاد",
    images: [PoolSajjad1, PoolSajjad2, PoolSajjad3],
  },
  {
    name: "استخر کوثر",
    location: "بلوار اندیشه، اندیشه ۴۸، مجموعه ورزشی کوثر",
    images: [PoolKosar1, PoolKosar2, PoolKosar3],
  },
];

// CORE VALUES //
const values = [
  {
    icon: <Shield className="w-8 h-8" />,
    title: "امنیت و ایمنی",
    description:
      "اولویت نخست ما، حفظ ایمنی هنرجویان با رعایت استانداردهای حرفه‌ای و اصول آموزشی روز است.",
  },
  {
    icon: <Heart className="w-8 h-8" />,
    title: "علاقه و اشتیاق",
    description:
      "با عشق به آموزش و ورزش، محیطی پویا و انگیزه‌بخش برای یادگیری شنا فراهم کرده‌ایم.",
  },
  {
    icon: <Target className="w-8 h-8" />,
    title: "تخصص و کیفیت",
    description:
      "آموزش بر پایه متدهای نوین، دانش تخصصی و تجربه عملی مربیان مجموعه انجام می‌شود.",
  },
  {
    icon: <Award className="w-8 h-8" />,
    title: "پیشرفت مستمر",
    description:
      "همراه هنرجویان هستیم تا از مراحل ابتدایی تا سطوح پیشرفته، مسیر رشد را اصولی طی کنند.",
  },
];

// MAIN COMPONENT //
export default function AboutUs() {
  const [currentLeaderIndex, setCurrentLeaderIndex] = useState(0);

  // AUTO ROTATE //
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentLeaderIndex((prev) => (prev + 1) % leaders.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [leaders.length]);

  // NAVIGATION //
  const nextLeader = () => {
    setCurrentLeaderIndex((prev) => (prev + 1) % leaders.length);
  };

  const prevLeader = () => {
    setCurrentLeaderIndex((prev) => (prev - 1 + leaders.length) % leaders.length);
  };

  return (
    <div dir="rtl" className="min-h-screen bg-sky-950 p-4 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-7xl">

        {/* HEADER */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 pt-8 max-w-7xl mx-auto text-center"
        >
          <header className="text-center mt-8 mb-8 md:mb-12">
            <h1 className="text-3xl md:text-4xl font-medium text-white mb-4">
              درباره مدرسه شنا ایران استرالیا
            </h1>
            <div className="w-16 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent mx-auto mb-4"></div>
            <p className="text-gray-300 max-w-4xl mx-auto text-sm md:text-base leading-relaxed">
              ترکیبی از تجربه، تخصص و استانداردهای روز دنیا برای ارائه آموزش
              حرفه‌ای شنا در محیطی اصولی، ایمن و الهام‌بخش
            </p>
          </header>
        </motion.div>

        {/* STORY */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 md:p-8 border border-white/20 shadow-sm mb-12 md:mb-16 mx-4"
        >
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">
              مسیر ما در آموزش حرفه‌ای شنا
            </h2>
            <p className="text-sky-100 leading-8 text-sm md:text-base">
              مدرسه شنای ایران استرالیا با تکیه بر تجربه عملی، ساختار آموزشی
              اصولی و استفاده از متدهای نوین، بستری حرفه‌ای برای آموزش شنا فراهم
              کرده است. هدف ما تنها آموزش مهارت‌های پایه نیست؛ بلکه تلاش می‌کنیم
              هنرجویان در فضایی استاندارد، ایمن و انگیزه‌بخش، شنا را به‌صورت
              اصولی و ماندگار یاد بگیرند.
            </p>
          </div>
        </motion.div>

        {/* LEADERSHIP CAROUSEL */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="px-4 mb-12 md:mb-16"
        >
          <div className="text-center mb-8 md:mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
              مدیریت و راهبری مجموعه
            </h2>
            <p className="text-sky-200 text-sm md:text-base max-w-3xl mx-auto leading-relaxed">
              پشتوانه علمی، فنی و اجرایی مدرسه شنای ایران استرالیا بر پایه
              تجربه، تخصص و نگاه حرفه‌ای به آموزش بنا شده است.
            </p>
          </div>

          <div className="relative max-w-4xl mx-auto">
            {/* PREV BUTTON */}
            <button
              onClick={prevLeader}
              className="absolute -right-4 md:-right-6 top-1/2 -translate-y-1/2 z-10 bg-white/20 hover:bg-white/40 backdrop-blur rounded-full p-2 transition-all duration-300"
            >
              <ChevronRight className="w-5 h-5 text-white" />
            </button>

            {/* NEXT BUTTON */}
            <button
              onClick={nextLeader}
              className="absolute -left-4 md:-left-6 top-1/2 -translate-y-1/2 z-10 bg-white/20 hover:bg-white/40 backdrop-blur rounded-full p-2 transition-all duration-300"
            >
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>

            {/* SLIDE CONTENT */}
            <div className="overflow-hidden rounded-2xl">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentLeaderIndex}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.5 }}
                  className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6 md:p-8"
                >
                  <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">
                    {/* PHOTO */}
                    <div className="flex-shrink-0">
                      <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 p-1">
                        <div className="w-full h-full rounded-full overflow-hidden bg-sky-100">
                          <img
                            src={leaders[currentLeaderIndex].image}
                            alt={leaders[currentLeaderIndex].name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                    </div>

                    {/* DETAILS */}
                    <div className="flex-1 text-center md:text-right">
                      <p className="text-sm text-sky-300 font-medium mb-1">
                        {leaders[currentLeaderIndex].title}
                      </p>
                      <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">
                        {leaders[currentLeaderIndex].name}
                      </h3>
                      <p className="text-sky-200 text-sm md:text-base mb-4">
                        {leaders[currentLeaderIndex].role}
                      </p>
                      <p className="text-white/80 leading-7 text-sm md:text-base mb-4">
                        {leaders[currentLeaderIndex].description}
                      </p>
                      <div className="w-full h-px bg-white/20 my-4"></div>
                      <p className="text-white/70 leading-7 text-sm md:text-base">
                        {leaders[currentLeaderIndex].details}
                      </p>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* DOTS */}
            <div className="flex justify-center gap-2 mt-6">
              {leaders.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentLeaderIndex(idx)}
                  className={`transition-all duration-300 rounded-full ${
                    currentLeaderIndex === idx
                      ? "w-8 h-2 bg-sky-400"
                      : "w-2 h-2 bg-white/40 hover:bg-white/60"
                  }`}
                />
              ))}
            </div>
          </div>
        </motion.section>

        {/* CORE VALUES */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="px-4 pb-10"
        >
          <div className="text-center mb-8 md:mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
              ارزش‌های ما
            </h2>
            <p className="text-sky-200 text-sm md:text-base max-w-3xl mx-auto leading-relaxed">
              آنچه هویت آموزشی ایران استرالیا را می‌سازد، مجموعه‌ای از ارزش‌های
              حرفه‌ای، انسانی و تخصصی است.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            {values.map((value, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8 + index * 0.1 }}
                className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 text-center"
              >
                <div className="text-sky-300 flex justify-center mb-4">
                  {value.icon}
                </div>
                <h3 className="text-white text-lg font-bold mb-3">
                  {value.title}
                </h3>
                <p className="text-sky-100 text-sm leading-7">
                  {value.description}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* POOLS GALLERY */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="px-4 mb-12 md:mb-16"
        >
          <h2 className="text-2xl md:text-3xl font-semibold text-white mb-8 text-center">
            استخرها
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {pools.map((pool, index) => (
              <div
                key={index}
                className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl overflow-hidden shadow-lg"
              >
                <div className="p-4 md:p-6">
                  {/* HEADER */}
                  <div className="flex items-center gap-2 text-cyan-300 mb-3">
                    <MapPin className="w-5 h-5" />
                    <h3 className="text-xl md:text-2xl font-bold text-white">
                      {pool.name}
                    </h3>
                  </div>

                  <p className="text-sky-100 text-sm md:text-base mb-4">
                    {pool.location}
                  </p>

                  {/* SWIPER GALLERY */}
                  <Swiper
                    modules={[Navigation, Pagination, Autoplay]}
                    navigation
                    pagination={{ clickable: true }}
                    autoplay={{ delay: 3000, disableOnInteraction: false }}
                    loop={true}
                    className="rounded-xl overflow-hidden"
                  >
                    {pool.images.map((img, imgIndex) => (
                      <SwiperSlide key={imgIndex}>
                        <div className="relative w-full aspect-[4/3] bg-slate-800">
                          <img
                            src={img}
                            alt={`${pool.name} - ${imgIndex + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </SwiperSlide>
                    ))}
                  </Swiper>
                </div>
              </div>
            ))}
          </div>
        </motion.section>

      </div>
    </div>
  );
}