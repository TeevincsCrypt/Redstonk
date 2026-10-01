import { describe, expect, it } from "vitest";
import { isTradingDay, marketState, nyParts, nyWallTime, nyseHolidays } from "@/lib/market-clock";

// Helper: build an instant from a New York wall-clock string.
function ny(ymd: string, hhmm: string): Date {
  const [h, m] = hhmm.split(":").map(Number);
  return nyWallTime(ymd, h * 60 + m);
}

describe("nyWallTime", () => {
  it("maps EDT and EST correctly", () => {
    expect(ny("2026-10-01", "16:00").toISOString()).toBe("2026-10-01T20:00:00.000Z"); // EDT
    expect(ny("2026-12-01", "16:00").toISOString()).toBe("2026-12-01T21:00:00.000Z"); // EST
    expect(nyParts(ny("2026-03-09", "09:30")).hour).toBe(9); // day after DST start
  });
});

describe("holidays", () => {
  it("knows the 2026 NYSE calendar", () => {
    const h = nyseHolidays(2026);
    for (const d of [
      "2026-01-01",
      "2026-01-19",
      "2026-02-16",
      "2026-04-03",
      "2026-05-25",
      "2026-06-19",
      "2026-07-03", // July 4 is a Saturday
      "2026-09-07",
      "2026-11-26",
      "2026-12-25",
    ]) {
      expect(h.has(d), d).toBe(true);
    }
    expect(isTradingDay("2026-07-03")).toBe(false);
    expect(isTradingDay("2026-10-01")).toBe(true);
  });

  it("does not observe a Saturday New Year's Day on Friday", () => {
    // Jan 1 2028 is a Saturday; Dec 31 2027 stays a trading day.
    expect(isTradingDay("2027-12-31")).toBe(true);
  });
});

describe("marketState", () => {
  it("is shut during the cash session and counts down to 16:00", () => {
    const s = marketState(ny("2026-10-01", "12:00")); // Thursday
    expect(s.window).toBe("shut");
    expect(s.nextClose.toISOString()).toBe(ny("2026-10-01", "16:00").toISOString());
    expect(s.sessionDate).toBe("2026-09-30");
  });

  it("opens at 16:00 with today as the session date", () => {
    const s = marketState(ny("2026-10-01", "16:00"));
    expect(s.window).toBe("open");
    expect(s.sessionDate).toBe("2026-10-01");
    expect(s.nextOpen.toISOString()).toBe(ny("2026-10-02", "09:30").toISOString());
  });

  it("stays open before 09:30 with the previous weekday as session", () => {
    const s = marketState(ny("2026-10-02", "09:29"));
    expect(s.window).toBe("open");
    expect(s.sessionDate).toBe("2026-10-01");
  });

  it("shuts exactly at 09:30", () => {
    expect(marketState(ny("2026-10-02", "09:30")).window).toBe("shut");
  });

  it("carries Friday's window through the weekend to Monday 09:30", () => {
    for (const t of [ny("2026-10-03", "12:00"), ny("2026-10-04", "20:00"), ny("2026-10-05", "08:00")]) {
      const s = marketState(t);
      expect(s.window).toBe("open");
      expect(s.sessionDate).toBe("2026-10-02");
      expect(s.nextOpen.toISOString()).toBe(ny("2026-10-05", "09:30").toISOString());
    }
  });

  it("carries the window over a holiday", () => {
    // Thanksgiving 2026-11-26: Wednesday's close stays live until Friday 09:30.
    const s = marketState(ny("2026-11-26", "13:00"));
    expect(s.window).toBe("open");
    expect(s.sessionDate).toBe("2026-11-25");
    expect(s.nextOpen.toISOString()).toBe(ny("2026-11-27", "09:30").toISOString());
  });

  it("uses the previous trading day across a Monday holiday", () => {
    // Labor Day 2026-09-07. Tuesday pre-open → session is Friday 09-04.
    const s = marketState(ny("2026-09-08", "07:00"));
    expect(s.sessionDate).toBe("2026-09-04");
  });
});
