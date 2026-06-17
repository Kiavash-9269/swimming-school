// src/components/Footer.jsx
import { Link } from "react-router-dom";
import logo from "/logo.png.webp";
import { Navigation } from "lucide-react";

import {
  FaInstagram,
  FaTelegramPlane,
  FaPhone,
  FaMapMarkerAlt,
  FaCommentDots,
  FaPaperPlane,
} from "react-icons/fa";

// SOCIAL ICONS //
const socialIcons = [
  {
    href: "https://instagram.com/iranaustraliaswimmingclub",
    icon: <FaInstagram />,
    title: "اینستاگرام",
  },
  {
    href: "https://t.me/Hamedmobarreziaswim",
    icon: <FaTelegramPlane />,
    title: "تلگرام",
  },
  {
    href: "https://ble.ir/iran_australia_swim",
    icon: <FaCommentDots />,
    title: "بله",
  },
  {
    href: "https://eitaa.com/iran_australia_swim",
    icon: <FaPaperPlane />,
    title: "ایتا",
  },
];

// NAVIGATION LINKS //
const linkGroups = [
  {
    title: "لینک‌های کاربردی",
    links: [
      { href: "/", label: "صفحه اصلی" },
      { href: "/about", label: "درباره ما" },
      { href: "/courses", label: "دوره‌ها" },
      { href: "/gallery", label: "تصاویر" },
      { href: "/contact", label: "ارتباط با ما" },
    ],
  },
  {
    title: "پشتیبانی",
    links: [
      { href: "/support", label: "پشتیبانی" },
      { href: "/faq", label: "سوالات متداول" },
      { href: "/terms", label: "قوانین استفاده" },
      { href: "/privacy", label: "حریم خصوصی" },
    ],
  },
];

// POOLS DATA //
const addresses = [
  {
    title: "استخر سجاد",
    address: "مشهد، بلوار سجاد، حامد شمالی ۱۰، مجموعه ورزشی سجاد",
    directionLink: "https://nshn.ir/?lat=36.32169739434071&lng=59.546124377183524",
    phoneNumber: "۰۵۱۳۶۰۷۲۵۵۵",
  },
  {
    title: "استخر کوثر",
    address: "مشهد،رو به رو شاهد۷۵، مجموعه ورزشی کوثر",
    directionLink: "https://nshn.ir/?lat=36.36444112135125&lng=59.52572420239248",
    phoneNumber: "۰۵۱۳۶۲۲۵۲۵۲",
  },
];

// CONTACT PHONES //
const phones = [
  {
    label: "موبایل",
    number: "۰۹۱۵۱۱۲۵۲۵۲",
  },
];

// MAIN COMPONENT //
export default function Footer() {
  // HELPER: PERSIAN TO ENGLISH NUMBER //
  const handlePhoneCall = (phoneNumber) => {
    const persianToEnglish = {
      '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
      '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9'
    };
    const englishNumber = phoneNumber.replace(/[۰-۹]/g, (char) => persianToEnglish[char]);
    window.location.href = `tel:${englishNumber}`;
  };

  return (
    <footer className="bg-[#071826] pt-10 pb-6 px-4 md:px-6 text-white" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* GLASS CARD */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl p-6 md:p-10">
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            
            {/* SECTION 1: LOGO + SOCIAL */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <img src={logo} className="w-14 h-14 rounded-full" alt="logo" />
                <h2 className="font-bold text-lg leading-6">
                  مدرسه شنا <br /> ایران استرالیا
                </h2>
              </div>
              <p className="text-sm text-gray-300 mb-4">
                با ما در شبکه‌های اجتماعی در ارتباط باشید
              </p>
              <div className="flex gap-3">
                {socialIcons.map((item, i) => (
                  <a
                    key={i}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={item.title}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 transition"
                  >
                    <span className="text-lg text-gray-200 hover:text-sky-400 transition">
                      {item.icon}
                    </span>
                  </a>
                ))}
              </div>
            </div>

            {/* SECTION 2: NAVIGATION LINKS */}
            <div className="flex gap-8">
              {linkGroups.map((group, i) => (
                <div key={i}>
                  <h3 className="font-bold mb-4 text-sky-300 text-sm">{group.title}</h3>
                  <ul className="space-y-2">
                    {group.links.map((link, j) => (
                      <li key={j}>
                        <Link
                          to={link.href}
                          className="text-sm text-gray-300 hover:text-sky-400 flex items-center gap-2 transition"
                        >
                          <span className="text-sky-500">›</span>
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* SECTION 3: POOL ADDRESSES */}
            <div>
              <h3 className="font-bold mb-4 text-sky-300 text-sm">آدرس استخرها</h3>
              <div className="space-y-3">
                {addresses.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 p-2 rounded-xl bg-white/5 hover:bg-white/10 transition group"
                  >
                    <FaMapMarkerAlt className="text-sky-400 text-base flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-xs">{item.title}</h4>
                      <p className="text-xs text-gray-300 break-words leading-relaxed">
                        {item.address}
                      </p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0 items-center">
                      {/* CALL */}
                      <button
                        onClick={() => handlePhoneCall(item.phoneNumber)}
                        className="w-7 h-7 rounded-lg bg-green-500/20 hover:bg-green-500 flex items-center justify-center transition-all hover:scale-105"
                        title={`تماس با ${item.title}`}
                      >
                        <FaPhone className="w-3.5 h-3.5 text-green-400 hover:text-white transition" />
                      </button>
                      {/* MAP */}
                      <a
                        href={item.directionLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-7 h-7 rounded-lg bg-sky-500/20 hover:bg-sky-500 flex items-center justify-center transition-all hover:scale-105"
                        title="مشاهده مسیر در نقشه"
                      >
                        <Navigation className="w-3.5 h-3.5 text-sky-400 hover:text-white transition" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SECTION 4: CONTACT PHONES */}
            <div>
              <h3 className="font-bold mb-4 text-sky-300 text-sm">تماس با ما</h3>
              <div className="space-y-3">
                {phones.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => handlePhoneCall(item.number)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-green-500/20 group-hover:bg-green-500 flex items-center justify-center transition-all">
                      <FaPhone className="text-green-400 group-hover:text-white text-base transition" />
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">{item.label}</p>
                      <p className="text-sm text-white font-medium">
                        {item.number}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* COPYRIGHT */}
          <div className="border-t border-white/10 mt-8 pt-5 text-center">
            <p className="text-xs text-gray-400">
              © تمامی حقوق برای مدرسه شنا ایران استرالیا محفوظ است
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}