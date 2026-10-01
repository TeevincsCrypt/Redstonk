"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Countdown } from "./countdown";
import { Banner, PairingNote, QuoteDisclaimer } from "./notes";
import { WalletButton } from "./wallet-button";
import { PageHero } from "./page-hero";
import { fetchPrint, usePrint } from "./use-print";
import { CLUSTER, IS_MAINNET, PLATFORM_ID, explorerAddressUrl, explorerTxUrl } from "@/lib/env";
import { formatEt, formatPct, formatUnits, formatUsd, shortAddress } from "@/lib/format";
import { formatSessionDate } from "@/lib/market-clock";
import {
  BLURB_MAX,
  IMAGE_MAX_BYTES,
  IMAGE_TYPES,
  NAME_MAX_BYTES,
  SYMBOL_MAX,
  normalizeTicker,
  validateListing,
  type ListingErrors,
} from "@/lib/metadata";
import { findQuote } from "@/lib/quotes";
import { loadCurveSheet, loadQuoteBalance, type CurveSheet } from "@/lib/launch-sheet";
import { rawToUi, uiToRaw } from "@/lib/quote-mint";
import { PLATFORM_NOT_CONFIGURED } from "@/lib/launch-guards";
import { STAGE_LABEL, SimulationFailed, runLaunch, type LaunchResult, type LaunchStage } from "@/lib/launch-tx";
import type { PrintResponse } from "@/lib/print-response";
import { UNDERLYING } from "@/lib/copy";

type Step = 1 | 2 | 3;

const btnPrimary = "btn btn-dark h-12 w-full px-5 text-sm";
const btnGhost = "btn btn-outline h-12 px-5 text-sm";
const input = "field mt-1.5";

export function LaunchFlow({
  initial,
  irysReady,
  nowOverride,
}: {
  initial: PrintResponse;
  irysReady: boolean;
  nowOverride?: string;
}) {
  const { data, skewMs, refresh } = usePrint(initial, nowOverride);
  const print = data ?? initial;
  const winner = print.window === "open" ? print.winner : null;
  const locked = !winner;

  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [confirmedTicker, setConfirmedTicker] = useState<string | null>(null);
  const [result, setResult] = useState<LaunchResult | null>(null);

  const errors: ListingErrors = useMemo(
    () => validateListing({ name, symbol, description }),
    [name, symbol, description],
  );
  const listingValid = Object.keys(errors).length === 0 && !imageError;

  // If the print moves on (window shuts, or a new winner), the earlier confirmation is void.
  useEffect(() => {
    if (confirmedTicker && winner?.ticker !== confirmedTicker) {
      setConfirmedTicker(null);
      if (step === 3) setStep(2);
    }
  }, [winner?.ticker, confirmedTicker, step]);
  useEffect(() => {
    if (locked && step !== 1 && !result) setStep(1);
  }, [locked, step, result]);

  if (result) return <Success result={result} print={print} />;

  return (
    <>
      <PageHero eyebrow="List" title="List against the print">
        One coin, one quote, one signature. The quote is whatever closed worst. There is no picker.
      </PageHero>
      <div className="relative z-10 mx-auto -mt-20 max-w-2xl px-4 md:px-8">
      <div className="card p-5 md:p-8">
      {nowOverride && <Banner tone="warn">Dev clock override: {nowOverride}</Banner>}
      {print.source?.kind === "fixture" && <Banner tone="warn">{print.source.label}</Banner>}
      {!irysReady &&
        (IS_MAINNET ? (
          <Banner tone="warn">Mainnet launch disabled: IRYS_PRIVATE_KEY is not set, so metadata cannot be stored.</Banner>
        ) : (
          <Banner>
            Dev metadata: IRYS_PRIVATE_KEY is not set, so token metadata is an inline data URI (image dropped,
            blurb trimmed to 200 bytes). Mainnet launch is disabled until Irys is configured.
          </Banner>
        ))}
      {!PLATFORM_ID && <Banner tone="warn">{PLATFORM_NOT_CONFIGURED} Listing is disabled.</Banner>}

      <StepRail step={step} />

      {locked && <LockedNotice print={print} skewMs={skewMs} onBell={refresh} />}

      {step === 1 && (
        <section aria-labelledby="step1">
          <h1 id="step1" className="text-2xl font-semibold tracking-tight md:text-3xl">
            The coin
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-mute">
            Fixed supply of 1,000,000,000 at 6 decimals. No team allocation, no mint or freeze authority kept.
          </p>
          <fieldset disabled={locked} className="mt-5 space-y-5">
            <label className="block">
              <span className="eyebrow text-mute">Name</span>
              <input
                className={input}
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="off"
                placeholder="Red Candle"
              />
              <FieldNote error={showErrors ? errors.name : undefined}>Up to {NAME_MAX_BYTES} bytes.</FieldNote>
            </label>
            <label className="block">
              <span className="eyebrow text-mute">Ticker</span>
              <input
                className={`${input} font-mono uppercase`}
                value={symbol}
                onChange={(e) => setSymbol(normalizeTicker(e.target.value))}
                maxLength={SYMBOL_MAX}
                autoComplete="off"
                autoCapitalize="characters"
                placeholder="CANDLE"
              />
              <FieldNote error={showErrors ? errors.symbol : undefined}>
                A–Z, 0–9, up to {SYMBOL_MAX}. Uppercased.
              </FieldNote>
            </label>
            <label className="block">
              <span className="eyebrow text-mute">Blurb</span>
              <textarea
                className={`${input} min-h-24 text-base`}
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, BLURB_MAX))}
                placeholder="One line on why this exists."
              />
              <FieldNote error={showErrors ? errors.description : undefined}>
                {description.length}/{BLURB_MAX}
              </FieldNote>
            </label>
            <ImageField image={image} error={imageError} onChange={(img, err) => (setImage(img), setImageError(err))} />
          </fieldset>
          <div className="mt-6">
            <button
              type="button"
              className={btnPrimary}
              disabled={locked}
              onClick={() => {
                setShowErrors(true);
                if (listingValid) setStep(2);
              }}
            >
              Next: confirm the quote
            </button>
          </div>
        </section>
      )}

      {step === 2 && winner && (
        <ConfirmQuote
          print={print}
          onBack={() => setStep(1)}
          onConfirm={() => {
            setConfirmedTicker(winner.ticker);
            setStep(3);
          }}
        />
      )}

      {step === 3 && winner && confirmedTicker === winner.ticker && (
        <SignStep
          print={print}
          confirmedTicker={confirmedTicker}
          irysReady={irysReady}
          listing={{ name, symbol, description, image }}
          nowOverride={nowOverride}
          onBack={() => setStep(2)}
          onDone={setResult}
        />
      )}

      </div>
      <div className="mt-6">
        <PairingNote xStock={winner?.xStock ?? print.print?.xStock} ticker={winner?.ticker ?? print.print?.ticker} />
      </div>
      <QuoteDisclaimer />
      </div>
    </>
  );
}

function StepRail({ step }: { step: Step }) {
  const items = ["Coin", "Quote", "Sign"];
  return (
    <ol className="mb-6 grid grid-cols-3 gap-1 rounded-full bg-canvas p-1 ring-1 ring-line">
      {items.map((label, i) => {
        const n = (i + 1) as Step;
        const state = n === step ? "bg-ink text-white shadow-sm" : n < step ? "text-ink" : "text-faint";
        return (
          <li key={label} className={`rounded-full py-2 text-center text-xs font-medium ${state}`}>
            {n < step ? "✓" : n}. {label}
          </li>
        );
      })}
    </ol>
  );
}

function LockedNotice({ print, skewMs, onBell }: { print: PrintResponse; skewMs: number; onBell: () => void }) {
  let title = "Form locked";
  let body: React.ReactNode = print.message;
  if (print.window === "shut") {
    title = "Pad shut";
    body = (
      <>
        Listings open at the 16:00 ET close ({formatEt(print.nextClose)}) in{" "}
        <Countdown target={print.nextClose} skewMs={skewMs} onDone={onBell} className="text-brand" />.
      </>
    );
  } else if (print.verdict === "no-curve-config") {
    title = "No curve config for this print";
    body = `${print.print?.xStock ?? "Today's print"} has no verified LaunchLab config on ${print.cluster}. Listing is hidden.`;
  } else if (print.verdict === "no-red-print") {
    title = "No red print";
    body = (
      <>
        Every supported name closed flat or green. Next close in{" "}
        <Countdown target={print.nextClose} skewMs={skewMs} onDone={onBell} />.
      </>
    );
  }
  return (
    <div className="mb-6 rounded-2xl border border-[#ffd2d8] bg-[linear-gradient(180deg,#fff0f2,#ffffff)] p-4">
      <p className="flex items-center gap-2 text-lg font-semibold">
        <span className="h-2 w-2 rounded-full bg-brand" aria-hidden />
        {title}
      </p>
      <p className="mt-1 text-sm leading-relaxed text-ink-soft">{body}</p>
    </div>
  );
}

function FieldNote({ error, children }: { error?: string; children: React.ReactNode }) {
  return error ? (
    <span className="mt-1.5 block text-sm text-brand">{error}</span>
  ) : (
    <span className="mt-1.5 block text-xs text-faint">{children}</span>
  );
}

function ImageField({
  image,
  error,
  onChange,
}: {
  image: string | null;
  error: string | null;
  onChange: (image: string | null, error: string | null) => void;
}) {
  return (
    <div>
      <span className="eyebrow text-mute">Image</span>
      <div className="mt-1 flex items-center gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-line bg-blush">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="Coin image preview" className="h-full w-full object-cover" />
          ) : (
            <span className="font-mono text-xs text-faint">none</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <input
            type="file"
            accept={IMAGE_TYPES.join(",")}
            className="block w-full text-sm text-mute file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-ink file:px-3.5 file:py-2 file:text-xs file:font-medium file:text-white"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return onChange(null, null);
              if (!(IMAGE_TYPES as readonly string[]).includes(file.type)) return onChange(null, "PNG, JPEG, GIF, or WebP.");
              if (file.size > IMAGE_MAX_BYTES) return onChange(null, "Image is larger than 1 MB.");
              const reader = new FileReader();
              reader.onload = () => onChange(String(reader.result), null);
              reader.onerror = () => onChange(null, "Could not read that file.");
              reader.readAsDataURL(file);
            }}
          />
          {image && (
            <button type="button" className="mt-1.5 text-xs text-brand underline" onClick={() => onChange(null, null)}>
              Remove
            </button>
          )}
        </div>
      </div>
      <FieldNote error={error ?? undefined}>Optional. Up to 1 MB.</FieldNote>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------

function useCurveSheet(print: PrintResponse) {
  const winner = print.winner;
  const [sheet, setSheet] = useState<CurveSheet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    if (!winner) return;
    const quote = findQuote(winner.ticker);
    if (!quote) return setError("Unknown quote.");
    setLoading(true);
    setError(null);
    try {
      setSheet(await loadCurveSheet(winner, quote));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read the chain.");
    } finally {
      setLoading(false);
    }
  }, [winner]);
  useEffect(() => {
    void load();
  }, [load]);
  return { sheet, error, loading, reload: load };
}

function Row({ k, v, mono = false }: { k: string; v: React.ReactNode; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[8rem_1fr] gap-3 border-b border-line py-2.5 text-sm last:border-b-0">
      <dt className="text-mute">{k}</dt>
      <dd className={`min-w-0 break-words ${mono ? "font-mono text-xs leading-5" : ""}`}>{v}</dd>
    </div>
  );
}

function ConfirmQuote({ print, onBack, onConfirm }: { print: PrintResponse; onBack: () => void; onConfirm: () => void }) {
  const w = print.winner!;
  const { sheet, error, loading } = useCurveSheet(print);
  const q = sheet?.quote;
  return (
    <section aria-labelledby="step2">
      <h1 id="step2" className="text-2xl font-semibold tracking-tight md:text-3xl">
        The quote
      </h1>
      <p className="mt-1.5 text-sm leading-relaxed text-mute">
        One quote per US trading day: the worst close. There is no picker. This coin will trade against{" "}
        {w.xStock} or not at all.
      </p>

      <div className="card-blush mt-5 p-5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-mono text-xl font-semibold">{w.xStock}</span>
          <span className="text-sm text-ink-soft">{UNDERLYING[w.ticker] ?? w.ticker}</span>
        </div>
        <div className="mt-2 text-6xl leading-none font-semibold tracking-tight text-brand tabular">{formatPct(w.changePct)}</div>
        <dl className="mt-4">
          <Row k="Close" v={<span className="font-mono tabular">{formatUsd(w.close)}</span>} />
          <Row k="Prior close" v={<span className="font-mono tabular">{formatUsd(w.prevClose)}</span>} />
          <Row k="Session" v={formatSessionDate(w.sessionDate)} />
          <Row k="Quote mint" v={<AddressLink addr={w.mint} />} mono />
          <Row k="LaunchLab config" v={<AddressLink addr={w.configId} />} mono />
          <Row k="Cluster" v={CLUSTER} />
        </dl>
      </div>

      <div className="mt-4">
        <h2 className="eyebrow text-mute">Issuer controls on the quote</h2>
        {loading && <p className="mt-1 text-sm text-faint">Reading the mint…</p>}
        {error && <p className="mt-1 text-sm text-brand">{error}</p>}
        {q && (
          <dl className="mt-1">
            <Row k="Token program" v={q.isToken2022 ? "Token-2022" : "SPL Token"} />
            <Row k="Freeze authority" v={q.freezeAuthority ? shortAddress(q.freezeAuthority) : "none"} mono />
            <Row k="Permanent delegate" v={q.permanentDelegate ? shortAddress(q.permanentDelegate) : "none"} mono />
            <Row k="Pausable" v={q.pausable ? (q.paused ? "yes — currently PAUSED" : "yes") : "no"} />
            {q.uiMultiplier !== 1 && <Row k="UI multiplier" v={q.uiMultiplier.toFixed(6)} mono />}
          </dl>
        )}
        <p className="mt-2 text-xs text-faint">
          Read live from {CLUSTER}. An issuer with these powers can freeze, pause, or move the quote token.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-[auto_1fr] gap-3">
        <button type="button" className={btnGhost} onClick={onBack}>
          Back
        </button>
        <button type="button" className={btnPrimary} onClick={onConfirm} disabled={!sheet && !error}>
          Confirm {w.xStock}
        </button>
      </div>
    </section>
  );
}

function AddressLink({ addr }: { addr: string }) {
  return (
    <a href={explorerAddressUrl(addr)} target="_blank" rel="noreferrer" className="underline decoration-brand/30">
      {addr}
    </a>
  );
}

function SignStep({
  print,
  confirmedTicker,
  irysReady,
  listing,
  nowOverride,
  onBack,
  onDone,
}: {
  print: PrintResponse;
  confirmedTicker: string;
  irysReady: boolean;
  listing: { name: string; symbol: string; description: string; image: string | null };
  nowOverride?: string;
  onBack: () => void;
  onDone: (r: LaunchResult) => void;
}) {
  const w = print.winner!;
  const wallet = useWallet();
  const { sheet, error: sheetError, loading, reload } = useCurveSheet(print);
  const [balance, setBalance] = useState<bigint | null>(null);
  const [buyUi, setBuyUi] = useState("");
  const [stage, setStage] = useState<{ stage: LaunchStage; detail?: string } | null>(null);
  const [failure, setFailure] = useState<{ message: string; logs: string[] } | null>(null);

  useEffect(() => {
    if (!wallet.publicKey) return setBalance(null);
    loadQuoteBalance(wallet.publicKey, w.mint)
      .then(setBalance)
      .catch(() => setBalance(null));
  }, [wallet.publicKey, w.mint]);

  const quote = sheet?.quote;
  let buyRaw = BigInt(0);
  let buyError: string | null = null;
  if (buyUi.trim() !== "" && quote) {
    try {
      buyRaw = uiToRaw(buyUi, quote.decimals, quote.uiMultiplier);
      if (balance != null && buyRaw > balance) buyError = `More than your ${w.xStock} balance.`;
    } catch (e) {
      buyError = (e as Error).message;
    }
  }

  const blockers: string[] = [];
  if (!PLATFORM_ID) blockers.push(PLATFORM_NOT_CONFIGURED);
  if (IS_MAINNET && !irysReady) blockers.push("Mainnet launch disabled: IRYS_PRIVATE_KEY is not set.");
  if (sheetError) blockers.push(sheetError);
  for (const p of sheet?.problems ?? []) if (!blockers.includes(p)) blockers.push(p);
  if (buyError) blockers.push(buyError);
  if (!wallet.publicKey) blockers.push("Connect a wallet to sign.");

  const running = stage != null && failure == null;
  const canSign = !running && !loading && sheet != null && blockers.length === 0;

  async function sign() {
    if (!wallet.publicKey) return;
    setFailure(null);
    try {
      const r = await runLaunch(
        {
          listing,
          confirmedTicker,
          sheet: sheet!,
          firstBuyRaw: buyRaw,
          fetchPrint: () => fetchPrint(nowOverride),
        },
        {
          publicKey: wallet.publicKey,
          signTransaction: wallet.signTransaction,
          signAllTransactions: wallet.signAllTransactions,
        },
        (s, detail) => setStage({ stage: s, detail }),
      );
      onDone(r);
    } catch (e) {
      const logs = e instanceof SimulationFailed ? e.logs : [];
      setFailure({ message: e instanceof Error ? e.message : String(e), logs });
    }
  }

  const fees = sheet?.fees;
  const lp = sheet?.lp;
  const econ = sheet?.economics;

  return (
    <section aria-labelledby="step3">
      <h1 id="step3" className="text-2xl font-semibold tracking-tight md:text-3xl">
        Fees and sign
      </h1>
      <p className="mt-1.5 text-sm leading-relaxed text-mute">
        {listing.name || "Your coin"} <span className="font-mono">${listing.symbol}</span> against{" "}
        <span className="font-mono">{w.xStock}</span> on Raydium LaunchLab, {CLUSTER}.
      </p>

      {loading && <p className="mt-4 text-sm text-faint">Reading config, platform, and quote from {CLUSTER}…</p>}

      {sheet && (
        <>
          <h2 className="eyebrow mt-6 text-mute">Fee line</h2>
          <dl className="mt-1">
            {fees ? (
              <>
                <Row
                  k="RedStonk fee"
                  v={
                    fees.onTarget
                      ? "1% — 0.5% creator / 0.5% platform"
                      : `${formatPct(fees.creatorPct + fees.platformPct).replace("+", "")} — ${fees.creatorPct.toFixed(2)}% creator / ${fees.platformPct.toFixed(2)}% platform (platform config differs from the 1% target)`
                  }
                />
                <Row k="Raydium protocol" v={`${fees.protocolPct.toFixed(2)}% (set by the LaunchLab config)`} />
                <Row k="Total per trade" v={<strong>{fees.totalPct.toFixed(2)}%</strong>} />
              </>
            ) : (
              <Row k="Fees" v="Unavailable until the platform config can be read." />
            )}
          </dl>

          <h2 className="eyebrow mt-6 text-mute">Curve</h2>
          <dl className="mt-1">
            <Row k="Supply" v="1,000,000,000 · 6 decimals" />
            <Row
              k="Curve sell"
              v={econ ? `${formatUnits(econ.totalSellA, 6, 1)} tokens` : "—"}
            />
            <Row
              k="Graduation"
              v={
                econ && quote
                  ? `${formatUnits(econ.totalFundRaisingB, quote.decimals, 4)} ${w.xStock} raised${econ.source === "env" ? " (operator target)" : " (LaunchLab default)"}`
                  : "—"
              }
            />
            <Row k="Then" v="Migrates to a Raydium CPMM pool" />
            <Row
              k="LP policy"
              v={
                lp
                  ? [
                      lp.burnPct > 0 && `${lp.burnPct.toFixed(lp.burnPct % 1 ? 4 : 0)}% burned`,
                      lp.platformLockPct > 0 && `${lp.platformLockPct.toFixed(lp.platformLockPct % 1 ? 4 : 0)}% locked by LaunchLab (platform fee key)`,
                      lp.creatorLockPct > 0 && `${lp.creatorLockPct.toFixed(2)}% locked (creator fee key)`,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "—"
                  : "—"
              }
            />
            <Row k="Refund at open" v="None. Unfilled curves keep trading under LaunchLab rules." />
          </dl>

          <h2 className="eyebrow mt-6 text-mute">First buy (optional)</h2>
          <label className="mt-1 block">
            <div className="flex items-center gap-2">
              <input
                className={`${input} mt-0 font-mono`}
                inputMode="decimal"
                placeholder="0"
                value={buyUi}
                onChange={(e) => setBuyUi(e.target.value.replace(/[^0-9.]/g, ""))}
                disabled={running}
              />
              <span className="font-mono text-sm">{w.xStock}</span>
            </div>
            <span className="mt-1 block text-xs text-faint">
              {balance != null && quote
                ? `Balance ${rawToUi(balance, quote.decimals, quote.uiMultiplier).toLocaleString("en-US", { maximumFractionDigits: 6 })} ${w.xStock}. `
                : ""}
              Bought in the same signing step, 1% slippage. Leave empty to list only.
            </span>
          </label>
        </>
      )}

      {blockers.length > 0 && (
        <ul className="mt-5 space-y-1 rounded-2xl border border-[#ffd2d8] bg-blush px-4 py-3 text-sm text-brand-deep">
          {blockers.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      )}
      {sheetError && (
        <button type="button" className="mt-2 text-xs text-brand underline" onClick={() => void reload()}>
          Retry reading the chain
        </button>
      )}

      {stage && !failure && (
        <p className="mt-5 flex items-center gap-2 text-sm text-ink-soft" aria-live="polite">
          <span className="h-2 w-2 animate-pulse rounded-full bg-brand" aria-hidden />
          {STAGE_LABEL[stage.stage]}…{stage.detail ? ` ${stage.stage === "confirming" ? shortAddress(stage.detail, 6) : stage.detail}` : ""}
        </p>
      )}
      {failure && (
        <div className="mt-5 rounded-2xl border border-[#ffd2d8] bg-blush p-4 text-sm text-brand-deep" role="alert">
          <p>{failure.message}</p>
          {failure.logs.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer font-mono text-xs">Program logs</summary>
              <pre className="mt-2 max-h-64 overflow-auto font-mono text-[11px] leading-4 whitespace-pre-wrap text-ink-soft">
                {failure.logs.join("\n")}
              </pre>
            </details>
          )}
        </div>
      )}

      <div className="mt-6 space-y-3">
        {!wallet.publicKey && <WalletButton block />}
        <div className="grid grid-cols-[auto_1fr] gap-3">
          <button type="button" className={btnGhost} onClick={onBack} disabled={running}>
            Back
          </button>
          <button type="button" className={btnPrimary} onClick={() => void sign()} disabled={!canSign}>
            {running ? "Working…" : "Sign listing"}
          </button>
        </div>
        <p className="text-xs text-faint">
          Your wallet shows every transaction before it is sent. Nothing is sent that you did not sign.
        </p>
      </div>
    </section>
  );
}

function Success({ result, print }: { result: LaunchResult; print: PrintResponse }) {
  return (
    <>
      <PageHero eyebrow="Signed and sent" title="Listed.">
        Your coin is on a Raydium LaunchLab curve against {print.winner?.xStock ?? "today's print"} on {CLUSTER}.
      </PageHero>
      <div className="relative z-10 mx-auto -mt-20 max-w-2xl px-4 md:px-8">
      <div className="card p-5 md:p-8">
      <dl className="mt-5">
        <Row k="Mint" v={<AddressLink addr={result.mint} />} mono />
        <Row k="Pool" v={<AddressLink addr={result.poolId} />} mono />
        {result.signatures.map((sig, i) => (
          <Row
            key={sig}
            k={result.signatures.length > 1 ? `Signature ${i + 1}` : "Signature"}
            v={
              <a href={explorerTxUrl(sig)} target="_blank" rel="noreferrer" className="underline decoration-brand/30">
                {sig}
              </a>
            }
            mono
          />
        ))}
        <Row k="Metadata" v={result.metadataUri.startsWith("data:") ? "inline data URI (dev)" : result.metadataUri} mono />
      </dl>
      {result.metadataNotes.map((n) => (
        <p key={n} className="mt-2 text-xs text-faint">
          {n}
        </p>
      ))}
      {!result.poolFound && (
        <p className="mt-3 text-sm text-brand">
          The pool account did not show up on your RPC within 30 seconds. The ticket page reads it once it does.
        </p>
      )}
      <Link href={`/coin/${result.mint}`} className={`${btnPrimary} mt-6`}>
        Open the ticket <span aria-hidden>→</span>
      </Link>
      </div>
      <div className="mt-6">
        <PairingNote xStock={print.winner?.xStock} ticker={print.winner?.ticker} />
      </div>
      <QuoteDisclaimer />
      </div>
    </>
  );
}
