const {
  ageFromBirthDate,
  assertValidBirthDate,
  parseUtcDateOnly,
  birthDateRangeFromAge,
  addUtcYears,
  addUtcDays,
} = require("../src/utils/age");

describe("ageFromBirthDate (UTC deterministic)", () => {
  test("birthday today increments age", () => {
    const asOf = new Date(Date.UTC(2026, 8, 8)); // Sep 8 2026
    const birth = new Date(Date.UTC(2015, 8, 8));
    expect(ageFromBirthDate(birth, asOf)).toBe(11);
  });

  test("birthday tomorrow keeps previous age", () => {
    const asOf = new Date(Date.UTC(2026, 8, 8));
    const birth = new Date(Date.UTC(2015, 8, 9));
    expect(ageFromBirthDate(birth, asOf)).toBe(10);
  });

  test("birthday yesterday already incremented", () => {
    const asOf = new Date(Date.UTC(2026, 8, 8));
    const birth = new Date(Date.UTC(2015, 8, 7));
    expect(ageFromBirthDate(birth, asOf)).toBe(11);
  });

  test("exact min/max boundaries", () => {
    const asOf = new Date(Date.UTC(2026, 0, 1));
    expect(ageFromBirthDate(new Date(Date.UTC(2018, 0, 1)), asOf)).toBe(8);
    expect(ageFromBirthDate(new Date(Date.UTC(2018, 0, 2)), asOf)).toBe(7);
  });

  test("rejects future DOB", () => {
    const asOf = new Date(Date.UTC(2026, 8, 8));
    expect(() => assertValidBirthDate(new Date(Date.UTC(2026, 8, 9)), asOf)).toThrow();
  });

  test("parseUtcDateOnly strips time", () => {
    const d = parseUtcDateOnly(new Date("2020-05-15T23:30:00.000Z"));
    expect(d.toISOString()).toBe("2020-05-15T00:00:00.000Z");
  });

  test("birthDateRangeFromAge ageMin/ageMax inclusive birthday boundaries", () => {
    const asOf = new Date(Date.UTC(2026, 8, 8)); // 2026-09-08
    const range = birthDateRangeFromAge({ ageMin: 18, ageMax: 30, asOf });
    expect(range.$lte.toISOString()).toBe(addUtcYears(asOf, -18).toISOString());
    expect(range.$gte.toISOString()).toBe(addUtcDays(addUtcYears(asOf, -31), 1).toISOString());

    expect(ageFromBirthDate(range.$lte, asOf)).toBe(18);
    expect(ageFromBirthDate(range.$gte, asOf)).toBe(30);
    expect(ageFromBirthDate(addUtcDays(range.$gte, -1), asOf)).toBe(31);
    expect(ageFromBirthDate(addUtcDays(range.$lte, 1), asOf)).toBe(17);
  });
});
