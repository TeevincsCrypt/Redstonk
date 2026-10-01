"use client";

import Link from "next/link";
import { Board } from "./board";
import { Countdown } from "./countdown";
import { Banner, PairingNote } from "./notes";
import { usePrint } from "./use-print";
import { ClockArt, HeroCoin, Pedestal, TileIcon } from "./art";
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
    <>
      <Hero p={p} skewMs={skewMs} onBell={refresh} />

      <section id="print" className="mx-auto max-w-6xl scroll-mt-6 px-4 md:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow text-brand">{shut ? "Last session" : "Today's print"}</p>
            <h2 className="mt-1 text-3xl font-semibold tracking-tight md:text-4xl">{session}</h2>
          </div>
          <p className="max-w-sm text-sm text-mute">
            The worst regular-session close among the supported xStocks. Green closes never qualify.
          </p>
        </div>
        <SourceBanners p={p} nowOverride={nowOverride} />
        {error && <Banner tone="warn">Could not refresh the print: {error}. Showing the last good read.</Banner>}
        <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <PrintCard p={p} skewMs={skewMs} onBell={refresh} />
          <div>
            <Board rows={p.board} caption={shut ? `${session} · reference` : session} />
            {p.board.length > 0 && (
              <p className="mt-3 px-1 text-xs leading-relaxed text-faint">
                Red names are eligible only with a verified LaunchLab config. Green and flat closes are struck
                through. Ties break by dollar volume, then ticker.
              </p>
            )}
          </div>
        </div>
      </section>

      <HowItWorks />
      <Economics />
      <TheClock />
      <BuiltOn />
    </>
  );
}

// ---------------------------------------------------------------------------------------------

function Hero({ p, skewMs, onBell }: { p: PrintResponse; skewMs: number; onBell: () => void }) {
  const canList = p.window === "open" && !!p.winner;
  return (
    <section className="hero-red relative overflow-hidden pt-28 pb-10 md:pt-40 md:pb-0">
      <div className="mx-auto max-w-6xl px-4 md:px-8">
        <div className="mx-auto max-w-4xl text-center text-white">
          <StatusChip p={p} skewMs={skewMs} onBell={onBell} />
          <h1 className="mt-6 text-[2.55rem] leading-[1.05] font-semibold tracking-tight md:text-7xl">
            The Red-Close
            <br />
            Launchpad <span className="whitespace-nowrap">On Solana</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-white/90 md:text-lg">
            One quote a day: the tokenized stock that closed worst. List a fixed-supply coin against it on
            Raydium LaunchLab.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {canList ? (
              <Link href="/launch" className="btn btn-dark h-12 px-6 text-sm">
                List against this print <span aria-hidden>→</span>
              </Link>
            ) : (
              <a href="#print" className="btn btn-dark h-12 px-6 text-sm">
                See today&apos;s print <span aria-hidden>↓</span>
              </a>
            )}
            <Link href="/desk" className="btn btn-outline h-12 px-6 text-sm">
              How it works
            </Link>
          </div>
        </div>
        <div className="relative mx-auto mt-6 w-44 md:-mt-6 md:mr-[4%] md:w-80">
          <HeroCoin className="animate-float h-auto w-full" />
        </div>
      </div>
    </section>
  );
}

function StatusChip({ p, skewMs, onBell }: { p: PrintResponse; skewMs: number; onBell: () => void }) {
  let dot = "bg-white/70";
  let body: React.ReactNode;
  if (p.window === "shut") {
    body = (
      <>
        Pad shut · opens in <Countdown target={p.nextClose} skewMs={skewMs} onDone={onBell} />
      </>
    );
  } else if (p.winner) {
    dot = "bg-emerald-300";
    body = (
      <>
        Pad open · {p.winner.xStock} <span className="font-mono">{formatPct(p.winner.changePct, 1)}</span>
      </>
    );
  } else {
    body = <>Window open · no listable print</>;
  }
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-medium text-white ring-1 ring-white/40 backdrop-blur">
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden />
      {body}
    </span>
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

// ---------------------------------------------------------------------------------------------

function Stat({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={`rounded-2xl bg-white/80 px-3 py-2.5 ring-1 ring-line ${wide ? "col-span-2 sm:col-span-1" : ""}`}>
      <div className="text-[0.68rem] text-mute">{label}</div>
      <div className="mt-0.5 font-mono text-sm font-medium tabular">{children}</div>
    </div>
  );
}

function PrintCard({ p, skewMs, onBell }: { p: PrintResponse; skewMs: number; onBell: () => void }) {
  if (p.verdict === "error") {
    return (
      <article className="card p-6 md:p-8">
        <p className="eyebrow text-brand">Print unavailable</p>
        <h3 className="mt-2 text-4xl font-semibold tracking-tight">No prices to show</h3>
        <p className="mt-3 text-ink-soft">{p.error ?? p.message}</p>
        <p className="mt-1 text-sm text-mute">RedStonk never fills in a missing price.</p>
        <DisabledList reason="No print, no listing." />
      </article>
    );
  }

  if (p.window === "shut") {
    return (
      <article className="card p-6 md:p-8">
        <p className="eyebrow text-mute">The pad</p>
        <h3 className="mt-2 text-6xl font-semibold tracking-tight md:text-7xl">Pad shut</h3>
        <p className="mt-4 text-lg leading-snug text-ink-soft">
          The US cash session is trading. Listings open at the 16:00 ET close in{" "}
          <Countdown target={p.nextClose} skewMs={skewMs} onDone={onBell} className="font-semibold text-brand" />.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Stat label="Opens">{formatEt(p.nextClose)}</Stat>
          <Stat label="Locks again">{formatEt(p.nextOpen)}</Stat>
        </div>
        <DisabledList reason="Shut between the 09:30 open and the 16:00 close." />
      </article>
    );
  }

  const closesIn = (
    <Countdown target={p.nextOpen} skewMs={skewMs} onDone={onBell} />
  );

  if (p.verdict === "print" && p.winner) {
    const w = p.winner;
    return (
      <article className="card-blush relative overflow-hidden p-6 md:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(255,42,67,0.28),transparent_65%)]"
        />
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-[linear-gradient(135deg,#ff6b7a,#e61430_55%,#960d1f)] font-mono text-xs font-semibold text-white shadow-[0_8px_18px_-8px_rgba(230,20,48,0.8)]">
              {w.ticker.slice(0, 4)}
            </span>
            <div>
              <div className="font-mono text-lg font-semibold">{w.xStock}</div>
              <div className="text-xs text-mute">{UNDERLYING[w.ticker] ?? w.ticker}</div>
            </div>
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-brand ring-1 ring-[#ffd2d8]">
            Worst close
          </span>
        </div>
        <div className="mt-5 text-[4.5rem] leading-none font-semibold tracking-tight text-brand tabular md:text-[6rem]">
          {formatPct(w.changePct)}
        </div>
        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Stat label="Close">{formatUsd(w.close)}</Stat>
          <Stat label="Prior close">{formatUsd(w.prevClose)}</Stat>
          <Stat label="Locks in" wide>
            {closesIn}
          </Stat>
        </div>
        <Link href="/launch" className="btn btn-dark mt-6 h-12 w-full text-sm">
          List against this print <span aria-hidden>→</span>
        </Link>
        <p className="mt-2 text-center text-xs text-mute">Window closes at the cash open, {formatEt(p.nextOpen)}.</p>
        <div className="mt-5">
          <PairingNote xStock={w.xStock} ticker={w.ticker} />
        </div>
      </article>
    );
  }

  if (p.verdict === "no-curve-config" && p.print) {
    const r = p.print;
    return (
      <article className="card p-6 md:p-8">
        <div className="flex items-center gap-3">
          <span className="font-mono text-lg font-semibold">{r.xStock}</span>
          <span className="text-xs text-mute">{UNDERLYING[r.ticker] ?? r.ticker}</span>
        </div>
        <div className="mt-3 text-[4.5rem] leading-none font-semibold tracking-tight text-brand/60 tabular md:text-[6rem]">
          {formatPct(r.changePct)}
        </div>
        <h3 className="mt-5 text-xl font-semibold">No curve config for this print</h3>
        <p className="mt-2 text-ink-soft">
          {r.xStock} closed worst, but there is no verified Raydium LaunchLab config for it on this cluster, so
          listing is hidden. RedStonk does not fall through to the next red name or to a homemade pool.
        </p>
        {r.reason !== NO_CURVE_CONFIG && <p className="mt-2 font-mono text-xs text-faint">{r.reason}</p>}
        <p className="mt-3 text-sm text-mute">Window closes at the cash open, {formatEt(p.nextOpen)}, in {closesIn}.</p>
        <div className="mt-5">
          <PairingNote xStock={r.xStock} ticker={r.ticker} />
        </div>
      </article>
    );
  }

  if (p.verdict === "no-red-print") {
    return (
      <article className="card p-6 md:p-8">
        <p className="eyebrow text-up">All green</p>
        <h3 className="mt-2 text-6xl font-semibold tracking-tight md:text-7xl">No red print</h3>
        <p className="mt-4 text-lg leading-snug text-ink-soft">
          Every supported name closed flat or green. Green closes are ineligible, so there is nothing to list
          against until the next close.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Stat label="Next close">{formatEt(p.nextClose)}</Stat>
          <Stat label="In">
            <Countdown target={p.nextClose} skewMs={skewMs} onDone={onBell} />
          </Stat>
        </div>
        <DisabledList reason="No red print." />
      </article>
    );
  }

  return (
    <article className="card p-6 md:p-8">
      <p className="eyebrow text-mute">Waiting on closes</p>
      <h3 className="mt-2 text-5xl font-semibold tracking-tight md:text-6xl">Print pending</h3>
      <p className="mt-4 text-lg leading-snug text-ink-soft">{p.message}</p>
      <p className="mt-2 text-sm text-mute">
        The worst close cannot be named until every supported close is in. Window closes in {closesIn}.
      </p>
      <DisabledList reason="No print yet." />
    </article>
  );
}

function DisabledList({ reason }: { reason: string }) {
  return (
    <>
      <button type="button" disabled className="btn btn-dark mt-6 h-12 w-full text-sm">
        List against this print
      </button>
      <p className="mt-2 text-center text-xs text-faint">{reason}</p>
    </>
  );
}

// ---------------------------------------------------------------------------------------------

function SectionHead({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="eyebrow text-brand">{eyebrow}</p>
      <h2 className="mt-2 text-3xl font-semibold tracking-tight md:text-5xl">{title}</h2>
      {children && <p className="mt-4 text-base leading-relaxed text-mute">{children}</p>}
    </div>
  );
}

const HOW = [
  {
    glyph: "candle" as const,
    title: "One quote a day",
    body: "At the 16:00 ET close, the supported xStock with the worst regular-session close becomes the only quote. Green closes never qualify.",
  },
  {
    glyph: "curve" as const,
    title: "Raydium LaunchLab rail",
    body: "Every coin is a LaunchLab bonding curve bound to that day's config. When it fills, it migrates to a Raydium CPMM pool.",
  },
  {
    glyph: "lock" as const,
    title: "Locked by the program",
    body: "LP is burned or locked by LaunchLab, never sent to a creator. No mint or freeze authority. No team allocation.",
  },
];

function HowItWorks() {
  return (
    <section className="mx-auto mt-28 max-w-6xl px-4 md:px-8">
      <SectionHead eyebrow="How it works" title="The gateway to the red close">
        Three rules, enforced in code and on chain. Nothing to tune, nothing to pick.
      </SectionHead>
      <div className="mt-12 grid gap-5 md:grid-cols-3">
        {HOW.map((h) => (
          <article key={h.title} className="card-blush p-6">
            <Pedestal glyph={h.glyph} className="mx-auto h-40 w-auto" />
            <h3 className="mt-4 text-lg font-semibold tracking-tight">{h.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-mute">{h.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

const TILES = [
  { icon: "supply" as const, value: "1,000,000,000", label: "Fixed supply" },
  { icon: "decimals" as const, value: "6", label: "Decimals" },
  { icon: "curve" as const, value: "793.1M", label: "Sold on the curve" },
  { icon: "fee" as const, value: "1%", label: "0.5% creator · 0.5% platform" },
  { icon: "migrate" as const, value: "CPMM", label: "Graduates to Raydium" },
  { icon: "lp" as const, value: "Burn / lock", label: "LP never to the creator" },
];

function Economics() {
  return (
    <section className="mx-auto mt-28 max-w-6xl px-4 md:px-8">
      <SectionHead eyebrow="Economics" title="Fixed terms, no knobs">
        Every listing gets the same shape. Raydium&apos;s protocol fee from the config is added on top and shown
        before you sign.
      </SectionHead>
      <div className="mt-12 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {TILES.map((t) => (
          <div key={t.label} className="card p-4">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-blush text-brand">
              <TileIcon name={t.icon} />
            </span>
            <div className="mt-3 text-lg font-semibold tracking-tight">{t.value}</div>
            <div className="mt-0.5 text-xs leading-snug text-mute">{t.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function TheClock() {
  return (
    <section className="mx-auto mt-28 max-w-6xl px-4 md:px-8">
      <SectionHead eyebrow="The window" title="What the clock does" />
      <div className="mt-12 grid gap-5 md:grid-cols-2">
        <article className="card flex gap-5 p-6">
          <ClockArt hour={4} minute={0} className="h-24 w-24 shrink-0" />
          <div>
            <p className="eyebrow text-brand">16:00 ET</p>
            <h3 className="mt-1 text-lg font-semibold">The pad opens</h3>
            <p className="mt-2 text-sm leading-relaxed text-mute">
              At the US cash close the day&apos;s print is named and the form unlocks. Weekends and holidays stay
              inside the window that opened at the last close.
            </p>
          </div>
        </article>
        <article className="card flex gap-5 p-6">
          <ClockArt hour={9} minute={30} className="h-24 w-24 shrink-0" />
          <div>
            <p className="eyebrow text-brand">09:30 ET</p>
            <h3 className="mt-1 text-lg font-semibold">New listings stop</h3>
            <p className="mt-2 text-sm leading-relaxed text-mute">
              At the cash open the form locks. Curves already listed keep trading under LaunchLab&apos;s rules.
              Nothing is refunded; there is no refund instruction to call.
            </p>
          </div>
        </article>
      </div>
    </section>
  );
}

function BuiltOn() {
  const names = ["Solana", "Raydium LaunchLab", "xStocks", "Irys", "Phantom", "Solflare", "Backpack"];
  return (
    <section className="mx-auto mt-24 max-w-6xl px-4 md:px-8">
      <p className="eyebrow text-center text-faint">Built on</p>
      <ul className="mt-5 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
        {names.map((n) => (
          <li key={n} className="text-lg font-semibold tracking-tight text-[#b7aeb1]">
            {n}
          </li>
        ))}
      </ul>
    </section>
  );
}
