import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";


import heroPoster from "../../assets/images/swimming-pictures-2aq7n1d6lib0rt2n.jpg";

export default function HomeHero() {
  const navigate = useNavigate();

  const elements = [
    { id: 1, type: "badge" },
    { id: 2, type: "headingPart1" },
    { id: 3, type: "headingPart2" },
    { id: 4, type: "description" },
    { id: 5, type: "buttons" },
  ];

  const [visibleIds, setVisibleIds] = useState([]);

  useEffect(() => {
    const timers = elements.map((el, index) =>
      setTimeout(() => {
        setVisibleIds((prev) => [...prev, el.id]);
      }, index * 350),
    );

    return () => timers.forEach(clearTimeout);
  }, []);

  const isVisible = (id) => visibleIds.includes(id);

  return (
    <header className="relative min-h-screen overflow-hidden rtl">
      
      <video
        autoPlay
        muted
        loop
        playsInline
preload="metadata"        poster={heroPoster} 
        className="absolute inset-0 w-full h-full object-cover"
      >

        <source src="/videos/IMG_1215.mp4" type="video/mp4" />
      </video>

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-950/85 via-cyan-950/60 to-cyan-800/60" />
      <div className="absolute inset-0 bg-black/30" />

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 min-h-screen flex items-center justify-center md:justify-end">
        <div
          className="
            w-full
            max-w-sm
            sm:max-w-xl
            md:max-w-2xl
            lg:max-w-3xl
            text-white
            text-right
            ml-auto
            space-y-4
            sm:space-y-6
            md:space-y-8
          "
        >
          {/* Badge */}
          <div
            className={`
              inline-flex items-center gap-2
              bg-white/15
              backdrop-blur-md
              rounded-full
              px-4 py-2
              border border-white/20
              text-xs sm:text-sm
              transition-all duration-700 will-change-transform
              ${
                isVisible(1)
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-5"
              }
            `}
          >
            <i className="fas fa-star text-amber-400"></i>

            <span className="font-medium">برترین مدرسه شنا در خراسان رضوی</span>
          </div>

          {/* Title */}
          <h1 className="font-extrabold leading-[1.25]">
            <span
              className={`
                block
                text-3xl
                sm:text-5xl
                md:text-6xl
                xl:text-7xl
                transition-all duration-700 will-change-transform
                ${
                  isVisible(2)
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-5"
                }
              `}
            >
              مدرسه شنا ایران استرالیا
            </span>

            <span
              className={`
                block mt-2 sm:mt-4
                text-xl
                sm:text-3xl
                md:text-4xl
                lg:text-5xl
                bg-gradient-to-r
                from-cyan-200
                to-white
                bg-clip-text
                text-transparent
                transition-all duration-700 will-change-transform
                ${
                  isVisible(3)
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-5"
                }
              `}
            >
              با متود آموزشی کشور استرالیا
            </span>
          </h1>

          {/* Description */}
          <div
            className={`
              transition-all duration-700 will-change-transform
              ${
                isVisible(4)
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-5"
              }
            `}
          >
            <p
              className="
                text-sm
                sm:text-base
                md:text-lg
                lg:text-xl
                leading-7
                md:leading-8
                opacity-90
                
                text-right
              "
            >
              در مدرسه شنا ایران استرالیا، با روش‌های مدرن و ایمن هنر شنا را در
              محیطی دوستانه، حرفه‌ای و مطابق با استانداردهای بین‌المللی فرا
              بگیرید
            </p>
          </div>

          {/* Buttons */}
          <div
            className={`
              flex flex-col
              sm:flex-row-reverse
              gap-4
              justify-start
              items-start
              transition-all duration-700 will-change-transform
              ${
                isVisible(5)
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-5"
              }
            `}
          >
            <button
              onClick={() => navigate("/courses")}
              className="
                w-full
                sm:w-48
                md:w-52
                lg:w-56
                h-12
                sm:h-14
                md:h-16
                bg-sky-500
                text-white
                rounded-2xl
                font-bold
                text-base
                sm:text-lg
                shadow-xl
                transition-all
                duration-300
                hover:bg-cyan-500
                hover:scale-105
              "
            >
              شروع دوره آموزشی
            </button>

            <button
              onClick={() => navigate("/contact")}
              className="
                w-full
                sm:w-48
                md:w-52
                lg:w-56
                h-12
                sm:h-14
                md:h-16
                border-2
                border-white/40
                text-white
                rounded-2xl
                font-bold
                text-base
                sm:text-lg
                backdrop-blur-sm
                transition-all
                duration-300
                hover:bg-cyan-400
                hover:border-cyan-400
                hover:scale-105
              "
            >
              <i className="fas fa-phone-alt ml-2"></i>
              تماس با ما
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}