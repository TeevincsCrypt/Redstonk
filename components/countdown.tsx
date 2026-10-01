"use client";

import { useEffect, useRef, useState } from "react";
import { formatCountdown } from "@/lib/format";

/**
 * Counts down to `target`. `skewMs` is server time minus client time, so a wrong device clock
 * (or the dev-only ?now= override) does not skew the countdown. Calls `onDone` once at zero.
 */
export function Countdown({
  target,
  skewMs = 0,
  onDone,
  className = "",
}: {
  target: string;
  skewMs?: number;
  onDone?: () => void;
  className?: string;
}) {
  const targetMs = Date.parse(target);
  const [now, setNow] = useState<number | null>(null);
  const fired = useRef(false);

  useEffect(() => {
    fired.current = false;
    const tick = () => setNow(Date.now() + skewMs);
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetMs, skewMs]);

  useEffect(() => {
    if (now != null && now >= targetMs && !fired.current) {
      fired.current = true;
      onDone?.();
    }
  }, [now, targetMs, onDone]);

  return (
    <span className={`font-mono tabular ${className}`} suppressHydrationWarning>
      {now == null ? "—" : formatCountdown(targetMs - now)}
    </span>
  );
}
