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
        role:"قورباغه رو" ,
        description: "قهرمان کشور و مسابقات بین المللی دوبی",
        age: "هیجده سال به بالا",
        image: swimerBg1,
      },
      {
        name: "کاوه راموز",
        role: "استقامت سینه",
        description: "قهرمان کشور",
        age: "هیجده سال به بالا",
        image: swimerBg2,
      },
      {
        name: "محمد پارسا صفایی",
        role: "رکورد دار ۱۰۰ متر پروانه مردان در رده سنی ۱۵-۱۷ سال",
        description:
         "Tokyo Aquatic Center قهرمان کشور و قهرمانان مسابقات ",
        age: "هیجده سال ب بالا",
        image:
         swimerBg3,
      },
      {
        name: "مازیار بگیان اول",
        role: "پروانه رو",
        description:
          "قهرمان کشور",
        age: "هیجده سال به بالا",
        image:
          swimerBg4,
      },
      {
        name: "فربد ترابی",
        role: "قورباغه رو",
        description:
          "قهرمان کشور",
        age: "هیجده سال به بالا",
        image:
         swimerBg5,
      },
      {
        name: "پوریا سید جعفری",
        role: "مختلط رو",
        description:
          "قهرمان کشور",
        age: "هیجده سال به بالا",
        image:
          swimerBg6,
      },
      {
        name: "امیر یعقوبی ",
        role: "مختلط رو ",
        description:
        "قهرمان کشور در رده‌ی سنی ۱۳ تا ۱۴ سال",
          age: "سیزده به بالا",
        image:
          swimerBg7,
      },
    ],
    []
  );

  const [activeIndex, setActiveIndex] = useState(0);

  const swiperConfig = useMemo(
    () => ({
      modules: [Autoplay, EffectCoverflow],
      effect: "coverflow",
      grabCursor: true,
      centeredSlides: true,
      slidesPerView: 3,
      spaceBetween: 0,
      speed: 800,
      autoplay: { delay: 3000, disableOnInteraction: false },
      loop: true,
      coverflowEffect: {
        rotate: 0,
        stretch: 0,
        depth: 80,
        modifier: 1.2,
        slideShadows: false,
      },
      onSlideChange: (swiper) => {
        setActiveIndex(swiper.realIndex);
      },
      lazy: true,
      breakpoints: {
        320: { slidesPerView: 1, spaceBetween: 10 },
        768: { slidesPerView: 2, spaceBetween: -20 },
        1024: { slidesPerView: 3, spaceBetween: -40 },
      },
    }),
    []
  );

  const shouldRender = (index) => {
    const total = profileData.length;
    const diff = Math.abs(index - activeIndex);
    return diff <= 1 || diff >= total - 1;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 py-12 px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-blue-900/95"></div>
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-2xl"></div>
      <div className="absolute bottom-1/4 right-1/4 w-90 h-90 bg-blue-400/10 rounded-full blur-2xl"></div>

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
            شناگران برتر
          </h1>
        </div>

        <Swiper {...swiperConfig} className="h-[480px]">
          {profileData.map((profile, index) => (
            <SwiperSlide key={index} className="!h-[420px]">
              {shouldRender(index) && (
                <div
                  className={`team-card relative w-full h-full bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-500 flex flex-col ${
                    index === activeIndex
                      ? "scale-100 blur-none z-30"
                      : "scale-90 blur-[2px] opacity-80"
                  } hover:scale-105 hover:blur-none`}
                >
                  <div className="relative h-36 bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center">
                    <div className="relative z-10 w-40 h-40 mt-12 border-2 rounded-3xl border-white shadow-lg overflow-hidden">
                      <img
                        src={profile.image}
                        alt={profile.name}
                        className=" transition duration-300 hover:scale-110 cursor-pointer object-cover"
                        loading="lazy"
                      />
                    </div>
                  </div>
                  <div className="pt-8 px-5 pb-5 mt-8 flex-grow flex flex-col text-center">
                    <h3 className="text-lg font-bold text-gray-800 mb-2">
                      {profile.name}
                    </h3>
                    <p className="text-sm text-gray-500  mt-2 mb-3">{profile.age}</p>
                    <p className="text-blue-600 mt-1 font-medium mb-3 text-sm">
                      {profile.role}
                    </p>

                    <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 mt-2 shadow-sm hover:shadow-md transition duration-300">
                      <p className="text-gray-700 text-sm leading-relaxed">
                        <span className="inline-block mr-2 text-blue-500 text-base"></span>
                        {profile.description}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;600;700&display=swap");
        * {
          font-family: "Vazirmatn", sans-serif;
        }

        .team-card {
          transform-origin: center center;
          transition: transform 0.5s ease, filter 0.5s ease, opacity 0.4s ease;
        }
      `}</style>
    </div>
  );
};

export default HomeSwimmer;
