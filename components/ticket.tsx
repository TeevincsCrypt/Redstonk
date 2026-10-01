"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getConnection } from "@/lib/connection";
import { readOffchain, readTicket, type OffchainMetadata, type Ticket } from "@/lib/coin-read";
import { CLUSTER, PLATFORM_ID, explorerAddressUrl } from "@/lib/env";
import { formatUnits } from "@/lib/format";
import { curveProgress, poolStage, rateToPercent, RATE_DENOMINATOR } from "@/lib/launchlab-layout";
import { PairingNote, QuoteDisclaimer } from "./notes";
import { PageHero } from "./page-hero";

export function TicketView({ mint }: { mint: string }) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [offchain, setOffchain] = useState<OffchainMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const t = await readTicket(getConnection(), mint);
        if (!live) return;
        setTicket(t);
        if (t.kind === "coin" && t.metadata?.uri) {
          const o = await readOffchain(t.metadata.uri);
          if (live) setOffchain(o);
        }
      } catch (e) {
        if (live) setError(e instanceof Error ? e.message : "Could not read the chain.");
      }
    })();
    return () => {
      live = false;
    };
  }, [mint]);

  if (error) {
    return (
      <Shell>
        <Empty title="Could not read the ticket" body={error} />
      </Shell>
    );
  }
  if (!ticket) {
    return (
      <Shell>
        <p className="flex items-center gap-2 text-sm text-mute"><span className="h-2 w-2 animate-pulse rounded-full bg-brand" aria-hidden />Reading {CLUSTER}…</p>
      </Shell>
    );
  }
  if (ticket.kind === "invalid") {
    return (
      <Shell>
        <Empty title="Not a mint address" body={`"${mint}" is not a Solana address.`} />
      </Shell>
    );
  }
  if (ticket.kind === "unknown") {
    return (
      <Shell>
        <Empty title="Unknown coin" body={`There is no token mint at this address on ${CLUSTER}.`} mint={mint} />
      </Shell>
    );
  }

  const { metadata, pool, quote, quoteMint, platform, config } = ticket;
  const name = metadata?.name || "Unnamed coin";
  const symbol = metadata?.symbol || "—";
  const onRedStonk = !!pool && !!PLATFORM_ID && pool.platformId.toBase58() === PLATFORM_ID;

  return (
    <Shell>
      <article>
        <p className="eyebrow text-brand">{onRedStonk ? "Listed on RedStonk" : "LaunchLab coin"}</p>
        <div className="mt-2 flex items-start gap-4">
          {offchain?.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={offchain.image} alt="" className="h-20 w-20 shrink-0 rounded-2xl object-cover ring-1 ring-line" />
          )}
          <div className="min-w-0">
            <h2 className="text-4xl leading-tight font-semibold tracking-tight break-words md:text-5xl">{name}</h2>
            <p className="mt-1 inline-block rounded-full bg-blush px-3 py-0.5 font-mono text-sm font-semibold text-brand">${symbol}</p>
          </div>
        </div>
        {offchain?.description && <p className="mt-3 leading-relaxed text-ink-soft">{offchain.description}</p>}

        {pool && quote ? (
          <>
            <section className="card-blush mt-6 p-5">
              <div className="flex items-baseline justify-between">
                <span className="eyebrow text-mute">Quote</span>
                <span className="font-mono text-lg font-semibold">{quote.xStock}</span>
              </div>
              <Progress
                stage={poolStage(pool.status)}
                progress={curveProgress(pool)}
                raised={pool.realB}
                target={pool.totalFundRaisingB}
                decimals={pool.mintDecimalsB}
                xStock={quote.xStock}
              />
            </section>
            <div className="mt-4">
              <PairingNote xStock={quote.xStock} ticker={quote.ticker} />
            </div>
          </>
        ) : (
          <>
            <div className="mt-6 rounded-2xl border border-line bg-canvas p-4">
              <p className="text-lg font-semibold">No LaunchLab pool against a supported quote.</p>
              <p className="mt-1 text-sm text-ink-soft">
                This mint exists on {CLUSTER}, but RedStonk found no Raydium LaunchLab pool pairing it with any
                configured xStock. Curve progress cannot be read.
              </p>
            </div>
            <div className="mt-4">
              <PairingNote />
            </div>
          </>
        )}

        <dl className="mt-6">
          <Row k="Mint" v={<Addr a={ticket.mint.address} />} mono />
          {pool && <Row k="Pool" v={<Addr a={pool.id} />} mono />}
          {pool && quote && <Row k="Quote mint" v={<Addr a={pool.mintB.toBase58()} />} mono />}
          <Row k="Supply" v={`${formatUnits(BigInt(ticket.mint.supply), ticket.mint.decimals, 0)} · ${ticket.mint.decimals} decimals`} />
          <Row k="Mint authority" v={ticket.mint.mintAuthority ? <Addr a={ticket.mint.mintAuthority} /> : "none (revoked)"} mono={!!ticket.mint.mintAuthority} />
          <Row k="Freeze authority" v={ticket.mint.freezeAuthority ? <Addr a={ticket.mint.freezeAuthority} /> : "none"} mono={!!ticket.mint.freezeAuthority} />
          {pool && <Row k="Migrates to" v={pool.migrateType === 1 ? "Raydium CPMM" : "Raydium AMM v4"} />}
          {platform && <Row k="LP policy" v={lpPolicy(platform.burnScale, platform.platformScale, platform.creatorScale)} />}
          {platform && config && (
            <Row
              k="Fees per trade"
              v={`${(rateToPercent(config.tradeFeeRate) + rateToPercent(platform.feeRate) + rateToPercent(platform.creatorFeeRate)).toFixed(2)}% — creator ${rateToPercent(platform.creatorFeeRate).toFixed(2)}% · platform ${rateToPercent(platform.feeRate).toFixed(2)}% · Raydium ${rateToPercent(config.tradeFeeRate).toFixed(2)}%`}
            />
          )}
          {pool && (
            <Row
              k="Listed through"
              v={onRedStonk ? "RedStonk" : `Another LaunchLab platform${platform?.name ? ` (${platform.name})` : ""}`}
            />
          )}
          <Row k="Metadata" v={metadata ? `${metadata.source === "metaplex" ? "Metaplex" : "Token-2022"}${metadata.uri.startsWith("data:") ? " · inline (dev)" : ""}` : "none found"} />
          <Row k="Cluster" v={CLUSTER} />
        </dl>
        {quoteMint && (quoteMint.freezeAuthority || quoteMint.permanentDelegate || quoteMint.pausable) && (
          <p className="mt-3 text-xs text-faint">
            The quote token&apos;s issuer keeps{" "}
            {listJoin(
              [
                quoteMint.freezeAuthority && "a freeze authority",
                quoteMint.permanentDelegate && "a permanent delegate",
                quoteMint.pausable && "a pause switch",
              ].filter((x): x is string => !!x),
            )}{" "}
            on it.
          </p>
        )}
      </article>
    </Shell>
  );
}

function listJoin(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

function lpPolicy(burn: bigint, platformLock: bigint, creatorLock: bigint): string {
  const pct = (v: bigint) => {
    const n = (Number(v) / Number(RATE_DENOMINATOR)) * 100;
    return Number.isInteger(n) ? `${n}%` : `${n.toFixed(4)}%`;
  };
  const parts: string[] = [];
  if (burn > BigInt(0)) parts.push(`${pct(burn)} burned`);
  if (platformLock > BigInt(0)) parts.push(`${pct(platformLock)} locked by LaunchLab (platform fee key)`);
  if (creatorLock > BigInt(0)) parts.push(`${pct(creatorLock)} locked (creator fee key)`);
  return parts.length ? `${parts.join(" · ")}. No one can withdraw it.` : "—";
}

function Progress({
  stage,
  progress,
  raised,
  target,
  decimals,
  xStock,
}: {
  stage: ReturnType<typeof poolStage>;
  progress: number;
  raised: bigint;
  target: bigint;
  decimals: number;
  xStock: string;
}) {
  const label =
    stage === "migrated"
      ? "Graduated · migrated to CPMM"
      : stage === "migrating"
        ? "Graduated · migrating"
        : stage === "curve"
          ? "On the curve"
          : "Status unknown";
  return (
    <div className="mt-3">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="font-mono text-sm font-semibold text-brand tabular">{(progress * 100).toFixed(1)}%</span>
      </div>
      <div className="mt-2 h-3 overflow-hidden rounded-full bg-white ring-1 ring-[#ffd2d8]" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-[linear-gradient(90deg,#ff6b7a,#e61430)]" style={{ width: `${Math.max(0, Math.min(100, progress * 100))}%` }} />
      </div>
      <p className="mt-2 font-mono text-xs text-mute">
        {formatUnits(raised, decimals, 4)} of {formatUnits(target, decimals, 4)} {xStock} raised
      </p>
    </div>
  );
}

function Row({ k, v, mono = false }: { k: string; v: React.ReactNode; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[8rem_1fr] gap-3 border-b border-line py-2.5 text-sm last:border-b-0">
      <dt className="text-mute">{k}</dt>
      <dd className={`min-w-0 break-words ${mono ? "font-mono text-xs leading-5" : ""}`}>{v}</dd>
    </div>
  );
}

function Addr({ a }: { a: string }) {
  return (
    <a href={explorerAddressUrl(a)} target="_blank" rel="noreferrer" className="underline decoration-brand/30">
      {a}
    </a>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageHero eyebrow={`Ticket · ${CLUSTER}`} title="Coin ticket">
        Read straight from the chain: the mint, its metadata, and its Raydium LaunchLab pool.
      </PageHero>
      <div className="relative z-10 mx-auto -mt-20 max-w-2xl px-4 md:px-8">
        <div className="card p-5 md:p-8">{children}</div>
        <QuoteDisclaimer />
      </div>
    </>
  );
}

function Empty({ title, body, mint }: { title: string; body: string; mint?: string }) {
  return (
    <div>
      <h2 className="text-3xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-2 text-ink-soft">{body}</p>
      {mint && <p className="mt-2 font-mono text-xs break-all text-faint">{mint}</p>}
      <div className="mt-4">
        <PairingNote />
      </div>
      <Link href="/" className="btn btn-dark mt-6 h-11 px-5 text-sm">
        Back to the tape
      </Link>
    </div>
  );
}
