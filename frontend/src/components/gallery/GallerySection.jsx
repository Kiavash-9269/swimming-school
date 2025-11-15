import React, { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const categories = [
  {
    id: "kids",
    title: "بخش کودکان",
    description: "محیطی شاد و ایمن برای نوآموزان کوچک",
    images: [
      { src: "/images/kids1.jpg", alt: "کلاس شنا کودکان" },
      { src: "/images/kids2.jpg", alt: "آموزش شنا" },
      { src: "/images/kids3.jpg", alt: "فعالیت آبی" },
      { src: "/images/kids4.jpg", alt: "شیرجه کودکان" },
      { src: "/images/kids5.jpg", alt: "بازی آبی" },
      { src: "/images/kids6.jpg", alt: "آموزش غوطه‌وری" },
      { src: "/images/kids7.jpg", alt: "جشن پایان دوره" }
    ]
  },
  {
    id: "teens",
    title: "بخش نوجوانان",
    description: "تمرینات حرفه‌ای و پیشرفته برای نوجوانان",
    images: [
      { src: "/images/teens1.jpg", alt: "تمرین نوجوانان" },
      { src: "/images/teens2.jpg", alt: "کرال سینه" },
      { src: "/images/teens3.jpg", alt: "استارت حرفه‌ای" },
      { src: "/images/teens4.jpg", alt: "مسابقه نوجوانان" },
      { src: "/images/teens5.jpg", alt: "تمرین تکنیک" },
      { src: "/images/teens6.jpg", alt: "کرال پشت" },
      { src: "/images/teens7.jpg", alt: "تمرین تیمی" }
    ]
  },
  {
    id: "coaches",
    title: "مربیان مجرب",
    description: "تیم حرفه‌ای مربیان با سال‌ها تجربه",
    images: [
      { src: "/images/coaches1.jpg", alt: "تیم مربیان" },
      { src: "/images/coaches2.jpg", alt: "کارگاه آموزشی" },
      { src: "/images/coaches3.jpg", alt: "مربی ارشد" },
      { src: "/images/coaches4.jpg", alt: "آموزش تکنیک" },
      { src: "/images/coaches5.jpg", alt: "مربی و شاگرد" },
      { src: "/images/coaches6.jpg", alt: "تمرین خصوصی" },
      { src: "/images/coaches7.jpg", alt: "تحلیل حرکت" }
    ]
  },
  {
    id: "competitions",
    title: "بخش مسابقات",
    description: "رقابت‌های هیجان‌انگیز و رویدادهای ورزشی",
    images: [
      { src: "/images/comp1.jpg", alt: "مسابقه استانی" },
      { src: "/images/comp2.jpg", alt: "رقابت نوجوانان" },
      { src: "/images/comp3.jpg", alt: "مراسم اهدای مدال" },
      { src: "/images/comp4.jpg", alt: "مسابقات تیمی" },
      { src: "/images/comp5.jpg", alt: "شیرجه مسابقه" },
      { src: "/images/comp6.jpg", alt: "استارت مسابقه" },
      { src: "/images/comp7.jpg", alt: "جشن قهرمانی" }
    ]
  }
];

export default function GallerySection() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [currentSlides, setCurrentSlides] = useState(
    categories.reduce((acc, cat) => {
      acc[cat.id] = 0;
      return acc;
    }, {})
  );
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const sliderRef = useRef({});

  const filtered = activeCategory === "all" 
    ? categories 
    : categories.filter((c) => c.id === activeCategory);

  const nextSlide = (categoryId) => {
    const category = categories.find(cat => cat.id === categoryId);
    const maxVisibleSlides = 4;
    const maxSlide = category.images.length - maxVisibleSlides;
    
    setCurrentSlides(prev => ({
      ...prev,
      [categoryId]: Math.min(prev[categoryId] + 1, maxSlide)
    }));
  };

  const prevSlide = (categoryId) => {
    setCurrentSlides(prev => ({
      ...prev,
      [categoryId]: Math.max(prev[categoryId] - 1, 0)
    }));
  };

  const getVisibleImages = (category) => {
    const startIndex = currentSlides[category.id];
    return category.images.slice(startIndex, startIndex + 4);
  };

  // Functions for drag to scroll
  const handleMouseDown = (e, categoryId) => {
    setIsDragging(true);
    setStartX(e.pageX - sliderRef.current[categoryId].offsetLeft);
    setScrollLeft(sliderRef.current[categoryId].scrollLeft);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e, categoryId) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - sliderRef.current[categoryId].offsetLeft;
    const walk = (x - startX) * 2;
    sliderRef.current[categoryId].scrollLeft = scrollLeft - walk;
  };

  // Touch events for mobile
  const handleTouchStart = (e, categoryId) => {
    setIsDragging(true);
    setStartX(e.touches[0].pageX - sliderRef.current[categoryId].offsetLeft);
    setScrollLeft(sliderRef.current[categoryId].scrollLeft);
  };

  const handleTouchMove = (e, categoryId) => {
    if (!isDragging) return;
    const x = e.touches[0].pageX - sliderRef.current[categoryId].offsetLeft;
    const walk = (x - startX) * 2;
    sliderRef.current[categoryId].scrollLeft = scrollLeft - walk;
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  return (
    <div className="min-h-screen bg-sky-950 select-none">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4 py-16 max-w-7xl mx-auto text-center"
      >
        <h1 className="text-4xl font-medium text-white mb-4">گالری آموزشگاه شنا</h1>
        <div className="w-16 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent mx-auto mb-4"></div>
        <p className="text-gray-300 max-w-2xl mx-auto">
          ثبت بهترین لحظات آموزشی در مدرسه شنا ایران استرالیا
        </p>
      </motion.div>

      {/* Filter Tabs */}
      <div className="flex justify-center mb-12">
        <div className="flex gap-1 bg-white rounded-2xl p-1.5 shadow-inner">
          <button
            onClick={() => setActiveCategory("all")}
            className={`px-6 py-2.5 text-sm rounded-xl transition-all duration-300 ${
              activeCategory === "all"
                ? "bg-sky-700 text-white shadow-md font-medium"
                : "text-gray-700 hover:bg-blue-50 hover:text-gray-800"
            }`}
          >
            همه بخش‌ها
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-6 py-2.5 text-sm rounded-xl transition-all duration-300 ${
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

      {/* Gallery Content */}
      <div className="max-w-7xl mx-auto px-4 space-y-16">
        {filtered.map((category, categoryIndex) => (
          <motion.div
            key={category.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: categoryIndex * 0.1 }}
            className="space-y-6"
          >
            {/* Category Header */}
            <div className="text-center space-y-3">
              <h2 className="text-2xl font-medium text-white">{category.title}</h2>
              <p className="text-gray-300 text-sm max-w-xl mx-auto">{category.description}</p>
            </div>

            {/* Slider Container */}
            <div className="relative">
              <div className="flex items-center gap-4">
                {/* Navigation Button - Previous */}
                <button
                  onClick={() => prevSlide(category.id)}
                  disabled={currentSlides[category.id] === 0}
                  className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                    currentSlides[category.id] === 0
                      ? "bg-gray-600/50 text-gray-400 cursor-not-allowed"
                      : "bg-white/80 text-sky-600 hover:bg-white hover:scale-110 shadow-md backdrop-blur-sm border border-sky-200"
                  }`}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                  </svg>
                </button>

                {/* Images Grid - 4 images visible */}
                <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                  {getVisibleImages(category).map((image, index) => (
                    <motion.div
                      key={currentSlides[category.id] + index}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                      className="group relative"
                    >
                      <div className="aspect-[3/4] bg-gray-100 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-500">
                        <img
                          src={image.src}
                          alt={image.alt}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                        
                        {/* Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        
                        {/* Image Info */}
                        <div className="absolute bottom-0 left-0 right-0 p-3 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                          <p className="text-white text-sm font-medium text-shadow">{image.alt}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Navigation Button - Next */}
                <button
                  onClick={() => nextSlide(category.id)}
                  disabled={currentSlides[category.id] >= category.images.length - 4}
                  className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                    currentSlides[category.id] >= category.images.length - 4
                      ? "bg-gray-600/50 text-gray-400 cursor-not-allowed"
                      : "bg-white/80 text-sky-600 hover:bg-white hover:scale-110 shadow-md backdrop-blur-sm border border-sky-200"
                  }`}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"/>
                  </svg>
                </button>
              </div>

              {/* Draggable Full Slider (hidden but functional) */}
              <div 
                ref={el => sliderRef.current[category.id] = el}
                className={`overflow-x-auto scrollbar-hide mt-4 ${
                  isDragging ? 'cursor-grabbing' : 'cursor-grab'
                }`}
                onMouseDown={(e) => handleMouseDown(e, category.id)}
                onMouseLeave={handleMouseLeave}
                onMouseUp={handleMouseUp}
                onMouseMove={(e) => handleMouseMove(e, category.id)}
                onTouchStart={(e) => handleTouchStart(e, category.id)}
                onTouchMove={(e) => handleTouchMove(e, category.id)}
                onTouchEnd={handleTouchEnd}
              >
                <div className="flex gap-4 pb-4 min-w-max">
                  {category.images.map((image, index) => (
                    <div key={index} className="w-64 flex-shrink-0 opacity-0 h-1" />
                  ))}
                </div>
              </div>

              {/* Beautiful Dots Indicator */}
              <div className="flex justify-center items-center gap-3 mt-8">
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20">
                  {category.images.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentSlides(prev => ({ ...prev, [category.id]: index }))}
                      className={`transition-all duration-500 ease-out ${
                        index >= currentSlides[category.id] && index < currentSlides[category.id] + 4
                          ? 'w-3 h-3 bg-sky-400 rounded-full shadow-lg shadow-sky-400/50 scale-125' 
                          : 'w-2 h-2 bg-white/40 rounded-full hover:bg-white/60 hover:scale-110'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* CTA Section */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6 }}
        className="bg-white py-16 mt-16"
      >
        <div className="max-w-md mx-auto text-center px-4 space-y-4">
          <h3 className="text-xl font-medium text-gray-800">آماده شروع هستید؟</h3>
          <p className="text-gray-500 text-sm">همین امروز به خانواده ما بپیوندید</p>
          <div className="flex gap-3 justify-center pt-2">
            <button className="bg-sky-700 text-white text-sm px-8 py-3 rounded-xl hover:bg-sky-800 transition-colors duration-300 shadow-sm hover:shadow-md">
              ثبت‌نام در دوره‌ها
            </button>
            <button className="border border-gray-300 text-gray-600 text-sm px-8 py-3 rounded-xl hover:border-gray-400 hover:text-gray-800 transition-all duration-300">
              دریافت مشاوره
            </button>
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
        .text-shadow {
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
        }
      `}</style>
    </div>
  );
}