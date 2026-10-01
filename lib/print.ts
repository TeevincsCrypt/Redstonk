// Pure ranking logic for the daily print. No I/O here so it can be unit-tested directly.

import type { QuoteConfig } from "./quotes";

export type CloseResult =
  | { ok: true; close: number; prevClose: number; volume: number | null; date: string | null }
  | { ok: false; reason: string };

export type ConfigCheck = { ok: true } | { ok: false; reason: string };

export type BoardStatus = "red" | "green" | "flat" | "missing";

export interface BoardRow {
  ticker: string;
  xStock: string;
  /** Percent change, e.g. -4.21 for −4.21%. Null when the close is missing. */
  changePct: number | null;
  eligible: boolean;
  reason: string;
  status: BoardStatus;
  close: number | null;
  prevClose: number | null;
  /** close × volume, used only to break ties. */
  dollarVolume: number | null;
  /** True when this row is the day's reddest close (whether or not it can launch). */
  isPrint: boolean;
}

export interface Winner {
  ticker: string;
  xStock: string;
  mint: string;
  configId: string;
  changePct: number;
  close: number;
  prevClose: number;
}

export type Verdict =
  | "print" // a red, configured winner exists
  | "no-red-print" // every supported name closed flat or green
  | "no-curve-config" // the reddest close has no usable LaunchLab config
  | "incomplete"; // at least one supported name has no close, so the worst close is unknown

export interface PrintResult {
  verdict: Verdict;
  winner: Winner | null;
  /** The reddest close among the supported set, even when it cannot launch. */
  print: BoardRow | null;
  board: BoardRow[];
  message: string;
}

/** Changes closer than this (as a fraction) are a tie. */
const TIE_EPSILON = 1e-9;

export const NO_CURVE_CONFIG = "no curve config for this print";
/** Board wording for a red name without a usable config that is not the print. */
export const NO_CONFIG_ROW = "no curve config";

export function percentChange(close: number, prevClose: number): number {
  return ((close - prevClose) / prevClose) * 100;
}

/**
 * Orders red rows: most negative change first, then larger dollar volume, then ticker A→Z.
 */
export function compareRed(a: BoardRow, b: BoardRow): number {
  const ca = (a.changePct ?? 0) / 100;
  const cb = (b.changePct ?? 0) / 100;
  if (Math.abs(ca - cb) > TIE_EPSILON) return ca - cb;
  const va = a.dollarVolume ?? -1;
  const vb = b.dollarVolume ?? -1;
  if (va !== vb) return vb - va;
  return a.ticker < b.ticker ? -1 : a.ticker > b.ticker ? 1 : 0;
}

export function computePrint(
  quotes: readonly QuoteConfig[],
  closes: Record<string, CloseResult>,
  configChecks: Record<string, ConfigCheck>,
): PrintResult {
  const rows: BoardRow[] = quotes.map((q) => {
    const c = closes[q.ticker] ?? { ok: false, reason: "no close data" };
    if (!c.ok) {
      return {
        ticker: q.ticker,
        xStock: q.xStock,
        changePct: null,
        eligible: false,
        reason: c.reason,
        status: "missing",
        close: null,
        prevClose: null,
        dollarVolume: null,
        isPrint: false,
      };
    }
    const changePct = percentChange(c.close, c.prevClose);
    const status: BoardStatus = changePct < 0 ? "red" : changePct > 0 ? "green" : "flat";
    const check = configChecks[q.ticker] ?? { ok: false, reason: NO_CONFIG_ROW };
    let reason: string;
    let eligible = false;
    if (status === "green") reason = "green close";
    else if (status === "flat") reason = "flat close";
    else if (q.configId === "") reason = NO_CONFIG_ROW;
    else if (q.mint === "") reason = "no xStock mint set";
    else if (!check.ok) reason = check.reason;
    else {
      eligible = true;
      reason = "red close";
    }
    return {
      ticker: q.ticker,
      xStock: q.xStock,
      changePct,
      eligible,
      reason,
      status,
      close: c.close,
      prevClose: c.prevClose,
      dollarVolume: c.volume != null ? c.close * c.volume : null,
      isPrint: false,
    };
  });

  const red = rows.filter((r) => r.status === "red").sort(compareRed);
  const missing = rows.filter((r) => r.status === "missing");
  const rest = rows
    .filter((r) => r.status === "green" || r.status === "flat")
    .sort((a, b) => (a.changePct ?? 0) - (b.changePct ?? 0));
  const board = [...red, ...rest, ...missing];

  if (missing.length > 0) {
    return {
      verdict: "incomplete",
      winner: null,
      print: null,
      board,
      message: `No print: ${missing.map((m) => m.ticker).join(", ")} ${missing.length === 1 ? "has" : "have"} no close, so the worst close is unknown.`,
    };
  }

  const print = red[0] ?? null;
  if (!print) {
    return {
      verdict: "no-red-print",
      winner: null,
      print: null,
      board,
      message: "No red print. Every supported name closed flat or green.",
    };
  }

  print.isPrint = true;
  for (const r of red.slice(1)) if (r.eligible) r.reason = "red, not the worst close";

  if (!print.eligible) {
    // The rule is the reddest close or nothing. Never fall through to the next red name.
    print.reason = print.reason === NO_CONFIG_ROW ? NO_CURVE_CONFIG : `${NO_CURVE_CONFIG} (${print.reason})`;
    return {
      verdict: "no-curve-config",
      winner: null,
      print,
      board,
      message: `${print.xStock} printed the worst close, but there is ${NO_CURVE_CONFIG}. Launch is hidden.`,
    };
  }

  const q = quotes.find((x) => x.ticker === print.ticker)!;
  print.reason = "today's print";
  return {
    verdict: "print",
    winner: {
      ticker: q.ticker,
      xStock: q.xStock,
      mint: q.mint,
      configId: q.configId,
      changePct: print.changePct!,
      close: print.close!,
      prevClose: print.prevClose!,
    },
    print,
    board,
    message: `${print.xStock} printed the worst close.`,
  };
}
