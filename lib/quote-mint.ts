// Reads a quote (xStock) mint's on-chain controls. Issuer powers over the quote are disclosed on
// the launch and ticket screens because they affect what a holder of the pair is exposed to.

import { PublicKey, type Connection, type ParsedAccountData } from "@solana/web3.js";

export const TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
export const TOKEN_2022_PROGRAM = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";

export interface MintInfo {
  address: string;
  program: string;
  isToken2022: boolean;
  decimals: number;
  supply: string;
  mintAuthority: string | null;
  freezeAuthority: string | null;
  permanentDelegate: string | null;
  pausable: boolean;
  paused: boolean;
  transferHookProgram: string | null;
  /** Scaled-UI multiplier in force now (1 when the extension is absent). */
  uiMultiplier: number;
  /** Token-2022 metadata extension, when present. */
  tokenMetadata: { name: string; symbol: string; uri: string } | null;
}

type Ext = { extension: string; state: Record<string, unknown> };

export async function readMint(connection: Connection, address: string): Promise<MintInfo | null> {
  const res = await connection.getParsedAccountInfo(new PublicKey(address));
  const acct = res.value;
  if (!acct) return null;
  const data = acct.data as ParsedAccountData | Buffer;
  if (!("parsed" in data) || data.parsed?.type !== "mint") return null;
  const info = data.parsed.info as Record<string, unknown> & { extensions?: Ext[] };
  const ext = (name: string) => info.extensions?.find((e) => e.extension === name)?.state;

  const scaled = ext("scaledUiAmountConfig");
  let uiMultiplier = 1;
  if (scaled) {
    const ts = Number(scaled.newMultiplierEffectiveTimestamp ?? 0);
    const m = Date.now() / 1000 >= ts ? scaled.newMultiplier : scaled.multiplier;
    const n = Number(m);
    if (Number.isFinite(n) && n > 0) uiMultiplier = n;
  }
  const pausable = ext("pausableConfig");
  const hook = ext("transferHook");
  const md = ext("tokenMetadata");

  return {
    address,
    program: acct.owner.toBase58(),
    isToken2022: acct.owner.toBase58() === TOKEN_2022_PROGRAM,
    decimals: Number(info.decimals),
    supply: String(info.supply),
    mintAuthority: (info.mintAuthority as string | null) ?? null,
    freezeAuthority: (info.freezeAuthority as string | null) ?? null,
    permanentDelegate: ((ext("permanentDelegate")?.delegate as string | null) ?? null) || null,
    pausable: !!pausable,
    paused: !!pausable?.paused,
    transferHookProgram: ((hook?.programId as string | null) ?? null) || null,
    uiMultiplier,
    tokenMetadata: md
      ? { name: String(md.name ?? ""), symbol: String(md.symbol ?? ""), uri: String(md.uri ?? "") }
      : null,
  };
}

/** UI amount (what a wallet shows) → raw base units, honoring a scaled-UI multiplier. */
export function uiToRaw(ui: string, decimals: number, multiplier = 1): bigint {
  const s = ui.trim();
  if (!/^\d*\.?\d*$/.test(s) || s === "" || s === ".") throw new Error("Enter a number.");
  const [whole, frac = ""] = s.split(".");
  const unscaled = BigInt(whole || "0") * BigInt(10) ** BigInt(decimals) + BigInt((frac + "0".repeat(decimals)).slice(0, decimals) || "0");
  if (multiplier === 1) return unscaled;
  // Divide by the multiplier with 1e12 fixed-point precision, rounding down.
  const scale = BigInt(1_000_000_000_000);
  const m = BigInt(Math.round(multiplier * 1e12));
  return (unscaled * scale) / m;
}

/** Raw base units → UI number, honoring a scaled-UI multiplier. */
export function rawToUi(raw: bigint, decimals: number, multiplier = 1): number {
  return (Number(raw) / 10 ** decimals) * multiplier;
}
