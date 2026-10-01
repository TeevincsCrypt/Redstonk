// Builds, signs, and sends a LaunchLab listing. Client-side only.
//
// Order of operations:
//   1. re-fetch the print and refuse anything but today's open winner (launch-guards)
//   2. upload metadata and get its URI
//   3. build raydium.launchpad.createLaunchpad bound to the winner's configId and our platform
//   4. simulate, then hand every transaction to the wallet in one prompt
//   5. send in order, confirm, and poll for the pool account

import BN from "bn.js";
import { Keypair, PublicKey, VersionedTransaction, type Connection } from "@solana/web3.js";
import { CLUSTER, LAUNCHLAB_PROGRAM_ID, PLATFORM_ID } from "./env";
import { getConnection } from "./connection";
import { assertConfigQuote, assertLaunchable, LaunchBlocked, PLATFORM_NOT_CONFIGURED } from "./launch-guards";
import { launchPoolId } from "./launchlab-layout";
import { TOKEN_DECIMALS, type CurveSheet } from "./launch-sheet";
import type { ListingFields } from "./metadata";
import type { MetadataResponse } from "@/app/api/metadata/route";
import type { PrintResponse, PrintWinner } from "./print-response";

export type LaunchStage =
  | "checking-print"
  | "uploading-metadata"
  | "building"
  | "simulating"
  | "awaiting-signature"
  | "sending"
  | "confirming"
  | "finding-pool";

export const STAGE_LABEL: Record<LaunchStage, string> = {
  "checking-print": "Re-checking the print",
  "uploading-metadata": "Storing metadata",
  building: "Building the LaunchLab transaction",
  simulating: "Simulating on " + CLUSTER,
  "awaiting-signature": "Waiting for your wallet",
  sending: "Sending",
  confirming: "Confirming",
  "finding-pool": "Reading the new pool",
};

export interface LaunchWallet {
  publicKey: PublicKey;
  signTransaction?: <T extends VersionedTransaction>(tx: T) => Promise<T>;
  signAllTransactions?: <T extends VersionedTransaction>(txs: T[]) => Promise<T[]>;
}

export interface LaunchRequest {
  listing: ListingFields & { image: string | null };
  /** The ticker the user confirmed on the quote step. */
  confirmedTicker: string;
  sheet: CurveSheet;
  /** Optional first buy, raw quote units. Zero means create only. */
  firstBuyRaw: bigint;
  fetchPrint: () => Promise<PrintResponse>;
}

export interface LaunchResult {
  mint: string;
  poolId: string;
  signatures: string[];
  metadataUri: string;
  metadataNotes: string[];
  poolFound: boolean;
}

export class SimulationFailed extends Error {
  constructor(
    message: string,
    readonly logs: string[],
  ) {
    super(message);
  }
}

/** Throws unless every precondition for building holds. Runs before the SDK is even loaded. */
export function assertBuildable(sheet: CurveSheet, platformId: string): void {
  if (!platformId) throw new LaunchBlocked(PLATFORM_NOT_CONFIGURED);
  if (sheet.problems.length > 0) throw new LaunchBlocked(sheet.problems[0]);
  if (!sheet.config || !sheet.platform || !sheet.quote || !sheet.economics) {
    throw new LaunchBlocked("The curve sheet is incomplete. Reload and try again.");
  }
}

async function uploadMetadata(listing: LaunchRequest["listing"]): Promise<MetadataResponse> {
  const res = await fetch("/api/metadata", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(listing),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.uri) throw new LaunchBlocked(body?.error ?? `Metadata upload failed (HTTP ${res.status}).`);
  return body as MetadataResponse;
}

export async function buildLaunchTransactions(opts: {
  connection: Connection;
  owner: PublicKey;
  winner: PrintWinner;
  sheet: CurveSheet;
  mintA: Keypair;
  uri: string;
  listing: ListingFields;
  firstBuyRaw: bigint;
}): Promise<VersionedTransaction[]> {
  const { connection, owner, winner, sheet, mintA, uri, listing, firstBuyRaw } = opts;
  assertBuildable(sheet, PLATFORM_ID);
  const sdk = await import("@raydium-io/raydium-sdk-v2");

  const raydium = await sdk.Raydium.load({
    connection,
    owner,
    cluster: CLUSTER === "mainnet-beta" ? "mainnet" : "devnet",
    disableFeatureCheck: true,
    disableLoadToken: true,
    blockhashCommitment: "finalized",
  });
  // createLaunchpad always asks Raydium's API for its config list. Hand it the list our server
  // already fetched (or nothing) so the browser never depends on Raydium's CORS. Every curve
  // parameter is passed explicitly below, so the list is never used to fill in values.
  raydium.api.fetchLaunchConfigs = async () => (sheet.apiConfig ? [sheet.apiConfig as never] : []);
  if (firstBuyRaw > BigInt(0)) await raydium.account.fetchWalletTokenAccounts();

  const configId = new PublicKey(winner.configId);
  const configAccount = await connection.getAccountInfo(configId);
  if (!configAccount) throw new LaunchBlocked("The LaunchLab config disappeared. Reload.");
  const configInfo = sdk.LaunchpadConfig.decode(configAccount.data);
  // The quote mint comes from the GlobalConfig, never from the form. Check it is the print.
  assertConfigQuote(configInfo.mintB.toBase58(), winner);

  const economics = sheet.economics!;
  const { transactions } = await raydium.launchpad.createLaunchpad({
    programId: new PublicKey(LAUNCHLAB_PROGRAM_ID),
    platformId: new PublicKey(PLATFORM_ID), // always explicit: never Raydium's default platform
    configId,
    configInfo,
    mintA: mintA.publicKey,
    decimals: TOKEN_DECIMALS,
    mintBDecimals: sheet.quote!.decimals,
    mintBProgram: new PublicKey(sheet.quote!.program),
    name: listing.name.trim(),
    symbol: listing.symbol,
    uri,
    migrateType: "cpmm",
    supply: new BN(economics.supply.toString()),
    totalSellA: new BN(economics.totalSellA.toString()),
    totalFundRaisingB: new BN(economics.totalFundRaisingB.toString()),
    totalLockedAmount: new BN(0),
    cliffPeriod: new BN(0),
    unlockPeriod: new BN(0),
    buyAmount: new BN(firstBuyRaw.toString()),
    createOnly: firstBuyRaw === BigInt(0),
    slippage: new BN(100), // 1% on the optional first buy
    platformAllowConfig: sheet.platform!.restrictGlobalConfig ? true : undefined,
    extraSigners: [mintA],
    txVersion: sdk.TxVersion.V0,
    computeBudgetConfig: { units: 600_000, microLamports: 50_000 },
  });
  return transactions as VersionedTransaction[];
}

function needsSigner(tx: VersionedTransaction, key: PublicKey): boolean {
  const { numRequiredSignatures } = tx.message.header;
  return tx.message.staticAccountKeys.slice(0, numRequiredSignatures).some((k) => k.equals(key));
}

export async function runLaunch(
  req: LaunchRequest,
  wallet: LaunchWallet,
  onStage: (stage: LaunchStage, detail?: string) => void,
): Promise<LaunchResult> {
  if (!PLATFORM_ID) throw new LaunchBlocked(PLATFORM_NOT_CONFIGURED);
  const connection = getConnection();

  onStage("checking-print");
  const winner = assertLaunchable(await req.fetchPrint(), req.confirmedTicker, PLATFORM_ID);
  assertBuildable(req.sheet, PLATFORM_ID);

  onStage("uploading-metadata");
  const metadata = await uploadMetadata(req.listing);

  onStage("building");
  const mintA = Keypair.generate();
  const built = await buildLaunchTransactions({
    connection,
    owner: wallet.publicKey,
    winner,
    sheet: req.sheet,
    mintA,
    uri: metadata.uri,
    listing: req.listing,
    firstBuyRaw: req.firstBuyRaw,
  });
  if (built.length === 0) throw new Error("The SDK returned no transactions.");

  // Simulate the first transaction (later ones depend on it landing) before asking for a signature.
  onStage("simulating");
  const sim = await connection.simulateTransaction(built[0], { sigVerify: false, replaceRecentBlockhash: true });
  if (sim.value.err) {
    throw new SimulationFailed(
      `Simulation failed: ${JSON.stringify(sim.value.err)}. Nothing was sent.`,
      sim.value.logs ?? [],
    );
  }

  // Hand the wallet clean messages (no pre-existing signatures), then add the mint signature
  // after the wallet signs, in case the wallet adjusted the message.
  const unsigned = built.map((tx) => new VersionedTransaction(tx.message));
  onStage("awaiting-signature", built.length > 1 ? `${built.length} transactions in one prompt` : undefined);
  let signed: VersionedTransaction[];
  if (wallet.signAllTransactions) signed = await wallet.signAllTransactions(unsigned);
  else if (wallet.signTransaction && unsigned.length === 1) signed = [await wallet.signTransaction(unsigned[0])];
  else throw new LaunchBlocked("This wallet cannot sign the listing transactions.");
  for (const tx of signed) if (needsSigner(tx, mintA.publicKey)) tx.sign([mintA]);

  onStage("sending");
  const signatures: string[] = [];
  for (const tx of signed) {
    const sig = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: false, maxRetries: 3 });
    signatures.push(sig);
    onStage("confirming", sig);
    const latest = await connection.getLatestBlockhash("confirmed");
    const conf = await connection.confirmTransaction(
      { signature: sig, blockhash: tx.message.recentBlockhash, lastValidBlockHeight: latest.lastValidBlockHeight },
      "confirmed",
    );
    if (conf.value.err) throw new Error(`Transaction ${sig} failed: ${JSON.stringify(conf.value.err)}`);
  }

  onStage("finding-pool");
  const poolId = launchPoolId(new PublicKey(LAUNCHLAB_PROGRAM_ID), mintA.publicKey, new PublicKey(winner.mint));
  let poolFound = false;
  for (let i = 0; i < 15 && !poolFound; i++) {
    poolFound = !!(await connection.getAccountInfo(poolId, "confirmed"));
    if (!poolFound) await new Promise((r) => setTimeout(r, 2_000));
  }

  return {
    mint: mintA.publicKey.toBase58(),
    poolId: poolId.toBase58(),
    signatures,
    metadataUri: metadata.uri,
    metadataNotes: metadata.notes,
    poolFound,
  };
}
