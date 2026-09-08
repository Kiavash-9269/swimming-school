const {
  timeRangesOverlap,
  schedulesConflict,
  generateSessionDates,
} = require("../src/modules/courses/schedule");

describe("schedule utils", () => {
  test("detects overlapping times", () => {
    expect(timeRangesOverlap("17:00", "18:00", "17:30", "18:30")).toBe(true);
  });

  test("adjacent times do not overlap (half-open)", () => {
    expect(timeRangesOverlap("17:00", "18:00", "18:00", "19:00")).toBe(false);
  });

  test("schedule conflict requires shared day + date range + time overlap", () => {
    const a = {
      startDate: "2026-10-01",
      endDate: "2026-10-30",
      daysOfWeek: [6], // Saturday
      startTime: "17:00",
      endTime: "18:00",
    };
    const b = {
      startDate: "2026-10-01",
      endDate: "2026-10-30",
      daysOfWeek: [6],
      startTime: "17:30",
      endTime: "18:30",
    };
    const c = {
      startDate: "2026-10-01",
      endDate: "2026-10-30",
      daysOfWeek: [6],
      startTime: "18:00",
      endTime: "19:00",
    };
    const d = {
      startDate: "2026-10-01",
      endDate: "2026-10-30",
      daysOfWeek: [0],
      startTime: "17:30",
      endTime: "18:30",
    };
    expect(schedulesConflict(a, b)).toBe(true);
    expect(schedulesConflict(a, c)).toBe(false);
    expect(schedulesConflict(a, d)).toBe(false);
  });

  test("generates exact session count on matching weekdays", () => {
    // 2026-10-03 is Saturday (UTC)
    const dates = generateSessionDates({
      startDate: "2026-10-03T00:00:00.000Z",
      endDate: "2026-11-30T00:00:00.000Z",
      daysOfWeek: [6],
      totalSessions: 4,
    });
    expect(dates).toHaveLength(4);
    expect(dates.every((d) => d.getUTCDay() === 6)).toBe(true);
  });
});
