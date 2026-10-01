// The RedStonk mark, vectorized from the brand PNG (grid background removed).
// Two tones: the bright silhouette and the deep inner bands.

export const LOGO_BRIGHT = "#E61430";
export const LOGO_DEEP = "#960D1F";

/** Outer silhouette, with the upper counter cut out (even-odd). */
export const MARK_OUTER =
  "M70 33.5H124C142 33.5 149.5 42 149.5 56C149.5 64 148 70 145.5 73.5H130C141 73.5 150.5 80 150.5 95V99C150.5 106 148.5 115.5 144.5 115.5H106.5L114.5 98Q115.5 95.5 112.5 95.5H74L62.5 115.5H23.5Z M97 55H110Q113 55 112.5 58.5L106 73.5H86.5Z";

/** Deep inner bands of both bowls. */
export const MARK_INNER =
  "M83.5 45.5H124C129.5 45.5 132 49 131.5 54C131 61 127.5 70 125.5 73.5H67.5Z M97 55H110Q113 55 112.5 58.5L106 73.5H86.5Z M60.5 85.5H122C128.5 85.5 132 90 131.5 97C131 105 127.5 112 125.5 115.5H106.5L114.5 98Q115.5 95.5 112.5 95.5H74L62.5 115.5H43.5Z";

export const MARK_VIEWBOX = "20 30 134 90";

export function LogoMark({
  className,
  bright = LOGO_BRIGHT,
  deep = LOGO_DEEP,
  title = "RedStonk",
}: {
  className?: string;
  bright?: string;
  deep?: string;
  title?: string | null;
}) {
  return (
    <svg viewBox={MARK_VIEWBOX} className={className} role={title ? "img" : undefined} aria-hidden={title ? undefined : true}>
      {title && <title>{title}</title>}
      <path fill={bright} fillRule="evenodd" d={MARK_OUTER} />
      <path fill={deep} fillRule="evenodd" d={MARK_INNER} />
    </svg>
  );
}

/** Mark in a white tile plus the wordmark. `tone` sets the wordmark color for its background. */
export function Logo({ tone = "dark", className = "" }: { tone?: "dark" | "light"; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-white shadow-[0_6px_18px_-6px_rgba(150,13,31,0.45)] ring-1 ring-black/5">
        <LogoMark className="h-5 w-auto" title={null} />
      </span>
      <span className={`text-lg font-semibold tracking-tight ${tone === "light" ? "text-white" : "text-ink"}`}>
        RedStonk
      </span>
    </span>
  );
}
