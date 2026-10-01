import type { BoardRow } from "@/lib/print";
import { formatPct, formatUsd } from "@/lib/format";

export function Board({ rows, caption }: { rows: BoardRow[]; caption: string }) {
  if (rows.length === 0) return null;
  return (
    <section aria-label="Board">
      <div className="flex items-baseline justify-between">
        <h2 className="kicker">The board</h2>
        <span className="kicker text-ink-faint">{caption}</span>
      </div>
      <div className="rule-thick mt-1" />
      <ol>
        {rows.map((r) => (
          <li key={r.ticker} className="grid grid-cols-[1fr_auto] items-baseline gap-x-3 border-b border-ink/25 py-2.5">
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-sm font-medium">{r.xStock}</span>
                {r.isPrint && (
                  <span className="kicker border border-down px-1 text-[0.6rem] text-down">print</span>
                )}
              </div>
              <div className="truncate text-xs text-ink-soft">
                <span className="font-mono">{r.ticker}</span>
                {r.close != null && (
                  <span className="font-mono tabular">
                    {" "}
                    · {formatUsd(r.close)} <span className="text-ink-faint">from {formatUsd(r.prevClose)}</span>
                  </span>
                )}
              </div>
            </div>
            <div className="max-w-[9.5rem] text-right">
              <div className={`font-mono tabular text-base ${changeClass(r)}`}>{formatPct(r.changePct)}</div>
              <div className={`text-xs leading-tight ${r.eligible ? "text-ink-soft" : "text-ink-faint"}`}>{r.reason}</div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function changeClass(r: BoardRow): string {
  switch (r.status) {
    case "red":
      return r.eligible ? "text-down font-semibold" : "text-down/70";
    case "green":
      return "text-up line-through decoration-1";
    case "flat":
      return "text-ink-faint line-through decoration-1";
    default:
      return "text-ink-faint";
  }
}
