// Reads a coin's ticket from the write cluster: mint, metadata, and its LaunchLab pool.
// The pool is found by PDA against each supported quote mint, so no indexer or database is needed.

import { PublicKey, type Connection } from "@solana/web3.js";
import { LAUNCHLAB_PROGRAM_ID, METAPLEX_METADATA_PROGRAM_ID } from "./env";
import {
  CONFIG_SPAN,
  PLATFORM_SPAN,
  POOL_SPAN,
  decodeConfig,
  decodePlatform,
  decodePool,
  launchPoolId,
  type LaunchConfigInfo,
  type LaunchPlatformInfo,
  type LaunchPoolInfo,
} from "./launchlab-layout";
import { readMint, type MintInfo } from "./quote-mint";
import { QUOTES, type QuoteConfig } from "./quotes";

export interface TokenMetadata {
  name: string;
  symbol: string;
  uri: string;
  source: "metaplex" | "token-2022";
}

export interface OffchainMetadata {
  image?: string;
  description?: string;
}

export type Ticket =
  | { kind: "invalid" }
  | { kind: "unknown" }
  | {
      kind: "coin";
      mint: MintInfo;
      metadata: TokenMetadata | null;
      pool: (LaunchPoolInfo & { id: string }) | null;
      quote: QuoteConfig | null;
      quoteMint: MintInfo | null;
      platform: LaunchPlatformInfo | null;
      config: LaunchConfigInfo | null;
    };

/** Borsh string: u32 length + bytes. Metaplex pads fixed fields with NULs. */
function readBorshString(data: Uint8Array, offset: number): [string, number] {
  const len = new DataView(data.buffer, data.byteOffset + offset, 4).getUint32(0, true);
  const bytes = data.subarray(offset + 4, offset + 4 + len);
  return [new TextDecoder().decode(bytes).replace(/\0+$/g, "").trim(), offset + 4 + len];
}

export function decodeMetaplexMetadata(data: Uint8Array): { name: string; symbol: string; uri: string } {
  // key (1) + update authority (32) + mint (32)
  let o = 65;
  let name: string;
  let symbol: string;
  let uri: string;
  [name, o] = readBorshString(data, o);
  [symbol, o] = readBorshString(data, o);
  [uri] = readBorshString(data, o);
  return { name, symbol, uri };
}

function metaplexPda(mint: PublicKey): PublicKey {
  const program = new PublicKey(METAPLEX_METADATA_PROGRAM_ID);
  return PublicKey.findProgramAddressSync(
    [new TextEncoder().encode("metadata"), program.toBytes(), mint.toBytes()],
    program,
  )[0];
}

export async function readTicket(connection: Connection, address: string): Promise<Ticket> {
  let mintKey: PublicKey;
  try {
    mintKey = new PublicKey(address);
  } catch {
    return { kind: "invalid" };
  }

  const mint = await readMint(connection, address);
  if (!mint) return { kind: "unknown" };

  const programId = new PublicKey(LAUNCHLAB_PROGRAM_ID);
  const candidates = QUOTES.filter((q) => q.mint).flatMap((q) => {
    try {
      return [{ q, id: launchPoolId(programId, mintKey, new PublicKey(q.mint)) }];
    } catch {
      return [];
    }
  });
  const metaKey = metaplexPda(mintKey);
  const infos = await connection.getMultipleAccountsInfo([metaKey, ...candidates.map((c) => c.id)]);

  let metadata: TokenMetadata | null = null;
  if (infos[0] && infos[0].owner.toBase58() === METAPLEX_METADATA_PROGRAM_ID) {
    try {
      metadata = { ...decodeMetaplexMetadata(infos[0].data), source: "metaplex" };
    } catch {
      metadata = null;
    }
  }
  if (!metadata && mint.tokenMetadata) metadata = { ...mint.tokenMetadata, source: "token-2022" };

  let pool: (LaunchPoolInfo & { id: string }) | null = null;
  let quote: QuoteConfig | null = null;
  candidates.forEach((c, i) => {
    const info = infos[i + 1];
    if (!pool && info && info.owner.equals(programId) && info.data.length === POOL_SPAN) {
      pool = { ...decodePool(info.data), id: c.id.toBase58() };
      quote = c.q;
    }
  });

  let platform: LaunchPlatformInfo | null = null;
  let config: LaunchConfigInfo | null = null;
  let quoteMint: MintInfo | null = null;
  if (pool) {
    const p = pool as LaunchPoolInfo & { id: string };
    const [accts, qm] = await Promise.all([
      connection.getMultipleAccountsInfo([p.platformId, p.configId]),
      readMint(connection, p.mintB.toBase58()),
    ]);
    if (accts[0]?.data.length === PLATFORM_SPAN) platform = decodePlatform(accts[0].data);
    if (accts[1]?.data.length === CONFIG_SPAN) config = decodeConfig(accts[1].data);
    quoteMint = qm;
  }

  return { kind: "coin", mint, metadata, pool, quote, quoteMint, platform, config };
}

/** Best-effort read of the off-chain JSON (data URI or https). Failures are silent. */
export async function readOffchain(uri: string): Promise<OffchainMetadata | null> {
  try {
    let json: unknown;
    const b64 = /^data:application\/json;base64,(.*)$/s.exec(uri);
    if (b64) {
      const bin = atob(b64[1]);
      json = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
    } else if (uri.startsWith("https://")) {
      const res = await fetch(uri, { signal: AbortSignal.timeout(6_000) });
      if (!res.ok) return null;
      json = await res.json();
    } else {
      return null;
    }
    const o = json as Record<string, unknown>;
    return {
      image: typeof o.image === "string" && /^https:\/\//.test(o.image) ? o.image : undefined,
      description: typeof o.description === "string" ? o.description : undefined,
    };
  } catch {
    return null;
  }
}
