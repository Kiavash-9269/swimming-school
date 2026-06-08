import { useState, useEffect } from "react";
import { LifeBuoy, Droplets, Goal, Venus, X } from "lucide-react";
import bgHomeServices from "../../assets/images/wp2046124.jpg";

export default function ServicesSection() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState(null);

  const services = [
    {
      id: 1,
      icon: LifeBuoy,
      title: "آموزش شنا برای کودکان و بزرگسالان",
      text: "کلاس‌های تخصصی شنا برای سنین مختلف با مربیان مجرب و آموزش گام‌به‌گام از مبتدی تا پیشرفته.",
      details:
        "ما در این مجموعه دوره‌های آموزشی شنا را در سطوح مبتدی، متوسط و پیشرفته برگزار می‌کنیم. کودکان از سن ۴ سال به بالا می‌توانند در کلاس‌های ویژه کودکان شرکت کنند. دوره‌های بزرگسالان نیز شامل تکنیک‌های کرال سینه، کرال پشت، قورباغه و پروانه می‌شود. تمامی مربیان دارای مدرک بین‌المللی و کارت صلاحیت حرفه‌ای از فدراسیون شنا هستند. هر ترم ۱۲ جلسه یک‌ساعته برگزار می‌شود و در پایان به هنرجویان گواهی معتبر اعطا می‌گردد.",
    },
    {
      id: 2,
      icon: Droplets,
      title: "آب‌درمانی و تمرینات اصلاحی",
      text: "جلسات آب‌درمانی برای بهبود دردهای عضلانی و مفصلی با نظارت کارشناسان مجرب.",
      details:
        "آب‌درمانی با استفاده از خواص فیزیکی آب مانند شناوری، مقاومت و حرارت به کاهش درد و التهاب، افزایش دامنه حرکتی و تقویت عضلات کمک می‌کند. این روش برای بیماران مبتلا به آرتروز، دیسک کمر، فیبرومیالژیا، توانبخشی پس از جراحی و ورزشکاران حرفه‌ای بسیار موثر است. جلسات توسط فیزیوتراپیست‌های مجرب و با برنامه تمرینی شخصی‌سازی شده برای هر فرد انجام می‌شود. استخر آب‌گرم با دمای ۳۲-۳۴ درجه سانتی‌گراد محیطی ایده‌آل برای درمان فراهم کرده است.",
    },
    {
      id: 3,
      icon: Goal,
      title: "واترپلو",
      text: "زیر نظر مربیان منتخب ملی واتر پلو کشور | تمرین با توپ حرفه‌ای",
      details:
        "آکادمی واترپلوی ما با همکاری پیشکسوتان و مربیان تیم ملی فعالیت می‌کند. این رشته ترکیبی از شنا، سرعت، قدرت و تاکتیک‌های گروهی است. دوره‌های آموزشی در رده‌های سنی نونهالان (زیر ۱۲ سال)، نوجوانان (۱۴-۱۲ سال)، جوانان (۱۸-۱۴ سال) و بزرگسالان برگزار می‌شود. هنرجویان مستعد به تیم‌های استانی و ملی معرفی می‌شوند. تمرینات شامل تکنیک‌های شنا با توپ، شوت زنی، دریبل، دفاع و تاکتیک‌های حمله می‌باشد..",
    },
    {
      id: 4,
      icon: Venus,
      title: "مدرسه شنا ایران استرالیا | فعال در حوزه بانوان",
      text: "مدرسه شنا ایران استرالیا با بهره‌گیری از متدهای روز دنیا و مربیان قهرمان زن، خدمات تخصصی شنا را به بانوان عزیز ارائه می‌دهد.",
      details:
        "مدرسه شنا ایران استرالیا یکی از فعال‌ترین آکادمی‌های شنا در حوزه بانوان است. این مجموعه با ترکیبی از دانش روز استرالیا و تجربه مربیان حرفه‌ای ایرانی، دوره‌های تخصصی شنا را از سطح مبتدی تا حرفه‌ای برگزار می‌کند. تمامی مربیان این مجموعه از بانوان قهرمان و ملی‌پوش سابق هستند .",
    },
  ];

  const openModal = (service) => {
    setSelectedService(service);
    setModalOpen(true);
    document.body.style.overflow = "hidden";
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedService(null);
    document.body.style.overflow = "unset";
  };

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && modalOpen) {
        closeModal();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [modalOpen]);

  return (
    <>
      <section
        dir="rtl"
        className="relative w-full bg-gradient-to-r from-sky-950 via-sky-900 to-sky-950 text-white py-12 md:py-16 px-4 md:px-8 lg:px-12 overflow-hidden"
      >
        <div
          className="absolute inset-0 bg-center bg-cover opacity-20"
          style={{
            backgroundImage: `url(${bgHomeServices})`,
          }}
        ></div>

        <div className="relative grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-0 rounded-xl overflow-hidden max-w-7xl mx-auto shadow-2xl">
          {services.map((service) => {
            const IconComponent = service.icon;
            return (
              <div
                key={service.id}
                className={`group p-5 md:p-8 transition-all duration-500 backdrop-blur-sm
                  bg-white/5 hover:bg-blue-600/90 active:bg-blue-600
                  border-b sm:border-b-0 sm:border-l border-white/10 last:border-b-0 sm:last:border-l-0
                  hover:scale-105 active:scale-95 hover:z-10 hover:shadow-2xl
                  transform-gpu text-right
                  flex flex-col`}
              >
                <div className="flex justify-start mb-4 h-12 md:h-14">
                  <IconComponent className="w-8 h-8 md:w-10 md:h-10 text-blue-400" />
                </div>

                <div className="flex-1 flex flex-col">
                  <div className="h-[70px] md:h-[80px]">
                    <h3 className="text-lg md:text-xl font-bold mb-2 line-clamp-2">
                      {service.title}
                    </h3>
                  </div>

                  <div className="min-h-[4rem] md:min-h-[5rem]">
                    <p className="text-xs md:text-sm text-gray-200 mb-4 line-clamp-3">
                      {service.text}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => openModal(service)}
                  className="mt-2 w-fit px-4 md:px-5 py-1.5 md:py-2 text-xs md:text-sm font-semibold text-blue-300 bg-white/5 border border-blue-400/40 rounded-lg 
                  hover:bg-blue-500 hover:text-white hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/30 
                  active:bg-blue-600 active:scale-95
                  focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-sky-900
                  transition-all duration-300 transform hover:-translate-x-1 active:translate-x-0 cursor-pointer"
                >
                  ← بیشتر بدانید
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* مودال */}
      {modalOpen && selectedService && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-4 bg-black/70 backdrop-blur-sm transition-all duration-300"
          onClick={closeModal}
        >
          <div
            dir="rtl"
            className="relative bg-gradient-to-br from-sky-900 to-sky-800 rounded-2xl w-full max-w-[92%] sm:max-w-sm md:max-w-2xl lg:max-w-3xl max-h-[85dvh] overflow-y-auto shadow-2xl border border-blue-400/30"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeModal}
              className="absolute top-3 left-3 md:top-4 md:left-4 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2 md:p-2.5 transition-all duration-200 z-10
              focus:outline-none focus:ring-2 focus:ring-blue-400"
              aria-label="بستن"
            >
              <X className="w-5 h-5 md:w-5 md:h-5" />
            </button>

            <div className="pt-10 md:pt-12 pb-4 px-4 md:px-6 border-b border-blue-400/20 flex items-center justify-start gap-3">
              <div className="bg-blue-500/20 p-2 md:p-3 rounded-full">
                {(() => {
                  const IconComponent = selectedService.icon;
                  return (
                    <IconComponent className="w-6 h-6 md:w-7 md:h-7 text-blue-400" />
                  );
                })()}
              </div>
              <h2 className="text-lg md:text-2xl font-bold text-white">
                {selectedService.title}
              </h2>
            </div>

            <div className="p-4 md:p-6">
              <p className="text-sm md:text-base text-gray-200 leading-relaxed md:leading-8 text-justify">
                {selectedService.details}
              </p>

              <div className="mt-6 md:mt-8 flex justify-start">
                <button
                  onClick={closeModal}
                  className="px-5 md:px-6 py-2.5 md:py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg hover:shadow-blue-500/25 text-sm md:text-base
                  focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-sky-800"
                >
                  بستن
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}