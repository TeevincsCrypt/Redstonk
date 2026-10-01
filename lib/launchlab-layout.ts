// Minimal read-only decoders for the Raydium LaunchLab accounts RedStonk displays.
//
// Offsets mirror the layouts in @raydium-io/raydium-sdk-v2 (`LaunchpadConfig`, `LaunchpadPool`,
// `PlatformConfig`). tests/launchlab-layout.test.ts encodes accounts with the SDK's own layouts
// and checks these decoders against them, so a layout change in the SDK fails the test suite.
// Keeping these here lets the ticket page and the print route read the chain without shipping the
// whole SDK.

import { PublicKey } from "@solana/web3.js";

export const CONFIG_SPAN = 371;
export const POOL_SPAN = 429;
export const PLATFORM_SPAN = 944;

/** Fee rates and LP scales in LaunchLab are parts per million. */
export const RATE_DENOMINATOR = 1_000_000;

function view(data: Uint8Array): DataView {
  return new DataView(data.buffer, data.byteOffset, data.byteLength);
}

function u64(data: Uint8Array, offset: number): bigint {
  return view(data).getBigUint64(offset, true);
}

function u8(data: Uint8Array, offset: number): number {
  return data[offset];
}

function u16(data: Uint8Array, offset: number): number {
  return view(data).getUint16(offset, true);
}

function pubkey(data: Uint8Array, offset: number): PublicKey {
  return new PublicKey(data.subarray(offset, offset + 32));
}

function fixedString(data: Uint8Array, offset: number, length: number): string {
  const bytes = data.subarray(offset, offset + length);
  const end = bytes.indexOf(0);
  return new TextDecoder().decode(end >= 0 ? bytes.subarray(0, end) : bytes);
}

export interface LaunchConfigInfo {
  curveType: number;
  index: number;
  migrateFee: bigint;
  tradeFeeRate: bigint;
  minSupplyA: bigint;
  minSellRateA: bigint;
  minMigrateRateA: bigint;
  minFundRaisingB: bigint;
  mintB: PublicKey;
}

export function decodeConfig(data: Uint8Array): LaunchConfigInfo {
  if (data.length !== CONFIG_SPAN) throw new Error(`not a LaunchLab GlobalConfig (size ${data.length})`);
  return {
    curveType: u8(data, 16),
    index: u16(data, 17),
    migrateFee: u64(data, 19),
    tradeFeeRate: u64(data, 27),
    minSupplyA: u64(data, 43),
    minSellRateA: u64(data, 59),
    minMigrateRateA: u64(data, 67),
    minFundRaisingB: u64(data, 75),
    mintB: pubkey(data, 83),
  };
}

export interface LaunchPoolInfo {
  status: number;
  mintDecimalsA: number;
  mintDecimalsB: number;
  migrateType: number;
  supply: bigint;
  totalSellA: bigint;
  virtualA: bigint;
  virtualB: bigint;
  realA: bigint;
  realB: bigint;
  totalFundRaisingB: bigint;
  configId: PublicKey;
  platformId: PublicKey;
  mintA: PublicKey;
  mintB: PublicKey;
  creator: PublicKey;
}

export function decodePool(data: Uint8Array): LaunchPoolInfo {
  if (data.length !== POOL_SPAN) throw new Error(`not a LaunchLab pool (size ${data.length})`);
  return {
    status: u8(data, 17),
    mintDecimalsA: u8(data, 18),
    mintDecimalsB: u8(data, 19),
    migrateType: u8(data, 20),
    supply: u64(data, 21),
    totalSellA: u64(data, 29),
    virtualA: u64(data, 37),
    virtualB: u64(data, 45),
    realA: u64(data, 53),
    realB: u64(data, 61),
    totalFundRaisingB: u64(data, 69),
    configId: pubkey(data, 141),
    platformId: pubkey(data, 173),
    mintA: pubkey(data, 205),
    mintB: pubkey(data, 237),
    creator: pubkey(data, 333),
  };
}

export interface LaunchPlatformInfo {
  platformScale: bigint;
  creatorScale: bigint;
  burnScale: bigint;
  feeRate: bigint;
  name: string;
  web: string;
  cpConfigId: PublicKey;
  creatorFeeRate: bigint;
  restrictGlobalConfig: number;
  restrictCurveParam: number;
}

export function decodePlatform(data: Uint8Array): LaunchPlatformInfo {
  if (data.length !== PLATFORM_SPAN) throw new Error(`not a LaunchLab platform (size ${data.length})`);
  return {
    platformScale: u64(data, 80),
    creatorScale: u64(data, 88),
    burnScale: u64(data, 96),
    feeRate: u64(data, 104),
    name: fixedString(data, 112, 64),
    web: fixedString(data, 176, 256),
    cpConfigId: pubkey(data, 688),
    creatorFeeRate: u64(data, 720),
    restrictGlobalConfig: u8(data, 832),
    restrictCurveParam: u8(data, 833),
  };
}

/** LaunchLab pool PDA: seeds ["pool", mintA, mintB]. */
export function launchPoolId(programId: PublicKey, mintA: PublicKey, mintB: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [new TextEncoder().encode("pool"), mintA.toBytes(), mintB.toBytes()],
    programId,
  )[0];
}

/** PDA that lets a platform with restrictGlobalConfig use a given GlobalConfig. */
export function platformAllowConfigId(programId: PublicKey, platformId: PublicKey, configId: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [new TextEncoder().encode("platform_allow_config"), platformId.toBytes(), configId.toBytes()],
    programId,
  )[0];
}

export type PoolStage = "curve" | "migrating" | "migrated" | "unknown";

/** Pool status as read on mainnet: 0 trades on the curve, 2 has migrated; 1 is in between. */
export function poolStage(status: number): PoolStage {
  if (status === 0) return "curve";
  if (status === 1) return "migrating";
  if (status === 2) return "migrated";
  return "unknown";
}

/** Share of the graduation target raised so far, 0–1. */
export function curveProgress(pool: Pick<LaunchPoolInfo, "realB" | "totalFundRaisingB" | "status">): number {
  if (pool.status === 2) return 1;
  if (pool.totalFundRaisingB === BigInt(0)) return 0;
  const ppm = (pool.realB * BigInt(1_000_000)) / pool.totalFundRaisingB;
  return Math.min(1, Number(ppm) / 1_000_000);
}

export function rateToPercent(rate: bigint): number {
  return (Number(rate) / RATE_DENOMINATOR) * 100;
}
