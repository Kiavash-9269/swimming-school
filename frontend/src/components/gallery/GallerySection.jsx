import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useSwipeable } from "react-swipeable";

const categories = [
  {
    id: "kids",
    title: "بخش کودکان",
    description: "محیطی شاد و ایمن برای نوآموزان کوچک",
    images: [
      {
        src: "/gallery/kids/photo_2026-06-03_10-54-02.webp",
        alt: "کودکان در حال آموزش شنا",
      },
      {
        src: "/gallery/kids/photo_2026-06-03_11-16-20.webp",
        alt: "کودکان در حال آموزش شنا",
      },
      {
        src: "/gallery/kids/photo_2026-06-03_11-16-52.webp",
        alt: "کودکان در حال آموزش شنا",
      },
      { src: "/gallery/kids/IMG_5143.webp", alt: "کودکان در حال آموزش شنا" },
      {
        src: "/gallery/kids/photo_2026-06-03_11-16-16.webp",
        alt: "کودکان در حال آموزش شنا",
      },
      {
        src: "/gallery/kids/photo_2026-06-03_11-16-08.webp",
        alt: "کودکان در حال آموزش شنا",
      },
      { src: "/gallery/kids/IMG_5070.webp", alt: "کودکان در حال آموزش شنا" },
    ],
  },
  {
    id: "teens",
    title: "عکس هایمان ",
    description: " مجموعه ای از فعالیت های مدرسه شنا ایران استرالیا",
    images: [
      {
        src: "/gallery/teens/photo_2026-06-04_11-18-55.webp",
        alt: "نوجوانان در حال تمرین حرفه‌ای",
      },
      {
        src: "/gallery/teens/photo_2026-06-04_11-18-47.webp",
        alt: "نوجوانان در حال تمرین حرفه‌ای",
      },
      {
        src: "/gallery/teens/_SAR3934.webp",
        alt: "نوجوانان در حال تمرین حرفه‌ای",
      },
      {
        src: "/gallery/teens/photo_2026-06-03_11-15-54.webp",
        alt: "نوجوانان در حال تمرین حرفه‌ای",
      },
      {
        src: "/gallery/teens/photo_2026-06-03_10-54-06.webp",
        alt: "نوجوانان در حال تمرین حرفه‌ای",
      },
      {
        src: "/gallery/teens/photo_2026-06-03_11-15-50.webp",
        alt: "نوجوانان در حال تمرین حرفه‌ای",
      },
      {
        src: "/gallery/teens/photo_2026-06-03_10-54-11.webp",
        alt: "نوجوانان در حال تمرین حرفه‌ای",
      },
    ],
  },
  {
    id: "coaches",
    title: "مربیان مجرب",
    description: "تیم حرفه‌ای مربیان ترکیب جوانی با تجربه",
    images: [
      { src: "/gallery/coaches/IMG_5420.webp", alt: "کیارش بهراد فر" },
      { src: "/gallery/coaches/IMG_7074.webp", alt: "سینا عزیزی" },
      {
        src: "/gallery/coaches/photo_2026-06-03_10-53-52.webp",
        alt: "میلاد خجسته",
      },
      { src: "/gallery/coaches/IMG_9699.webp", alt: "کیاوش آقابیگی" },
      {
        src: "/gallery/coaches/photo_2026-06-03_10-50-50.webp",
        alt: "نیما فکور",
      },
      { src: "/gallery/coaches/IMG_7470.webp", alt: "مصطفی شادکام" },
      { src: "/gallery/coaches/IMG_4655.webp", alt: "شایان حمانی" },
      { src: "/gallery/coaches/IMG_2286.webp", alt: "محمد سوری" },
      { src: "/gallery/coaches/IMG_6388.webp", alt: "عارف فرجی" },
      { src: "/gallery/coaches/IMG_4648.webp", alt: "ارشیا طاهرگلی" },
      {
        src: "/gallery/coaches/photo_2026-06-04_09-25-19.webp",
        alt: "پویا حبیبی",
      },
    ],
  },
  {
    id: "competitions",
    title: "بخش مسابقات",
    description: "رقابت‌های هیجان‌انگیز و رویدادهای ورزشی",
    images: [
      { src: "/gallery/competitions/_SAR3833.webp", alt: "مسابقات شنا" },
      { src: "/gallery/competitions/_SAR3717.webp", alt: "مسابقات شنا" },
      { src: "/gallery/competitions/_SAR3622.webp", alt: "مسابقات شنا" },
      { src: "/gallery/competitions/_SAR3744.webp", alt: "مسابقات شنا" },
      {
        src: "/gallery/competitions/photo_2026-06-03_11-16-45.webp",
        alt: "مسابقات شنا",
      },
      {
        src: "/gallery/competitions/photo_2026-06-03_11-16-41.webp",
        alt: "مسابقات شنا",
      },
      {
        src: "/gallery/competitions/photo_2026-06-03_11-15-43.webp",
        alt: "مسابقات شنا",
      },
    ],
  },
];

const categoryMap = Object.fromEntries(categories.map((cat) => [cat.id, cat]));

// کامپوننت مستقل برای اسلایدر هر دسته
const CategorySlider = ({
  category,
  currentSlide,
  visibleCount,
  onNext,
  onPrev,
  onDotClick,
}) => {
  const swipeHandlers = useSwipeable({
    onSwipedLeft: onNext,
    onSwipedRight: onPrev,
    trackMouse: false,
    preventScrollOnSwipe: true,
    delta: 50,
  });

  const visibleImages = category.images.slice(
    currentSlide,
    currentSlide + visibleCount,
  );

  return (
    <div className="relative">
      <div className="flex items-center gap-2 sm:gap-4" {...swipeHandlers}>
        {/* دکمه قبلی */}
        <button
          onClick={onPrev}
          disabled={currentSlide === 0}
          className={`flex-shrink-0 w-11 h-11 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
            currentSlide === 0
              ? "bg-gray-600/50 text-gray-400 cursor-not-allowed"
              : "bg-white/80 text-sky-600 hover:bg-white hover:scale-110 shadow-md backdrop-blur-sm border border-sky-200 active:scale-95"
          }`}
          aria-label="تصاویر قبلی"
        >
          <svg
            className="w-5 h-5 sm:w-5 sm:h-5"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
          </svg>
        </button>

        {/* گرید تصاویر */}
        <div className="flex-1 grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
          {visibleImages.map((image, index) => {
            const isFirstImage = currentSlide === 0 && index === 0;
            return (
              <div
                key={`${category.id}-${currentSlide}-${index}`}
                className="group relative"
              >
                <div className="aspect-[4/5] sm:aspect-[3/4] bg-gray-100 rounded-lg sm:rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-500">
                  <img
                    src={image.src}
                    alt={
                      image.alt ||
                      (category.id === "coaches"
                        ? image.alt
                        : `گالری ${category.title}`)
                    }
                    loading="lazy"
                    decoding="async"
                    fetchPriority={isFirstImage ? "high" : "low"}
                    draggable={false}
                    className="w-full h-full object-cover transition-transform duration-300 sm:duration-700 group-hover:scale-110"
                    width={400}
                    height={500}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  {/* نام مربی - با بک‌گراند آبی روشن، border-radius و فاصله از پایین */}
                  {category.id === "coaches" && image.alt && (
                    <div className="absolute bottom-3 left-3 right-3 p-2 sm:p-2.5 translate-y-0 md:translate-y-full md:group-hover:translate-y-0 transition-transform duration-300 bg-sky-500/90 backdrop-blur-sm rounded-lg shadow-lg">
                      <p className="text-white text-[11px] sm:text-xs font-medium text-center md:text-right">
                        {image.alt}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* دکمه بعدی */}
        <button
          onClick={onNext}
          disabled={currentSlide >= category.images.length - visibleCount}
          className={`flex-shrink-0 w-11 h-11 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
            currentSlide >= category.images.length - visibleCount
              ? "bg-gray-600/50 text-gray-400 cursor-not-allowed"
              : "bg-white/80 text-sky-600 hover:bg-white hover:scale-110 shadow-md backdrop-blur-sm border border-sky-200 active:scale-95"
          }`}
          aria-label="تصاویر بعدی"
        >
          <svg
            className="w-5 h-5 sm:w-5 sm:h-5"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z" />
          </svg>
        </button>
      </div>

      {/* دات نویگیشن - با فاصله بیشتر از بالا */}
      <div className="flex justify-center items-center gap-2 sm:gap-3 mt-8 sm:mt-10">
        <div className="flex items-center gap-2 sm:gap-3 bg-white/10 backdrop-blur-sm rounded-full px-4 sm:px-5 py-2 sm:py-2.5 border border-white/20">
          {category.images.map((_, index) => {
            const isInRange =
              index >= currentSlide && index < currentSlide + visibleCount;
            return (
              <button
                key={index}
                onClick={() => onDotClick(index)}
                className={`transition-all duration-300 ease-out ${
                  isInRange
                    ? "w-2.5 h-2.5 sm:w-3 sm:h-3 bg-sky-400 rounded-full shadow-lg shadow-sky-400/50 scale-125"
                    : "w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white/40 rounded-full hover:bg-white/60 hover:scale-110"
                }`}
                aria-label={`رفتن به اسلاید ${index + 1}`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default function GallerySection() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [currentSlides, setCurrentSlides] = useState(
    categories.reduce((acc, cat) => {
      acc[cat.id] = 0;
      return acc;
    }, {}),
  );

  const [visibleCount, setVisibleCount] = useState(4);

  useEffect(() => {
    const updateCount = () => {
      if (window.innerWidth < 640) setVisibleCount(1);
      else if (window.innerWidth < 768) setVisibleCount(2);
      else if (window.innerWidth < 1024) setVisibleCount(3);
      else setVisibleCount(4);
    };

    updateCount();
    window.addEventListener("resize", updateCount);
    return () => window.removeEventListener("resize", updateCount);
  }, []);

  const filtered =
    activeCategory === "all"
      ? categories
      : categories.filter((c) => c.id === activeCategory);

  const nextSlide = useCallback(
    (categoryId) => {
      const category = categoryMap[categoryId];
      const maxSlide = Math.max(0, category.images.length - visibleCount);

      setCurrentSlides((prev) => ({
        ...prev,
        [categoryId]: Math.min(prev[categoryId] + 1, maxSlide),
      }));
    },
    [visibleCount],
  );

  const prevSlide = useCallback((categoryId) => {
    setCurrentSlides((prev) => ({
      ...prev,
      [categoryId]: Math.max(prev[categoryId] - 1, 0),
    }));
  }, []);

  const handleDotClick = useCallback(
    (categoryId, index) => {
      const category = categoryMap[categoryId];
      const maxSlide = Math.max(0, category.images.length - visibleCount);
      const clampedIndex = Math.min(index, maxSlide);

      setCurrentSlides((prev) => ({
        ...prev,
        [categoryId]: clampedIndex,
      }));
    },
    [visibleCount],
  );

  return (
    <div className="min-h-screen bg-sky-950 select-none">
      {/* هدر با فاصله بیشتر از نوبار */}
      <div className="px-2 sm:px-4 pt-12 sm:pt-16 md:pt-16 max-w-7xl mx-auto text-center">
        <header className="text-center mt-8 sm:mt-10 md:mt-12 mb-8 sm:mb-12">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-medium text-white mb-4 sm:mb-5">
            گالری آموزشگاه شنا
          </h1>
          <div className="w-12 sm:w-16 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent mx-auto mb-4 sm:mb-5"></div>
          <p className="text-gray-300 text-sm sm:text-base max-w-2xl mx-auto px-2">
            ثبت بهترین لحظات آموزشی در مدرسه شنا ایران استرالیا
          </p>
        </header>
      </div>

      {/* دکمه‌های دسته‌بندی اسکرولی */}
      <div className="flex justify-center px-4 mb-10 sm:mb-14">
        <div
          className="flex overflow-x-auto gap-1 sm:gap-1.5 bg-white rounded-2xl p-1.5 shadow-inner max-w-full scrollbar-hide"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          <button
            onClick={() => setActiveCategory("all")}
            className={`px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 md:py-2.5 text-xs sm:text-sm rounded-xl transition-all duration-300 whitespace-nowrap ${
              activeCategory === "all"
                ? "bg-sky-700 text-white shadow-md font-medium"
                : "text-gray-700 hover:bg-blue-50 hover:text-gray-800"
            }`}
          >
            همه
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 md:py-2.5 text-xs sm:text-sm rounded-xl transition-all duration-300 whitespace-nowrap ${
                activeCategory === cat.id
                  ? "bg-sky-700 text-white shadow-md font-medium"
                  : "text-gray-700 hover:bg-blue-50 hover:text-gray-800"
              }`}
            >
              {cat.title}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 space-y-12 sm:space-y-16 pb-16">
        {filtered.map((category, categoryIndex) => (
          <motion.div
            key={category.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: categoryIndex * 0.1 }}
            className="space-y-4 sm:space-y-6"
          >
            <div className="text-center space-y-2 sm:space-y-3">
              <h2 className="text-xl sm:text-2xl font-medium text-white">
                {category.title}
              </h2>
              <p className="text-gray-300 text-xs sm:text-sm max-w-xl mx-auto px-4">
                {category.description}
              </p>
            </div>

            <CategorySlider
              category={category}
              currentSlide={currentSlides[category.id]}
              visibleCount={visibleCount}
              onNext={() => nextSlide(category.id)}
              onPrev={() => prevSlide(category.id)}
              onDotClick={(index) => handleDotClick(category.id, index)}
            />
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
        className="bg-sky-600 py-12 sm:py-16 mt-12 sm:mt-16"
      >
        <div className="max-w-md mx-auto text-center px-4 space-y-3 sm:space-y-4">
          <h3 className="text-lg sm:text-xl font-medium text-white">
            آماده شروع هستید؟
          </h3>
          <p className="text-gray-300 text-xs sm:text-sm">
            همین امروز به خانواده ما بپیوندید
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link
              to="/contact"
              className="bg-sky-900 text-white text-sm px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl hover:bg-sky-800 transition-colors duration-300 shadow-sm hover:shadow-md text-center"
            >
              ثبت‌نام در دوره‌ها
            </Link>
            <Link
              to="/contact"
              className="border border-gray-300 text-white text-sm px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl hover:border-gray-400 hover:text-gray-800 transition-all duration-300 text-center"
            >
              تماس با ما
            </Link>
          </div>
        </div>
      </motion.div>

      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        @media (min-width: 480px) {
          .xs\\:grid-cols-2 {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
      `}</style>
    </div>
  );
}
