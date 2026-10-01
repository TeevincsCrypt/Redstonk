// Server-side check that each configured quote really has a LaunchLab GlobalConfig whose quote
// mint (mintB) is that xStock's mint, on the write cluster. A name that fails here is shown as
// "no curve config for this print" and cannot launch.

import { Connection, PublicKey } from "@solana/web3.js";
import { CONFIG_SPAN, decodeConfig } from "./launchlab-layout";
import type { ConfigCheck } from "./print";
import type { QuoteConfig } from "./quotes";
import type { Cluster } from "./env";

function parseKey(value: string): PublicKey | null {
  try {
    return new PublicKey(value);
  } catch {
    return null;
  }
}

export async function checkConfigs(opts: {
  quotes: readonly QuoteConfig[];
  rpcUrl: string;
  cluster: Cluster;
  programId: string;
}): Promise<Record<string, ConfigCheck>> {
  const out: Record<string, ConfigCheck> = {};
  const toFetch: { q: QuoteConfig; config: PublicKey; mint: PublicKey }[] = [];

  for (const q of opts.quotes) {
    if (q.mint === "" || q.configId === "") continue; // computePrint reports these itself
    const mint = parseKey(q.mint);
    const config = parseKey(q.configId);
    if (!mint) out[q.ticker] = { ok: false, reason: "mint env is not a valid address" };
    else if (!config) out[q.ticker] = { ok: false, reason: "config env is not a valid address" };
    else toFetch.push({ q, config, mint });
  }
  if (toFetch.length === 0) return out;

  if (!opts.rpcUrl) {
    for (const { q } of toFetch) out[q.ticker] = { ok: false, reason: "no RPC configured to verify the config" };
    return out;
  }

  try {
    const connection = new Connection(opts.rpcUrl, "confirmed");
    const keys = toFetch.flatMap(({ config, mint }) => [config, mint]);
    const infos = await connection.getMultipleAccountsInfo(keys);
    toFetch.forEach(({ q, mint }, i) => {
      const cfg = infos[i * 2];
      const mintInfo = infos[i * 2 + 1];
      if (!cfg) {
        out[q.ticker] = { ok: false, reason: `config not found on ${opts.cluster}` };
      } else if (cfg.owner.toBase58() !== opts.programId) {
        out[q.ticker] = { ok: false, reason: "config is not a LaunchLab account on this cluster" };
      } else if (cfg.data.length !== CONFIG_SPAN) {
        out[q.ticker] = { ok: false, reason: "config account is not a LaunchLab GlobalConfig" };
      } else if (!decodeConfig(cfg.data).mintB.equals(mint)) {
        out[q.ticker] = { ok: false, reason: `config quote mint is not ${q.xStock}` };
      } else if (!mintInfo) {
        out[q.ticker] = { ok: false, reason: `${q.xStock} mint not found on ${opts.cluster}` };
      } else {
        out[q.ticker] = { ok: true };
      }
    });
  } catch {
    for (const { q } of toFetch) out[q.ticker] = { ok: false, reason: "could not verify config (RPC error)" };
  }
  return out;
}
