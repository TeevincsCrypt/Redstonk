// Public runtime configuration. Every NEXT_PUBLIC_* read here is referenced literally so Next
// can inline it into the client bundle.

export type Cluster = "devnet" | "mainnet-beta";

export const CLUSTER: Cluster =
  process.env.NEXT_PUBLIC_SOLANA_CLUSTER === "mainnet-beta" ? "mainnet-beta" : "devnet";

export const IS_MAINNET = CLUSTER === "mainnet-beta";

const IS_DEV = process.env.NODE_ENV !== "production";

const PUBLIC_DEVNET_RPC = "https://api.devnet.solana.com";

/**
 * RPC for the write cluster. Falls back to the public devnet endpoint only while running
 * `next dev` against devnet. Mainnet always needs an explicit NEXT_PUBLIC_RPC_URL.
 */
export const RPC_URL: string =
  process.env.NEXT_PUBLIC_RPC_URL || (IS_DEV && CLUSTER === "devnet" ? PUBLIC_DEVNET_RPC : "");

export const PLATFORM_ID: string = (process.env.NEXT_PUBLIC_PLATFORM_ID ?? "").trim();

/**
 * Raydium LaunchLab program ids, copied from @raydium-io/raydium-sdk-v2 `common/programId`
 * (LAUNCHPAD_PROGRAM / DEV_LAUNCHPAD_PROGRAM). tests/launchlab-ids.test.ts asserts they match
 * the installed SDK so the client bundle does not need the SDK just to know an address.
 */
export const LAUNCHLAB_PROGRAM_IDS: Record<Cluster, string> = {
  "mainnet-beta": "LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj",
  devnet: "DRay6fNdQ5J82H7xV6uq2aV3mNrUZ1J4PgSKsWgptcm6",
};

export const LAUNCHLAB_PROGRAM_ID = LAUNCHLAB_PROGRAM_IDS[CLUSTER];

export const METAPLEX_METADATA_PROGRAM_ID = "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s";

export function explorerTxUrl(signature: string): string {
  return `https://explorer.solana.com/tx/${signature}${CLUSTER === "devnet" ? "?cluster=devnet" : ""}`;
}

export function explorerAddressUrl(address: string): string {
  return `https://explorer.solana.com/address/${address}${CLUSTER === "devnet" ? "?cluster=devnet" : ""}`;
}
