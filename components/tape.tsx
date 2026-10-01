"use client";

import Link from "next/link";
import { Board } from "./board";
import { Countdown } from "./countdown";
import { Banner, PairingNote, QuoteDisclaimer } from "./notes";
import { usePrint } from "./use-print";
import { formatEt, formatPct, formatUsd } from "@/lib/format";
import { formatSessionDate } from "@/lib/market-clock";
import type { PrintResponse } from "@/lib/print-response";
import { UNDERLYING } from "@/lib/copy";
import { NO_CURVE_CONFIG } from "@/lib/print";

export function Tape({ initial, nowOverride }: { initial: PrintResponse; nowOverride?: string }) {
  const { data, skewMs, refresh, error } = usePrint(initial, nowOverride);
  const p = data ?? initial;
  const session = formatSessionDate(p.sessionDate);
  const shut = p.window === "shut";

  return (
    <div>
      <SourceBanners p={p} nowOverride={nowOverride} />
      {error && <Banner tone="warn">Could not refresh the print: {error}. Showing the last good read.</Banner>}

      <div className="grid gap-8 md:grid-cols-12">
        <section className="md:col-span-7" aria-live="polite">
          <p className="kicker text-ink-soft">
            {shut ? "Last session" : "The print"} · {session}
          </p>
          <Hero p={p} skewMs={skewMs} onBell={refresh} />
        </section>

        <div className="md:col-span-5">
          <Board
            rows={p.board}
            caption={shut ? `${session} · reference only` : session}
          />
          {p.board.length > 0 && (
            <p className="mt-2 text-xs text-ink-faint">
              Red names are eligible only with a verified LaunchLab config. Green and flat closes are struck
              through. Ties break by dollar volume, then ticker.
            </p>
          )}
        </div>
      </div>

      <QuoteDisclaimer />
    </div>
  );
}

function SourceBanners({ p, nowOverride }: { p: PrintResponse; nowOverride?: string }) {
  return (
    <>
      {nowOverride && <Banner tone="warn">Dev clock override: {nowOverride}</Banner>}
      {p.source?.kind === "fixture" && <Banner tone="warn">{p.source.label}</Banner>}
      {p.cluster === "devnet" && (
        <Banner>Devnet. Launches write to devnet; quote mints there are stand-ins, not real xStocks.</Banner>
      )}
    </>
  );
}

const listButton =
  "mt-6 block w-full border-2 border-ink px-5 py-4 text-center font-mono text-sm uppercase tracking-[0.16em]";

function Hero({ p, skewMs, onBell }: { p: PrintResponse; skewMs: number; onBell: () => void }) {
  if (p.verdict === "error") {
    return (
      <>
        <h1 className="mt-2 text-6xl leading-none font-semibold md:text-7xl">Print unavailable</h1>
        <p className="mt-4 text-lg">{p.error ?? p.message}</p>
        <p className="mt-2 text-sm text-ink-soft">No prices are shown when the data source fails.</p>
        <DisabledList reason="No print, no listing." />
      </>
    );
  }

  if (p.window === "shut") {
    return (
      <>
        <h1 className="mt-2 text-7xl leading-none font-semibold md:text-8xl">Pad shut</h1>
        <p className="mt-4 text-lg leading-snug">
          The US cash session is trading. The pad opens at the 16:00 ET close in{" "}
          <Countdown target={p.nextClose} skewMs={skewMs} onDone={onBell} className="text-down" />.
        </p>
        <p className="mt-1 text-sm text-ink-soft">Opens {formatEt(p.nextClose)}.</p>
        <DisabledList reason="Shut between the 09:30 open and the 16:00 close." />
      </>
    );
  }

  const windowLine = (
    <p className="mt-3 text-sm text-ink-soft">
      Window closes at the cash open, {formatEt(p.nextOpen)}, in{" "}
      <Countdown target={p.nextOpen} skewMs={skewMs} onDone={onBell} />.
    </p>
  );

  if (p.verdict === "print" && p.winner) {
    const w = p.winner;
    return (
      <>
        <div className="mt-3 font-mono text-lg">
          {w.xStock} <span className="text-ink-soft">· {UNDERLYING[w.ticker] ?? w.ticker}</span>
        </div>
        <h1 className="text-[5.5rem] leading-[0.9] font-semibold tracking-tight text-down tabular md:text-[8rem]">
          {formatPct(w.changePct, 1)}
        </h1>
        <p className="mt-3 text-lg leading-snug">
          Closed <span className="font-mono tabular">{formatUsd(w.close)}</span> from{" "}
          <span className="font-mono tabular">{formatUsd(w.prevClose)}</span>. The worst regular-session close in
          the supported set.
        </p>
        {windowLine}
        <Link href="/launch" className={`${listButton} bg-ink text-paper hover:bg-down hover:border-down`}>
          List against this print
        </Link>
        <div className="mt-4">
          <PairingNote xStock={w.xStock} ticker={w.ticker} />
        </div>
      </>
    );
  }

  if (p.verdict === "no-curve-config" && p.print) {
    const r = p.print;
    return (
      <>
        <div className="mt-3 font-mono text-lg">
          {r.xStock} <span className="text-ink-soft">· {UNDERLYING[r.ticker] ?? r.ticker}</span>
        </div>
        <h1 className="text-[5.5rem] leading-[0.9] font-semibold tracking-tight text-down/70 tabular md:text-[8rem]">
          {formatPct(r.changePct, 1)}
        </h1>
        <p className="mt-3 text-lg leading-snug">
          No curve config for this print. {r.xStock} closed worst, but there is no verified Raydium LaunchLab
          config for it on this cluster, so listing is hidden. RedStonk does not fall through to the next red
          name or to a homemade pool.
        </p>
        {r.reason !== NO_CURVE_CONFIG && <p className="mt-1 font-mono text-xs text-ink-faint">{r.reason}</p>}
        {windowLine}
        <div className="mt-4">
          <PairingNote xStock={r.xStock} ticker={r.ticker} />
        </div>
      </>
    );
  }

  if (p.verdict === "no-red-print") {
    return (
      <>
        <h1 className="mt-2 text-7xl leading-none font-semibold md:text-8xl">No red print</h1>
        <p className="mt-4 text-lg leading-snug">
          Every supported name closed flat or green. Green closes are ineligible, so there is nothing to list
          against until the next close.
        </p>
        <p className="mt-3 text-sm text-ink-soft">
          Next close {formatEt(p.nextClose)}, in <Countdown target={p.nextClose} skewMs={skewMs} onDone={onBell} />.
        </p>
        <DisabledList reason="No red print." />
      </>
    );
  }

  // incomplete
  return (
    <>
      <h1 className="mt-2 text-6xl leading-none font-semibold md:text-7xl">Print pending</h1>
      <p className="mt-4 text-lg leading-snug">{p.message}</p>
      <p className="mt-2 text-sm text-ink-soft">The worst close cannot be named until every supported close is in.</p>
      {windowLine}
      <DisabledList reason="No print yet." />
    </>
  );
}

function DisabledList({ reason }: { reason: string }) {
  return (
    <>
      <button type="button" disabled className={`${listButton} text-ink-faint border-ink-faint`}>
        List against this print
      </button>
      <p className="mt-2 text-center font-mono text-xs text-ink-faint">{reason}</p>
    </>
  );
}
