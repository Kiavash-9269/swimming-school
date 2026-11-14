const { SiteSetting } = require("./siteSetting.model");

const SETTING_KEYS = {
  CARD_TO_CARD: "cardToCard",
};

const CARD_TO_CARD_FIELDS = [
  "enabled",
  "cardNumber",
  "cardHolder",
  "bankName",
  "iban",
  "instructions",
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
};

async function getValue(key) {
  const doc = await SiteSetting.findOne({ key }).lean();
  return { ...DEFAULTS[key], ...(doc?.value || {}) };
}

async function getCardToCard() {
  return getValue(SETTING_KEYS.CARD_TO_CARD);
}

async function updateValue(key, patch = {}, { actorId = null } = {}) {
  const set = {};
  for (const field of CARD_TO_CARD_FIELDS) {
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

module.exports = {
  SETTING_KEYS,
  DEFAULTS,
  getCardToCard,
  updateValue,
  publicCardToCard,
};
