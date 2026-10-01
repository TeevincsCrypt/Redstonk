import { describe, expect, it } from "vitest";
import { feedUrl, parseDailyCsv, parseDailyJson, pickSession } from "@/lib/closes";

const STOOQ = `Date,Open,High,Low,Close,Volume
2026-09-28,180,181,178,179.10,1000
2026-09-29,179,181,177,179.98,2000
2026-09-30,179,180,171,172.41,3000
`;

describe("feed parsing", () => {
  it("reads Stooq-style CSV and picks the session plus prior close", () => {
    const rows = parseDailyCsv(STOOQ);
    expect(rows).toHaveLength(3);
    expect(pickSession(rows, "2026-09-30")).toEqual({
      ok: true,
      close: 172.41,
      prevClose: 179.98,
      volume: 3000,
      date: "2026-09-30",
    });
  });

  it("reports an unpublished close instead of using a stale one", () => {
    const r = pickSession(parseDailyCsv(STOOQ), "2026-10-01");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("no 2026-10-01 close yet");
  });

  it("reads JSON arrays and wrapped rows", () => {
    const rows = parseDailyJson({ rows: [{ date: "2026-09-29", close: 10 }, { date: "2026-09-30", close: "9.5", volume: 7 }] });
    expect(pickSession(rows, "2026-09-30")).toMatchObject({ ok: true, close: 9.5, prevClose: 10, volume: 7 });
  });

  it("ignores Stooq's 'No data' body", () => {
    expect(parseDailyCsv("No data")).toEqual([]);
  });

  it("fills symbol placeholders", () => {
    expect(feedUrl("https://x.test/q?s={symbol_lower}.us&t={symbol}", "NVDA")).toBe("https://x.test/q?s=nvda.us&t=NVDA");
  });
});
