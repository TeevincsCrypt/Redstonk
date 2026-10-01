// Builds a listing exactly as the launch page does and simulates it against your env. Nothing is
// signed or sent. Use it to check a platform, config, and graduation target before going live.
//
//   npm run simulate:launch -- --ticker NVDA --payer <wallet with SOL>
//   npm run simulate:launch -- --ticker NVDA --payer <wallet holding NVDAx> --buy 0.5
//
// The payer must exist on the cluster with enough SOL for rent (and quote tokens for --buy);
// simulation skips signature checks, so any funded address works.

import { Keypair, PublicKey } from "@solana/web3.js";
import { CLUSTER, PLATFORM_ID } from "@/lib/env";
import { getConnection } from "@/lib/connection";
import { fetchCurveDefaults } from "@/lib/curve-defaults";
import { loadCurveSheet } from "@/lib/launch-sheet";
import { buildLaunchTransactions } from "@/lib/launch-tx";
import { devDataUri } from "@/lib/metadata";
import { uiToRaw } from "@/lib/quote-mint";
import { QUOTES, findQuote } from "@/lib/quotes";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const ticker = (arg("ticker") ?? "").toUpperCase();
  const payer = arg("payer");
  if (!ticker || !payer) throw new Error("Usage: --ticker <NVDA|…> --payer <address> [--buy <amount>]");
  const quote = findQuote(ticker);
  if (!quote) throw new Error(`Unknown ticker. Supported: ${QUOTES.map((q) => q.ticker).join(", ")}`);
  if (!quote.mint || !quote.configId) throw new Error(`NEXT_PUBLIC_${quote.xStock.toUpperCase()}_MINT/_CONFIG are not set.`);
  if (!PLATFORM_ID) throw new Error("NEXT_PUBLIC_PLATFORM_ID is not set. Refusing to build.");

  // A stand-in print: this script checks the rail, not the market.
  const winner = { ticker, xStock: quote.xStock, mint: quote.mint, configId: quote.configId, changePct: -1, close: 1, prevClose: 1, sessionDate: "simulation" };
  const sheet = await loadCurveSheet(winner, quote, () =>
    fetchCurveDefaults(CLUSTER, QUOTES.map((q) => q.configId)),
  );
  console.log(`Cluster ${CLUSTER}, platform ${PLATFORM_ID}, config ${quote.configId}`);
  if (sheet.fees) console.log(`Fees: ${sheet.fees.totalPct.toFixed(2)}% (creator ${sheet.fees.creatorPct}%, platform ${sheet.fees.platformPct}%, protocol ${sheet.fees.protocolPct}%)`);
  if (sheet.lp) console.log(`LP: burn ${sheet.lp.burnPct}%, platform lock ${sheet.lp.platformLockPct}%, creator lock ${sheet.lp.creatorLockPct}%`);
  if (sheet.economics) console.log(`Curve: sell ${sheet.economics.totalSellA}, raise ${sheet.economics.totalFundRaisingB} raw ${quote.xStock} (${sheet.economics.source})`);
  if (sheet.problems.length) {
    console.error("Blocked:\n- " + sheet.problems.join("\n- "));
    process.exit(1);
  }

  const buy = arg("buy");
  const firstBuyRaw = buy ? uiToRaw(buy, sheet.quote!.decimals, sheet.quote!.uiMultiplier) : BigInt(0);
  const txs = await buildLaunchTransactions({
    connection: getConnection(),
    owner: new PublicKey(payer),
    winner,
    sheet,
    mintA: Keypair.generate(),
    uri: devDataUri({ name: "Simulation", symbol: "SIM", description: "" }).uri,
    listing: { name: "Simulation", symbol: "SIM", description: "" },
    firstBuyRaw,
  });
  console.log(`Built ${txs.length} transaction(s): ${txs.map((t) => `${t.serialize().length} bytes`).join(", ")}`);
  const sim = await getConnection().simulateTransaction(txs[0], { sigVerify: false, replaceRecentBlockhash: true });
  const logs = sim.value.logs ?? [];
  if (sim.value.err) {
    console.error(`Simulation FAILED: ${JSON.stringify(sim.value.err)}`);
    console.error(logs.join("\n"));
    process.exit(1);
  }
  console.log(`Simulation ok: ${sim.value.unitsConsumed} compute units. Nothing was sent.`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
