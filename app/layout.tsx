import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { IBM_Plex_Mono, Newsreader } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { BottomNav, TopNav } from "@/components/nav";
import { WalletButton } from "@/components/wallet-button";
import { CLUSTER } from "@/lib/env";
import { TAGLINE } from "@/lib/copy";

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  style: ["normal", "italic"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "RedStonk",
  description: `${TAGLINE} A Solana launchpad that only opens against the day's reddest tokenized-stock close.`,
  metadataBase: new URL("https://redstonk.fun"),
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f4efe4",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${newsreader.variable} ${plexMono.variable}`}>
      <body className="min-h-dvh bg-paper text-ink">
        <Providers>
          <div className="mx-auto max-w-5xl px-4 md:px-8">
            <header className="pt-4 md:pt-6">
              <div className="flex items-center justify-between gap-3">
                <span className="kicker text-ink-soft">
                  {CLUSTER === "mainnet-beta" ? "Mainnet" : "Devnet"} · redstonk.fun
                </span>
                <WalletButton />
              </div>
              <div className="rule-thick mt-3" />
              <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1 py-2">
                <Link href="/" className="block">
                  <span className="text-[2.6rem] leading-none font-semibold tracking-tight md:text-6xl">RedStonk</span>
                </Link>
                <TopNav />
              </div>
              <div className="rule-double" />
              <p className="py-1.5 text-sm italic text-ink-soft">{TAGLINE}</p>
              <div className="rule" />
            </header>
            <main className="pb-nav pt-5">{children}</main>
          </div>
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
