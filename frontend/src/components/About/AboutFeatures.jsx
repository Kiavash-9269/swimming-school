// src/components/AboutUs.jsx
import React from "react";
import { motion } from "framer-motion";
import { Award, Users, Clock, Target, Heart, Shield } from "lucide-react";

export default function AboutUs() {
  const stats = [
    { icon: <Users className="w-6 h-6" />, number: "۵۰۰۰+", label: "شاگرد آموزش دیده" },
    { icon: <Clock className="w-6 h-6" />, number: "۱۵+", label: "سال تجربه" },
    { icon: <Award className="w-6 h-6" />, number: "۵۰+", label: "مربی متخصص" },
    { icon: <Target className="w-6 h-6" />, number: "۹۸%", label: "رضایت‌مندی" },
  ];

  const values = [
    {
      icon: <Shield className="w-8 h-8" />,
      title: "امنیت و ایمنی",
      description: "اولویت اول ما حفظ ایمنی شاگردان با استانداردهای بین‌المللی"
    },
    {
      icon: <Heart className="w-8 h-8" />,
      title: "علاقه و اشتیاق",
      description: "با عشق به ورزش و آموزش، بهترین خدمات را ارائه می‌دهیم"
    },
    {
      icon: <Target className="w-8 h-8" />,
      title: "تخصص و کیفیت",
      description: "با مربیان بین‌المللی و متدهای روز دنیا آموزش می‌دهیم"
    },
    {
      icon: <Award className="w-8 h-8" />,
      title: "پیشرفت مستمر",
      description: "همراه شما در تمام مراحل یادگیری تا رسیدن به قله موفقیت"
    }
  ];

  const team = [
    {
      name: "دکتر علی محمدی",
      role: "مربی ارشد بین‌المللی",
      experience: "۲۰ سال سابقه",
      specialty: "مربی تیم ملی استرالیا ۲۰۱۸-۲۰۲۰"
    },
    {
      name: "مهسا کریمی",
      role: "مربی بانوان",
      experience: "۱۲ سال سابقه",
      specialty: "دارای مدرک FINA استرالیا"
    },
    {
      name: "رضا احمدی",
      role: "مربی توان‌بخشی",
      experience: "۱۰ سال سابقه",
      specialty: "متخصص آب‌درمانی و شنا درمانی"
    },
    {
      name: "سارا نجفی",
      role: "مربی کودکان",
      experience: "۸ سال سابقه",
      specialty: "مربی تخصصی رده سنی ۴-۱۲ سال"
    }
  ];

  return (
    <div dir="rtl" className="min-h-screen bg-sky-950 p-4 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-7xl">
        
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="px-4 pt-8 max-w-7xl mx-auto text-center"
        >
          <header className="text-center mt-8 mb-8 md:mb-12">
            <h1 className="text-3xl md:text-4xl font-medium text-white mb-4">درباره مدرسه شنا ایران استرالیا</h1>
            <div className="w-16 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent mx-auto mb-4"></div>
            <p className="text-gray-300 max-w-4xl mx-auto text-sm md:text-base leading-relaxed">
              ترکیبی بی‌نظیر از تجربه ایرانی و استانداردهای استرالیایی در خدمت آموزش شنا به تمامی سنین و سطوح
            </p>
          </header>
        </motion.div>

        {/* Stats Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-12 md:mb-16 px-4"
        >
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 md:p-6 border border-sky-200/30 text-center"
            >
              <div className="text-sky-300 flex justify-center mb-2">{stat.icon}</div>
              <div className="text-2xl md:text-3xl font-bold text-white mb-1">{stat.number}</div>
              <div className="text-sky-200 text-xs md:text-sm">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* Story Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl p-6 md:p-8 border border-sky-200 shadow-sm mb-12 md:mb-16 mx-4"
        >
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-sky-900 mb-4">داستان ما</h2>
              <div className="space-y-4 text-sky-700 text-sm md:text-base leading-relaxed">
                <p>
                  مدرسه شنا ایران استرالیا در سال ۱۳۸۸ با همکاری گروهی از مربیان بین‌المللی ایرانی و استرالیایی تأسیس شد. 
                  ما با ترکیب دانش بومی و استانداردهای جهانی آموزش شنا، محیطی امن و حرفه‌ای برای یادگیری ایجاد کرده‌ایم.
                </p>
                <p>
                  با بهره‌گیری از متدهای آموزشی روز دنیا و تجربه ۱۵ ساله، موفق شده‌ایم به بیش از ۵۰۰۰ نفر در سنین مختلف 
                  آموزش شنا دهیم و بسیاری از شاگردان ما امروز به مربیان و قهرمانان ملی تبدیل شده‌اند.
                </p>
                <p>
                  افتخار ما این است که تنها مرکز تخصصی آموزش شنا در ایران هستیم که دارای گواهینامه بین‌المللی از فدراسیون شنا استرالیا می‌باشیم.
                </p>
              </div>
            </div>
            <div className="relative">
              <img 
                src="https://picsum.photos/seed/swim-pool/600/400" 
                alt="استخر مدرسه شنا ایران استرالیا"
                className="w-full h-64 md:h-80 object-cover rounded-2xl shadow-lg"
              />
              <div className="absolute inset-0 bg-sky-900/20 rounded-2xl"></div>
            </div>
          </div>
        </motion.div>

        {/* Values Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mb-12 md:mb-16 px-4"
        >
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-8 md:mb-12">ارزش‌های ما</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 + index * 0.1 }}
                className="bg-white rounded-2xl p-6 border border-sky-200 shadow-sm hover:shadow-md transition-all duration-300 text-center"
              >
                <div className="text-sky-600 flex justify-center mb-4">{value.icon}</div>
                <h3 className="font-semibold text-sky-900 text-lg mb-3">{value.title}</h3>
                <p className="text-sky-700 text-sm leading-relaxed">{value.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Team Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 md:p-8 border border-sky-200/30 mx-4"
        >
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-8 md:mb-12">تیم مربیان ما</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {team.map((member, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.9 + index * 0.1 }}
                className="bg-white rounded-2xl p-6 border border-sky-200 shadow-sm hover:shadow-md transition-all duration-300 text-center"
              >
                <div className="w-20 h-20 bg-sky-100 rounded-full flex items-center justify-center text-sky-600 text-xl font-bold mx-auto mb-4 border border-sky-200">
                  {member.name.split(' ')[0].charAt(0)}
                </div>
                <h3 className="font-semibold text-sky-900 text-lg mb-2">{member.name}</h3>
                <p className="text-sky-600 text-sm mb-3">{member.role}</p>
                <div className="text-sky-700 text-xs space-y-1">
                  <p>📅 {member.experience}</p>
                  <p>⭐ {member.specialty}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Mission Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
          className="bg-white rounded-2xl mb-8 p-6 md:p-8 border border-sky-200 shadow-sm mt-12 md:mt-16 mx-4"
        >
          <div className="text-center max-w-4xl mx-auto ">
            <h2 className="text-2xl md:text-3xl font-bold text-sky-900 mb-6">ماموریت و چشم‌انداز</h2>
            <div className="grid md:grid-cols-2 gap-8 text-sm md:text-base text-sky-700 leading-relaxed">
              <div className="space-y-4">
                <h3 className="font-semibold text-sky-800 text-lg">🎯 ماموریت ما</h3>
                <p>
                  آموزش شنا به همه افراد جامعه با هر سن و توانایی، در محیطی امن و استاندارد 
                  با بهره‌گیری از آخرین متدهای آموزشی بین‌المللی
                </p>
              </div>
              <div className="space-y-4">
                <h3 className="font-semibold text-sky-800 text-lg">🔮 چشم‌انداز ما</h3>
                <p>
                  تبدیل شدن به برترین مرکز آموزش شنا در خاورمیانه با استانداردهای استرالیایی 
                  و پرورش نسل جدیدی از شناگران حرفه‌ای
                </p>
              </div>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
} 