import { useEffect, useState } from "react";
import headerBg from "../../assets/images/swimming-pictures-2aq7n1d6lib0rt2n.jpg";

export default function HomeHero() {
  
  const elements = [
    { id: 1, type: "badge" },
    { id: 2, type: "headingPart1" },
    { id: 3, type: "headingPart2" }, 
    { id: 4, type: "description" },
    { id: 5, type: "buttons" },
    { id: 6, type: "stats" },
  ];

  const [visibleIds, setVisibleIds] = useState([]);

  useEffect(() => {
    elements.forEach((el, index) => {
      setTimeout(() => {
        setVisibleIds(prev => [...prev, el.id]);
      }, index * 400);
    });
  }, []);پ

  const isVisible = (id) => visibleIds.includes(id);
  return (
    <header className="relative h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-cyan-700 overflow-hidden rtl">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${headerBg})` }}
      ></div>
      <div className="absolute inset-0 bg-gradient-to-r from-blue-900/70 to-cyan-700/50"></div>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-900/20 to-blue-900/80"></div>
      <div className="relative z-10 container mx-auto px-4 h-full flex flex-col-reverse md:flex-row-reverse items-center">
        <div className="max-w-2xl text-white text-right space-y-6">
          <div className={`inline-flex items-center space-x-2 space-x-reverse bg-white/20 backdrop-blur-lg rounded-full px-4 py-2 mb-6 border border-white/30 transition-all duration-700 transform ${isVisible(1) ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`}>
            <i className="fas fa-star text-amber-400"></i>
            <span className="text-sm font-medium">برترین مدرسه شنا در ایران</span>
          </div>
          <h1 className="text-5xl lg:text-6xl font-bold leading-tight space-y-2">
            <span className={`block transition-all duration-700 transform ${isVisible(2) ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`}>
              ایران استرالیا
            </span>
            <span className={`block text-4xl text-cyan-300 bg-gradient-to-r from-cyan-300 to-cyan-100 bg-clip-text text-transparent transition-all duration-700 transform ${isVisible(3) ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`}>
              با بهترین مربیان
            </span>
          </h1>

          
          <div className={`transition-all duration-700 transform ${isVisible(4) ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`}>
            <p className="text-xl opacity-90 leading-relaxed max-w-lg">
              در مدرسه شنا ایران استرالیا، با روش‌های مدرن و ایمن، هنر شنا را در محیطی دوستانه و حرفه‌ای فرا بگیرید
            </p>
          </div>

          {/* CTA Buttons */}
          <div className={`flex flex-col sm:flex-row items-center justify-center gap-4 transition-all duration-700 transform ${isVisible(5) ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`}>
  <button className="w-48 h-14 bg-cyan-500 text-white rounded-2xl font-bold text-lg shadow-md transition-all duration-300 transform hover:bg-[#00bcd4] hover:shadow-lg hover:-translate-y-0.5">
    شروع دوره آموزشی
  </button>
  <button className="w-48 h-14 border-2 border-white/40 text-white rounded-2xl font-bold text-lg backdrop-blur-sm transition-all duration-300 transform hover:bg-[#00bcd4] hover:border-[#00bcd4] hover:-translate-y-0.5">
    <i className="fas fa-phone-alt ml-2"></i>
    تماس با ما
  </button>
</div>



          {/* Stats */}
          <div className={`grid grid-cols-3 gap-8 pt-8 border-t border-white/30 backdrop-blur-sm bg-white/10 rounded-2xl p-6 transition-all duration-700 transform ${isVisible(6) ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`}>
            <div className="text-center">
              <div className="text-3xl font-bold text-cyan-300">۵۰۰+</div>
              <div className="text-sm opacity-80 mt-1">شاگرد فعال</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-cyan-300">۱۵</div>
              <div className="text-sm opacity-80 mt-1">مربی حرفه‌ای</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-cyan-300">۹۸٪</div>
              <div className="text-sm opacity-80 mt-1">رضایت‌مندی</div>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
}
