import React from "react";
import { motion } from "framer-motion";
import reason1 from "../../assets/images/IMG_7073.jpeg";
import logo from "/logo.png.webp";

const HomeWhyChooseUs = () => {
  const reasons = [
    {
      title: "آموزش حرفه‌ای و اصولی",
      text: "مسیر یادگیری شما بر پایه تجربه واقعی و استانداردهای بین‌المللی طراحی شده؛ ساده، دقیق و نتیجه‌محور.",
    },
    {
      title: "پشتیبانی واقعی در تمام مسیر",
      text: "هر لحظه که نیاز داشته باشید، یک تیم همراه دارید که واقعاً پاسخگوست، نه فقط در ظاهر.",
    },
    {
      title: "متدهای مدرن آموزشی",
      text: "از جدیدترین روش‌های یادگیری استفاده می‌کنیم تا پیشرفت شما سریع‌تر و اصولی‌تر باشد.",
    },
    {
      title: "برنامه اختصاصی برای هر فرد",
      text: "هیچ دو هنرجویی یک مسیر یکسان ندارند؛ همه چیز دقیقاً بر اساس سطح و هدف شما تنظیم می‌شود.",
    },
  ];

  return (
    <section
      className="relative w-full bg-[#071826] text-white py-20 md:py-24 px-6 md:px-16 overflow-hidden"
      dir="rtl"
    >
      {/* background glow */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-sky-500/10 blur-[120px]" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-cyan-400/10 blur-[120px]" />

      {/* header */}
      <div className="text-center mb-14 md:mb-20">
        <h2 className="text-2xl md:text-4xl font-bold mb-3">
          چرا ما را انتخاب کنید؟
        </h2>
        <p className="text-sky-200 max-w-xl mx-auto text-xs md:text-sm leading-6">
          تجربه‌ای متفاوت از آموزش شنا با محیطی امن، حرفه‌ای و استانداردهای روز دنیا
        </p>
      </div>

      {/* layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">

        {/* TEXT */}
        <div className="lg:col-span-5 space-y-8 order-2 lg:order-1">

          {reasons.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 25 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: i * 0.08 }}
              className="border-r border-sky-400 pr-5"
            >
              <h3 className="text-base md:text-lg font-semibold mb-1 text-white/95">
                {item.title}
              </h3>

              <p className="text-gray-300 leading-6 text-xs md:text-sm">
                {item.text}
              </p>
            </motion.div>
          ))}

        </div>

        {/* IMAGE */}
        <div className="lg:col-span-7 order-1 lg:order-2">

          <div className="relative rounded-3xl overflow-hidden shadow-2xl h-[360px] md:h-[520px]">

            <img
              src={reason1}
              alt="swimming"
              className="w-full h-full object-cover"
            />

            {/* overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-black/70 via-black/20 to-transparent" />

            {/* logo glass */}
            <div className="absolute bottom-4 right-4">
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 px-3 py-2 rounded-xl">
                <img src={logo} className="w-5 h-5" />
                <span className="text-[11px] text-sky-100">
                  ایران استرالیا
                </span>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
};

export default HomeWhyChooseUs;