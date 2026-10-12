/**
 * Source of truth for marketing catalog (schedules, pricing) and swimming records.
 * Synced into CourseClass rows via catalog.service.syncCatalog().
 * Keep in lockstep with the public courses / record-yab UX.
 */

const PRICING = {
  public: { price: 400_000, discountPrice: 300_000 },
  school: { price: 4_000_000, discountPrice: 3_700_000 },
  hydro: { price: 3_700_000, discountPrice: 3_700_000 },
};

const DAY_NAME_TO_NUMBER = {
  یکشنبه: 0,
  دوشنبه: 1,
  سه‌شنبه: 2,
  سهشنبه: 2,
  چهارشنبه: 3,
  پنجشنبه: 4,
  جمعه: 5,
  شنبه: 6,
};

function parseDaysOfWeek(dayLabel) {
  const parts = String(dayLabel || "")
    .split(/[،,]/)
    .map((p) => p.trim())
    .filter(Boolean);
  const days = [];
  for (const part of parts) {
    const n = DAY_NAME_TO_NUMBER[part];
    if (n != null && !days.includes(n)) days.push(n);
  }
  return days.sort((a, b) => a - b);
}

function parseTimeRange(timeLabel) {
  const cleaned = String(timeLabel || "")
    .replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
    .replace(/\s/g, "");
  const [startTime, endTime] = cleaned.split("-").map((t) => t.trim());
  return { startTime, endTime };
}

function audienceMeta(audience) {
  const text = String(audience || "");
  if (/پیشرفته|۱۰ سال/.test(text)) {
    return { level: "Advanced", ageMin: 10, ageMax: 99 };
  }
  if (/بزرگسال|پزشک/.test(text)) {
    return { level: "Hydrotherapy", ageMin: 18, ageMax: 99 };
  }
  if (/عمومی|بلیط/.test(text)) {
    return { level: "Public", ageMin: 5, ageMax: 99 };
  }
  return { level: "Beginner", ageMin: 5, ageMax: 99 };
}

function slot({
  groupKey,
  scheduleId,
  daysLabel,
  time,
  sessionId,
  sessionLabel,
  day,
  audience,
  type,
  category,
  pool,
  location,
  description,
  genderRestriction,
  requiresMedicalApproval = false,
  requiresInsurance = true,
  capacity,
  totalSessions,
}) {
  const { startTime, endTime } = parseTimeRange(time);
  const daysOfWeek = parseDaysOfWeek(day);
  const meta = audienceMeta(audience);
  const pricing = PRICING[type] || PRICING.school;
  const catalogKey = `${groupKey}:${scheduleId}:${sessionId}`;

  return {
    catalogKey,
    groupKey,
    scheduleId,
    sessionId,
    category,
    type,
    pool,
    location,
    description,
    daysLabel,
    time,
    sessionLabel,
    day,
    audience,
    startTime,
    endTime,
    daysOfWeek,
    genderRestriction,
    requiresMedicalApproval,
    requiresInsurance,
    level: meta.level,
    ageMin: meta.ageMin,
    ageMax: meta.ageMax,
    listPrice: pricing.price,
    price: pricing.discountPrice,
    capacity: capacity ?? (type === "public" ? 40 : type === "hydro" ? 8 : 12),
    totalSessions: totalSessions ?? (type === "public" ? 8 : 12),
    title: `${pool} — ${time} (${sessionLabel})`,
  };
}

/** Marketing groups (cards) with nested schedule/session slots. */
const CATALOG_GROUPS = [
  {
    id: 1,
    groupKey: "men-sajjad-01",
    category: "men",
    type: "school",
    pool: "استخر سجاد",
    poolImageKey: "sajjad",
    location: "حامد شمالی ۱۰",
    description: "آموزش حرفه‌ای شنا از مبتدی تا پیشرفته",
    schedule: [
      {
        id: "evening-1",
        days: "روزهای زوج",
        time: "۱۶:۱۵ - ۱۷:۱۵",
        sessions: [
          {
            id: "s1",
            label: "سانس ۱",
            day: "شنبه، دوشنبه، چهارشنبه",
            audience: "آموزش پایه — ۵ سال تا بزرگسال",
          },
        ],
      },
      {
        id: "evening-2",
        days: "روزهای زوج",
        time: "۱۷:۳۰ - ۱۸:۳۰",
        sessions: [
          {
            id: "s1",
            label: "سانس ۱",
            day: "شنبه، دوشنبه، چهارشنبه",
            audience: "آموزش پایه — ۵ سال تا بزرگسال",
          },
        ],
      },
      {
        id: "evening-3",
        days: "روزهای زوج",
        time: "۱۹:۰۰ - ۲۰:۰۰",
        sessions: [
          {
            id: "s1",
            label: "سانس ۱",
            day: "شنبه، دوشنبه، چهارشنبه",
            audience: "آموزش پیشرفته — ۱۰ سال به بالا",
          },
        ],
      },
    ],
  },
  {
    id: 2,
    groupKey: "men-kosar-01",
    category: "men",
    type: "school",
    pool: "استخر کوثر",
    poolImageKey: "kosar",
    location: "قاسم آباد، روبروی شاهد ۷۵",
    description: "آموزش حرفه‌ای شنا از مبتدی تا پیشرفته",
    schedule: [
      {
        id: "afternoon-1",
        days: "روزهای فرد",
        time: "۱۴:۳۰ - ۱۵:۰۰",
        sessions: [
          {
            id: "s1",
            label: "سانس ۱",
            day: "یکشنبه، سه‌شنبه، پنجشنبه",
            audience: "آموزش پایه — ۵ سال تا بزرگسال",
          },
        ],
      },
      {
        id: "afternoon-2",
        days: "روزهای فرد",
        time: "۱۶:۰۰ - ۱۷:۰۰",
        sessions: [
          {
            id: "s1",
            label: "سانس ۱",
            day: "یکشنبه، سه‌شنبه، پنجشنبه",
            audience: "آموزش پایه — ۵ سال تا بزرگسال",
          },
        ],
      },
      {
        id: "evening-1",
        days: "روزهای فرد",
        time: "۱۸:۰۰ - ۱۹:۰۰",
        sessions: [
          {
            id: "s1",
            label: "سانس ۱",
            day: "یکشنبه، سه‌شنبه، پنجشنبه",
            audience: "آموزش پیشرفته — ۱۰ سال به بالا",
          },
        ],
      },
      {
        id: "evening-2",
        days: "روزهای فرد",
        time: "۱۹:۰۰ - ۲۰:۰۰",
        sessions: [
          {
            id: "s1",
            label: "سانس ۱",
            day: "یکشنبه، سه‌شنبه، پنجشنبه",
            audience: "آموزش پیشرفته — ۱۰ سال به بالا",
          },
        ],
      },
    ],
  },
  {
    id: 101,
    groupKey: "women-sajjad-01",
    category: "women",
    type: "school",
    pool: "استخر سجاد",
    poolImageKey: "sajjad",
    location: "حامد شمالی ۱۰",
    description: "آموزش حرفه‌ای شنا از مبتدی تا پیشرفته",
    schedule: [
      {
        id: "morning-1",
        days: "روزهای فرد",
        time: "۱۰:۰۰ - ۱۲:۰۰",
        sessions: [
          {
            id: "s1",
            label: "سانس ۱",
            day: "شنبه، دوشنبه، چهارشنبه",
            audience: "آموزش پایه — ۵ سال تا بزرگسال",
          },
        ],
      },
      {
        id: "noon-1",
        days: "روزهای فرد",
        time: "۱۲:۰۰ - ۱۴:۰۰",
        sessions: [
          {
            id: "s1",
            label: "سانس ۱",
            day: "شنبه، دوشنبه، چهارشنبه",
            audience: "آموزش پایه — ۵ سال تا بزرگسال",
          },
        ],
      },
      {
        id: "afternoon-1",
        days: "روزهای فرد",
        time: "۱۴:۰۰ - ۱۶:۰۰",
        sessions: [
          {
            id: "s1",
            label: "سانس ۱",
            day: "شنبه، دوشنبه، چهارشنبه",
            audience: "آموزش پیشرفته — ۱۰ سال به بالا",
          },
        ],
      },
      {
        id: "evening-1",
        days: "روزهای فرد",
        time: "۱۶:۰۰ - ۱۸:۰۰",
        sessions: [
          {
            id: "s1",
            label: "سانس ۱",
            day: "شنبه، دوشنبه، چهارشنبه",
            audience: "آموزش پیشرفته — ۱۰ سال به بالا",
          },
        ],
      },
      {
        id: "evening-2",
        days: "روزهای فرد",
        time: "۱۸:۰۰ - ۲۰:۰۰",
        sessions: [
          {
            id: "s1",
            label: "سانس ۱",
            day: "شنبه، دوشنبه، چهارشنبه",
            audience: "آموزش پیشرفته — ۱۰ سال به بالا",
          },
        ],
      },
    ],
  },
  {
    id: 102,
    groupKey: "women-kosar-01",
    category: "women",
    type: "school",
    pool: "استخر کوثر",
    poolImageKey: "kosar",
    location: "قاسم آباد، روبروی شاهد ۷۵",
    description: "آموزش حرفه‌ای شنا از مبتدی تا پیشرفته",
    schedule: [
      {
        id: "morning-1",
        days: "روزهای زوج",
        time: "۱۰:۰۰ - ۱۲:۰۰",
        sessions: [
          {
            id: "s1",
            label: "سانس ۱",
            day: "یکشنبه، سه‌شنبه، پنجشنبه",
            audience: "آموزش پایه — ۵ سال تا بزرگسال",
          },
        ],
      },
      {
        id: "noon-1",
        days: "روزهای زوج",
        time: "۱۲:۰۰ - ۱۴:۰۰",
        sessions: [
          {
            id: "s1",
            label: "سانس ۱",
            day: "یکشنبه، سه‌شنبه، پنجشنبه",
            audience: "آموزش پایه — ۵ سال تا بزرگسال",
          },
        ],
      },
      {
        id: "afternoon-1",
        days: "روزهای زوج",
        time: "۱۴:۰۰ - ۱۶:۰۰",
        sessions: [
          {
            id: "s1",
            label: "سانس ۱",
            day: "یکشنبه، سه‌شنبه، پنجشنبه",
            audience: "آموزش پیشرفته — ۱۰ سال به بالا",
          },
        ],
      },
      {
        id: "evening-1",
        days: "روزهای زوج",
        time: "۱۶:۰۰ - ۱۸:۰۰",
        sessions: [
          {
            id: "s1",
            label: "سانس ۱",
            day: "یکشنبه، سه‌شنبه، پنجشنبه",
            audience: "آموزش پیشرفته — ۱۰ سال به بالا",
          },
        ],
      },
      {
        id: "evening-2",
        days: "روزهای زوج",
        time: "۱۸:۰۰ - ۲۰:۰۰",
        sessions: [
          {
            id: "s1",
            label: "سانس ۱",
            day: "یکشنبه، سه‌شنبه، پنجشنبه",
            audience: "آموزش پیشرفته — ۱۰ سال به بالا",
          },
        ],
      },
    ],
  },
  {
    id: 201,
    groupKey: "hydro-men-sajjad-01",
    category: "hydro",
    type: "hydro",
    pool: "استخر سجاد",
    poolImageKey: "sajjad",
    location: "حامد شمالی ۱۰",
    description: "تمرینات آب‌درمانی زیر نظر دکتر شجاعی",
    schedule: [
      {
        id: "evening-1",
        days: "روزهای زوج",
        time: "۱۹:۰۰ - ۲۰:۳۰",
        sessions: [
          {
            id: "s1",
            label: "سانس ویژه",
            day: "شنبه، دوشنبه، چهارشنبه",
            audience: "بزرگسال — با نسخه پزشک",
          },
        ],
      },
    ],
  },
  {
    id: 301,
    groupKey: "public-sajjad",
    category: "public",
    type: "public",
    pool: "استخر سجاد",
    poolImageKey: "sajjad",
    location: "حامد شمالی ۱۰",
    description: "بلیط سانس عمومی استخر سجاد",
    schedule: [],
  },
  {
    id: 302,
    groupKey: "public-kosar",
    category: "public",
    type: "public",
    pool: "استخر کوثر",
    poolImageKey: "kosar",
    location: "قاسم آباد، روبروی شاهد ۷۵",
    description: "بلیط سانس عمومی استخر کوثر",
    schedule: [],
  },
];

const CATEGORY_META = {
  men: { id: "men", label: "دوره‌های آقایان", genderRestriction: "MALE" },
  women: { id: "women", label: "دوره‌های بانوان", genderRestriction: "FEMALE" },
  public: { id: "public", label: "سانس عمومی", genderRestriction: "ANY" },
  hydro: { id: "hydro", label: "آب‌درمانی", genderRestriction: "MALE" },
};

function flattenSlots() {
  const slots = [];
  for (const group of CATALOG_GROUPS) {
    const genderRestriction = CATEGORY_META[group.category]?.genderRestriction || "ANY";
    const requiresMedicalApproval = group.type === "hydro";
    const requiresInsurance = group.type !== "public";

    if (!group.schedule?.length) {
      const pricing = PRICING[group.type] || PRICING.public;
      slots.push({
        catalogKey: group.groupKey,
        groupKey: group.groupKey,
        scheduleId: "ticket",
        sessionId: "main",
        category: group.category,
        type: group.type,
        pool: group.pool,
        location: group.location,
        description: group.description,
        daysLabel: "همه‌روزه",
        time: "طبق برنامه استخر",
        sessionLabel: "بلیط سانس عمومی",
        day: "شنبه، یکشنبه، دوشنبه، سه‌شنبه، چهارشنبه، پنجشنبه",
        audience: "سانس عمومی — همه سنین",
        startTime: "08:00",
        endTime: "20:00",
        daysOfWeek: [0, 1, 2, 3, 4, 6],
        genderRestriction,
        requiresMedicalApproval: false,
        requiresInsurance: false,
        level: "Public",
        ageMin: 5,
        ageMax: 99,
        listPrice: pricing.price,
        price: pricing.discountPrice,
        capacity: 40,
        totalSessions: 8,
        title: `${group.pool} — سانس عمومی`,
      });
      continue;
    }

    for (const schedule of group.schedule) {
      for (const session of schedule.sessions) {
        slots.push(
          slot({
            groupKey: group.groupKey,
            scheduleId: schedule.id,
            daysLabel: schedule.days,
            time: schedule.time,
            sessionId: session.id,
            sessionLabel: session.label,
            day: session.day,
            audience: session.audience,
            type: group.type,
            category: group.category,
            pool: group.pool,
            location: group.location,
            description: group.description,
            genderRestriction: genderRestriction === "ANY" ? "MALE" : genderRestriction,
            requiresMedicalApproval,
            requiresInsurance,
          }),
        );
      }
    }
  }
  return slots;
}

/** Default swimming records (Mehr 1405 / Oct 2026). */
const DEFAULT_SWIMMING_RECORDS = [
  { event: "50m آزاد", time: 20.88, distance: 50, holder: "کامرون مک‌اووی", type: "خارجی", discipline: "آزاد" },
  { event: "100m آزاد", time: 46.4, distance: 100, holder: "پان ژانله", type: "خارجی", discipline: "آزاد" },
  { event: "200m آزاد", time: 102.0, distance: 200, holder: "پاول بیدرمان", type: "خارجی", discipline: "آزاد" },
  { event: "400m آزاد", time: 219.96, distance: 400, holder: "لوکاس مارتنس", type: "خارجی", discipline: "آزاد" },
  { event: "800m آزاد", time: 452.12, distance: 800, holder: "ژانگ لین", type: "خارجی", discipline: "آزاد" },
  { event: "1500m آزاد", time: 866.79, distance: 1500, holder: "یوهانس لیبمان", type: "خارجی", discipline: "آزاد" },
  { event: "50m آزاد ایران", time: 22.41, distance: 50, holder: "سامیار عبدلی", type: "داخلی", discipline: "آزاد" },
  { event: "100m آزاد ایران", time: 50.34, distance: 100, holder: "سامیار عبدلی", type: "داخلی", discipline: "آزاد" },
  { event: "200m آزاد ایران", time: 110.3, distance: 200, holder: "محمد قاسمی", type: "داخلی", discipline: "آزاد" },
  { event: "400m آزاد ایران", time: 233.16, distance: 400, holder: "محمد قاسمی", type: "داخلی", discipline: "آزاد" },
  { event: "800m آزاد ایران", time: 491.83, distance: 800, holder: "محمد قاسمی", type: "داخلی", discipline: "آزاد" },
  { event: "1500m آزاد ایران", time: 966.66, distance: 1500, holder: "علی جعفری", type: "داخلی", discipline: "آزاد" },
  { event: "50m پروانه", time: 22.27, distance: 50, holder: "آندری گووروف", type: "خارجی", discipline: "پروانه" },
  { event: "100m پروانه", time: 49.45, distance: 100, holder: "کیلیب درسل", type: "خارجی", discipline: "پروانه" },
  { event: "200m پروانه", time: 110.34, distance: 200, holder: "کریستوف میلاک", type: "خارجی", discipline: "پروانه" },
  { event: "50m پروانه ایران", time: 24.15, distance: 50, holder: "مهرشاد افقری", type: "داخلی", discipline: "پروانه" },
  { event: "100m پروانه ایران", time: 53.32, distance: 100, holder: "مهرشاد افقری", type: "داخلی", discipline: "پروانه" },
  { event: "200m پروانه ایران", time: 119.97, distance: 200, holder: "متین بالسینی", type: "داخلی", discipline: "پروانه" },
  { event: "50m کرال پشت", time: 23.55, distance: 50, holder: "کلیمنت کولسنیکوف", type: "خارجی", discipline: "کرال پشت" },
  { event: "100m کرال پشت", time: 51.6, distance: 100, holder: "توماس چکون", type: "خارجی", discipline: "کرال پشت" },
  { event: "200m کرال پشت", time: 111.92, distance: 200, holder: "آرون پیرسول", type: "خارجی", discipline: "کرال پشت" },
  {
    event: "50m کرال پشت ایران",
    time: 24.1,
    distance: 50,
    holder: "پارسا صفایی",
    type: "داخلی",
    discipline: "کرال پشت",
    highlight: true,
  },
  {
    event: "100m کرال پشت ایران",
    time: 52.84,
    distance: 100,
    holder: "پارسا صفایی",
    type: "داخلی",
    discipline: "کرال پشت",
    highlight: true,
  },
  { event: "200m کرال پشت ایران", time: 124.67, distance: 200, holder: "ابوالفضل سام", type: "داخلی", discipline: "کرال پشت" },
  { event: "50m غورباقه", time: 25.95, distance: 50, holder: "آدام پیتی", type: "خارجی", discipline: "غورباقه" },
  { event: "100m غورباقه", time: 56.88, distance: 100, holder: "آدام پیتی", type: "خارجی", discipline: "غورباقه" },
  { event: "200m غورباقه", time: 124.83, distance: 200, holder: "شین اوهاشی", type: "خارجی", discipline: "غورباقه" },
  { event: "50m غورباقه ایران", time: 27.95, distance: 50, holder: "محمد علیرضایی دیزیچه", type: "داخلی", discipline: "غورباقه" },
  { event: "100m غورباقه ایران", time: 62.12, distance: 100, holder: "امیر مطاعی", type: "داخلی", discipline: "غورباقه" },
  { event: "200m غورباقه ایران", time: 135.23, distance: 200, holder: "امیر مطاعی", type: "داخلی", discipline: "غورباقه" },
  { event: "200m مختلط", time: 112.69, distance: 200, holder: "لئون مارشان", type: "خارجی", discipline: "مختلط" },
  { event: "400m مختلط", time: 242.5, distance: 400, holder: "لئون مارشان", type: "خارجی", discipline: "مختلط" },
  { event: "200m مختلط ایران", time: 125.87, distance: 200, holder: "متین سهران", type: "داخلی", discipline: "مختلط" },
  { event: "400m مختلط ایران", time: 275.34, distance: 400, holder: "محمد قاسمی", type: "داخلی", discipline: "مختلط" },
];

module.exports = {
  PRICING,
  CATALOG_GROUPS,
  CATEGORY_META,
  DEFAULT_SWIMMING_RECORDS,
  flattenSlots,
  parseDaysOfWeek,
  parseTimeRange,
};
