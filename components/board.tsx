import type { BoardRow } from "@/lib/print";
import { formatPct, formatUsd } from "@/lib/format";
import { UNDERLYING } from "@/lib/copy";

export function Board({ rows, caption }: { rows: BoardRow[]; caption: string }) {
  if (rows.length === 0) return null;
  return (
    <section aria-label="Board" className="card overflow-hidden">
      <div className="flex items-baseline justify-between gap-3 border-b border-line px-5 py-4">
        <h2 className="text-lg font-semibold tracking-tight">The board</h2>
        <span className="eyebrow text-faint">{caption}</span>
      </div>
      <ol className="divide-y divide-line">
        {rows.map((r) => (
          <li
            key={r.ticker}
            className={`flex items-center gap-3 px-5 py-3.5 ${r.isPrint ? "bg-[linear-gradient(90deg,#fff0f2,transparent)]" : ""}`}
          >
            <Avatar row={r} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-semibold">{r.xStock}</span>
                {r.isPrint && (
                  <span className="rounded-full bg-brand px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-wider text-white">
                    Print
                  </span>
                )}
              </div>
              <div className="truncate text-xs text-mute">{UNDERLYING[r.ticker] ?? r.ticker}</div>
              {r.close != null && (
                <div className="truncate font-mono text-[0.7rem] text-ink-soft tabular">
                  {formatUsd(r.close)} <span className="text-faint">· prev {formatUsd(r.prevClose)}</span>
                </div>
              )}
            </div>
            <div className="max-w-[8.5rem] shrink-0 text-right">
              <Change row={r} />
              <div className={`mt-1 text-[0.7rem] leading-tight ${r.eligible ? "text-mute" : "text-faint"}`}>{r.reason}</div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Avatar({ row }: { row: BoardRow }) {
  const red = row.status === "red";
  return (
    <span
      className={`grid h-10 w-10 shrink-0 place-items-center rounded-full font-mono text-[0.68rem] font-semibold ${
        red
          ? "bg-[linear-gradient(135deg,#ff6b7a,#e61430_55%,#960d1f)] text-white shadow-[0_6px_14px_-6px_rgba(230,20,48,0.7)]"
          : "bg-canvas text-faint ring-1 ring-line"
      }`}
      aria-hidden
    >
      {row.ticker.slice(0, 4)}
    </span>
  );
}

function Change({ row }: { row: BoardRow }) {
  const base = "inline-block rounded-full px-2.5 py-1 font-mono text-sm tabular";
  switch (row.status) {
    case "red":
      return (
        <span className={`${base} ${row.eligible ? "bg-blush-strong font-semibold text-brand" : "bg-blush text-brand/70"}`}>
          {formatPct(row.changePct)}
        </span>
      );
    case "green":
      return <span className={`${base} bg-[#eef7f0] text-up line-through decoration-1`}>{formatPct(row.changePct)}</span>;
    case "flat":
      return <span className={`${base} bg-canvas text-faint line-through decoration-1`}>{formatPct(row.changePct)}</span>;
    default:
      return <span className={`${base} bg-canvas text-faint`}>—</span>;
  }
}
