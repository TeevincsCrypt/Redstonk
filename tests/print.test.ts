import { describe, expect, it } from "vitest";
import { computePrint, NO_CURVE_CONFIG, type CloseResult, type ConfigCheck } from "@/lib/print";
import type { QuoteConfig } from "@/lib/quotes";
import fixtureRed from "@/data/fixture-closes.json";
import fixtureGreen from "@/data/fixture-closes-green.json";

function quote(ticker: string, configured = true): QuoteConfig {
  return {
    ticker,
    xStock: `${ticker}x`,
    mint: configured ? `${ticker}mint` : "",
    configId: configured ? `${ticker}cfg` : "",
    issuer: "xStocks",
    raise: "",
  };
}

function close(c: number, p: number, v: number | null = 1_000): CloseResult {
  return { ok: true, close: c, prevClose: p, volume: v, date: null };
}

const allOk = (qs: QuoteConfig[]): Record<string, ConfigCheck> =>
  Object.fromEntries(qs.map((q) => [q.ticker, { ok: true } as ConfigCheck]));

describe("computePrint", () => {
  it("picks the most negative close", () => {
    const qs = [quote("AAA"), quote("BBB"), quote("CCC")];
    const r = computePrint(qs, { AAA: close(98, 100), BBB: close(95, 100), CCC: close(103, 100) }, allOk(qs));
    expect(r.verdict).toBe("print");
    expect(r.winner?.ticker).toBe("BBB");
    expect(r.winner?.changePct).toBeCloseTo(-5);
    expect(r.board.map((b) => b.ticker)).toEqual(["BBB", "AAA", "CCC"]);
    expect(r.board.find((b) => b.ticker === "CCC")).toMatchObject({ status: "green", eligible: false });
  });

  it("breaks ties by dollar volume, then ticker", () => {
    const qs = [quote("ZED"), quote("ABC"), quote("MID")];
    const r = computePrint(
      qs,
      { ZED: close(95, 100, 10), ABC: close(95, 100, 10), MID: close(95, 100, 5) },
      allOk(qs),
    );
    expect(r.winner?.ticker).toBe("ABC");
    const r2 = computePrint(
      qs,
      { ZED: close(95, 100, 50), ABC: close(95, 100, 10), MID: close(95, 100, 5) },
      allOk(qs),
    );
    expect(r2.winner?.ticker).toBe("ZED");
  });

  it("never falls through when the reddest close has no config", () => {
    const qs = [quote("RED", false), quote("PINK")];
    const r = computePrint(qs, { RED: close(90, 100), PINK: close(99, 100) }, allOk(qs));
    expect(r.verdict).toBe("no-curve-config");
    expect(r.winner).toBeNull();
    expect(r.print?.ticker).toBe("RED");
    expect(r.print?.reason).toBe(NO_CURVE_CONFIG);
  });

  it("treats a config that fails on-chain checks as no curve config", () => {
    const qs = [quote("RED")];
    const r = computePrint(qs, { RED: close(90, 100) }, { RED: { ok: false, reason: "config not found on devnet" } });
    expect(r.verdict).toBe("no-curve-config");
    expect(r.print?.reason).toContain(NO_CURVE_CONFIG);
  });

  it("reports no red print when everything is flat or green", () => {
    const qs = [quote("AAA"), quote("BBB")];
    const r = computePrint(qs, { AAA: close(100, 100), BBB: close(101, 100) }, allOk(qs));
    expect(r.verdict).toBe("no-red-print");
    expect(r.winner).toBeNull();
    expect(r.board.find((b) => b.ticker === "AAA")?.reason).toBe("flat close");
  });

  it("refuses to rank when any close is missing", () => {
    const qs = [quote("AAA"), quote("BBB")];
    const missing: CloseResult = { ok: false, reason: "feed timed out" };
    const r = computePrint(qs, { AAA: close(90, 100), BBB: missing }, allOk(qs));
    expect(r.verdict).toBe("incomplete");
    expect(r.winner).toBeNull();
  });

  it("the shipped fixtures behave as documented", () => {
    const tickers = Object.keys(fixtureRed.closes);
    const qs = tickers.map((t) => quote(t));
    const toCloses = (f: typeof fixtureRed) =>
      Object.fromEntries(
        Object.entries(f.closes).map(([t, c]) => [t, close(c.close, c.prevClose, c.volume)]),
      );
    const red = computePrint(qs, toCloses(fixtureRed), allOk(qs));
    expect(red.winner?.ticker).toBe("NVDA");
    expect(red.board.some((b) => b.status === "green")).toBe(true);
    const green = computePrint(qs, toCloses(fixtureGreen), allOk(qs));
    expect(green.verdict).toBe("no-red-print");
  });
});
