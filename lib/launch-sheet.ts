// Everything the sign step shows and checks, read from chain before anything is built:
// the bound GlobalConfig, RedStonk's LaunchLab platform, the quote mint, and the curve economics.
// Client-side only.

import { PublicKey } from "@solana/web3.js";
import { getConnection } from "./connection";
import { CLUSTER, LAUNCHLAB_PROGRAM_ID, PLATFORM_ID } from "./env";
import {
  CONFIG_SPAN,
  PLATFORM_SPAN,
  RATE_DENOMINATOR,
  decodeConfig,
  decodePlatform,
  platformAllowConfigId,
  rateToPercent,
  type LaunchConfigInfo,
  type LaunchPlatformInfo,
} from "./launchlab-layout";
import { readMint, type MintInfo } from "./quote-mint";
import { PLATFORM_NOT_CONFIGURED } from "./launch-guards";
import type { PrintWinner } from "./print-response";
import type { QuoteConfig } from "./quotes";
import type { CurveDefaultsResponse } from "./curve-defaults";

/** Fixed listing economics. */
export const TOKEN_DECIMALS = 6;
export const SUPPLY_RAW = BigInt(1_000_000_000) * BigInt(10) ** BigInt(TOKEN_DECIMALS);
/** LaunchLab's standard curve sell (SDK `LaunchpadPoolInitParam.totalSellA`): 793.1M tokens. */
export const LAUNCHLAB_STANDARD_SELL_RAW = BigInt("793100000000000");
/** RedStonk's fee target: 0.5% platform + 0.5% creator, in LaunchLab parts per million. */
export const TARGET_PLATFORM_FEE = BigInt(5_000);
export const TARGET_CREATOR_FEE = BigInt(5_000);

export interface Economics {
  supply: bigint;
  totalSellA: bigint;
  totalFundRaisingB: bigint;
  source: "raydium-default" | "env";
}

export interface CurveSheet {
  configId: string;
  config: LaunchConfigInfo | null;
  platform: (LaunchPlatformInfo & { id: string }) | null;
  quote: MintInfo | null;
  economics: Economics | null;
  fees: { protocolPct: number; platformPct: number; creatorPct: number; totalPct: number; onTarget: boolean } | null;
  lp: { burnPct: number; platformLockPct: number; creatorLockPct: number } | null;
  /** Raydium's published config list entry, handed to the SDK. Null when not published. */
  apiConfig: unknown | null;
  /** Anything here blocks signing. */
  problems: string[];
}

function parseUnits(value: string, decimals: number): bigint | null {
  if (!/^\d+(\.\d+)?$/.test(value)) return null;
  const [w, f = ""] = value.split(".");
  if (f.length > decimals) return null;
  return BigInt(w) * BigInt(10) ** BigInt(decimals) + BigInt((f + "0".repeat(decimals)).slice(0, decimals) || "0");
}

/** In the browser, Raydium's defaults come through our /api/curve-defaults proxy. */
async function defaultsViaProxy(): Promise<CurveDefaultsResponse> {
  try {
    const res = await fetch("/api/curve-defaults", { cache: "no-store" });
    return (await res.json()) as CurveDefaultsResponse;
  } catch {
    return { reachable: false, configs: {} };
  }
}

export async function loadCurveSheet(
  winner: PrintWinner,
  quote: QuoteConfig,
  loadDefaults: () => Promise<CurveDefaultsResponse> = defaultsViaProxy,
): Promise<CurveSheet> {
  const problems: string[] = [];
  const sheet: CurveSheet = {
    configId: winner.configId,
    config: null,
    platform: null,
    quote: null,
    economics: null,
    fees: null,
    lp: null,
    apiConfig: null,
    problems,
  };
  if (!PLATFORM_ID) problems.push(PLATFORM_NOT_CONFIGURED);

  const connection = getConnection();
  const programId = new PublicKey(LAUNCHLAB_PROGRAM_ID);
  const configKey = new PublicKey(winner.configId);
  let platformKey: PublicKey | null = null;
  try {
    platformKey = PLATFORM_ID ? new PublicKey(PLATFORM_ID) : null;
  } catch {
    problems.push("NEXT_PUBLIC_PLATFORM_ID is not a valid address.");
  }

  const keys = [configKey, ...(platformKey ? [platformKey, platformAllowConfigId(programId, platformKey, configKey)] : [])];
  const [infos, quoteMint, defaults] = await Promise.all([
    connection.getMultipleAccountsInfo(keys),
    readMint(connection, winner.mint),
    loadDefaults(),
  ]);

  // GlobalConfig
  const cfgInfo = infos[0];
  if (!cfgInfo || cfgInfo.owner.toBase58() !== LAUNCHLAB_PROGRAM_ID || cfgInfo.data.length !== CONFIG_SPAN) {
    problems.push(`No LaunchLab GlobalConfig at ${winner.configId} on ${CLUSTER}.`);
  } else {
    sheet.config = decodeConfig(cfgInfo.data);
    if (sheet.config.mintB.toBase58() !== winner.mint) {
      problems.push(`Config ${winner.configId} is not quoted in ${winner.xStock}.`);
    }
  }

  // Quote mint
  sheet.quote = quoteMint;
  if (!quoteMint) problems.push(`${winner.xStock} mint not found on ${CLUSTER}.`);

  // Platform
  if (platformKey) {
    const pInfo = infos[1];
    if (!pInfo || pInfo.owner.toBase58() !== LAUNCHLAB_PROGRAM_ID || pInfo.data.length !== PLATFORM_SPAN) {
      problems.push(`No LaunchLab platform at NEXT_PUBLIC_PLATFORM_ID on ${CLUSTER}.`);
    } else {
      const platform = decodePlatform(pInfo.data);
      sheet.platform = { ...platform, id: platformKey.toBase58() };
      const d = Number(RATE_DENOMINATOR) / 100;
      sheet.lp = {
        burnPct: Number(platform.burnScale) / d,
        platformLockPct: Number(platform.platformScale) / d,
        creatorLockPct: Number(platform.creatorScale) / d,
      };
      if (platform.creatorScale > BigInt(0)) {
        problems.push(
          "The platform config hands part of the migrated LP position to the creator. RedStonk requires burn or platform lock only.",
        );
      }
      if (platform.restrictGlobalConfig && !infos[2]) {
        problems.push("The platform restricts configs and has not allowed this one.");
      }
      if (sheet.config) {
        const protocolPct = rateToPercent(sheet.config.tradeFeeRate);
        const platformPct = rateToPercent(platform.feeRate);
        const creatorPct = rateToPercent(platform.creatorFeeRate);
        sheet.fees = {
          protocolPct,
          platformPct,
          creatorPct,
          totalPct: protocolPct + platformPct + creatorPct,
          onTarget: platform.feeRate === TARGET_PLATFORM_FEE && platform.creatorFeeRate === TARGET_CREATOR_FEE,
        };
      }
    }
  }

  // Economics: LaunchLab's published default for this config, else the operator's env target.
  const published = defaults.configs[winner.configId];
  const envName = `NEXT_PUBLIC_${winner.xStock.toUpperCase()}_RAISE`;
  if (published) {
    sheet.apiConfig = published.raw;
    if (BigInt(published.supplyInit) !== SUPPLY_RAW) {
      problems.push("Raydium's default curve for this config is not a 1B supply. RedStonk will not reshape it.");
    } else {
      sheet.economics = {
        supply: SUPPLY_RAW,
        totalSellA: BigInt(published.totalSellA),
        totalFundRaisingB: BigInt(published.totalFundRaisingB),
        source: "raydium-default",
      };
    }
  } else if (quote.raise && quoteMint) {
    const raw = parseUnits(quote.raise, quoteMint.decimals);
    if (raw == null || raw === BigInt(0)) problems.push(`${envName} is not a positive number.`);
    else sheet.economics = { supply: SUPPLY_RAW, totalSellA: LAUNCHLAB_STANDARD_SELL_RAW, totalFundRaisingB: raw, source: "env" };
  } else {
    problems.push(
      `Raydium publishes no default curve for this config${defaults.reachable ? "" : " (its config list is unreachable)"} and ${envName} is unset. RedStonk will not invent a graduation target.`,
    );
  }

  // Shape checks against the config's own minimums (the SDK repeats these before building).
  if (sheet.economics && sheet.config) {
    const e = sheet.economics;
    const c = sheet.config;
    const ppm = BigInt(RATE_DENOMINATOR);
    if (e.totalFundRaisingB < c.minFundRaisingB) problems.push("Graduation target is below the config minimum.");
    if (e.totalSellA < (e.supply * c.minSellRateA) / ppm) problems.push("Curve sell is below the config minimum.");
    if (e.supply - e.totalSellA < (e.supply * c.minMigrateRateA) / ppm) {
      problems.push("Too little supply would migrate to the CPMM pool for this config.");
    }
  }

  return sheet;
}

export async function loadQuoteBalance(owner: PublicKey, mint: string): Promise<bigint> {
  const res = await getConnection().getParsedTokenAccountsByOwner(owner, { mint: new PublicKey(mint) });
  return res.value.reduce((sum, a) => {
    const amt = (a.account.data.parsed?.info?.tokenAmount?.amount as string | undefined) ?? "0";
    return sum + BigInt(amt);
  }, BigInt(0));
}
