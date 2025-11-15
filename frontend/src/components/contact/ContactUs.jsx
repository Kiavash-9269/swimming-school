import React, { useState, useCallback, lazy, Suspense } from "react";
import { Phone, Mail, MapPin, Clock, Send, Instagram, PhoneCall, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";

// Sample contact info

const CONTACT_INFO = [
  { icon: <Phone className="w-5 h-5" />, title: "تلفن تماس", details: ["۰۲۱-۱۲۳۴۵۶۷۸", "۰۹۱۲-۱۲۳-۴۵۶۷"], link: "tel:02112345678" },
  { icon: <Mail className="w-5 h-5" />, title: "ایمیل", details: ["info@swimmingpool.com"], link: "mailto:info@swimmingpool.com" },
  { icon: <MapPin className="w-5 h-5" />, title: "آدرس", details: ["مشهد، بلوار سجاد", "خیابان حامد شمالی"], link: "https://maps.google.com" },
  { icon: <Clock className="w-5 h-5" />, title: "ساعات کاری", details: ["شنبه تا چهارشنبه: ۸ تا ۲۲", "پنجشنبه: ۸ تا ۲۰"] },
];

// Sample social media

const SOCIAL_MEDIA = [
  { icon: <Instagram className="w-4 h-4" />, name: "اینستاگرام", link: "https://instagram.com" },
  { icon: <Send className="w-4 h-4" />, name: "تلگرام", link: "https://telegram.org" },
  { icon: <PhoneCall className="w-4 h-4" />, name: "واتس‌اپ", link: "https://wa.me/989121234567" },
];

// Sample FAQ

const FAQS = [
  { q: "چگونه می‌توانم در دوره‌های شنا ثبت‌نام کنم؟", a: "می‌توانید از طریق فرم تماس، تماس تلفنی یا مراجعه حضوری به استخر ثبت‌نام کنید." },
  { q: "هزینه دوره‌های آموزش شنا چقدر است؟", a: "هزینه دوره‌ها بسته به سطح و نوع دوره متفاوت است. برای اطلاعات دقیق با ما تماس بگیرید." },
  { q: "آیا مربی خصوصی برای تمام سنین دارید؟", a: "بله، مربیان خصوصی حرفه‌ای برای همه سطوح و سنین موجود هستند." },
];

// Skeleton loader

const SkeletonBox = ({ className }) => <div className={`bg-sky-100 animate-pulse rounded-2xl ${className}`} />;

// Contact card component

const ContactCard = React.memo(({ icon, title, details, link }) => (
  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -2 }} className="bg-white rounded-2xl p-4 border border-sky-200 hover:border-sky-300 transition-all duration-300 shadow-sm hover:shadow-md">
    <div className="flex items-center gap-3 mb-2">
      <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center text-sky-600">{icon}</div>
      <h3 className="font-semibold text-sky-900 text-sm">{title}</h3>
    </div>
    <div className="text-sky-700 text-xs space-y-0.5">{details.map((d, i) => <p key={i}>{d}</p>)}</div>
    {link && <a href={link} target="_blank" rel="noreferrer noopener" className="text-sky-600 hover:text-sky-800 text-xs mt-2 inline-block transition-colors duration-200">ارتباط مستقیم →</a>}
  </motion.div>
));


// Social button component

const SocialButton = React.memo(({ icon, name, link }) => (
  <motion.a whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} href={link} target="_blank" rel="noreferrer noopener" className="w-10 h-10 flex items-center justify-center rounded-xl bg-sky-100 text-sky-700 border border-sky-200 hover:bg-sky-200 hover:text-sky-900 transition-all duration-200 shadow-sm" aria-label={name}>
    {icon}
  </motion.a>
));

// FAQ item component

const FAQItem = React.memo(({ item, index, isOpen, onToggle }) => (
  <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-sky-200 rounded-2xl shadow-sm overflow-hidden">
    <button onClick={() => onToggle(index)} className="w-full flex justify-between items-center p-4 text-sky-900 hover:bg-sky-50 transition-colors duration-200 text-sm font-medium" aria-expanded={isOpen}>
      <span className="text-right flex-1">{item.q}</span>
      <ChevronDown className={`w-4 h-4 text-sky-500 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
    </button>
    {isOpen && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="p-4 text-sky-700 text-xs border-t border-sky-100">{item.a}</motion.div>}
  </motion.div>
));

// Lazy loaded sections

const MapSection = lazy(() => Promise.resolve({ default: React.memo(() => (
  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-sm border border-sky-200 p-4">
    <h3 className="font-bold text-sky-900 text-sm mb-3">موقعیت روی نقشه</h3>
    <div className="h-48 rounded-xl overflow-hidden bg-sky-100 border border-sky-200">
      <iframe title="Location" src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d803.6532840000618!2d59.545977754768!3d36.32168724330435!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3f6c9213c3c8a575%3A0xb16f3f211b9dffe8!2z2KfYs9iq2K7YsSDYs9is2KfYrw!5e0!3m2!1sen!2s!4v1762856992257!5m2!1sen!2s" width="100%" height="100%" style={{ border: 0 }} loading="lazy" />
    </div>
  </motion.div>
))}));

const FAQSection = lazy(() => Promise.resolve({ default: React.memo(({ openFAQ, toggleFAQ }) => (
  <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-12 mb-12 max-w-4xl mx-auto space-y-3">
    <h2 className="text-xl font-bold text-white text-center mb-4">سوالات متداول</h2>
      <div className="w-16 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent mx-auto mb-4"></div>
    {FAQS.map((item, idx) => <FAQItem key={idx} item={item} index={idx} isOpen={openFAQ === idx} onToggle={toggleFAQ} />)}
  </motion.section>
))}));

// Main ContactUs component

export default function ContactUs() {
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
  const [uiState, setUiState] = useState({ isSubmitting: false, submitStatus: null, openFAQ: null });

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  }, []);

  // Validation rules

  const emailRegex = /\S+@\S+\.\S+/;
  const phoneRegex = /^(?:\+98|0)?9\d{9}$/; 

  const emailValid = emailRegex.test(formData.email);
  const phoneValid = !formData.phone || phoneRegex.test(formData.phone); // optional phone
  const isFormValid = formData.name && formData.email && formData.subject && formData.message && emailValid && phoneValid;

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!isFormValid) return;

    setUiState((p) => ({ ...p, isSubmitting: true, submitStatus: null }));

    try {
      // TODO: Replace with real backend endpoint
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("ارسال پیام با خطا مواجه شد");

      setUiState({ isSubmitting: false, submitStatus: "success", openFAQ: null });
      setFormData({ name: "", email: "", phone: "", subject: "", message: "" });
      setTimeout(() => setUiState((p) => ({ ...p, submitStatus: null })), 4000);
    } catch (error) {
      console.error(error);
      setUiState({ isSubmitting: false, submitStatus: "error", openFAQ: null });
      setTimeout(() => setUiState((p) => ({ ...p, submitStatus: null })), 4000);
    }
  }, [formData, isFormValid]);

  const toggleFAQ = useCallback((idx) => setUiState((p) => ({ ...p, openFAQ: p.openFAQ === idx ? null : idx })), []);

  // Render

  return (
    <div dir="rtl" className="min-h-screen bg-sky-950 p-4 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-7xl">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="px-4 pt-8 max-w-7xl mx-auto text-center">
          <header className="text-center mb-8 md:mb-12">
            <h1 className="text-3xl md:text-4xl font-medium text-white mb-4">تماس با ما</h1>
            <div className="w-16 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent mx-auto mb-4"></div>
            <p className="text-gray-300 max-w-2xl mx-auto">با ما در ارتباط باشید , همیشه آماده پاسخگویی و راهنمایی شما هستیم</p>
          </header>
        </motion.div>

        {/* Contact info + Map */}
        <div className="grid lg:grid-cols-2 gap-6 max-w-7xl mx-auto">
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">{CONTACT_INFO.map((item, i) => <ContactCard key={i} {...item} />)}</div>
            <Suspense fallback={<SkeletonBox className="h-48" />}>
              <MapSection />
            </Suspense>
          </div>

          {/* Contact Form */}
          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="bg-white rounded-2xl shadow-sm p-6 border border-sky-200 space-y-4">
            <h2 className="text-xl font-bold text-sky-900">ارسال پیام</h2>
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="grid sm:grid-cols-2 gap-4">
                <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="نام و نام خانوادگی" required className="w-full px-4 py-3 rounded-xl border border-sky-200 bg-white focus:border-sky-400 focus:ring-2 focus:ring-sky-100 outline-none text-sky-800 text-sm transition-all duration-200 hover:shadow-sm" />
                <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="ایمیل" required className="w-full px-4 py-3 rounded-xl border border-sky-200 bg-white focus:border-sky-400 focus:ring-2 focus:ring-sky-100 outline-none text-sky-800 text-sm transition-all duration-200 hover:shadow-sm" />
              </div>

              {!emailValid && formData.email && <p className="text-red-600 text-xs">ایمیل وارد شده معتبر نیست.</p>}

              <div className="grid sm:grid-cols-2 gap-4">
                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="شماره تماس" className="w-full px-4 py-3 rounded-xl border border-sky-200 bg-white focus:border-sky-400 focus:ring-2 focus:ring-sky-100 outline-none text-sky-800 text-sm transition-all duration-200 hover:shadow-sm text-right" />
                <select name="subject" value={formData.subject} onChange={handleChange} required className="w-full px-4 py-3 rounded-xl border border-sky-200 bg-white focus:border-sky-400 focus:ring-2 focus:ring-sky-100 outline-none text-sky-800 text-sm transition-all duration-200 hover:shadow-sm">
                  <option value="">انتخاب موضوع</option>
                  <option value="registration">ثبت‌نام دوره‌ها</option>
                  <option value="info">درخواست اطلاعات</option>
                  <option value="feedback">پیشنهاد یا انتقاد</option>
                  <option value="cooperation">همکاری</option>
                </select>
              </div>

              {!phoneValid && formData.phone && <p className="text-red-600 text-xs">شماره موبایل معتبر نیست.</p>}

              <textarea name="message" value={formData.message} onChange={handleChange} placeholder="پیام خود را بنویسید..." rows="4" required className="w-full px-4 py-3 rounded-xl border border-sky-200 bg-white focus:border-sky-400 focus:ring-2 focus:ring-sky-100 outline-none text-sky-800 text-sm transition-all duration-200 hover:shadow-sm resize-none" />

              {/* Success/Error messages */}
              {uiState.submitStatus === "success" && <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-xl text-center text-sm">✅ پیام شما با موفقیت ارسال شد!</motion.div>}
              {uiState.submitStatus === "error" && <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-center text-sm">⚠️ مشکلی در ارسال پیام رخ داد. دوباره تلاش کنید.</motion.div>}

              {/* Submit button */}
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={!isFormValid || uiState.isSubmitting} className="w-full bg-sky-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-sky-700 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed shadow-sm hover:shadow-md">
                {uiState.isSubmitting ? <span className="flex items-center justify-center gap-2"><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-4 h-4 border-2 border-white border-t-transparent rounded-full" />در حال ارسال...</span> : <span className="flex items-center justify-center gap-2">ارسال پیام <Send className="w-4 h-4" /></span>}
              </motion.button>
            </form>

            {/* Social media */}
            <div className="mt-12 p-4 bg-sky-50 border border-sky-200 rounded-2xl">
              <p className="text-sky-800 text-xs font-medium mb-3 text-center">راه‌های ارتباط سریع</p>
              <div className="flex justify-center gap-3">{SOCIAL_MEDIA.map((s, i) => <SocialButton key={i} {...s} />)}</div>
            </div>
          </motion.div>
        </div>

        {/* FAQ section */}
        <Suspense fallback={<SkeletonBox className="mt-8 h-48" />}>
          <FAQSection openFAQ={uiState.openFAQ} toggleFAQ={toggleFAQ} />
        </Suspense>
      </div>
    </div>
  );
}

