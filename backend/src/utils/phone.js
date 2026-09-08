const PERSIAN_DIGITS = {
  "۰": "0",
  "۱": "1",
  "۲": "2",
  "۳": "3",
  "۴": "4",
  "۵": "5",
  "۶": "6",
  "۷": "7",
  "۸": "8",
  "۹": "9",
};

const ARABIC_DIGITS = {
  "٠": "0",
  "١": "1",
  "٢": "2",
  "٣": "3",
  "٤": "4",
  "٥": "5",
  "٦": "6",
  "٧": "7",
  "٨": "8",
  "٩": "9",
};

function toEnglishDigits(value) {
  return String(value || "").replace(/[۰-۹٠-٩]/g, (char) => PERSIAN_DIGITS[char] || ARABIC_DIGITS[char] || char);
}

/**
 * Normalize Iranian mobile numbers to 09xxxxxxxxx.
 */
function normalizePhone(input) {
  let phone = toEnglishDigits(input).replace(/[\s()-]/g, "");

  if (phone.startsWith("+98")) {
    phone = `0${phone.slice(3)}`;
  } else if (phone.startsWith("0098")) {
    phone = `0${phone.slice(4)}`;
  } else if (phone.startsWith("98") && phone.length === 12) {
    phone = `0${phone.slice(2)}`;
  }

  return phone;
}

function isValidIranianMobile(phone) {
  return /^09\d{9}$/.test(phone);
}

module.exports = {
  normalizePhone,
  isValidIranianMobile,
  toEnglishDigits,
};
