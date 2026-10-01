"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getConnection } from "@/lib/connection";
import { readOffchain, readTicket, type OffchainMetadata, type Ticket } from "@/lib/coin-read";
import { CLUSTER, PLATFORM_ID, explorerAddressUrl } from "@/lib/env";
import { formatUnits } from "@/lib/format";
import { curveProgress, poolStage, rateToPercent, RATE_DENOMINATOR } from "@/lib/launchlab-layout";
import { PairingNote, QuoteDisclaimer } from "./notes";

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
        <p className="kicker text-ink-faint">Reading {CLUSTER}…</p>
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
        <p className="kicker text-ink-soft">Ticket · {CLUSTER}</p>
        <div className="mt-2 flex items-start gap-4">
          {offchain?.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={offchain.image} alt="" className="h-20 w-20 shrink-0 border border-ink object-cover" />
          )}
          <div className="min-w-0">
            <h1 className="text-5xl leading-none font-semibold break-words">{name}</h1>
            <p className="mt-1 font-mono text-lg">${symbol}</p>
          </div>
        </div>
        {offchain?.description && <p className="mt-3 text-lg leading-snug">{offchain.description}</p>}

        {pool && quote ? (
          <>
            <section className="mt-6 border-2 border-ink p-4">
              <div className="flex items-baseline justify-between">
                <span className="kicker">Quote</span>
                <span className="font-mono text-lg">{quote.xStock}</span>
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
            <div className="mt-6 border border-ink p-4">
              <p className="text-lg">No LaunchLab pool against a supported quote.</p>
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
          <p className="mt-3 text-xs text-ink-faint">
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
        <span className="text-sm">{label}</span>
        <span className="font-mono tabular text-sm">{(progress * 100).toFixed(1)}%</span>
      </div>
      <div className="mt-1 h-3 border border-ink" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full bg-ink" style={{ width: `${Math.max(0, Math.min(100, progress * 100))}%` }} />
      </div>
      <p className="mt-1 font-mono text-xs text-ink-soft">
        {formatUnits(raised, decimals, 4)} of {formatUnits(target, decimals, 4)} {xStock} raised
      </p>
    </div>
  );
}

function Row({ k, v, mono = false }: { k: string; v: React.ReactNode; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[8.5rem_1fr] gap-3 border-b border-ink/20 py-2 text-sm">
      <dt className="text-ink-soft">{k}</dt>
      <dd className={`min-w-0 break-words ${mono ? "font-mono text-xs leading-5" : ""}`}>{v}</dd>
    </div>
  );
}

function Addr({ a }: { a: string }) {
  return (
    <a href={explorerAddressUrl(a)} target="_blank" rel="noreferrer" className="underline decoration-ink/30">
      {a}
    </a>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-xl">
      {children}
      <QuoteDisclaimer />
    </div>
  );
}

function Empty({ title, body, mint }: { title: string; body: string; mint?: string }) {
  return (
    <div className="py-6">
      <h1 className="text-4xl font-semibold">{title}</h1>
      <p className="mt-2 text-ink-soft">{body}</p>
      {mint && <p className="mt-2 font-mono text-xs break-all text-ink-faint">{mint}</p>}
      <div className="mt-4">
        <PairingNote />
      </div>
      <Link href="/" className="mt-6 inline-block font-mono text-xs uppercase tracking-[0.14em] underline">
        Back to the tape
      </Link>
    </div>
  );
}
