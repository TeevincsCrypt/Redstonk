import { Connection } from "@solana/web3.js";
import { CLUSTER, RPC_URL } from "./env";

export class RpcNotConfiguredError extends Error {
  constructor() {
    super(
      CLUSTER === "mainnet-beta"
        ? "RPC not configured. Set NEXT_PUBLIC_RPC_URL for mainnet-beta."
        : "RPC not configured. Set NEXT_PUBLIC_RPC_URL.",
    );
  }
}

let cached: Connection | null = null;

/** Connection to the write cluster. Throws when no RPC is configured. */
export function getConnection(): Connection {
  if (!RPC_URL) throw new RpcNotConfiguredError();
  cached ??= new Connection(RPC_URL, "confirmed");
  return cached;
}
