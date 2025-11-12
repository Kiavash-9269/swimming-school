import React, { useState, useCallback, useMemo, lazy, Suspense } from "react";
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  Send,
  Instagram,
  PhoneCall,
  ChevronDown,
} from "lucide-react";


const ContactCard = React.memo(({ icon, title, details, link }) => (
  <div className="bg-white rounded-xl p-4 border border-sky-100 hover:border-sky-200 transition-all duration-200 shadow-sm hover:shadow-md">
    <div className="flex items-center gap-3 mb-2">
      <div className="w-9 h-9 rounded-lg bg-sky-50 flex items-center justify-center text-sky-600">
        {icon}
      </div>
      <h3 className="font-semibold text-sky-900 text-sm">{title}</h3>
    </div>
    <div className="text-sky-700 text-xs space-y-0.5">
      {details.map((d, i) => (
        <p key={i}>{d}</p>
      ))}
    </div>
    {link && (
      <a
        href={link}
        target="_blank"
        rel="noreferrer noopener"
        className="text-sky-600 hover:text-sky-800 text-xs mt-2 inline-block"
      >
        ارتباط مستقیم →
      </a>
    )}
  </div>
));


const SocialButton = React.memo(({ icon, name, link }) => (
  <a
    href={link}
    target="_blank"
    rel="noreferrer noopener"
    className="w-10 h-10 flex items-center justify-center rounded-xl bg-sky-50 text-sky-700 border border-sky-100 hover:bg-sky-100 hover:text-sky-900 transition-all duration-200"
    aria-label={name}
  >
    {icon}
  </a>
));


const FAQItem = React.memo(({ item, index, isOpen, onToggle }) => (
  <div className="bg-white border border-sky-100 rounded-xl shadow-sm overflow-hidden">
    <button
      onClick={() => onToggle(index)}
      className="w-full flex justify-between items-center p-3 text-sky-900 hover:bg-sky-50 transition-colors duration-200 text-sm font-medium"
      aria-expanded={isOpen}
    >
      <span className="text-right flex-1">{item.q}</span>
      <ChevronDown
        className={`w-4 h-4 text-sky-500 transition-transform duration-300 ${
          isOpen ? "rotate-180" : ""
        }`}
      />
    </button>
    {isOpen && (
      <div className="p-3 text-sky-700 text-xs border-t border-sky-100">
        {item.a}
      </div>
    )}
  </div>
));

const ContactForm = React.memo(
  ({ formData, onChange, onSubmit, uiState, socialMedia }) => {
    const inputClass =
      "w-full px-3 py-2 rounded-lg border border-sky-200 bg-white focus:border-sky-400 focus:ring-2 focus:ring-sky-100 outline-none text-sky-800 text-sm";

    return (
      <div className="bg-white rounded-xl shadow-sm p-4 border border-sky-100 space-y-3">
        <h2 className="text-lg font-bold text-sky-900">ارسال پیام</h2>
        <form onSubmit={onSubmit} className="space-y-3" noValidate>
          <div className="grid sm:grid-cols-2 gap-3">
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={onChange}
              placeholder="نام و نام خانوادگی"
              required
              className={inputClass}
            />
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={onChange}
              placeholder="ایمیل"
              required
              className={inputClass}
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={onChange}
              placeholder="شماره تماس"
              className={inputClass}
            />
            <select
              name="subject"
              value={formData.subject}
              onChange={onChange}
              required
              className={inputClass}
            >
              <option value="">انتخاب موضوع</option>
              <option value="registration">ثبت‌نام دوره‌ها</option>
              <option value="info">درخواست اطلاعات</option>
              <option value="feedback">پیشنهاد یا انتقاد</option>
              <option value="cooperation">همکاری</option>
            </select>
          </div>
          <textarea
            name="message"
            value={formData.message}
            onChange={onChange}
            placeholder="پیام خود را بنویسید..."
            rows="3"
            required
            className={`${inputClass} resize-none`}
          />
          {uiState.submitStatus === "success" && (
            <div className="bg-green-50 border border-green-200 text-green-700 p-2 rounded text-center text-sm">
              ✅ پیام شما ارسال شد!
            </div>
          )}
          <button
            type="submit"
            disabled={uiState.isSubmitting}
            className="w-full bg-sky-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-sky-700 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {uiState.isSubmitting ? "در حال ارسال..." : "ارسال پیام"}{" "}
            <Send className="w-4 h-4 inline-block ml-1" />
          </button>
        </form>

        
        <div className="mt-3 p-3 bg-sky-50 border border-sky-100 rounded-xl">
          <p className="text-sky-800 text-xs font-medium mb-2 text-center">
            راه‌های ارتباط سریع
          </p>
          <div className="flex justify-center gap-3">
            {socialMedia.map((s, i) => (
              <SocialButton key={i} {...s} />
            ))}
          </div>
        </div>
      </div>
    );
  }
);


const MapSection = lazy(() =>
  Promise.resolve({
    default: React.memo(() => (
      <div className="bg-white rounded-xl shadow-sm border border-sky-100 p-4">
        <h3 className="font-bold text-sky-900 text-sm mb-2">موقعیت روی نقشه</h3>
        <div className="h-36 rounded-xl overflow-hidden bg-sky-100">
          <iframe
            title="موقعیت"
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d803.6532840000618!2d59.545977654768!3d36.32168724330435!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3f6c9213c3c8a575%3A0xb16f3f211b9dffe8!2z2KfYs9iq2K7YsSDYs9is2KfYrw!5e0!3m2!1sen!2s!4v1762856992257!5m2!1sen!2s"
            width="100%"
            height="100%"
            style={{ border: 0 }}
            loading="lazy"
          />
        </div>
      </div>
    )),
  })
);

const FAQSection = lazy(() =>
  Promise.resolve({
    default: React.memo(({ faqs, openFAQ, toggleFAQ }) => (
      <section className="mt-8 max-w-4xl mx-auto space-y-2">
        <h2 className="text-xl font-bold text-sky-900 text-center mb-3">
          سوالات متداول
        </h2>
        {faqs.map((item, idx) => (
          <FAQItem
            key={idx}
            item={item}
            index={idx}
            isOpen={openFAQ === idx}
            onToggle={toggleFAQ}
          />
        ))}
      </section>
    )),
  })
);

export default function ContactUs() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [uiState, setUiState] = useState({
    isSubmitting: false,
    submitStatus: null,
    openFAQ: null,
  });

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  }, []);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    setUiState((p) => ({ ...p, isSubmitting: true }));
    setTimeout(() => {
      setUiState({
        isSubmitting: false,
        submitStatus: "success",
        openFAQ: null,
      });
      setFormData({ name: "", email: "", phone: "", subject: "", message: "" });
      setTimeout(() => setUiState((p) => ({ ...p, submitStatus: null })), 4000);
    }, 700);
  }, []);

  const toggleFAQ = useCallback(
    (idx) => setUiState((p) => ({ ...p, openFAQ: p.openFAQ === idx ? null : idx })),
    []
  );

  const contactInfo = useMemo(
    () => [
      {
        icon: <Phone className="w-4 h-4" />,
        title: "تلفن تماس",
        details: ["۰۲۱-۱۲۳۴۵۶۷۸", "۰۹۱۲-۱۲۳-۴۵۶۷"],
        link: "tel:02112345678",
      },
      {
        icon: <Mail className="w-4 h-4" />,
        title: "ایمیل",
        details: ["info@swimmingpool.com"],
        link: "mailto:info@swimmingpool.com",
      },
      {
        icon: <MapPin className="w-4 h-4" />,
        title: "آدرس",
        details: ["مشهد، بلوار سجاد", "خیابان حامد شمالی"],
        link: "https://maps.google.com",
      },
      {
        icon: <Clock className="w-4 h-4" />,
        title: "ساعات کاری",
        details: ["شنبه تا چهارشنبه: ۸ تا ۲۲", "پنجشنبه: ۸ تا ۲۰"],
      },
    ],
    []
  );

  const socialMedia = useMemo(
    () => [
      {
        icon: <Instagram className="w-4 h-4" />,
        name: "اینستاگرام",
        link: "https://instagram.com",
      },
      {
        icon: <Send className="w-4 h-4" />,
        name: "تلگرام",
        link: "https://telegram.org",
      },
      {
        icon: <PhoneCall className="w-4 h-4" />,
        name: "واتس‌اپ",
        link: "https://wa.me/989121234567",
      },
    ],
    []
  );

  const faqs = useMemo(
    () => [
      { q: "چگونه ثبت‌نام کنم؟", a: "از طریق فرم تماس یا تماس تلفنی می‌توانید ثبت‌نام کنید." },
      { q: "هزینه دوره‌ها چقدر است؟", a: "هزینه دوره‌ها بسته به سطح و نوع دوره متفاوت است." },
      { q: "آیا مربی خصوصی دارید؟", a: "بله، مربیان خصوصی حرفه‌ای برای همه سطوح و سنین موجود هستند." },
    ],
    []
  );

  return (
    <section
      dir="rtl"
      className="bg-gradient-to-b from-sky-50 via-white to-sky-50 py-10 px-4 sm:px-6 lg:px-8"
    >
      <header className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-sky-900 mb-2">
          در تماس باشید
        </h1>
        <p className="text-sm sm:text-base text-sky-700 max-w-2xl mx-auto">
          با ما در ارتباط باشید — همیشه آماده پاسخ‌گویی هستیم 🌊
        </p>
      </header>

      <div className="grid lg:grid-cols-2 gap-6 max-w-7xl mx-auto">
        {/* ستون چپ */}
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            {contactInfo.map((item, i) => (
              <ContactCard key={i} {...item} />
            ))}
          </div>
          <Suspense fallback={<div className="h-36 bg-sky-100 animate-pulse rounded-xl" />}>
            <MapSection />
          </Suspense>
        </div>

        
        <ContactForm
          formData={formData}
          onChange={handleChange}
          onSubmit={handleSubmit}
          uiState={uiState}
          socialMedia={socialMedia}
        />
      </div>

      <Suspense fallback={<div className="mt-6 h-48 bg-sky-100 animate-pulse rounded-xl" />}>
        <FAQSection faqs={faqs} openFAQ={uiState.openFAQ} toggleFAQ={toggleFAQ} />
      </Suspense>
    </section>
  );
}
