import React, { useMemo, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, EffectCoverflow } from "swiper/modules";
import "swiper/css";
import "swiper/css/effect-coverflow";

import swimerBg1 from "../../assets/images/photo_2025-10-22_13-03-56.jpg";
import swimerBg2 from "../../assets/images/photo_2025-10-22_13-03-40.jpg";
import swimerBg3 from "../../assets/images/photo_2025-10-22_13-03-48.jpg";
import swimerBg4 from "../../assets/images/photo_2025-10-22_13-04-01.jpg";
import swimerBg5 from "../../assets/images/photo_2025-10-22_13-03-44.jpg";
import swimerBg6 from "../../assets/images/photo_2025-10-22_13-03-52.jpg";
import swimerBg7 from "../../assets/images/photo_2025-10-22_13-02-58.jpg";

const HomeSwimmer = () => {
  const profileData = useMemo(
    () => [
      {
        name: "معراج توروه",
        role: "قورباغه رو",
        description: "قهرمان کشور و مسابقات بین‌المللی دبی",
        age: "۱۸ سال به بالا",
        image: swimerBg1,
      },
      {
        name: "کاوه راموز",
        role: "استقامت سینه",
        description: "قهرمان کشور",
        age: "۱۸ سال به بالا",
        image: swimerBg2,
      },
      {
        name: "محمد پارسا صفایی",
        role: "پروانه",
        description: "رکورددار ۱۰۰ متر پروانه",
        age: "۱۵ تا ۱۷ سال",
        image: swimerBg3,
      },
      {
        name: "مازیار بگیان",
        role: "پروانه رو",
        description: "قهرمان کشور",
        age: "۱۸ سال به بالا",
        image: swimerBg4,
      },
      {
        name: "فربد ترابی",
        role: "قورباغه رو",
        description: "قهرمان کشور",
        age: "۱۸ سال به بالا",
        image: swimerBg5,
      },
      {
        name: "پوریا سید جعفری",
        role: "مختلط",
        description: "قهرمان کشور",
        age: "۱۸ سال به بالا",
        image: swimerBg6,
      },
      {
        name: "امیر یعقوبی",
        role: "مختلط",
        description: "قهرمان کشور در رده سنی نوجوانان",
        age: "۱۳ تا ۱۴ سال",
        image: swimerBg7,
      },
    ],
    []
  );

  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <section className="relative bg-[#071826] py-20 overflow-hidden" dir="rtl">

      {/* glow background */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-sky-500/10 blur-[120px]" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-cyan-400/10 blur-[120px]" />

      <div className="max-w-6xl mx-auto px-4 relative z-10">

        {/* title */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            شناگران برتر
          </h2>
          <p className="text-sky-200 text-sm mt-2">
            معرفی قهرمانان و استعدادهای برتر مجموعه
          </p>
        </div>

        <Swiper
          modules={[Autoplay, EffectCoverflow]}
          effect="coverflow"
          centeredSlides
          loop
          autoplay={{ delay: 3000 }}
          speed={800}
          slidesPerView={3}
          spaceBetween={-40}
          coverflowEffect={{
            rotate: 0,
            stretch: 0,
            depth: 120,
            modifier: 1.2,
            slideShadows: false,
          }}
          breakpoints={{
            320: { slidesPerView: 1 },
            768: { slidesPerView: 2 },
            1024: { slidesPerView: 3 },
          }}
          onSlideChange={(swiper) => setActiveIndex(swiper.realIndex)}
        >
          {profileData.map((p, i) => (
            <SwiperSlide key={i} className="!h-[460px]">

              <div
                className={`relative h-full rounded-2xl overflow-hidden transition-all duration-500
                ${i === activeIndex ? "scale-100" : "scale-90 opacity-60"}`}
              >

                {/* image */}
                <img
                  src={p.image}
                  className="w-full h-full object-cover"
                />

                {/* dark overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                {/* content */}
                <div className="absolute bottom-0 w-full p-5 text-white">

                  <h3 className="text-lg font-bold">{p.name}</h3>

                  <p className="text-sky-300 text-sm">{p.role}</p>

                  <p className="text-xs text-gray-300 mt-1">
                    {p.age}
                  </p>

                  <p className="text-sm text-gray-200 mt-2 leading-6">
                    {p.description}
                  </p>

                </div>

              </div>

            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
};

export default HomeSwimmer;