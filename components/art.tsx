// Decorative illustrations: the hero coin, the pedestal icons, and small line glyphs.
// All are aria-hidden SVG so they stay sharp at any size and add no network requests.

import { useId } from "react";
import { MARK_INNER, MARK_OUTER } from "./logo";

/** A glossy RedStonk coin standing on a red glow, turned slightly toward the viewer. */
export function HeroCoin({ className = "" }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  const g = (n: string) => `${id}-${n}`;
  return (
    <svg viewBox="0 0 360 380" className={className} aria-hidden>
      <defs>
        <radialGradient id={g("glow")} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ff2a43" stopOpacity="0.85" />
          <stop offset="55%" stopColor="#e61430" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#e61430" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={g("edge")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#b5122a" />
          <stop offset="100%" stopColor="#5e0612" />
        </linearGradient>
        <linearGradient id={g("rim")} x1="0.15" y1="0.05" x2="0.85" y2="0.95">
          <stop offset="0%" stopColor="#ff8e9a" />
          <stop offset="38%" stopColor="#f0283f" />
          <stop offset="100%" stopColor="#a10e25" />
        </linearGradient>
        <radialGradient id={g("face")} cx="38%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#ffe3e7" />
          <stop offset="100%" stopColor="#ffb9c2" />
        </radialGradient>
        <filter id={g("blur")} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
        <filter id={g("soft")} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>

      {/* floor glow and contact shadow */}
      <ellipse cx="180" cy="338" rx="150" ry="34" fill={`url(#${g("glow")})`} filter={`url(#${g("blur")})`} />
      <ellipse cx="184" cy="334" rx="92" ry="12" fill="#3d0410" opacity="0.45" filter={`url(#${g("soft")})`} />

      <g transform="rotate(-8 180 180)">
        {/* coin thickness */}
        <ellipse cx="196" cy="176" rx="118" ry="148" fill={`url(#${g("edge")})`} />
        {/* coin face (rim) */}
        <ellipse cx="180" cy="172" rx="118" ry="148" fill={`url(#${g("rim")})`} />
        {/* recessed inner face */}
        <ellipse cx="180" cy="172" rx="92" ry="118" fill="#8f0b20" opacity="0.55" />
        <ellipse cx="178" cy="169" rx="90" ry="116" fill={`url(#${g("face")})`} />
        <ellipse cx="178" cy="169" rx="90" ry="116" fill="none" stroke="#ffffff" strokeOpacity="0.8" strokeWidth="2" />
        {/* the mark, with a little extrusion */}
        <g transform="translate(108 122) scale(1.05)">
          <g transform="translate(-20 -30)">
            <path d={MARK_OUTER} fill="#5e0612" fillRule="evenodd" transform="translate(3 3)" opacity="0.35" />
            <path d={MARK_OUTER} fill="#e61430" fillRule="evenodd" />
            <path d={MARK_INNER} fill="#960d1f" fillRule="evenodd" />
          </g>
        </g>
        {/* specular highlights */}
        <path
          d="M96 92 C 122 52, 176 30, 226 40"
          fill="none"
          stroke="#ffffff"
          strokeOpacity="0.75"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <path d="M78 150 C 76 132, 80 118, 86 106" fill="none" stroke="#ffffff" strokeOpacity="0.45" strokeWidth="4" strokeLinecap="round" />
      </g>
    </svg>
  );
}

type Glyph = "candle" | "curve" | "lock";

/** A glossy pedestal with a floating object, in the style of a 3D app icon. */
export function Pedestal({ glyph, className = "" }: { glyph: Glyph; className?: string }) {
  const id = useId().replace(/:/g, "");
  const g = (n: string) => `${id}-${n}`;
  return (
    <svg viewBox="0 0 220 170" className={className} aria-hidden>
      <defs>
        <radialGradient id={g("glow")} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ff2a43" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#ff2a43" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={g("side")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#9d0d24" />
          <stop offset="50%" stopColor="#e61430" />
          <stop offset="100%" stopColor="#8a0b1f" />
        </linearGradient>
        <linearGradient id={g("top")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#ffd4da" />
        </linearGradient>
        <linearGradient id={g("tier")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ff9aa6" />
          <stop offset="50%" stopColor="#ffd9de" />
          <stop offset="100%" stopColor="#ff8a97" />
        </linearGradient>
        <linearGradient id={g("obj")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ff6d7d" />
          <stop offset="55%" stopColor="#e61430" />
          <stop offset="100%" stopColor="#8f0b20" />
        </linearGradient>
        <linearGradient id={g("glass")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#ffe3e7" stopOpacity="0.75" />
        </linearGradient>
        <filter id={g("blur")} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
      </defs>

      <ellipse cx="110" cy="138" rx="86" ry="20" fill={`url(#${g("glow")})`} filter={`url(#${g("blur")})`} />

      {/* base */}
      <path d="M48 120 v12 a62 17 0 0 0 124 0 v-12 z" fill={`url(#${g("side")})`} />
      <ellipse cx="110" cy="120" rx="62" ry="17" fill={`url(#${g("top")})`} />
      {/* upper tier */}
      <path d="M70 112 v7 a40 10.5 0 0 0 80 0 v-7 z" fill={`url(#${g("tier")})`} />
      <ellipse cx="110" cy="112" rx="40" ry="10.5" fill="#ffffff" />
      <ellipse cx="110" cy="112" rx="40" ry="10.5" fill="none" stroke="#ffb3bd" strokeWidth="1.5" />
      <ellipse cx="110" cy="111" rx="22" ry="5" fill="#e61430" opacity="0.18" />

      {glyph === "candle" && (
        <g>
          <rect x="74" y="34" width="72" height="60" rx="12" fill={`url(#${g("glass")})`} stroke="#ffc2ca" />
          <line x1="110" y1="22" x2="110" y2="96" stroke="#7a0a1a" strokeWidth="3" strokeLinecap="round" />
          <rect x="97" y="38" width="26" height="44" rx="6" fill={`url(#${g("obj")})`} />
          <rect x="101" y="42" width="5" height="34" rx="2.5" fill="#ffffff" opacity="0.5" />
          <path d="M136 52 v20 m-7 -7 l7 7 l7 -7" fill="none" stroke="#e61430" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )}
      {glyph === "curve" && (
        <g>
          <rect x="66" y="30" width="88" height="66" rx="13" fill={`url(#${g("glass")})`} stroke="#ffc2ca" />
          <path d="M78 84 C 98 82, 112 74, 122 60 S 138 40, 144 38" fill="none" stroke="#f3b4bc" strokeWidth="9" strokeLinecap="round" />
          <path d="M78 84 C 98 82, 112 74, 122 60 S 138 40, 144 38" fill="none" stroke={`url(#${g("obj")})`} strokeWidth="4.5" strokeLinecap="round" />
          <circle cx="122" cy="60" r="6" fill="#ffffff" stroke="#e61430" strokeWidth="3" />
          <line x1="78" y1="90" x2="146" y2="90" stroke="#f1d3d7" strokeWidth="2" strokeLinecap="round" />
        </g>
      )}
      {glyph === "lock" && (
        <g>
          <path d="M92 56 v-12 a18 18 0 0 1 36 0 v12" fill="none" stroke="#7a0a1a" strokeWidth="9" strokeLinecap="round" />
          <path d="M92 56 v-12 a18 18 0 0 1 36 0 v12" fill="none" stroke="#ff8b98" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
          <rect x="78" y="52" width="64" height="46" rx="11" fill={`url(#${g("obj")})`} />
          <rect x="84" y="57" width="52" height="8" rx="4" fill="#ffffff" opacity="0.28" />
          <circle cx="110" cy="74" r="6" fill="#ffffff" />
          <rect x="107.5" y="76" width="5" height="12" rx="2.5" fill="#ffffff" />
        </g>
      )}
    </svg>
  );
}

/** Small line icons for the economics tiles. */
export function TileIcon({ name }: { name: "supply" | "decimals" | "curve" | "fee" | "migrate" | "lp" }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      {name === "supply" && (
        <>
          <ellipse cx="12" cy="6" rx="7" ry="2.5" {...common} />
          <path d="M5 6v6c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V6M5 12v6c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-6" {...common} />
        </>
      )}
      {name === "decimals" && <path d="M4 17h2M9 7h3v10M9 17h6M17 7v10" {...common} />}
      {name === "curve" && <path d="M4 19c6 0 9-3 11-8s3-6 5-6M4 19h16" {...common} />}
      {name === "fee" && (
        <>
          <path d="M6 18 18 6" {...common} />
          <circle cx="7.5" cy="7.5" r="2.5" {...common} />
          <circle cx="16.5" cy="16.5" r="2.5" {...common} />
        </>
      )}
      {name === "migrate" && <path d="M4 8h12l-3-3M20 16H8l3 3" {...common} />}
      {name === "lp" && (
        <>
          <rect x="5" y="11" width="14" height="9" rx="2" {...common} />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" {...common} />
        </>
      )}
    </svg>
  );
}

/** A thin-line clock face, for the window cards. */
export function ClockArt({ hour, minute, className = "" }: { hour: number; minute: number; className?: string }) {
  const minuteAngle = (minute / 60) * 360;
  const hourAngle = ((hour % 12) / 12) * 360 + (minute / 60) * 30;
  // Rounded so server and client serialize identical attribute strings.
  const at = (angle: number, len: number) => {
    const r = ((angle - 90) * Math.PI) / 180;
    return { x: Math.round((60 + Math.cos(r) * len) * 100) / 100, y: Math.round((60 + Math.sin(r) * len) * 100) / 100 };
  };
  const hand = (angle: number, len: number) => {
    const { x, y } = at(angle, len);
    return { x2: x, y2: y };
  };
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden>
      <circle cx="60" cy="60" r="50" fill="#ffffff" stroke="#100d0e" strokeWidth="1.5" />
      <circle cx="60" cy="60" r="42" fill="none" stroke="#f1d3d7" strokeWidth="1" strokeDasharray="2 4" />
      {Array.from({ length: 12 }, (_, i) => {
        const outer = at(i * 30, 44);
        const inner = at(i * 30, i % 3 === 0 ? 37 : 40);
        return (
          <line
            key={i}
            x1={outer.x}
            y1={outer.y}
            x2={inner.x}
            y2={inner.y}
            stroke="#100d0e"
            strokeWidth={i % 3 === 0 ? 2 : 1.2}
            strokeLinecap="round"
          />
        );
      })}
      <line x1="60" y1="60" {...hand(hourAngle, 22)} stroke="#100d0e" strokeWidth="3" strokeLinecap="round" />
      <line x1="60" y1="60" {...hand(minuteAngle, 33)} stroke="#e61430" strokeWidth="2" strokeLinecap="round" />
      <circle cx="60" cy="60" r="3.5" fill="#e61430" />
    </svg>
  );
}
