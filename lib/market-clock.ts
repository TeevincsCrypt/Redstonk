// US cash-session clock in America/New_York.
//
// The launch window runs from a trading day's 16:00 close to the next trading day's 09:30 open.
// Weekends and NYSE full-day holidays sit inside the window that opened at the prior close.
// Early-close days (13:00) are treated as 16:00: the pad never opens before the regular close.

export const NY_TZ = "America/New_York";
export const CLOSE_MINUTES = 16 * 60;
export const OPEN_MINUTES = 9 * 60 + 30;

/** Calendar date as YYYY-MM-DD. */
export type Ymd = string;

export interface NyParts {
  ymd: Ymd;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  /** 0 = Sunday … 6 = Saturday */
  weekday: number;
}

const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: NY_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

export function nyParts(date: Date): NyParts {
  const p: Record<string, string> = {};
  for (const part of partsFormatter.formatToParts(date)) p[part.type] = part.value;
  const year = Number(p.year);
  const month = Number(p.month);
  const day = Number(p.day);
  return {
    ymd: `${p.year}-${p.month}-${p.day}`,
    year,
    month,
    day,
    hour: Number(p.hour),
    minute: Number(p.minute),
    second: Number(p.second),
    weekday: new Date(Date.UTC(year, month - 1, day)).getUTCDay(),
  };
}

function ymdToUtcMidnight(ymd: Ymd): number {
  const [y, m, d] = ymd.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function utcMidnightToYmd(ms: number): Ymd {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(ymd: Ymd, days: number): Ymd {
  return utcMidnightToYmd(ymdToUtcMidnight(ymd) + days * 86_400_000);
}

export function weekdayOf(ymd: Ymd): number {
  return new Date(ymdToUtcMidnight(ymd)).getUTCDay();
}

/** Offset of New York from UTC at `date`, in minutes (e.g. -240 during EDT). */
function nyOffsetMinutes(date: Date): number {
  const p = nyParts(date);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtc - Math.floor(date.getTime() / 1000) * 1000) / 60_000);
}

/** The instant at which the New York wall clock reads `ymd` `minutes` past midnight. */
export function nyWallTime(ymd: Ymd, minutes: number): Date {
  const naive = ymdToUtcMidnight(ymd) + minutes * 60_000;
  let instant = naive - nyOffsetMinutes(new Date(naive)) * 60_000;
  // Re-evaluate once in case the guess straddled a DST change.
  instant = naive - nyOffsetMinutes(new Date(instant)) * 60_000;
  return new Date(instant);
}

// ---------------------------------------------------------------------------------------------
// NYSE full-day holidays (rule-based). Ad-hoc closures (e.g. national days of mourning) are not
// modeled; on such a day the feed has no close and the print stays empty rather than guessed.

function nthWeekday(year: number, month: number, weekday: number, n: number): Ymd {
  const first = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const day = 1 + ((weekday - first + 7) % 7) + (n - 1) * 7;
  return utcMidnightToYmd(Date.UTC(year, month - 1, day));
}

function lastWeekday(year: number, month: number, weekday: number): Ymd {
  const lastDay = new Date(Date.UTC(year, month, 0));
  const diff = (lastDay.getUTCDay() - weekday + 7) % 7;
  return utcMidnightToYmd(lastDay.getTime() - diff * 86_400_000);
}

/** Anonymous Gregorian computus. */
function easterSunday(year: number): Ymd {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return utcMidnightToYmd(Date.UTC(year, month - 1, day));
}

/** Saturday → Friday, Sunday → Monday. */
function observed(ymd: Ymd): Ymd {
  const wd = weekdayOf(ymd);
  if (wd === 6) return addDays(ymd, -1);
  if (wd === 0) return addDays(ymd, 1);
  return ymd;
}

const holidayCache = new Map<number, Set<Ymd>>();

export function nyseHolidays(year: number): Set<Ymd> {
  const cached = holidayCache.get(year);
  if (cached) return cached;
  const days = new Set<Ymd>();
  // New Year's Day: Sunday → Monday; Saturday is not observed on the prior Friday.
  const ny = `${year}-01-01`;
  if (weekdayOf(ny) === 0) days.add(addDays(ny, 1));
  else if (weekdayOf(ny) !== 6) days.add(ny);
  days.add(nthWeekday(year, 1, 1, 3)); // Martin Luther King Jr. Day
  days.add(nthWeekday(year, 2, 1, 3)); // Washington's Birthday
  days.add(addDays(easterSunday(year), -2)); // Good Friday
  days.add(lastWeekday(year, 5, 1)); // Memorial Day
  if (year >= 2022) days.add(observed(`${year}-06-19`)); // Juneteenth
  days.add(observed(`${year}-07-04`)); // Independence Day
  days.add(nthWeekday(year, 9, 1, 1)); // Labor Day
  days.add(nthWeekday(year, 11, 4, 4)); // Thanksgiving
  days.add(observed(`${year}-12-25`)); // Christmas
  holidayCache.set(year, days);
  return days;
}

export function isTradingDay(ymd: Ymd): boolean {
  const wd = weekdayOf(ymd);
  if (wd === 0 || wd === 6) return false;
  return !nyseHolidays(Number(ymd.slice(0, 4))).has(ymd);
}

export function previousTradingDay(ymd: Ymd): Ymd {
  let d = addDays(ymd, -1);
  while (!isTradingDay(d)) d = addDays(d, -1);
  return d;
}

export function nextTradingDay(ymd: Ymd): Ymd {
  let d = addDays(ymd, 1);
  while (!isTradingDay(d)) d = addDays(d, 1);
  return d;
}

// ---------------------------------------------------------------------------------------------

export interface MarketState {
  window: "open" | "shut";
  /**
   * The session whose close the pad trades on. While the window is open this is the close
   * that opened it. While shut (09:30–16:00 on a trading day) it is the last completed session,
   * shown for reference only.
   */
  sessionDate: Ymd;
  /** Next 09:30 ET cash open strictly after `now`. Ends an open window. */
  nextOpen: Date;
  /** Next 16:00 ET cash close at or after `now`. Opens a shut window. */
  nextClose: Date;
}

export function marketState(now: Date): MarketState {
  const p = nyParts(now);
  const minutes = p.hour * 60 + p.minute;
  const today = p.ymd;

  if (isTradingDay(today)) {
    if (minutes < OPEN_MINUTES) {
      return {
        window: "open",
        sessionDate: previousTradingDay(today),
        nextOpen: nyWallTime(today, OPEN_MINUTES),
        nextClose: nyWallTime(today, CLOSE_MINUTES),
      };
    }
    if (minutes < CLOSE_MINUTES) {
      const next = nextTradingDay(today);
      return {
        window: "shut",
        sessionDate: previousTradingDay(today),
        nextOpen: nyWallTime(next, OPEN_MINUTES),
        nextClose: nyWallTime(today, CLOSE_MINUTES),
      };
    }
    const next = nextTradingDay(today);
    return {
      window: "open",
      sessionDate: today,
      nextOpen: nyWallTime(next, OPEN_MINUTES),
      nextClose: nyWallTime(next, CLOSE_MINUTES),
    };
  }

  // Weekend or holiday: still inside the window that opened at the last trading day's close.
  const next = nextTradingDay(today);
  return {
    window: "open",
    sessionDate: previousTradingDay(today),
    nextOpen: nyWallTime(next, OPEN_MINUTES),
    nextClose: nyWallTime(next, CLOSE_MINUTES),
  };
}

const sessionLabelFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
});

/** "Tue, Sep 30, 2026" for a YYYY-MM-DD session date. */
export function formatSessionDate(ymd: Ymd): string {
  return sessionLabelFormatter.format(new Date(ymdToUtcMidnight(ymd)));
}
