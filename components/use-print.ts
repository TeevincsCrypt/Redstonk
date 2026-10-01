"use client";

import { useCallback, useEffect, useState } from "react";
import type { PrintResponse } from "@/lib/print-response";

/** Fetches /api/print. A 503 still carries a PrintResponse describing the error state. */
export async function fetchPrint(nowOverride?: string): Promise<PrintResponse> {
  const qs = nowOverride ? `?now=${encodeURIComponent(nowOverride)}` : "";
  const res = await fetch(`/api/print${qs}`, { cache: "no-store" });
  const body = (await res.json().catch(() => null)) as PrintResponse | null;
  if (!body || typeof body.window !== "string") throw new Error(`print route returned HTTP ${res.status}`);
  return body;
}

export function usePrint(initial: PrintResponse | null, nowOverride?: string) {
  const [data, setData] = useState<PrintResponse | null>(initial);
  const [skewMs, setSkewMs] = useState(() => (initial ? Date.parse(initial.asOf) - Date.now() : 0));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!initial);

  const refresh = useCallback(async () => {
    try {
      const body = await fetchPrint(nowOverride);
      setData(body);
      setSkewMs(Date.parse(body.asOf) - Date.now());
      setError(null);
      return body;
    } catch (e) {
      setError(e instanceof Error ? e.message : "print unavailable");
      return null;
    } finally {
      setLoading(false);
    }
  }, [nowOverride]);

  useEffect(() => {
    if (!initial) void refresh();
    const id = setInterval(refresh, 60_000);
    return () => clearInterval(id);
  }, [initial, refresh]);

  return { data, skewMs, error, loading, refresh };
}
