import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/page-hero";
import { QuoteDisclaimer } from "@/components/notes";
import { CLUSTER, LAUNCHLAB_PROGRAM_ID } from "@/lib/env";
import { QUOTES } from "@/lib/quotes";
import { GENERIC_PAIRING_LINE } from "@/lib/copy";

export const metadata: Metadata = { title: "Desk · RedStonk" };

function Section({
  n,
  title,
  children,
  wide = false,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <section className={`card p-6 md:p-7 ${wide ? "md:col-span-2" : ""}`}>
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-blush font-mono text-xs font-semibold text-brand">
          {n}
        </span>
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      </div>
      <div className="mt-4 space-y-3 text-[0.95rem] leading-relaxed text-ink-soft">{children}</div>
    </section>
  );
}

function Bullets({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" aria-hidden />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function DeskPage() {
  return (
    <>
      <PageHero eyebrow="Floor manual" title="The desk">
        What the rule is, what the rail is, what happens at the open, and what we do not promise.
      </PageHero>

      <div className="relative z-10 mx-auto -mt-20 grid max-w-5xl grid-cols-[minmax(0,1fr)] gap-5 px-4 md:grid-cols-2 md:px-8">
        <Section n="01" title="The rule">
          <p>
            One quote per US trading day. At the 16:00 ET cash close, RedStonk compares every supported name&apos;s
            regular-session close with its prior close. The single worst percentage close is the print. Only that
            token can be the quote, and only if it closed down.
          </p>
          <p>
            Green and flat closes are ineligible. If two names tie, the larger dollar volume wins, then the ticker
            that sorts first.
          </p>
          <p>
            If the worst close has no Raydium LaunchLab config, there is no launch that day. RedStonk does not fall
            through to the next red name, and does not build its own pool. If any supported close is missing, the
            print is not named. A missing price is never guessed.
          </p>
        </Section>

        <Section n="02" title="The window">
          <p>
            The form opens at the 16:00 ET close and locks at the next 09:30 ET cash open. A weekend or NYSE holiday
            sits inside the window that opened at the previous close. On early-close days the pad still waits for
            16:00.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {QUOTES.map((q) => (
              <span key={q.ticker} className="rounded-full bg-canvas px-3 py-1 font-mono text-xs text-ink ring-1 ring-line">
                {q.xStock}
              </span>
            ))}
          </div>
          <p className="text-sm text-mute">The supported set: the only names that can ever be the quote.</p>
        </Section>

        <Section n="03" title="The rail" wide>
          <p>
            Every listing is a Raydium LaunchLab bonding curve, created with the Raydium SDK and signed by your
            wallet. RedStonk has no program of its own. The quote mint comes from the LaunchLab config bound to the
            print, not from anything typed into the form.
          </p>
          <Bullets
            items={[
              "Supply: 1,000,000,000 at 6 decimals. No team allocation. No platform token.",
              "Curve sell: LaunchLab's default for the bound config (793.1M on the standard shape).",
              "Fee: 1% to the pool (0.5% creator, 0.5% platform) when RedStonk's platform config is set that way, plus Raydium's protocol fee from the config. The sign screen shows the rates read from chain.",
              "Graduation: the curve migrates to a Raydium CPMM pool.",
              "LP: burned or locked by LaunchLab under the platform config. RedStonk refuses to list through a platform config that hands LP to the creator. There is no withdraw button because there is nothing to withdraw.",
              "Mint and freeze authority: LaunchLab mints without either. The ticket page reads both from chain.",
            ]}
          />
          <p className="rounded-2xl bg-canvas px-4 py-2.5 font-mono text-xs break-all text-mute ring-1 ring-line">
            Cluster {CLUSTER} · LaunchLab {LAUNCHLAB_PROGRAM_ID}
          </p>
        </Section>

        <Section n="04" title="What happens at the open">
          <p>
            At 09:30 ET, new listings stop. That is all. Curves already listed keep trading under LaunchLab&apos;s
            normal rules until they graduate or until people stop trading them.
          </p>
          <p>
            Nothing is refunded. LaunchLab has no refund for an unfilled curve, and RedStonk does not invent one. You
            will never see a &ldquo;refunded&rdquo; state here.
          </p>
        </Section>

        <Section n="05" title="What we do not promise">
          <p>{GENERIC_PAIRING_LINE}</p>
          <Bullets
            items={[
              "No price, no return, and no floor. The quote token can fall with the stock, and so can the pair.",
              "No share, dividend, or vote, for the coin or for the quote.",
              "The quote's issuer keeps powers over it (on xStocks today: freeze, a permanent delegate, and a pause switch). Those are shown on the quote and ticket screens.",
              "No custody. RedStonk never holds your keys, your quote tokens, or LP.",
              "No volume or holder counts we cannot read from chain, and no badges.",
            ]}
          />
        </Section>
      </div>

      <div className="mx-auto max-w-5xl px-4 md:px-8">
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/" className="btn btn-dark h-12 px-6 text-sm">
            See today&apos;s print <span aria-hidden>→</span>
          </Link>
          <Link href="/launch" className="btn btn-outline h-12 px-6 text-sm">
            List against it
          </Link>
        </div>
        <QuoteDisclaimer />
      </div>
    </>
  );
}
