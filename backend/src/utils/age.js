/**
 * Age is always derived from dateOfBirth — never stored as authoritative.
 * Uses UTC calendar dates for deterministic timezone-independent results.
 */
function parseUtcDateOnly(value) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new Error("INVALID_DATE");
  }
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function assertValidBirthDate(birthDate, asOf = new Date()) {
  const birth = parseUtcDateOnly(birthDate);
  const today = parseUtcDateOnly(asOf);
  if (birth.getTime() > today.getTime()) {
    const err = new Error("FUTURE_BIRTH_DATE");
    err.code = "FUTURE_BIRTH_DATE";
    throw err;
  }
  // Reject absurdly old dates (> 120 years)
  const min = new Date(Date.UTC(today.getUTCFullYear() - 120, today.getUTCMonth(), today.getUTCDate()));
  if (birth.getTime() < min.getTime()) {
    const err = new Error("BIRTH_DATE_TOO_OLD");
    err.code = "BIRTH_DATE_TOO_OLD";
    throw err;
  }
  return birth;
}

/**
 * Full years completed as of `asOf` (UTC date-only).
 * Birthday today → age increments today.
 * Birthday tomorrow → still previous age.
 */
function ageFromBirthDate(birthDate, asOf = new Date()) {
  const birth = parseUtcDateOnly(birthDate);
  const on = parseUtcDateOnly(asOf);
  let age = on.getUTCFullYear() - birth.getUTCFullYear();
  const monthDiff = on.getUTCMonth() - birth.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && on.getUTCDate() < birth.getUTCDate())) {
    age -= 1;
  }
  return age;
}

/**
 * Convert age range filters into inclusive birthDate bounds (UTC date-only).
 * age >= ageMin  ⟺  birthDate <= (asOf − ageMin years)
 * age <= ageMax  ⟺  birthDate >= (asOf − ageMax years − 1 day? wait)
 *
 * If asOf = 2026-09-08 and ageMax = 30:
 *   born 1995-09-08 → age 31 → excluded
 *   born 1995-09-09 → age 30 → included
 * So birthDateMin = asOf − (ageMax+1) years + 1 day = (asOf − ageMax years)'s next day after subtracting one more year...
 * Simpler: birthDateMin = day after (asOf − (ageMax+1) years)
 */
function addUtcYears(date, years) {
  const d = parseUtcDateOnly(date);
  return new Date(Date.UTC(d.getUTCFullYear() + years, d.getUTCMonth(), d.getUTCDate()));
}

function addUtcDays(date, days) {
  const d = parseUtcDateOnly(date);
  return new Date(d.getTime() + days * 24 * 60 * 60 * 1000);
}

function birthDateRangeFromAge({ ageMin, ageMax, asOf = new Date() } = {}) {
  const on = parseUtcDateOnly(asOf);
  const range = {};
  if (ageMin != null) {
    // inclusive max birth date for minimum age
    range.$lte = addUtcYears(on, -Number(ageMin));
  }
  if (ageMax != null) {
    // inclusive min birth date for maximum age
    range.$gte = addUtcDays(addUtcYears(on, -(Number(ageMax) + 1)), 1);
  }
  return Object.keys(range).length ? range : null;
}

module.exports = {
  parseUtcDateOnly,
  assertValidBirthDate,
  ageFromBirthDate,
  addUtcYears,
  addUtcDays,
  birthDateRangeFromAge,
};
