// Proxies Raydium's published LaunchLab config defaults for the configs RedStonk is bound to.
// Server-to-server so the launch page does not depend on Raydium's CORS policy.

import { NextResponse } from "next/server";
import { CLUSTER } from "@/lib/env";
import { QUOTES } from "@/lib/quotes";
import { fetchCurveDefaults, type CurveDefaultsResponse } from "@/lib/curve-defaults";

export const dynamic = "force-dynamic";

let cache: { at: number; body: CurveDefaultsResponse } | null = null;
const TTL_MS = 5 * 60_000;

export async function GET() {
  if (cache && Date.now() - cache.at < TTL_MS) return NextResponse.json(cache.body);
  const body = await fetchCurveDefaults(
    CLUSTER,
    QUOTES.map((q) => q.configId),
  );
  // Failures are not cached, so the next request retries.
  if (body.reachable) cache = { at: Date.now(), body };
  return NextResponse.json(body);
}
