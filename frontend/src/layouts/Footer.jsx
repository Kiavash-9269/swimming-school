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

const socialIcons = [
  {
    href: "https://instagram.com/iranaustraliaswimmingclub",
    icon: <FaInstagram />,
    title: "اینستاگرام",
  },
  {
    href: "https://t.me/iran_australia_swim",
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

// آدرس استخرها با لینک مسیر - برگرفته از ContactUs
const addresses = [
  {
    title: "استخر سجاد",
    address: "مشهد، بلوار سجاد، حامد شمالی، امین ۹، مجموعه ورزشی سجاد",
    directionLink: "https://nshn.ir/?lat=36.32169739434071&lng=59.546124377183524",
  },
  {
    title: "استخر کوثر",
    address: "مشهد، بلوار اندیشه، اندیشه ۴۸، مجموعه ورزشی کوثر",
    directionLink: "https://nshn.ir/?lat=36.36444112135125&lng=59.52572420239248",
  },
];

const phones = [
  {
    label: "موبایل",
    number: "09151125252",
  },
];

const landlines = [
  {
    label: "تلفن ثابت استخر سجاد",
    number: "05136076555",
  },
  {
    label: "تلفن ثابت استخر کوثر",
    number: "05136225252",
  },
];

export default function Footer() {
  return (
    <footer className="bg-[#071826] pt-10 pb-6 px-4 md:px-6 text-white" dir="rtl">

      {/* container */}
      <div className="max-w-7xl mx-auto">

        {/* glass card */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl p-6 md:p-10">

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">

            {/* Logo */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <img src={logo} className="w-14 h-14 rounded-full" />
                <h2 className="font-bold text-lg leading-6">
                  مدرسه شنا <br /> ایران استرالیا
                </h2>
              </div>

              <p className="text-sm text-gray-300">
                با ما در شبکه‌های اجتماعی در ارتباط باشید
              </p>

              {/* Socials */}
              <div className="flex gap-3 mt-5">
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

            {/* Links */}
            <div className="flex gap-10">
              {linkGroups.map((group, i) => (
                <div key={i}>
                  <h3 className="font-bold mb-4 text-sky-300">
                    {group.title}
                  </h3>

                  <ul className="space-y-3">
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

            {/* Addresses with direction link */}
            <div>
              <h3 className="font-bold mb-4 text-sky-300">
                آدرس استخرها
              </h3>

              <div className="space-y-4">
                {addresses.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition group"
                  >
                    <FaMapMarkerAlt className="text-sky-400 text-xl flex-shrink-0" />

                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm">
                        {item.title}
                      </h4>
                      <p className="text-sm text-gray-300 break-words">
                        {item.address}
                      </p>
                    </div>

                    {/* دکمه مسیر (نشان) */}
                    <a
                      href={item.directionLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="
                        flex-shrink-0
                        w-8 h-8
                        rounded-lg
                        bg-sky-500/20
                        hover:bg-sky-500
                        flex
                        items-center
                        justify-center
                        transition-all
                        duration-300
                        group-hover:scale-105
                      "
                      title="مشاهده مسیر در نقشه"
                    >
                      <Navigation className="w-4 h-4 text-sky-400 hover:text-white transition" />
                    </a>
                  </div>
                ))}
              </div>
            </div>

            {/* Contact */}
            <div>
              <h3 className="font-bold mb-4 text-sky-300">
                تماس با ما
              </h3>

              {/* موبایل */}
              <div className="space-y-3 mb-4">
                {phones.map((item, i) => (
                  <a
                    key={i}
                    href={`tel:${item.number}`}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition"
                  >
                    <FaPhone className="text-sky-400 text-xl flex-shrink-0" />

                    <div>
                      <p className="text-xs text-gray-400">
                        {item.label}
                      </p>
                      <p className="text-sm text-white">
                        {item.number}
                      </p>
                    </div>
                  </a>
                ))}
              </div>

              {/* خط جداکننده */}
              <div className="border-t border-white/10 my-3"></div>

              {/* تلفن‌های ثابت استخرها */}
              <div className="space-y-3">
                <p className="text-xs text-sky-400 mb-2">تلفن‌های ثابت استخرها</p>
                {landlines.map((item, i) => (
                  <a
                    key={i}
                    href={`tel:${item.number}`}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition"
                  >
                    <FaPhone className="text-sky-400 text-xl flex-shrink-0" />

                    <div>
                      <p className="text-xs text-gray-400">
                        {item.label}
                      </p>
                      <p className="text-sm text-white">
                        {item.number}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            </div>

          </div>

          {/* bottom */}
          <div className="border-t border-white/10 mt-10 pt-5 text-center">
            <p className="text-xs text-gray-400">
              © تمامی حقوق برای مدرسه شنا ایران استرالیا محفوظ است
            </p>
          </div>

        </div>
      </div>
    </footer>
  );
}