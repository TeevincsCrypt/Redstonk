import { GENERIC_PAIRING_LINE, QUOTE_DISCLAIMER, pairingLine } from "@/lib/copy";

/** "Pairing is not ownership." Required on every launch screen and every token page. */
export function PairingNote({ xStock, ticker }: { xStock?: string; ticker?: string }) {
  return (
    <aside className="border-l-2 border-down bg-down-wash/50 px-3 py-2 text-sm leading-snug">
      <span className="kicker mr-2 text-down">Pairing is not ownership</span>
      {xStock && ticker ? pairingLine(xStock, ticker) : GENERIC_PAIRING_LINE}
    </aside>
  );
}

/** The verbatim quote disclaimer. Required in the launch footer and on the coin page. */
export function QuoteDisclaimer() {
  return (
    <footer className="rule mt-8 pt-3">
      <p className="text-sm leading-relaxed text-ink-soft">{QUOTE_DISCLAIMER}</p>
    </footer>
  );
}

export function Banner({ tone = "plain", children }: { tone?: "plain" | "warn"; children: React.ReactNode }) {
  return (
    <div
      className={`mb-4 border px-3 py-2 font-mono text-xs leading-relaxed ${
        tone === "warn" ? "border-down text-down" : "border-ink text-ink-soft"
      }`}
    >
      {children}
    </div>
  );
}
