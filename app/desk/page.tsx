import type { Metadata } from "next";
import { QuoteDisclaimer } from "@/components/notes";
import { CLUSTER, LAUNCHLAB_PROGRAM_ID } from "@/lib/env";
import { QUOTES } from "@/lib/quotes";
import { GENERIC_PAIRING_LINE } from "@/lib/copy";

export const metadata: Metadata = { title: "Desk · RedStonk" };

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="rule pt-4 pb-6">
      <h2 className="flex items-baseline gap-3 text-2xl font-semibold">
        <span className="font-mono text-sm text-down">{n}</span>
        {title}
      </h2>
      <div className="mt-2 space-y-3 text-[1.05rem] leading-relaxed">{children}</div>
    </section>
  );
}

export default function DeskPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <p className="kicker text-ink-soft">Floor manual</p>
      <h1 className="mt-1 mb-6 text-5xl font-semibold">The desk</h1>

      <Section n="01" title="The rule">
        <p>
          One quote per US trading day. At the 16:00 ET cash close, RedStonk looks at the regular-session close of
          every supported name against its prior close. The single worst percentage close is the print. Only that
          token can be the quote, and only if it closed down.
        </p>
        <p>
          Supported: <span className="font-mono text-sm">{QUOTES.map((q) => q.xStock).join(", ")}</span>. Green and
          flat closes are ineligible. If two names tie on the percentage, the larger dollar volume wins, then the
          ticker that sorts first.
        </p>
        <p>
          If the worst close has no Raydium LaunchLab config, there is no launch that day. RedStonk does not fall
          through to the next red name, and does not build its own pool.
        </p>
        <p>
          If any supported close is missing, the print is not named. A missing price is never guessed.
        </p>
      </Section>

      <Section n="02" title="The window">
        <p>
          The form opens at the 16:00 ET close and locks at the next 09:30 ET cash open. A weekend or NYSE holiday
          sits inside the window that opened at the previous close. On early-close days the pad still waits for
          16:00.
        </p>
      </Section>

      <Section n="03" title="The rail">
        <p>
          Every listing is a Raydium LaunchLab bonding curve, created with the Raydium SDK and signed by your
          wallet. RedStonk has no program of its own. The quote mint comes from the LaunchLab config bound to the
          print, not from anything typed into the form.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Supply: 1,000,000,000 at 6 decimals. No team allocation. No platform token.</li>
          <li>Curve sell: LaunchLab&apos;s default for the bound config (793.1M on the standard shape).</li>
          <li>
            Fee: 1% to the pool (0.5% creator, 0.5% platform) when RedStonk&apos;s platform config is set that way,
            plus Raydium&apos;s protocol fee from the config. The sign screen shows the rates read from chain.
          </li>
          <li>Graduation: the curve migrates to a Raydium CPMM pool.</li>
          <li>
            LP: burned or locked by LaunchLab according to the platform config. RedStonk refuses to list through a
            platform config that hands LP to the creator. There is no withdraw button because there is nothing to
            withdraw.
          </li>
          <li>
            Mint and freeze authority: LaunchLab mints without either. The ticket page reads both from chain.
          </li>
        </ul>
        <p className="font-mono text-xs text-ink-soft">
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
        <ul className="list-disc space-y-1 pl-5">
          <li>No price, no return, and no floor. The quote token can fall with the stock, and so can the pair.</li>
          <li>No share, dividend, or vote. Not for the coin, and not for the quote.</li>
          <li>
            The quote&apos;s issuer keeps powers over it (on xStocks today: freeze, a permanent delegate, and a
            pause switch). Those are shown on the quote and ticket screens.
          </li>
          <li>No custody. RedStonk never holds your keys, your quote tokens, or LP.</li>
          <li>No volume or holder counts we cannot read from chain, and no badges.</li>
        </ul>
      </Section>

      <QuoteDisclaimer />
    </div>
  );
}
