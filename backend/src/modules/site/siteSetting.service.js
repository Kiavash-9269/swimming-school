const { SiteSetting } = require("./siteSetting.model");

const SETTING_KEYS = {
  CARD_TO_CARD: "cardToCard",
  CLINIC: "clinic",
};

const CARD_TO_CARD_FIELDS = [
  "enabled",
  "cardNumber",
  "cardHolder",
  "bankName",
  "iban",
  "instructions",
];

const CLINIC_FIELDS = [
  "enabled",
  "title",
  "subtitle",
  "description",
  "priceToman",
  "startDate",
  "endDate",
  "schedule",
  "location",
  "capacity",
  "phone",
  "notice",
];

const DEFAULTS = {
  [SETTING_KEYS.CARD_TO_CARD]: {
    enabled: true,
    cardNumber: "",
    cardHolder: "",
    bankName: "",
    iban: "",
    instructions:
      "مبلغ را به شماره کارت زیر واریز کنید، سپس در پنل تیک «پرداخت را انجام دادم» را بزنید تا مدیر تأیید کند.",
  },
  [SETTING_KEYS.CLINIC]: {
    enabled: false,
    title: "کلینیک شنا",
    subtitle: "جلسات تخصصی اصلاح تکنیک",
    description:
      "کلینیک شنا برای هنرجویانی است که می‌خواهند در جلسات کوتاه و متمرکز، تکنیک خود را اصلاح کنند.",
    priceToman: 0,
    startDate: "",
    endDate: "",
    schedule: "",
    location: "",
    capacity: 0,
    phone: "",
    notice: "",
  },
};

function fieldsFor(key) {
  return key === SETTING_KEYS.CLINIC ? CLINIC_FIELDS : CARD_TO_CARD_FIELDS;
}

async function getValue(key) {
  const doc = await SiteSetting.findOne({ key }).lean();
  return { ...DEFAULTS[key], ...(doc?.value || {}) };
}

async function getCardToCard() {
  return getValue(SETTING_KEYS.CARD_TO_CARD);
}

async function getClinic() {
  return getValue(SETTING_KEYS.CLINIC);
}

async function updateValue(key, patch = {}, { actorId = null } = {}) {
  const set = {};
  for (const field of fieldsFor(key)) {
    if (patch[field] === undefined) continue;
    set[`value.${field}`] = patch[field];
  }
  if (!Object.keys(set).length) return getValue(key);

  await SiteSetting.findOneAndUpdate(
    { key },
    { $set: { ...set, updatedBy: actorId || null } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return getValue(key);
}

function publicCardToCard(value) {
  const v = value || DEFAULTS[SETTING_KEYS.CARD_TO_CARD];
  return {
    enabled: Boolean(v.enabled),
    cardNumber: v.cardNumber || "",
    cardHolder: v.cardHolder || "",
    bankName: v.bankName || "",
    iban: v.iban || "",
    instructions: v.instructions || "",
  };
}

function publicClinic(value) {
  const v = value || DEFAULTS[SETTING_KEYS.CLINIC];
  return {
    enabled: Boolean(v.enabled),
    title: v.title || "",
    subtitle: v.subtitle || "",
    description: v.description || "",
    priceToman: Number(v.priceToman || 0),
    startDate: v.startDate || "",
    endDate: v.endDate || "",
    schedule: v.schedule || "",
    location: v.location || "",
    capacity: Number(v.capacity || 0),
    phone: v.phone || "",
    notice: v.notice || "",
  };
}

module.exports = {
  SETTING_KEYS,
  DEFAULTS,
  getCardToCard,
  getClinic,
  updateValue,
  publicCardToCard,
  publicClinic,
};
