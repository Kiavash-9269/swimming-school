import React from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Link } from "react-router-dom";
import HomeAboutBg from "../../assets/images/iStock-625735914_swimming-lesson-kickboard-712x325@2x.jpg"

export default function HomeAbout() {
  return (
    <section
      dir="rtl"
      className="relative w-full bg-gradient-to-r from-sky-950 via-sky-900 to-sky-950 text-white py-16 px-6 md:px-12 flex flex-col md:flex-row items-center justify-center gap-10 overflow-hidden"
    >
      <motion.div
        initial={{ opacity: 0, scale: 1.1 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        className="relative w-full md:w-1/2 z-10"
      >
        <motion.img
          src={HomeAboutBg}
          alt="درباره مدرسه شنا ایران"
          className="rounded-2xl shadow-2xl object-cover w-full h-[420px] md:h-[480px]"
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 8, ease: "easeOut" }}
        />
        <div className="absolute bottom-6 right-6 bg-black/70 text-center px-6 py-4 rounded-xl backdrop-blur-md border border-sky-400/40 shadow-lg shadow-sky-500/20">
          <h3 className="text-3xl font-bold text-white">+16</h3>
          <p className="text-sm text-sky-300 mt-1 font-medium">
            سال تجربه آموزشی
          </p>
        </div>
      </motion.div>

      <motion.div
        initial={{ x: 80, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 1 }}
        className="w-full md:w-1/2 z-10 space-y-6"
      >
        <h2 className="text-3xl md:text-4xl font-extrabold leading-snug text-white relative">
          درباره{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-l from-sky-400 to-cyan-400">
             مدرسه شنا ایران استرالیا
          </span>
          <span className="absolute -bottom-2 right-0 w-24 h-1 bg-gradient-to-l from-sky-400 to-cyan-400 rounded-full animate-pulse" />
        </h2>

        <p className="text-slate-200 leading-relaxed text-justify">
          مدرسه شنا ایران با بیش از ۱۶ سال تجربه در آموزش شنا برای تمامی
          سنین، با استفاده از مربیان مجرب و امکانات استاندارد، محیطی امن و
          پویا برای یادگیری و پیشرفت فراهم کرده است. هدف ما ترویج فرهنگ شنا و
          ارتقای سلامت جسمی و روحی در جامعه است.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 mt-4">
          {[
            "آموزش شنا از مبتدی تا حرفه‌ای",
            "مربیان دارای گواهینامه بین‌المللی",
            "استخرهای استاندارد و ایمن",
            "تمرینات تنفسی و بدنسازی آبی",
          ].map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.2 }}
              className="flex items-center gap-2"
            >
              <Check className="w-5 h-5 text-sky-400" />
              <span className="text-slate-100 text-sm">{item}</span>
            </motion.div>
          ))}
        </div>

          <Link></Link>
        <Link to="/about">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="inline-block mt-8 px-6 py-3 rounded-xl bg-gradient-to-l from-sky-500 to-cyan-500 text-white font-medium shadow-md hover:shadow-lg hover:from-sky-600 hover:to-cyan-600 transition-all cursor-pointer"
          >
            اطلاعات بیشتر
          </motion.div>
        </Link>
        </motion.div>
    </section>
  );
}
