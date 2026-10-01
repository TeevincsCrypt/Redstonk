// Raydium's published LaunchLab config defaults (supply, curve sell, graduation target) for the
// configs RedStonk is bound to. Fetched server-side (or from a script), never from the browser.

import type { Cluster } from "./env";

export interface CurveDefaults {
  name: string;
  supplyInit: string;
  totalSellA: string;
  totalFundRaisingB: string;
  /** Raw entry, handed back to the SDK so it sees the same list Raydium publishes. */
  raw: unknown;
}

export interface CurveDefaultsResponse {
  reachable: boolean;
  configs: Record<string, CurveDefaults>;
  error?: string;
}

export function raydiumConfigsUrl(cluster: Cluster): string {
  return cluster === "devnet"
    ? "https://launch-mint-v1-devnet.raydium.io/main/configs"
    : "https://launch-mint-v1.raydium.io/main/configs";
}

export async function fetchCurveDefaults(cluster: Cluster, configIds: string[]): Promise<CurveDefaultsResponse> {
  const wanted = new Set(configIds.filter(Boolean));
  try {
    const res = await fetch(raydiumConfigsUrl(cluster), { cache: "no-store", signal: AbortSignal.timeout(8_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as { data?: unknown };
    const list = Array.isArray(json.data) ? json.data : [];
    const configs: Record<string, CurveDefaults> = {};
    for (const item of list as Array<Record<string, any>>) {
      const id = item?.key?.pubKey;
      const d = item?.defaultParams;
      if (typeof id === "string" && wanted.has(id) && d) {
        configs[id] = {
          name: String(item.key.name ?? ""),
          supplyInit: String(d.supplyInit),
          totalSellA: String(d.totalSellA),
          totalFundRaisingB: String(d.totalFundRaisingB),
          raw: item,
        };
      }
    }
    return { reachable: true, configs };
  } catch (e) {
    return { reachable: false, configs: {}, error: e instanceof Error ? e.message : "unreachable" };
  }
}
