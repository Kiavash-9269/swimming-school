import { useState, useMemo, useCallback } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { FiClock, FiInfo, FiAward, FiTrendingUp, FiTarget, FiLoader } from "react-icons/fi";
import { FaSwimmer,FaGlobe } from "react-icons/fa";

export default function SwimmingPerformancePro() {
  const [selectedDiscipline, setSelectedDiscipline] = useState("");
  const [selectedEvent, setSelectedEvent] = useState("");
  const [swimmerTime, setSwimmerTime] = useState("");
  const [results, setResults] = useState(null);
  const [filterType, setFilterType] = useState("همه");
  const [activeTab, setActiveTab] = useState("calculator");
  const [showFinaInfo, setShowFinaInfo] = useState(false);
  const [error, setError] = useState("");
  const [isCalculating, setIsCalculating] = useState(false);

  // همه رکوردها
  const records = [
    // آزاد - رکوردهای جهانی
    { event: "50m آزاد", time: 20.91, distance: 50, holder: "Cesar Cielo", type: "خارجی", discipline: "آزاد" },
    { event: "100m آزاد", time: 46.40, distance: 100, holder: "Pan Zhanle", type: "خارجی", discipline: "آزاد" },
    { event: "200m آزاد", time: 102.00, distance: 200, holder: "Paul Biedermann", type: "خارجی", discipline: "آزاد" },
    { event: "400m آزاد", time: 219.96, distance: 400, holder: "Lukas Märtens", type: "خارجی", discipline: "آزاد" },
    { event: "800m آزاد", time: 452.12, distance: 800, holder: "Zhang Lin", type: "خارجی", discipline: "آزاد" },
    { event: "1500m آزاد", time: 870.67, distance: 1500, holder: "Bobby Finke", type: "خارجی", discipline: "آزاد" },

    // آزاد - رکوردهای ملی ایران
    { event: "50m آزاد ایران", time: 22.41, distance: 50, holder: "سامیار عبدلی", type: "داخلی", discipline: "آزاد" },
    { event: "100m آزاد ایران", time: 50.34, distance: 100, holder: "سامیار عبدلی", type: "داخلی", discipline: "آزاد" },
    { event: "200m آزاد ایران", time: 110.30, distance: 200, holder: "محمد قاسمی", type: "داخلی", discipline: "آزاد" },
    { event: "400m آزاد ایران", time: 233.16, distance: 400, holder: "محمد قاسمی", type: "داخلی", discipline: "آزاد" },
    { event: "800m آزاد ایران", time: 491.83, distance: 800, holder: "محمد قاسمی", type: "داخلی", discipline: "آزاد" },
    { event: "1500m آزاد ایران", time: 966.66, distance: 1500, holder: "علی جعفری", type: "داخلی", discipline: "آزاد" },

    // پروانه - رکوردهای جهانی
    { event: "50m پروانه", time: 22.27, distance: 50, holder: "Andriy Govorov", type: "خارجی", discipline: "پروانه" },
    { event: "100m پروانه", time: 49.45, distance: 100, holder: "Caeleb Dressel", type: "خارجی", discipline: "پروانه" },
    { event: "200m پروانه", time: 110.34, distance: 200, holder: "Kristóf Milák", type: "خارجی", discipline: "پروانه" },

    // پروانه - رکوردهای ملی ایران
    { event: "50m پروانه ایران", time: 24.15, distance: 50, holder: "مهردشاد افقری", type: "داخلی", discipline: "پروانه" },
    { event: "100m پروانه ایران", time: 53.32, distance: 100, holder: "مهردشاد افقری", type: "داخلی", discipline: "پروانه" },
    { event: "200m پروانه ایران", time: 119.97, distance: 200, holder: "متین بالسینی", type: "داخلی", discipline: "پروانه" },

    // کرال پشت - رکوردهای جهانی
    { event: "50m کرال پشت", time: 23.55, distance: 50, holder: "Kliment Kolesnikov", type: "خارجی", discipline: "کرال پشت" },
    { event: "100m کرال پشت", time: 51.60, distance: 100, holder: "Thomas Ceccon", type: "خارجی", discipline: "کرال پشت" },
    { event: "200m کرال پشت", time: 111.92, distance: 200, holder: "Aaron Peirsol", type: "خارجی", discipline: "کرال پشت" },

    // کرال پشت - رکوردهای ملی ایران
    { event: "50m کرال پشت ایران", time: 25.90, distance: 50, holder: "هومر عباسی", type: "داخلی", discipline: "کرال پشت" },
    { event: "100m کرال پشت ایران", time: 56.36, distance: 100, holder: "ابوالفضل سام", type: "داخلی", discipline: "کرال پشت" },
    { event: "200m کرال پشت ایران", time: 124.67, distance: 200, holder: "ابوالفضل سام", type: "داخلی", discipline: "کرال پشت" },

    // غورباقه - رکوردهای جهانی
    { event: "50m غورباقه", time: 25.95, distance: 50, holder: "Adam Peaty", type: "خارجی", discipline: "غورباقه" },
    { event: "100m غورباقه", time: 56.88, distance: 100, holder: "Adam Peaty", type: "خارجی", discipline: "غورباقه" },
    { event: "200m غورباقه", time: 126.00, distance: 200, holder: "Anton Chupkov", type: "خارجی", discipline: "غورباقه" },

    // غورباقه - رکوردهای ملی ایران
    { event: "50m غورباقه ایران", time: 27.95, distance: 50, holder: "محمد علیرضایی دریزچه", type: "داخلی", discipline: "غورباقه" },
    { event: "100m غورباقه ایران", time: 62.12, distance: 100, holder: "امیر مطاعی", type: "داخلی", discipline: "غورباقه" },
    { event: "200m غورباقه ایران", time: 137.67, distance: 200, holder: "علیرضا عرب", type: "داخلی", discipline: "غورباقه" },

    // مختلط انفرادی - رکوردهای ملی ایران
    { event: "200m مختلط ایران", time: 125.87, distance: 200, holder: "متین سهران", type: "داخلی", discipline: "مختلط" },
    { event: "400m مختلط ایران", time: 275.34, distance: 400, holder: "محمد قاسمی", type: "داخلی", discipline: "مختلط" }
  ];

  const disciplines = [...new Set(records.map((r) => r.discipline))];

  const handleEventChange = useCallback((eventName) => {
    setSelectedEvent(eventName);
    setSwimmerTime("");
    setResults(null);
    setError("");
  }, []);

  const calculate = async () => {
    setError("");
    
    if (!selectedEvent || !swimmerTime) {
      setError("لطفاً ماده شنا و زمان خود را وارد کنید");
      return;
    }

    const st = parseFloat(swimmerTime);
    if (isNaN(st) || st <= 0) {
      setError("زمان وارد شده معتبر نیست. لطفاً عدد مثبت وارد کنید");
      return;
    }

    setIsCalculating(true);
    
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      const selectedRecord = records.find((r) => r.event === selectedEvent);
      if (!selectedRecord) {
        setError("رکورد انتخاب شده یافت نشد");
        return;
      }

      const worldRecord = records.find(
        (r) =>
          r.discipline === selectedRecord.discipline &&
          r.distance === selectedRecord.distance &&
          r.type === "خارجی"
      ) ?? null;

      const nationalRecord = records.find(
        (r) =>
          r.discipline === selectedRecord.discipline &&
          r.distance === selectedRecord.distance &&
          r.type === "داخلی"
      ) ?? null;

      let world = null;
      if (worldRecord) {
        const wr = worldRecord.time;
        const dist = worldRecord.distance;
        let performanceWorld = (wr / st) * 100;
        if (performanceWorld > 100) performanceWorld = 100;
        const timeDiffWorld = +(st - wr).toFixed(2);
        const speed = +(dist / st).toFixed(2);
        const fina = +(1000 * Math.pow(wr / st, 3)).toFixed(1);

        let message = "";
        const delta = wr - st;
        if (delta > 0) {
          message = `تبریک! شما رکورد جهانی ${worldRecord.holder} در ${worldRecord.event} را با اختلاف ${delta.toFixed(2)} ثانیه شکستید!`;
        } else if (delta === 0) {
          message = `برابر رکورد جهانی! زمان شما دقیقاً با رکورد هماهنگ است.`;
        } else {
          message = `برای رسیدن به رکورد جهانی ${worldRecord.holder} هنوز ${Math.abs(delta).toFixed(2)} ثانیه نیاز دارید.`;
        }

        world = {
          exists: true,
          holder: worldRecord.holder,
          event: worldRecord.event,
          time: wr,
          distance: dist,
          performance: performanceWorld.toFixed(2),
          timeDiff: timeDiffWorld.toFixed(2),
          speed: speed.toFixed(2),
          fina,
          message,
        };
      } else {
        world = {
          exists: false,
          message: "رکورد جهانی متناظری برای این ماده در داده‌ها وجود ندارد.",
        };
      }

      let national = null;
      if (nationalRecord) {
        const nr = nationalRecord.time;
        const dist = nationalRecord.distance;
        let performanceNat = (nr / st) * 100;
        if (performanceNat > 100) performanceNat = 100;
        const timeDiffNat = +(st - nr).toFixed(2);
        const speedNat = +(dist / st).toFixed(2);

        let messageNat = "";
        const deltaNat = nr - st;
        if (deltaNat > 0) {
          messageNat = `تبریک! شما رکورد داخلی ${nationalRecord.holder} در ${nationalRecord.event} را با اختلاف ${deltaNat.toFixed(2)} ثانیه شکستید!`;
        } else if (deltaNat === 0) {
          messageNat = `برابر رکورد داخلی! زمان شما دقیقاً با رکورد متناظر است.`;
        } else {
          messageNat = `برای رسیدن به رکورد داخلی ${nationalRecord.holder} هنوز ${Math.abs(deltaNat).toFixed(2)} ثانیه نیاز دارید.`;
        }

        national = {
          exists: true,
          holder: nationalRecord.holder,
          event: nationalRecord.event,
          time: nr,
          distance: dist,
          performance: performanceNat.toFixed(2),
          timeDiff: timeDiffNat.toFixed(2),
          speed: speedNat.toFixed(2),
          message: messageNat,
        };
      } else {
        national = {
          exists: false,
          message: "رکورد داخلی متناظری برای این ماده در داده‌ها وجود ندارد.",
        };
      }

      setResults({
        selected: {
          event: selectedRecord.event,
          time: selectedRecord.time,
          holder: selectedRecord.holder,
          type: selectedRecord.type,
        },
        swimmerTime: st,
        world,
        national,
      });
    } catch (err) {
      setError("خطایی در محاسبات رخ داد. لطفاً دوباره تلاش کنید");
    } finally {
      setIsCalculating(false);
    }
  };

  const COLORS = ["#3B82F6", "#E5E7EB"];
  const COLORS_NAT = ["#10B981", "#FEEBC8"];



  const chartDataFor = (perf) =>
    perf != null
      ? [
          { name: "عملکرد", value: parseFloat(perf) },
          { name: "باقی", value: Math.max(0, 100 - parseFloat(perf)) }
        ]
      : [];

  const selectableRecords = useMemo(
    () =>
      records.filter(
        (r) =>
          (selectedDiscipline ? r.discipline === selectedDiscipline : true) &&
          (filterType === "همه" ? true : r.type === filterType)
      ),
    [selectedDiscipline, filterType]
  );

  const filteredRecords = useMemo(
    () => (filterType === "همه" ? records : records.filter((r) => r.type === filterType)),
    [filterType]
  );

  return (
    <div dir="rtl" className="min-h-screen bg-sky-950 p-4 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-7xl">
        {/* هدر */}
        <header className="text-center mb-8 md:mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2"> محاسبه عملکرد شناگر</h1>
          <p className="text-gray-300 max-w-2xl mx-auto">
            مقایسه عملکرد خود با رکوردهای جهانی و داخلی در رشته‌های مختلف شنا
          </p>
        </header>

        {/* تب‌ها */}
        <div className="flex justify-center mb-6 md:mb-8">
          <div className="bg-white rounded-2xl shadow-md p-1 flex gap-2">
            {["calculator", "records"].map((tab) => (
              <button
                key={tab}
                className={`px-4 py-2 rounded-xl font-medium transition-all ${
                  activeTab === tab ? "bg-sky-700 text-white shadow" : "text-gray-700 hover:bg-blue-50"
                }`}
                onClick={() => {
                  setActiveTab(tab);
                  setSelectedEvent("");
                  setResults(null);
                  setSwimmerTime("");
                  setError("");
                }}
              >
                {tab === "calculator" ? " محاسبه رکورد" : "جدول رکوردها"}
              </button>
            ))}
          </div>
        </div>

        {/* نمایش خطا */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-300 text-red-700 rounded-xl text-center">
            {error}
          </div>
        )}

        {activeTab === "calculator" ? (
          <div className="bg-sky-100 rounded-3xl shadow-xl overflow-hidden">
            <div className="p-6 md:p-8">
              <h2 className="text-2xl font-bold text-blue-500 mb-6 text-center">محاسبه عملکرد</h2>

              {/* انتخاب ماده و نوع رکورد */}
              <div className="bg-white/70 backdrop-blur-lg border border-gray-200 shadow-sm rounded-2xl p-5 mb-6 transition-all duration-300 hover:shadow-md">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2 ">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-5 h-5 text-blue-500"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path d="M3 6h18M3 12h18M3 18h18" />
                  </svg>
                  فیلتر رکوردها
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* فیلتر ماده */}
                  <div className="flex flex-col">
                    <label className="flex items-center text-gray-600 mb-2 font-medium tracking-wide  right">
                      <FaSwimmer className="ml-2 text-blue-500" />
                      انتخاب ماده:
                    </label>
                    <select
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent shadow-sm transition-all hover:bg-white text-right"
                      value={selectedDiscipline}
                      onChange={(e) => {
                        setSelectedDiscipline(e.target.value);
                        setSelectedEvent("");
                        setResults(null);
                        setSwimmerTime("");
                        setError("");
                      }}
                    >
                      <option value="">همه ماده ها</option>
                      {disciplines.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* فیلتر نوع رکورد */}
                  <div className="flex flex-col">
                    <label className=" text-gray-600 mb-2 font-medium tracking-wide text-right flex items-center  gap-2">
                          <FaGlobe className="text-blue-500" />
                          نوع رکورد:
                        </label>
                    <select
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent shadow-sm transition-all hover:bg-white text-right"
                      value={filterType}
                      onChange={(e) => {
                        setFilterType(e.target.value);
                        setSelectedEvent("");
                        setResults(null);
                        setSwimmerTime("");
                        setError("");
                      }}
                    >
                      {["همه", "داخلی", "خارجی"].map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* کارت رکوردها */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-700 mb-3 text-right">انتخاب رکورد:</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-80 overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-blue-300 scrollbar-track-blue-50">
                  {selectableRecords.map((r) => (
                    <button
                      key={r.event}
                      className={`p-4 rounded-xl shadow-sm border transition-transform duration-200 transform text-center font-medium ${
                        selectedEvent === r.event
                          ? "bg-blue-600 text-white border-blue-600 shadow-md scale-105"
                          : "bg-white text-gray-700 border-gray-200 hover:bg-blue-50 hover:border-blue-300"
                      }`}
                      onClick={() => handleEventChange(r.event)}
                    >
                      <div className="font-semibold">{r.event}</div>
                      <div className="text-xs mt-1 opacity-80">{r.type}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* رکورد انتخاب شده */}
              {selectedEvent && (
                <div className="bg-gradient-to-r from-blue-200 to-sky-600 rounded-2xl p-6 mb-8 border border-blue-200 shadow-lg flex flex-col items-center gap-4 text-center transform transition-all duration-300 hover:shadow-xl">
                  <div className="text-2xl font-bold text-sky-950 text-shadow-2xs flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-full">
                      <FiTarget className="text-red-600 text-xl" />
                    </div>
                    <span>رکورد انتخاب شده</span>
                  </div>
                  
                  <div className="flex flex-wrap justify-center gap-6 text-gray-800">
                    <div className="flex flex-col items-center bg-white/70 px-4 py-3 rounded-xl shadow-sm min-w-[120px]">
                      <span className="text-sm text-gray-600 mb-1">ماده</span>
                      <span className="font-semibold text-lg">{selectedEvent}</span>
                    </div>
                    
                    <div className="flex flex-col items-center bg-white/70 px-4 py-3 rounded-xl shadow-sm min-w-[120px]">
                      <span className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                        <FiClock className="text-blue-500" />
                        زمان
                      </span>
                      <span className="font-semibold text-lg text-blue-700">
                        {records.find((r) => r.event === selectedEvent).time} ثانیه
                      </span>
                    </div>
                    
                    <div className="flex flex-col items-center bg-white/70 px-4 py-3 rounded-xl shadow-sm min-w-[120px]">
                      <span className="text-sm text-gray-600 mb-1">رکورددار</span>
                      <span className="font-semibold text-lg ">
                        {records.find((r) => r.event === selectedEvent).holder}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* زمان شناگر */}
              <div className="mb-6 relative">
                <label className=" text-black font-bold flex items-center text-right gap-2 mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-5 h-5 text-blue-500"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path d="M3 6h18M3 12h18M3 18h18" />
                  </svg>
                  زمان شناگر (ثانیه):
                </label>
                <div className="relative bg">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="مثال: 52.45"
                    value={swimmerTime}
                    onChange={(e) => {
                      setSwimmerTime(e.target.value);
                      setError("");
                    }}
                    className="w-full p-3 pr-10 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition shadow-sm hover:shadow-md text-right dir-ltr"
                    dir="ltr"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <FiClock className="text-blue-500 h-5 w-5" />
                  </div>
                </div>
              </div>

              {/* دکمه محاسبه */}
              <button
                onClick={calculate}
                disabled={!selectedEvent || !swimmerTime || isCalculating}
                className={`w-full py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                  selectedEvent && swimmerTime && !isCalculating
                    ? "bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
              >
                {isCalculating ? (
                  <>
                    <FiLoader className="animate-spin" />
                    در حال محاسبه...
                  </>
                ) : (
                  "محاسبه عملکرد"
                )}
              </button>

              {/* نتایج */}
              {results && (
                <div className="mt-8 space-y-6">
                  {/* پیام‌های هوشمند */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* پیام جهانی */}
                    <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 shadow-sm border border-blue-200 text-right">
                      <h4 className="font-semibold text-sky-800 mb-3 flex items-center gap-2 ">
                        <FaGlobe className="text-blue-500" />
                        مقایسه با رکورد جهانی
                      </h4>
                      {results.world.exists ? (
                        <>
                          <div className="text-sm text-gray-700 mb-4 leading-relaxed text-justify">
                            {results.world.message}
                          </div>
                          <div className="flex flex-wrap gap-2 text-sm text-gray-600 ">
                            <div className="bg-white px-3 py-2 rounded-lg border border-blue-100">
                              <span className="text-blue-600 font-medium">رکورددار: </span>
                              <span>{results.world.holder}</span>
                            </div>
                            <div className="bg-white px-3 py-2 rounded-lg border border-blue-100">
                              <span className="text-blue-600 font-medium">زمان رکورد: </span>
                              <span>{results.world.time} ثانیه</span>
                            </div>
                            <div className="bg-white px-3 py-2 rounded-lg border border-blue-100">
                              <span className="text-blue-600 font-medium">سرعت شما: </span>
                              <span>{results.world.speed} متر/ثانیه</span>
                            </div>
                            <div className="bg-yellow-400 px-3 py-2 rounded-lg border border-blue-100 shadow-2xl ">
                              <span className="text-gray-800 font-medium ">امتیاز فینا: </span>
                              <span className="font-bold text-black">{results.world.fina}</span>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="text-sm text-gray-600 text-justify">{results.world.message}</div>
                      )}
                    </div>

                    {/* پیام داخلی */}
                    <div className="p-4 rounded-xl bg-gradient-to-br from-green-50 to-green-100 shadow-sm border border-green-200 text-right">
                      <h4 className="font-semibold text-sky-950 mb-3 flex items-center gap-2 ">
                        <div className="flex items-center text-xl ">
                          <span className="text-green-500">●</span>
                          <span className="text-white ">●</span>
                          <span className="text-red-500">●</span>
                        </div> 
                        مقایسه با رکورد داخلی
                      </h4>
                      {results.national.exists ? (
                        <>
                          <div className="text-sm text-gray-700 mb-4 leading-relaxed text-justify">
                            {results.national.message}
                          </div>
                          <div className="flex flex-wrap gap-2 text-sm text-gray-600 ">
                            <div className="bg-white px-3 py-2 rounded-lg border border-green-200">
                              <span className="text-green-700 font-medium">رکورددار: </span>
                              <span>{results.national.holder}</span>
                            </div>
                            <div className="bg-white px-3 py-2 rounded-lg border border-green-200">
                              <span className="text-green-700 font-medium">زمان رکورد: </span>
                              <span>{results.national.time} ثانیه</span>
                            </div>
                            <div className="bg-white px-3 py-2 rounded-lg border border-green-200">
                              <span className="text-green-800 font-medium">عملکرد: </span>
                              <span>{results.national.performance}%</span>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="text-sm text-gray-600 text-justify">{results.national.message}</div>
                      )}
                    </div>
                  </div>

                  {/* نمودارها و جزئیات عددی */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* نمودار جهانی */}
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 flex flex-col items-center shadow-sm border border-blue-200 text-right">
                      <h3 className="text-lg font-semibold text-sky-900 mb-4 flex items-center gap-2">
                        <FiTrendingUp className="text-sky-600" />
                        عملکرد نسبت به رکورد جهانی
                      </h3>
                      <div className="relative h-56 w-full max-w-xs">
                        {results.world.exists ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={chartDataFor(results.world.performance)}
                                dataKey="value"
                                startAngle={90}
                                endAngle={-270}
                                innerRadius="70%"
                                outerRadius="100%"
                                stroke="none"
                              >
                                {chartDataFor(results.world.performance).map((entry, index) => (
                                  <Cell key={index} fill={COLORS[index]} />
                                ))}
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="text-sm text-gray-600 flex items-center justify-center h-full">
                            رکورد جهانی موجود نیست
                          </div>
                        )}
                        {results.world.exists && (
                          <div className="absolute inset-0 flex items-center justify-center flex-col">
                            <span className="text-3xl font-bold text-blue-700">{results.world.performance}%</span>
                            <span className="text-sm text-gray-600 mt-1">عملکرد نسبت به جهانی</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* نمودار داخلی */}
                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 flex flex-col items-center shadow-sm border border-green-200 text-right">
                      <h3 className="text-lg font-semibold text-sky-950 mb-4 flex items-center gap-2">
                        <FiTrendingUp className="text-green-800" />
                        عملکرد نسبت به رکورد داخلی
                      </h3>
                      <div className="relative h-56 w-full max-w-xs">
                        {results.national.exists ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={chartDataFor(results.national.performance)}
                                dataKey="value"
                                startAngle={90}
                                endAngle={-270}
                                innerRadius="70%"
                                outerRadius="100%"
                                stroke="none"
                              >
                                {chartDataFor(results.national.performance).map((entry, index) => (
                                  <Cell key={index} fill={COLORS_NAT[index]} />
                                ))}
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="text-sm text-gray-600 flex items-center justify-center h-full">
                            رکورد داخلی موجود نیست
                          </div>
                        )}
                        {results.national.exists && (
                          <div className="absolute inset-0 flex items-center justify-center flex-col">
                            <span className="text-3xl font-bold text-gray-800">{results.national.performance}%</span>
                            <span className="text-sm text-gray-600 mt-1">عملکرد نسبت به داخلی</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* جدول خلاصه عددی */}
                  <div className="bg-gradient-to-bl from-blue-100 to-sky-800 rounded-2xl p-6 space-y-4 shadow-sm border border-blue-200 text-right">
                    <h3 className="text-lg font-semibold text-blue-700 mb-4 flex items-center gap-2 ">
                      <FiTarget className="text-blue-600" />
                      خلاصه نتایج
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex flex-col p-4 bg-white rounded-xl shadow-sm border border-blue-100 text-center">
                        <span className="text-gray-600 text-sm mb-2">زمان شما</span>
                        <span className="font-bold text-blue-700 text-xl">{results.swimmerTime} ثانیه</span>
                      </div>

                      <div className="flex flex-col p-4 bg-white rounded-xl shadow-sm border border-blue-100 text-center">
                        <span className="text-gray-600 text-sm mb-2">عملکرد جهانی</span>
                        <span className="font-bold text-blue-700 text-xl">
                          {results.world.exists ? `${results.world.performance}%` : "—"}
                        </span>
                      </div>

                      <div className="flex flex-col p-4 bg-white rounded-xl shadow-sm border border-blue-100 text-center">
                        <span className="text-gray-600 text-sm mb-2">عملکرد داخلی</span>
                        <span className="font-bold text-blue-700 text-xl">
                          {results.national.exists ? `${results.national.performance}%` : "—"}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-white rounded-xl shadow-sm border border-blue-100 text-center">
                        <span className="text-gray-600 text-sm block mb-2">اختلاف با رکورد جهانی</span>
                        <div className={`font-bold text-lg ${
                          results.world.timeDiff > 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {results.world.exists ? 
                            `${results.world.timeDiff > 0 ? '+' : ''}${results.world.timeDiff} ثانیه` 
                            : "—"
                          }
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {results.world.exists && 
                            (results.world.timeDiff > 0 ? 'کندتر از رکورد' : 'سریع‌تر از رکورد')
                          }
                        </div>
                      </div>

                      <div className="p-4 bg-white rounded-xl shadow-sm border border-blue-100 text-center">
                        <span className="text-gray-600 text-sm block mb-2">اختلاف با رکورد داخلی</span>
                        <div className={`font-bold text-lg ${
                          results.national.timeDiff > 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {results.national.exists ? 
                            `${results.national.timeDiff > 0 ? '+' : ''}${results.national.timeDiff} ثانیه` 
                            : "—"
                          }
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {results.national.exists && 
                            (results.national.timeDiff > 0 ? 'کندتر از رکورد' : 'سریع‌تر از رکورد')
                          }
                        </div>
                      </div>
                    </div>
                    
                    {/* فینا پوینت در خلاصه نتایج */}
                    {results.world.exists && (
                      <div className="p-4 bg-white rounded-xl shadow-sm border border-blue-100">
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 text-right">
                          <div className="text-center sm:text-right">
                            <span className="text-gray-600 text-sm block mb-1">امتیاز فینا</span>
                            <div className="font-bold text-blue-700 text-lg">{results.world.fina}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              {results.world.fina >= 900 ? 'سطح جهانی' : 
                              results.world.fina >= 800 ? 'سطح قهرمانی' :
                              results.world.fina >= 700 ? 'عملکرد خوب' :
                              results.world.fina >= 600 ? 'عملکرد متوسط' : 'نیاز به بهبود'}
                            </div>
                          </div>
                          <button 
                            onClick={() => setShowFinaInfo(!showFinaInfo)}
                            className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1 px-3 py-2 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                          >
                            <FiInfo className="w-4 h-4" />
                            اطلاعات بیشتر
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* توضیح فینا پوینت */}
                  {showFinaInfo && (
                    <div className="mt-6 bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-300 rounded-2xl p-6 shadow-sm text-right">
                      <h4 className="text-lg font-bold text-yellow-800 mb-4 flex items-center gap-2 ">
                        <FiInfo className="w-5 h-5 text-yellow-600" />
                        سیستم امتیازدهی فینا (FINA Points)
                      </h4>

                      <div className="text-yellow-800 space-y-4 text-sm leading-relaxed">
                        <div>
                          <p className="font-bold text-yellow-900 mb-2">امتیاز فینا چیست؟</p>
                          <p className="text-justify">
                            این سیستم توسط فدراسیون جهانی شنا (World Aquatics) طراحی شده تا عملکرد شناگران را در مواد مختلف به‌صورت
                            عادلانه مقایسه کند.
                          </p>
                        </div>

                        <div className="bg-yellow-200/40 border border-yellow-300 rounded-xl p-4 text-center text-yellow-900 font-bold text-lg">
                          امتیاز فینا = 1000 × (رکورد جهانی ÷ زمان شناگر)³
                        </div>

                        <div>
                          <p className="font-bold text-yellow-900 mb-3">تفسیر امتیازها:</p>
                          <ul className="list-disc list-inside space-y-2 pr-4 text-justify">
                            <li><strong className="ml-1">1000 امتیاز:</strong> برابر با رکورد جهانی</li>
                            <li><strong className="ml-1">900 امتیاز و بالاتر:</strong> عملکرد در سطح جهانی</li>
                            <li><strong className="ml-1">800-899 امتیاز:</strong> عملکرد در سطح قهرمانی</li>
                            <li><strong className="ml-1">700-799 امتیاز:</strong> عملکرد خوب</li>
                            <li><strong className="ml-1">600-699 امتیاز:</strong> عملکرد متوسط</li>
                            <li><strong className="ml-1">زیر 600 امتیاز:</strong> نیاز به بهبود عملکرد</li>
                          </ul>
                        </div>

                        <p className="text-xs mt-4 text-yellow-700 bg-yellow-100 border border-yellow-200 rounded-lg p-3 text-center">
                          این سیستم کمک می‌کند عملکرد شناگران در رشته‌ها و مسافت‌های متفاوت به‌صورت منصفانه مقایسه شود.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          // تب جدول رکوردها
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
            <div className="p-6 md:p-8 bg-sky-100">
              <h2 className="text-2xl font-bold text-blue-500 text-shadow-2xs mb-6 text-center">جدول رکوردهای شنا</h2>

              {/* فیلتر جدول */}
              <div className="flex flex-wrap justify-center gap-3 mb-6">
                {["همه", "داخلی", "خارجی"].map((t) => (
                  <button
                    key={t}
                    className={`px-4 py-2 rounded-xl border transition-all ${
                      filterType === t
                        ? "bg-sky-600 text-white border-blue-600 shadow"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-blue-100"
                    }`}
                    onClick={() => setFilterType(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* جدول */}
              <div className=" bg-white overflow-x-auto rounded-xl border border-gray-200 shadow-2xs">
                <table className="w-full border-collapse">
                  <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                    <tr>
                      <th className="border-b p-3 text-center font-semibold">رشته</th>
                      <th className="border-b p-3 text-center font-semibold">رکورد (ثانیه)</th>
                      <th className="border-b p-3 text-center font-semibold">نام رکورددار</th>
                      <th className="border-b p-3 text-center font-semibold">نوع رکورد</th>
                      <th className="border-b p-3 text-center font-semibold">ماده</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map((r) => (
                      <tr
                        key={r.event}
                        className="text-center hover:bg-blue-50 transition cursor-pointer"
                        onClick={() => {
                          setActiveTab("calculator");
                          handleEventChange(r.event);
                        }}
                      >
                        <td className="border-b p-3 font-medium">{r.event}</td>
                        <td className="border-b p-3">{r.time}</td>
                        <td className="border-b p-3">{r.holder}</td>
                        <td className="border-b p-3">
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${
                              r.type === "خارجی" ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"
                            }`}
                          >
                            {r.type}
                          </span>
                        </td>
                        <td className="border-b p-3">{r.discipline}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}