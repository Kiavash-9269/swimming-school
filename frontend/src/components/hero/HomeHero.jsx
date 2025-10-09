import headerBg from "../../assets/images/swimming-pictures-2aq7n1d6lib0rt2n.jpg";

export default function HomeHero() {
    return (
        <header className="relative h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-cyan-700 overflow-hidden rtl">
            {/* Background Image */}
            <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: `url(${headerBg})` }}
            ></div>

            {/* Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-900/70 to-cyan-700/50"></div>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-900/20 to-blue-900/80"></div>

            {/* Content */}
            <div className="relative z-10 container mx-auto px-4 h-full flex flex-col-reverse md:flex-row-reverse items-center">
                <div className="max-w-2xl text-white text-right">
                    {/* Badge */}
                    <div className="inline-flex items-center space-x-2 space-x-reverse bg-white/20 backdrop-blur-lg rounded-full px-4 py-2 mb-6 border border-white/30">
                        <i className="fas fa-star text-amber-400"></i>
                        <span className="text-sm font-medium">برترین مدرسه شنا در ایران</span>
                    </div>

                    {/* Main Heading */}
                    <h1 className="text-5xl lg:text-6xl font-bold leading-tight mb-6">
                        یادگیری شنا
                        <span className="block text-4xl text-cyan-300 bg-gradient-to-r from-cyan-300 to-cyan-100 bg-clip-text text-transparent">
                            با بهترین مربیان
                        </span>
                    </h1>

                    {/* Description */}
                    <p className="text-xl opacity-90 mb-8 leading-relaxed max-w-lg">
                        در مدرسه شنا ایران استرالیا، با روش‌های مدرن و ایمن، هنر شنا را در محیطی دوستانه و حرفه‌ای فرا بگیرید
                    </p>

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 mb-12">
                        <button className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1">
                            شروع دوره آموزشی
                        </button>
                        <button className="border-2 border-white/40 hover:border-white text-white px-8 py-4 rounded-2xl font-bold text-lg backdrop-blur-sm hover:bg-white/10 transition-all transform hover:-translate-y-1">
                            <i className="fas fa-phone-alt ml-2"></i>
                            تماس با ما
                        </button>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-8 pt-8 border-t border-white/30 backdrop-blur-sm bg-white/10 rounded-2xl p-6">
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

            {/* Scroll Down Indicator */}
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10">
                <div className="animate-bounce bg-white/20 backdrop-blur-sm rounded-full p-3">
                    <i className="fas fa-chevron-down text-white text-xl"></i>
                </div>
            </div>

            {/* Decorative Waves */}
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-blue-900/30 to-transparent"></div>
            <div className="absolute -bottom-10 left-0 right-0 h-20 bg-white/5 rounded-t-full"></div>
        </header>

    );
}