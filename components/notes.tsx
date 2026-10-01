import { GENERIC_PAIRING_LINE, QUOTE_DISCLAIMER, pairingLine } from "@/lib/copy";

/** "Pairing is not ownership." Required on every launch screen and every token page. */
export function PairingNote({ xStock, ticker }: { xStock?: string; ticker?: string }) {
  return (
    <aside className="flex gap-3 rounded-2xl border border-[#ffd2d8] bg-blush px-4 py-3 text-sm leading-relaxed text-ink-soft">
      <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand text-[0.7rem] font-bold text-white">
        !
      </span>
      <p>
        <span className="font-semibold text-ink">Pairing is not ownership. </span>
        {xStock && ticker ? pairingLine(xStock, ticker) : GENERIC_PAIRING_LINE}
      </p>
    </aside>
  );
}

/** The verbatim quote disclaimer. Required in the launch footer and on the coin page. */
export function QuoteDisclaimer() {
  return (
    <div className="mt-8 rounded-2xl border border-line bg-canvas px-4 py-3">
      <p className="text-xs leading-relaxed text-mute">{QUOTE_DISCLAIMER}</p>
    </div>
  );
}

export function Banner({ tone = "plain", children }: { tone?: "plain" | "warn"; children: React.ReactNode }) {
  return (
    <div
      className={`mb-3 flex items-start gap-2 rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
        tone === "warn" ? "border border-[#ffc9d0] bg-blush text-brand-deep" : "border border-line bg-canvas text-mute"
      }`}
    >
      <span aria-hidden className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${tone === "warn" ? "bg-brand" : "bg-faint"}`} />
      <div>{children}</div>
    </div>
  );
}
