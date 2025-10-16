import { LifeBuoy, Waves, ShieldCheck, CreditCard } from "lucide-react";
import bgHomeServices from "../../assets/images/wp2046124.jpg";

export default function ServicesSection() {
  const services = [
    {
      icon: <LifeBuoy className="w-10 h-10 text-blue-400" />,
      title: "آموزش شنا برای کودکان و بزرگسالان",
      text: "کلاس‌های تخصصی شنا برای سنین مختلف با مربیان مجرب و آموزش گام‌به‌گام از مبتدی تا پیشرفته.",
    },
    {
      icon: <Waves className="w-10 h-10 text-blue-400" />,
      title: "آب‌درمانی و تمرینات اصلاحی",
      text: "جلسات آب‌درمانی برای بهبود دردهای عضلانی و مفصلی با نظارت کارشناسان مجرب.",
    },
    {
      icon: <ShieldCheck className="w-10 h-10 text-blue-400" />,
      title: "ایمنی و نجات‌غریق",
      text: "آموزش اصول ایمنی در آب و دوره‌های نجات‌غریق با مدرک معتبر بین‌المللی.",
    },
    {
      icon: <CreditCard className="w-10 h-10 text-blue-400" />,
      title: "ثبت‌نام و پرداخت اقساطی",
      text: "امکان ثبت‌نام آنلاین و پرداخت شهریه به‌صورت اقساطی برای راحتی شما.",
    },
  ];

  return (
    <section
      dir="rtl"
      className="relative w-full bg-gradient-to-r from-sky-950 via-sky-900 to-sky-950 text-white py-16 px-6 md:px-12 overflow-hidden"
    >

      <div
        className="absolute inset-0 bg-center bg-cover opacity-20"
        style={{
          backgroundImage: `url(${bgHomeServices})`,
        }}
      ></div>

      <div className="relative flex flex-col md:flex-row items-stretch justify-center rounded-xl overflow-hidden max-w-7xl mx-auto shadow-2xl">
        {services.map((service, index) => (
          <div
            key={index}
            className={`group flex-1 p-8 cursor-pointer transition-all duration-500 backdrop-blur-sm
              bg-white/5 hover:bg-blue-600/90 flex flex-col justify-between
              border-l border-white/10 last:border-l-0
              hover:scale-105 hover:z-10 hover:shadow-2xl
              transform-gpu text-right`}
          >
            <div className="flex justify-start mb-4">{service.icon}</div>
            <div>
              <h3 className="text-xl font-bold mb-2">{service.title}</h3>
              <p className="text-sm text-gray-200 mb-4">{service.text}</p>
            </div>
            <div className="text-sm font-semibold text-blue-300 group-hover:text-white transition transform group-hover:-translate-x-2">
              ← بیشتر بدانید
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
