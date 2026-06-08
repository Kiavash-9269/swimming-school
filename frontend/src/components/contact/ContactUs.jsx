import React, { useState, useCallback, memo } from "react";
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  Send,
  Instagram,
  PhoneCall,
  ChevronDown,
  Map,
  User,
  PhoneForwarded,
  Navigation,
  MessageCircle,
  CheckCircle2,
  Sparkles,
  Users,
  Flower2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// حذف require و استفاده از import صحیح
import ManagerImage from "../../assets/images/BBC0FE2F-5758-462E-B5C9-EF4BD61CC2BE.jpeg";

const POOLS = [
  {
    id: 1,
    name: "استخر سجاد",
    address: "مشهد، بلوار سجاد، حامد شمالی ۱۰، مجموعه ورزشی سجاد",
    phone: "۰۵۱۳۶۰۷۶۵۵۵",
    phoneLink: "tel:05136076555",
    schedules: {
      menSchool: "شنبه تا چهارشنبه: ۱۶ تا ۱۸",
      womenSchool: "شنبه تا چهارشنبه: ۱۴ تا ۱۶",
      menFree: "شنبه تا چهارشنبه: ۲۰ تا ۲۲",
      womenFree: "شنبه تا چهارشنبه: ۱۰ تا ۱۳",
    },
    directionLink:
      "https://nshn.ir/?lat=36.32169739434071&lng=59.546124377183524",
    mapSrc:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d803.6532840000618!2d59.545977754768!3d36.32168724330435!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3f6c9213c3c8a575%3A0xb16f3f211b9dffe8!2z2KfYs9iq2K7YsSDYs9is2KfYrw!5e0!3m2!1sen!2s!4v1762856992257!5e0!3m2!1sen!2s",
  },
  {
    id: 2,
    name: "استخر کوثر",
    address: "مشهد، بلوار اندیشه، اندیشه ۴۸، مجموعه ورزشی کوثر",
    phone: "۰۵۱۳۶۲۲۵۲۵۲",
    phoneLink: "tel:05136225252",
    schedules: {
      menSchool: "شنبه تا چهارشنبه: ۱۷ تا ۱۹",
      womenSchool: "شنبه تا چهارشنبه: ۱۵ تا ۱۷",
      menFree: "شنبه تا چهارشنبه: ۲۱ تا ۲۳",
      womenFree: "شنبه تا چهارشنبه: ۱۱ تا ۱۴",
    },
    directionLink:
      "https://nshn.ir/?lat=36.36444112135125&lng=59.52572420239248",
    mapSrc:
      "https://www.google.com/maps?q=36.36444112135125,59.52572420239248&z=16&output=embed",
  },
];

const MANAGER_CONTACT = {
  name: "حامد مبرز",
  role: "مدیر مجموعه",
  phone: "۰۹۱۵۱۱۲۵۲۵۲",
  phoneLink: "tel:09151125252",
  image: ManagerImage,
};

const SOCIAL_MEDIA = [
  {
    icon: <Instagram className="w-4 h-4 sm:w-5 sm:h-5" />,
    name: "اینستاگرام",
    link: "https://instagram.com/iranaustraliaswimmingclub",
  },
  {
    icon: <Send className="w-4 h-4 sm:w-5 sm:h-5" />,
    name: "تلگرام",
    link: "https://t.me/iran_australia_swim",
  },
  {
    icon: <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />,
    name: "واتساپ",
    link: "https://wa.me/989151125252",
  },
];

const FAQS = [
  {
    q: "چگونه می‌توانم در دوره‌های شنا ثبت‌نام کنم؟",
    a: "از طریق تماس تلفنی یا مراجعه حضوری می‌توانید ثبت‌نام خود را انجام دهید.",
  },
  {
    q: "هزینه دوره‌ها چقدر است؟",
    a: "بسته به نوع دوره و سطح آموزش متفاوت است.",
  },
  {
    q: "آیا مربی خصوصی دارید؟",
    a: "بله، برای تمامی سنین و سطوح مربی خصوصی در دسترس است.",
  },
];

const ManagerCard = memo(() => (
  <motion.a
    href={MANAGER_CONTACT.phoneLink}
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ y: -3 }}
    className="
      relative
      overflow-hidden
      rounded-2xl sm:rounded-3xl
      bg-gradient-to-br
      from-sky-600
      via-blue-600
      to-indigo-700
      p-4 sm:p-6
      shadow-xl
      shadow-sky-900/20
      block
    "
  >
    <div className="absolute -left-8 -bottom-8 w-24 h-24 sm:w-32 sm:h-32 bg-white/10 rounded-full" />
    <div className="absolute -right-10 -top-10 w-32 h-32 sm:w-40 sm:h-40 bg-white/5 rounded-full" />

    <div className="relative flex items-center gap-3 sm:gap-4">
      <div
        className="
          w-12 h-12 sm:w-14 sm:h-14
          rounded-xl sm:rounded-2xl
          bg-white/15
          backdrop-blur
          flex
          items-center
          justify-center
          text-white
          overflow-hidden
        "
      >
        {MANAGER_CONTACT.image ? (
          <img
            src={MANAGER_CONTACT.image}
            alt={MANAGER_CONTACT.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <User className="w-6 h-6 sm:w-7 sm:h-7" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="text-white font-bold text-base sm:text-lg truncate">
          {MANAGER_CONTACT.name}
        </h3>

        <p className="text-sky-100 text-xs sm:text-sm">
          {MANAGER_CONTACT.role}
        </p>

        <div className="mt-2 sm:mt-3 flex items-center gap-2 flex-wrap">
          <Phone className="w-3 h-3 sm:w-4 sm:h-4 text-green-300" />
          <span className="text-white font-medium text-xs sm:text-sm">
            {MANAGER_CONTACT.phone}
          </span>
        </div>
      </div>

      <PhoneForwarded className="w-4 h-4 sm:w-5 sm:h-5 text-white/70 flex-shrink-0" />
    </div>
  </motion.a>
));

const PoolCard = memo(({ pool }) => (
  <motion.div
    whileHover={{ y: -4 }}
    className="
      bg-white
      rounded-2xl sm:rounded-3xl
      overflow-hidden
      border
      border-sky-100
      shadow-lg
      hover:shadow-xl
      transition-all
      duration-300
      h-full
      flex
      flex-col
    "
  >
    <div className="p-4 sm:p-5 flex-1">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2 sm:gap-3">
          <div
            className="
              w-8 h-8 sm:w-10 sm:h-10
              rounded-lg sm:rounded-xl
              bg-sky-100
              flex
              items-center
              justify-center
              flex-shrink-0
            "
          >
            <Map className="w-4 h-4 sm:w-5 sm:h-5 text-sky-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-800 text-sm sm:text-base">
              {pool.name}
            </h3>
          </div>
        </div>
      </div>

      <div className="space-y-2 sm:space-y-3 mb-3 sm:mb-4">
        <div className="flex items-start gap-2">
          <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-sky-500 mt-0.5 flex-shrink-0" />
          <span className="text-xs sm:text-sm text-gray-600 break-words">
            {pool.address}
          </span>
        </div>
      </div>

      <div className="mb-3 sm:mb-4 space-y-1.5 sm:space-y-2">
        <div className="text-xs sm:text-sm w-full space-y-1.5 sm:space-y-2">
          {/* مدرسه شنا آقایان */}
          <div className="bg-blue-50 rounded-lg sm:rounded-xl p-1.5 sm:p-2">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
              <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-600" />
              <span className="text-[10px] sm:text-xs font-bold text-blue-700">
                مدرسه شنا (آقایان)
              </span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 text-gray-600">
              <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span className="text-[10px] sm:text-xs">
                {pool.schedules.menSchool}
              </span>
            </div>
          </div>

          {/* مدرسه شنا بانوان */}
          <div className="bg-pink-50 rounded-lg sm:rounded-xl p-1.5 sm:p-2">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
              <Flower2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-pink-600" />
              <span className="text-[10px] sm:text-xs font-bold text-pink-700">
                مدرسه شنا (بانوان)
              </span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 text-gray-600">
              <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span className="text-[10px] sm:text-xs">
                {pool.schedules.womenSchool}
              </span>
            </div>
          </div>

          {/* سانس آزاد آقایان */}
          <div className="bg-blue-50 rounded-lg sm:rounded-xl p-1.5 sm:p-2">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
              <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-600" />
              <span className="text-[10px] sm:text-xs font-bold text-blue-700">
                سانس آزاد (آقایان)
              </span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 text-gray-600">
              <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span className="text-[10px] sm:text-xs">
                {pool.schedules.menFree}
              </span>
            </div>
          </div>

          {/* سانس آزاد بانوان */}
          <div className="bg-pink-50 rounded-lg sm:rounded-xl p-1.5 sm:p-2">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
              <Flower2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-pink-600" />
              <span className="text-[10px] sm:text-xs font-bold text-pink-700">
                سانس آزاد (بانوان)
              </span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 text-gray-600">
              <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span className="text-[10px] sm:text-xs">
                {pool.schedules.womenFree}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3 sm:mb-4">
        <a
          href={pool.phoneLink}
          className="
            flex
            items-center
            justify-center
            gap-1.5 sm:gap-2
            py-2 sm:py-3
            rounded-lg sm:rounded-xl
            bg-green-500
            text-white
            text-xs sm:text-sm
            font-medium
            hover:bg-green-600
            transition
          "
        >
          <Phone className="w-3 h-3 sm:w-4 sm:h-4" />
          تماس
        </a>

        <a
          href={pool.directionLink}
          target="_blank"
          rel="noopener noreferrer"
          className="
            flex
            items-center
            justify-center
            gap-1.5 sm:gap-2
            py-2 sm:py-3
            rounded-lg sm:rounded-xl
            bg-sky-500
            text-white
            text-xs sm:text-sm
            font-medium
            hover:bg-sky-600
            transition
          "
        >
          <Navigation className="w-3 h-3 sm:w-4 sm:h-4" />
          مسیر
        </a>
      </div>

      <div className="h-32 sm:h-48 rounded-lg sm:rounded-2xl overflow-hidden border border-sky-100">
        <iframe
          title={pool.name}
          src={pool.mapSrc}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          loading="lazy"
        />
      </div>
    </div>
  </motion.div>
));

const SocialButton = memo(({ icon, name, link }) => (
  <motion.a
    whileHover={{ y: -3, scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    href={link}
    target="_blank"
    rel="noreferrer noopener"
    aria-label={name}
    className="
      w-10 h-10 sm:w-12 sm:h-12
      rounded-xl sm:rounded-2xl
      bg-sky-50
      border
      border-sky-100
      flex
      items-center
      justify-center
      text-sky-700
      hover:bg-sky-500
      hover:text-white
      hover:border-sky-500
      transition-all
      duration-300
    "
  >
    {icon}
  </motion.a>
));

const FAQItem = memo(({ item, index, isOpen, onToggle }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.05 }}
    className="
      bg-white
      rounded-xl sm:rounded-2xl
      overflow-hidden
      border
      border-sky-100
      shadow-sm
    "
  >
    <button
      onClick={() => onToggle(index)}
      className="
        w-full
        flex
        items-center
        justify-between
        p-3 sm:p-5
        text-right
        gap-2
      "
    >
      <span className="font-medium text-gray-800 text-xs sm:text-sm flex-1">
        {item.q}
      </span>

      <ChevronDown
        className={`
          w-3 h-3 sm:w-4 sm:h-4
          text-sky-500
          transition-transform
          duration-300
          flex-shrink-0
          ${isOpen ? "rotate-180" : ""}
        `}
      />
    </button>

    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="border-t border-sky-100"
        >
          <div className="p-3 sm:p-5 text-xs sm:text-sm text-gray-600 leading-6 sm:leading-7">
            {item.a}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </motion.div>
));

const FAQSection = memo(({ openFAQ, toggleFAQ }) => (
  <section className="mt-12 sm:mt-16 mb-8 sm:mb-10 max-w-4xl mx-auto px-2 sm:px-0">
    <div className="text-center mb-6 sm:mb-8">
      <h2 className="text-xl sm:text-2xl font-bold text-white">
        سوالات متداول
      </h2>

      <div className="w-12 sm:w-16 h-px bg-white/20 mx-auto mt-2 sm:mt-3"></div>
    </div>

    <div className="space-y-2 sm:space-y-3">
      {FAQS.map((item, idx) => (
        <FAQItem
          key={idx}
          item={item}
          index={idx}
          isOpen={openFAQ === idx}
          onToggle={toggleFAQ}
        />
      ))}
    </div>
  </section>
));

export default function ContactUs() {
  const [uiState, setUiState] = useState({
    openFAQ: null,
  });

  const toggleFAQ = useCallback(
    (idx) =>
      setUiState((prev) => ({
        ...prev,
        openFAQ: prev.openFAQ === idx ? null : idx,
      })),
    [],
  );

  return (
    <div
      dir="rtl"
      className="
        min-h-screen
        bg-sky-950
        pt-16 sm:pt-20 md:pt-24
        pb-8 sm:pb-10
        px-3 sm:px-4 md:px-6
      "
    >
      <div className="w-full max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6 sm:mb-8 md:mb-12"
        >
          <header>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-medium text-white mb-3 sm:mb-4">
              تماس با ما
            </h1>

            <div className="w-12 sm:w-16 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent mx-auto mb-3 sm:mb-4"></div>

            <p className="text-gray-300 max-w-2xl mx-auto px-2 sm:px-4 text-xs sm:text-sm md:text-base">
              با ما در ارتباط باشید، همیشه آماده پاسخگویی و راهنمایی شما هستیم
            </p>
          </header>
        </motion.div>

        <div className="grid lg:grid-cols-12 gap-4 sm:gap-6">
          <div className="lg:col-span-7 space-y-4 sm:space-y-5 order-2 lg:order-1">
            <div>
              <div className="flex items-center gap-2 mb-2 sm:mb-3">
                <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-sky-400" />
                <h2 className="text-white font-semibold text-sm sm:text-base">
                  مدیریت مجموعه
                </h2>
              </div>

              <ManagerCard />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2 sm:mb-3">
                <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-sky-400" />
                <h2 className="text-white font-semibold text-sm sm:text-base">
                  شعب مجموعه
                </h2>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
                {POOLS.map((pool) => (
                  <PoolCard key={pool.id} pool={pool} />
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 order-1 lg:order-2">
            <div
              className="
                bg-white
                rounded-2xl sm:rounded-3xl
                shadow-xl
                shadow-sky-900/5
                p-4 sm:p-6
                border
                border-sky-100
                space-y-4 sm:space-y-5
                lg:sticky
                lg:top-24
              "
            >
              <div className="text-center">
                <h2 className="text-lg sm:text-xl font-bold text-sky-900">
                  راه‌های ارتباطی
                </h2>

                <p className="text-sky-600 text-xs sm:text-sm mt-1">
                  سریع‌ترین راه ارتباط با مجموعه
                </p>
              </div>

              {/* ایمیل */}
              <motion.a
                href="mailto:IranAustraliaswimmingclub@gmail.com"
                whileHover={{ scale: 1.02 }}
                className="
                  flex
                  items-center
                  gap-3 sm:gap-4
                  p-3 sm:p-4
                  rounded-xl sm:rounded-2xl
                  bg-sky-50
                  border
                  border-sky-100
                "
              >
                <div
                  className="
                    w-10 h-10 sm:w-12 sm:h-12
                    rounded-xl sm:rounded-2xl
                    bg-sky-500
                    flex
                    items-center
                    justify-center
                  "
                >
                  <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-[10px] sm:text-xs text-sky-600">
                    پست الکترونیک
                  </p>

                  <p className="text-sky-900 font-medium text-xs sm:text-sm truncate">
                    IranAustraliaswimmingclub@gmail.com
                  </p>
                </div>
              </motion.a>

              {/* شبکه‌های اجتماعی */}
              <div
                className="
                  p-3 sm:p-5
                  rounded-xl sm:rounded-2xl
                  bg-sky-50
                  border
                  border-sky-100
                "
              >
                <p className="text-center text-sky-800 text-xs sm:text-sm font-medium mb-3 sm:mb-4">
                  ما را در شبکه‌های اجتماعی دنبال کنید
                </p>

                <div className="flex justify-center gap-2 sm:gap-3">
                  {SOCIAL_MEDIA.map((item, i) => (
                    <SocialButton key={i} {...item} />
                  ))}
                </div>
              </div>

              {/* ویژگی‌ها */}
              <div className="pt-1 sm:pt-2 space-y-2 sm:space-y-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0" />
                  <span className="text-xs sm:text-sm text-sky-900">
                    پاسخگویی سریع و مستقیم
                  </span>
                </div>

                <div className="flex items-center gap-2 sm:gap-3">
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0" />
                  <span className="text-xs sm:text-sm text-sky-900">
                    مربیان حرفه‌ای و باتجربه
                  </span>
                </div>

                <div className="flex items-center gap-2 sm:gap-3">
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0" />
                  <span className="text-xs sm:text-sm text-sky-900">
                    آموزش برای تمامی سنین
                  </span>
                </div>

                <div className="flex items-center gap-2 sm:gap-3">
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0" />
                  <span className="text-xs sm:text-sm text-sky-900">
                    محیط استاندارد و ایمن
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <FAQSection openFAQ={uiState.openFAQ} toggleFAQ={toggleFAQ} />
      </div>
    </div>
  );
}
