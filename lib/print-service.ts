// Builds the daily print. Server-side only: used by GET /api/print and by the tape's first render.

import { CLUSTER, IS_MAINNET, LAUNCHLAB_PROGRAM_ID, RPC_URL } from "./env";
import { marketState } from "./market-clock";
import { computePrint, type ConfigCheck } from "./print";
import { loadCloses, type ClosesOutcome } from "./closes";
import { checkConfigs } from "./config-check";
import { QUOTES } from "./quotes";
import type { PrintResponse } from "./print-response";

const TTL_MS = 5 * 60_000;
/** Incomplete or failed reads are retried sooner so a late close shows up quickly. */
const RETRY_TTL_MS = 60_000;

const closesCache = new Map<string, { at: number; ttl: number; value: Promise<ClosesOutcome> }>();
let configCache: { at: number; ttl: number; value: Promise<Record<string, ConfigCheck>> } | null = null;

function cachedCloses(sessionDate: string): Promise<ClosesOutcome> {
  const key = `${process.env.STOCK_DATA_URL ?? ""}|${process.env.PRINT_FIXTURE ?? ""}|${sessionDate}`;
  const hit = closesCache.get(key);
  if (hit && Date.now() - hit.at < hit.ttl) return hit.value;
  const entry = {
    at: Date.now(),
    ttl: TTL_MS,
    value: loadCloses({ tickers: QUOTES.map((q) => q.ticker), sessionDate, isMainnet: IS_MAINNET }),
  };
  entry.value.then((r) => {
    if (r.fatal || Object.values(r.closes).some((c) => !c.ok)) entry.ttl = RETRY_TTL_MS;
  });
  closesCache.set(key, entry);
  for (const [k, v] of closesCache) if (Date.now() - v.at > TTL_MS) closesCache.delete(k);
  return entry.value;
}

function cachedConfigChecks(): Promise<Record<string, ConfigCheck>> {
  if (configCache && Date.now() - configCache.at < configCache.ttl) return configCache.value;
  const entry = {
    at: Date.now(),
    ttl: TTL_MS,
    value: checkConfigs({ quotes: QUOTES, rpcUrl: RPC_URL, cluster: CLUSTER, programId: LAUNCHLAB_PROGRAM_ID }),
  };
  entry.value.then((r) => {
    if (Object.values(r).some((c) => !c.ok && /RPC/.test(c.reason))) entry.ttl = RETRY_TTL_MS;
  });
  configCache = entry;
  return entry.value;
}

/**
 * Dev-only clock override (`?now=2026-10-01T21:00:00Z`) so the shut/open states can be checked
 * without waiting for the bell. Ignored in production builds.
 */
export function resolveNow(override: string | null | undefined): Date {
  if (override && process.env.NODE_ENV !== "production") {
    const d = new Date(override);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}

export async function getPrint(now: Date): Promise<{ status: number; body: PrintResponse }> {
  const state = marketState(now);
  const base = {
    asOf: now.toISOString(),
    window: state.window,
    nextOpen: state.nextOpen.toISOString(),
    nextClose: state.nextClose.toISOString(),
    sessionDate: state.sessionDate,
    cluster: CLUSTER,
  } as const;

  const [closes, checks] = await Promise.all([cachedCloses(state.sessionDate), cachedConfigChecks()]);

  if (closes.fatal) {
    return {
      status: 503,
      body: {
        ...base,
        winner: null,
        print: null,
        board: [],
        verdict: "error",
        message: closes.fatal,
        // A refused fixture was not served, so do not label the page as fixture data.
        source: closes.source.kind === "feed" ? closes.source : null,
        error: closes.fatal,
      },
    };
  }

  const result = computePrint(QUOTES, closes.closes, checks);
  const shut = state.window === "shut";

  return {
    status: 200,
    body: {
      ...base,
      winner:
        !shut && result.winner ? { ...result.winner, sessionDate: state.sessionDate } : null,
      print: result.print,
      board: result.board,
      verdict: shut ? "shut" : result.verdict,
      message: shut
        ? "Pad shut. The US cash session is trading. The pad opens at the 16:00 ET close."
        : result.message,
      source: closes.source,
    },
  };
}
