import React from "react";
import { motion } from "framer-motion";
import reason1 from "../../assets/images/file-20211202-19-26j0je.avif";
// import reason1 from "../../assets/images/file-20211202-19-26j0je.avif";
// import reason1 from "../../assets/images/file-20211202-19-26j0je.avif";
// import reason1 from "../../assets/images/file-20211202-19-26j0je.avif";

const HomeWhyChooseUs = () => {
  const reasons = [
    {
      id: 1,
      title: "تجربه استثنایی",
      text: "با سال‌ها تخصص در صنعت، راه‌حل‌های نوآورانه و مؤثری برای نیازهای شما ارائه می‌دهیم.",
      img: reason1,
    },
    {
      id: 2,
      title: "پشتیبانی تمام وقت",
      text: "تیم پشتیبانی ما 24/7 در کنار شماست تا بهترین تجربه کاربری را داشته باشید.",
      img: reason1,
    },
    {
      id: 3,
      title: "تکنولوژی پیشرفته",
      text: "از آخرین فناوری‌های روز دنیا برای ارائه خدمات باکیفیت استفاده می‌کنیم.",
      img: reason1,
    },
    {
      id: 4,
      title: "راهکارهای سفارشی",
      text: "راه‌حل‌هایی متناسب با نیازهای خاص کسب‌وکار شما طراحی و پیاده‌سازی می‌کنیم.",
      img: reason1,
    },
  ];


  const container = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { staggerChildren: 0.2, duration: 0.6 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
    hover: { scale: 1.05, boxShadow: "0px 20px 30px rgba(0,0,0,0.2)" },
  };

  return (
    <section
      className="relative w-full bg-gradient-to-r from-sky-950 via-sky-900 to-sky-950 text-white py-16 px-6 md:px-12 overflow-hidden"
      dir="rtl"
    >
      <div className="text-center mb-12 px-4">
        <h2 className="text-3xl md:text-4xl font-bold mb-3">
          چرا ما را انتخاب کنید؟
        </h2>
        <p className="text-sky-200 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
          با ترکیبی از تخصص، فناوری و تعهد، تجربه‌ای منحصر به فرد برای شما خلق می‌کنیم
        </p>
      </div>

      <motion.div
        className="flex flex-wrap justify-center gap-8 md:gap-10"
        variants={container}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        {reasons.map((reason) => (
          <motion.div
            key={reason.id}
            className="relative bg-[#D6E8F1] w-[260px] h-[460px] rounded-[8rem] shadow-md border border-sky-200 flex flex-col items-center pt-8 pb-6 px-4 text-center cursor-pointer"
            variants={item}
            whileHover="hover"
          >
            <div className="relative w-47 h-47 rounded-full overflow-hidden border-4 border-sky-500 shadow-md bg-white mb-6">
              <img
                src={reason.img}
                alt={reason.title}
                className="object-cover w-full h-full transition-transform duration-500 hover:scale-110"
              />
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-sky-600 text-white w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold border-4 border-white shadow-md">
                {reason.id}
              </div>
            </div>

            <div className="mt-5">
              <h3 className="text-lg md:text-xl font-bold text-sky-950 mb-2">
                {reason.title}
              </h3>
              <p className="text-gray-700 text-sm md:text-base leading-relaxed">
                {reason.text}
              </p>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
};

export default HomeWhyChooseUs;
