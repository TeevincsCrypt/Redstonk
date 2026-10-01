import type { Metadata, Viewport } from "next";
import { DM_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { BottomNav } from "@/components/nav";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { TAGLINE } from "@/lib/copy";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
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
  themeColor: "#e3142f",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${plexMono.variable}`}>
      <body className="min-h-dvh bg-white text-ink">
        <Providers>
          <div className="relative">
            <SiteHeader />
            <main>{children}</main>
          </div>
          <SiteFooter />
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
