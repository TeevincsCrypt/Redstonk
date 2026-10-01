// Where regular-session closes come from. Server-side only.
//
// - STOCK_DATA_URL set   → fetch every supported ticker from that daily endpoint. Any failure is
//                          reported as a missing close. Prices are never filled in.
// - STOCK_DATA_URL unset → the labeled fixture in data/, and only off mainnet-beta.

import fixtureRed from "@/data/fixture-closes.json";
import fixtureGreen from "@/data/fixture-closes-green.json";
import type { CloseResult } from "./print";
import type { Ymd } from "./market-clock";

export interface CloseSource {
  kind: "fixture" | "feed";
  label: string;
}

export interface ClosesOutcome {
  source: CloseSource;
  closes: Record<string, CloseResult>;
  /** Set when the source as a whole is unusable (e.g. mainnet with no feed). */
  fatal?: string;
}

interface FixtureFile {
  label: string;
  closes: Record<string, { close: number; prevClose: number; volume?: number }>;
}

export interface DailyRow {
  date: string;
  close: number;
  volume: number | null;
}

// ---------------------------------------------------------------------------------------------
// Parsing

function num(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim() !== "") return Number(v.trim());
  return NaN;
}

function normalizeDate(v: unknown): string | null {
  if (typeof v !== "string" && typeof v !== "number") return null;
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  return null;
}

/** CSV with a header row containing Date and Close (Volume optional), e.g. Stooq's daily CSV. */
export function parseDailyCsv(text: string): DailyRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length < 2) return [];
  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const iDate = header.indexOf("date");
  const iClose = header.indexOf("close");
  const iVol = header.indexOf("volume");
  if (iDate < 0 || iClose < 0) return [];
  const rows: DailyRow[] = [];
  for (const line of lines.slice(1)) {
    const cells = line.split(",");
    const date = normalizeDate(cells[iDate]);
    const close = num(cells[iClose]);
    const volume = iVol >= 0 ? num(cells[iVol]) : NaN;
    if (date && Number.isFinite(close) && close > 0) {
      rows.push({ date, close, volume: Number.isFinite(volume) ? volume : null });
    }
  }
  return rows;
}

/** JSON: an array of {date, close, volume?}, or {rows|data|results: [...]}. */
export function parseDailyJson(body: unknown): DailyRow[] {
  const list = Array.isArray(body)
    ? body
    : body && typeof body === "object"
      ? ((body as Record<string, unknown>).rows ??
        (body as Record<string, unknown>).data ??
        (body as Record<string, unknown>).results)
      : null;
  if (!Array.isArray(list)) return [];
  const rows: DailyRow[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const date = normalizeDate(o.date ?? o.Date);
    const close = num(o.close ?? o.Close);
    const volume = num(o.volume ?? o.Volume);
    if (date && Number.isFinite(close) && close > 0) {
      rows.push({ date, close, volume: Number.isFinite(volume) ? volume : null });
    }
  }
  return rows;
}

/** Picks the session's close and the prior close. Missing session → not published yet. */
export function pickSession(rows: DailyRow[], sessionDate: Ymd): CloseResult {
  const sorted = [...rows].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const idx = sorted.findIndex((r) => r.date === sessionDate);
  if (idx < 0) {
    const latest = sorted.at(-1)?.date;
    return {
      ok: false,
      reason: latest ? `no ${sessionDate} close yet (latest ${latest})` : `no ${sessionDate} close yet`,
    };
  }
  if (idx === 0) return { ok: false, reason: "no prior close in feed" };
  const cur = sorted[idx];
  const prev = sorted[idx - 1];
  return { ok: true, close: cur.close, prevClose: prev.close, volume: cur.volume, date: cur.date };
}

export function feedUrl(template: string, ticker: string): string {
  return template.replaceAll("{symbol_lower}", ticker.toLowerCase()).replaceAll("{symbol}", ticker);
}

// ---------------------------------------------------------------------------------------------
// Sources

function fixtureCloses(tickers: string[], file: FixtureFile): Record<string, CloseResult> {
  const out: Record<string, CloseResult> = {};
  for (const t of tickers) {
    const row = file.closes[t];
    out[t] = row
      ? { ok: true, close: row.close, prevClose: row.prevClose, volume: row.volume ?? null, date: null }
      : { ok: false, reason: "not in fixture" };
  }
  return out;
}

async function fetchTicker(template: string, ticker: string, sessionDate: Ymd): Promise<CloseResult> {
  const url = feedUrl(template, ticker);
  try {
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8_000) });
    if (!res.ok) return { ok: false, reason: `feed HTTP ${res.status}` };
    const type = res.headers.get("content-type") ?? "";
    const text = await res.text();
    let rows: DailyRow[];
    if (type.includes("json") || /^\s*[[{]/.test(text)) {
      try {
        rows = parseDailyJson(JSON.parse(text));
      } catch {
        return { ok: false, reason: "feed returned invalid JSON" };
      }
    } else {
      rows = parseDailyCsv(text);
    }
    if (rows.length === 0) return { ok: false, reason: "feed returned no rows" };
    return pickSession(rows, sessionDate);
  } catch (e) {
    const msg = e instanceof Error && e.name === "TimeoutError" ? "feed timed out" : "feed unreachable";
    return { ok: false, reason: msg };
  }
}

export async function loadCloses(opts: {
  tickers: string[];
  sessionDate: Ymd;
  isMainnet: boolean;
}): Promise<ClosesOutcome> {
  const template = (process.env.STOCK_DATA_URL ?? "").trim();
  if (template) {
    let host = "feed";
    try {
      host = new URL(feedUrl(template, "X")).host;
    } catch {
      return {
        source: { kind: "feed", label: "STOCK_DATA_URL" },
        closes: {},
        fatal: "STOCK_DATA_URL is not a valid URL template.",
      };
    }
    const results = await Promise.all(opts.tickers.map((t) => fetchTicker(template, t, opts.sessionDate)));
    const closes: Record<string, CloseResult> = {};
    opts.tickers.forEach((t, i) => (closes[t] = results[i]));
    const source: CloseSource = { kind: "feed", label: `Daily closes from ${host}` };
    if (results.every((r) => !r.ok && /HTTP|unreachable|timed out|invalid|no rows/.test(r.reason))) {
      return { source, closes, fatal: "Market data feed failed for every ticker. No prices are shown." };
    }
    return { source, closes };
  }

  const file = (process.env.PRINT_FIXTURE === "green" ? fixtureGreen : fixtureRed) as FixtureFile;
  const source: CloseSource = { kind: "fixture", label: file.label };
  if (opts.isMainnet) {
    return {
      source,
      closes: {},
      fatal: "STOCK_DATA_URL is not set. The fixture is dev-only and is never used on mainnet-beta.",
    };
  }
  return { source, closes: fixtureCloses(opts.tickers, file) };
}
