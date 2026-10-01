const MINUS = "−";

/** −4.21% / +2.30% / 0.00% */
export function formatPct(pct: number | null | undefined, digits = 2): string {
  if (pct == null || !Number.isFinite(pct)) return "—";
  const abs = Math.abs(pct).toFixed(digits);
  if (Number(abs) === 0) return `${(0).toFixed(digits)}%`;
  return `${pct < 0 ? MINUS : "+"}${abs}%`;
}

export function formatUsd(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86_400);
  const h = Math.floor((total % 86_400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  if (d > 0) return `${d}d ${h}h ${pad(m)}m`;
  if (h > 0) return `${h}h ${pad(m)}m ${pad(s)}s`;
  return `${m}m ${pad(s)}s`;
}

export function shortAddress(addr: string, chars = 4): string {
  if (addr.length <= chars * 2 + 1) return addr;
  return `${addr.slice(0, chars)}…${addr.slice(-chars)}`;
}

const etFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  weekday: "short",
  hour: "numeric",
  minute: "2-digit",
});

/** "Thu 4:00 PM ET" */
export function formatEt(iso: string): string {
  return `${etFormatter.format(new Date(iso))} ET`;
}

/** Formats a raw integer token amount with `decimals`, trimming trailing zeros. */
export function formatUnits(raw: bigint, decimals: number, maxFraction = 4): string {
  const neg = raw < BigInt(0);
  const v = neg ? -raw : raw;
  const base = BigInt(10) ** BigInt(decimals);
  const whole = v / base;
  const frac = (v % base).toString().padStart(decimals, "0").slice(0, maxFraction).replace(/0+$/, "");
  return `${neg ? MINUS : ""}${whole.toLocaleString("en-US")}${frac ? `.${frac}` : ""}`;
}
