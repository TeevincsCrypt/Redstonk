import Link from "next/link";
import { Logo } from "./logo";
import { PillNav } from "./nav";
import { WalletButton } from "./wallet-button";
import { CLUSTER } from "@/lib/env";
import { GENERIC_PAIRING_LINE, QUOTE_DISCLAIMER, TAGLINE } from "@/lib/copy";

/** Transparent header that sits over each page's red hero. */
export function SiteHeader() {
  return (
    <header className="absolute inset-x-0 top-0 z-30">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 md:px-8 md:py-5">
        <div className="flex items-center gap-3">
          <Link href="/" aria-label="RedStonk home">
            <Logo tone="light" />
          </Link>
          <span className="hidden rounded-full bg-white/20 px-2.5 py-1 font-mono text-[0.65rem] uppercase tracking-wider text-white ring-1 ring-white/40 sm:inline">
            {CLUSTER === "mainnet-beta" ? "Mainnet" : "Devnet"}
          </span>
        </div>
        <PillNav />
        <WalletButton />
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 bg-ink text-white">
      <div className="mx-auto max-w-6xl px-4 pt-14 pb-[calc(7.5rem+env(safe-area-inset-bottom))] md:px-8 md:pb-10">
        <div className="grid gap-10 md:grid-cols-[1.2fr_1fr_1fr]">
          <div>
            <Logo tone="light" />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/60">
              {TAGLINE} A Solana launchpad that opens once a day, against the tokenized stock that closed worst.
            </p>
          </div>
          <div>
            <h2 className="eyebrow text-white/40">Pages</h2>
            <ul className="mt-4 space-y-2 text-sm text-white/80">
              <li>
                <Link href="/" className="hover:text-white">
                  Tape: today&apos;s print
                </Link>
              </li>
              <li>
                <Link href="/launch" className="hover:text-white">
                  List against the print
                </Link>
              </li>
              <li>
                <Link href="/desk" className="hover:text-white">
                  Desk: the floor manual
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h2 className="eyebrow text-white/40">Rail</h2>
            <ul className="mt-4 space-y-2 text-sm text-white/80">
              <li>Raydium LaunchLab bonding curves</li>
              <li>Migrates to Raydium CPMM</li>
              <li>Writes to {CLUSTER}</li>
            </ul>
          </div>
        </div>
        <div className="mt-12 space-y-3 border-t border-white/10 pt-6 text-xs leading-relaxed text-white/50">
          <p>{QUOTE_DISCLAIMER}</p>
          <p>{GENERIC_PAIRING_LINE}</p>
          <p className="text-white/35">redstonk.fun · No platform token · No team allocation · No custody</p>
        </div>
      </div>
    </footer>
  );
}
