// Creates RedStonk's Raydium LaunchLab platform config: 0.5% platform fee, 0.5% creator fee, and
// migrated LP burned (default) or locked with the platform's fee key. Never to the creator.
//
// Dry run by default (builds and simulates). Add --send to submit.
//
//   npm run platform:create -- --keypair ./admin.keypair.json
//   npm run platform:create -- --keypair ./admin.keypair.json --lp platform-lock --send
//
// Options:
//   --keypair <path>       platform admin + fee payer (solana-keygen JSON). Required.
//   --cluster <c>          devnet | mainnet-beta (default NEXT_PUBLIC_SOLANA_CLUSTER, else devnet)
//   --rpc <url>            default NEXT_PUBLIC_RPC_URL, else the cluster's public RPC
//   --lp <policy>          burn (default) | platform-lock
//   --cp-config <id>       CPMM config used on migration (default: the one Raydium's own LaunchLab
//                          platform uses on this cluster, read from chain)
//   --claim-wallet <key>   wallet that claims platform fees (default: admin)
//   --send                 actually submit the transaction

import { readFileSync } from "node:fs";
import BN from "bn.js";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { DEV_LAUNCHPAD_PROGRAM, LAUNCHPAD_PROGRAM, Raydium, TxVersion, getPdaPlatformId } from "@raydium-io/raydium-sdk-v2";
import { decodePlatform } from "@/lib/launchlab-layout";

/** Raydium's own LaunchLab platform per cluster, from the SDK's programId constants. */
const RAYDIUM_PLATFORM = {
  "mainnet-beta": "4Bu96XjU84XjPDSpveTVf6LYGCkfW5FK7SNkREWcEfV4",
  devnet: "2Jx4KTDrVSdWNazuGpcA8n3ZLTRGGBDxAWhuKe2Xcj2a",
} as const;

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const keypairPath = arg("keypair");
  if (!keypairPath) throw new Error("--keypair <path> is required.");
  const cluster = (arg("cluster") ?? process.env.NEXT_PUBLIC_SOLANA_CLUSTER ?? "devnet") as "devnet" | "mainnet-beta";
  const rpc =
    arg("rpc") ??
    process.env.NEXT_PUBLIC_RPC_URL ??
    (cluster === "devnet" ? "https://api.devnet.solana.com" : "https://api.mainnet-beta.solana.com");
  const lp = arg("lp") ?? "burn";
  if (lp !== "burn" && lp !== "platform-lock") throw new Error("--lp must be burn or platform-lock.");
  const send = process.argv.includes("--send");

  const admin = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(keypairPath, "utf8"))));
  const connection = new Connection(rpc, "confirmed");
  const programId = cluster === "devnet" ? DEV_LAUNCHPAD_PROGRAM : LAUNCHPAD_PROGRAM;
  const platformId = getPdaPlatformId(programId, admin.publicKey).publicKey;

  console.log(`Cluster   ${cluster}`);
  console.log(`Admin     ${admin.publicKey.toBase58()}`);
  console.log(`Platform  ${platformId.toBase58()}`);

  const existing = await connection.getAccountInfo(platformId);
  if (existing) {
    const p = decodePlatform(existing.data);
    console.log(`\nAlready exists: "${p.name}", fee ${Number(p.feeRate) / 10_000}%, creator fee ${Number(p.creatorFeeRate) / 10_000}%, LP burn/platform/creator ${p.burnScale}/${p.platformScale}/${p.creatorScale}.`);
    console.log(`\nNEXT_PUBLIC_PLATFORM_ID=${platformId.toBase58()}`);
    return;
  }

  let cpConfigId = arg("cp-config");
  if (!cpConfigId) {
    const ray = await connection.getAccountInfo(new PublicKey(RAYDIUM_PLATFORM[cluster]));
    if (!ray) throw new Error("Could not read Raydium's platform to find a CPMM config. Pass --cp-config.");
    cpConfigId = decodePlatform(ray.data).cpConfigId.toBase58();
    console.log(`CPMM cfg  ${cpConfigId} (same as Raydium's own LaunchLab platform)`);
  }
  const claimWallet = new PublicKey(arg("claim-wallet") ?? admin.publicKey.toBase58());

  const raydium = await Raydium.load({
    connection,
    owner: admin,
    cluster: cluster === "devnet" ? "devnet" : "mainnet",
    disableFeatureCheck: true,
    disableLoadToken: true,
  });

  const { transaction, extInfo } = await raydium.launchpad.createPlatformConfig({
    programId,
    platformAdmin: admin.publicKey,
    platformClaimFeeWallet: claimWallet,
    platformLockNftWallet: claimWallet,
    platformVestingWallet: claimWallet,
    cpConfigId: new PublicKey(cpConfigId),
    transferFeeExtensionAuth: admin.publicKey,
    // Parts per million. LP after migration: all burned, or all locked with the platform's fee key.
    migrateCpLockNftScale:
      lp === "burn"
        ? { platformScale: new BN(0), creatorScale: new BN(0), burnScale: new BN(1_000_000) }
        : { platformScale: new BN(1_000_000), creatorScale: new BN(0), burnScale: new BN(0) },
    feeRate: new BN(5_000), // 0.5% platform
    creatorFeeRate: new BN(5_000), // 0.5% creator
    name: "RedStonk",
    web: "https://redstonk.fun",
    img: "https://redstonk.fun/icon.svg",
    txVersion: TxVersion.V0,
  });

  const sim = await connection.simulateTransaction(transaction, { sigVerify: false, replaceRecentBlockhash: true });
  if (sim.value.err) {
    console.error("Simulation failed:", JSON.stringify(sim.value.err));
    console.error((sim.value.logs ?? []).join("\n"));
    process.exit(1);
  }
  console.log(`Simulation ok (${sim.value.unitsConsumed} CU). LP policy: ${lp}. Fees: 0.5% platform + 0.5% creator.`);

  if (!send) {
    console.log("\nDry run. Re-run with --send to create it.");
    console.log(`Would set NEXT_PUBLIC_PLATFORM_ID=${extInfo.platformId.toBase58()}`);
    return;
  }
  transaction.sign([admin]);
  const sig = await connection.sendRawTransaction(transaction.serialize());
  await connection.confirmTransaction(sig, "confirmed");
  console.log(`\nCreated. Signature ${sig}`);
  console.log(`NEXT_PUBLIC_PLATFORM_ID=${extInfo.platformId.toBase58()}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
