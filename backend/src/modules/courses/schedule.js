/**
 * Schedule helpers. Times are wall-clock "HH:mm" (24h).
 * Boundary rule: [start, end) — adjacent ranges do NOT overlap.
 */

function parseTimeToMinutes(value) {
  const match = String(value || "").trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    throw new Error(`Invalid time: ${value}`);
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) {
    throw new Error(`Invalid time: ${value}`);
  }
  return hours * 60 + minutes;
}

function timeRangesOverlap(startA, endA, startB, endB) {
  const a0 = parseTimeToMinutes(startA);
  const a1 = parseTimeToMinutes(endA);
  const b0 = parseTimeToMinutes(startB);
  const b1 = parseTimeToMinutes(endB);
  if (a1 <= a0 || b1 <= b0) {
    throw new Error("endTime must be after startTime");
  }
  return a0 < b1 && b0 < a1;
}

function dateRangesOverlap(startA, endA, startB, endB) {
  const a0 = new Date(startA).getTime();
  const a1 = new Date(endA).getTime();
  const b0 = new Date(startB).getTime();
  const b1 = new Date(endB).getTime();
  return a0 <= b1 && b0 <= a1;
}

function daysIntersect(daysA = [], daysB = []) {
  const setB = new Set(daysB.map(Number));
  return daysA.some((d) => setB.has(Number(d)));
}

/**
 * Two recurring class schedules conflict when date ranges overlap,
 * they share at least one weekday, and time ranges overlap (half-open).
 */
function schedulesConflict(scheduleA, scheduleB) {
  if (!dateRangesOverlap(scheduleA.startDate, scheduleA.endDate, scheduleB.startDate, scheduleB.endDate)) {
    return false;
  }
  if (!daysIntersect(scheduleA.daysOfWeek, scheduleB.daysOfWeek)) {
    return false;
  }
  return timeRangesOverlap(scheduleA.startTime, scheduleA.endTime, scheduleB.startTime, scheduleB.endTime);
}

function toDateOnlyUtc(dateInput) {
  const d = new Date(dateInput);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function addUtcDays(date, days) {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

/**
 * Generate session calendar dates (UTC date-only) for a class schedule.
 */
function generateSessionDates({ startDate, endDate, daysOfWeek, totalSessions }) {
  const days = new Set((daysOfWeek || []).map(Number));
  const sessions = [];
  let cursor = toDateOnlyUtc(startDate);
  const end = toDateOnlyUtc(endDate);
  let guard = 0;

  while (cursor.getTime() <= end.getTime() && sessions.length < totalSessions && guard < 5000) {
    if (days.has(cursor.getUTCDay())) {
      sessions.push(new Date(cursor));
    }
    cursor = addUtcDays(cursor, 1);
    guard += 1;
  }

  return sessions;
}

module.exports = {
  parseTimeToMinutes,
  timeRangesOverlap,
  dateRangesOverlap,
  daysIntersect,
  schedulesConflict,
  generateSessionDates,
  toDateOnlyUtc,
};
