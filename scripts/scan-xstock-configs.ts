// Lists Raydium LaunchLab GlobalConfigs whose quote mint is a Token-2022 token with one of the
// supported xStock symbols. Read-only. Use the output as a lead, then verify every mint against
// the issuer's published list before putting it in .env.local. A symbol is not proof of issuer.
//
//   npm run scan:configs                 # mainnet-beta via NEXT_PUBLIC_RPC_URL or the public RPC
//   npm run scan:configs -- --rpc <url>

import { Connection, PublicKey, type ParsedAccountData } from "@solana/web3.js";
import { CONFIG_SPAN, decodeConfig } from "@/lib/launchlab-layout";
import { LAUNCHLAB_PROGRAM_IDS } from "@/lib/env";
import { QUOTES } from "@/lib/quotes";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const rpc = arg("rpc") ?? process.env.NEXT_PUBLIC_RPC_URL ?? "https://api.mainnet-beta.solana.com";
  const cluster = (arg("cluster") ?? "mainnet-beta") as keyof typeof LAUNCHLAB_PROGRAM_IDS;
  const programId = new PublicKey(LAUNCHLAB_PROGRAM_IDS[cluster]);
  const connection = new Connection(rpc, "confirmed");
  console.log(`Scanning LaunchLab ${programId.toBase58()} on ${cluster} via ${new URL(rpc).host}…`);

  const accounts = await connection.getProgramAccounts(programId, { filters: [{ dataSize: CONFIG_SPAN }] });
  const byMint = new Map<string, { id: string; curveType: number; index: number; tradeFeeRate: bigint }[]>();
  for (const a of accounts) {
    const c = decodeConfig(a.account.data);
    const key = c.mintB.toBase58();
    if (!byMint.has(key)) byMint.set(key, []);
    byMint.get(key)!.push({ id: a.pubkey.toBase58(), curveType: c.curveType, index: c.index, tradeFeeRate: c.tradeFeeRate });
  }
  console.log(`${accounts.length} GlobalConfigs across ${byMint.size} quote mints.`);

  const wanted = new Map(QUOTES.map((q) => [q.xStock, q]));
  const mints = [...byMint.keys()].map((m) => new PublicKey(m));
  const found: { xStock: string; mint: string; mintAuthority: string | null; name: string; configs: string[] }[] = [];
  for (let i = 0; i < mints.length; i += 100) {
    const chunk = mints.slice(i, i + 100);
    const infos = await connection.getMultipleParsedAccounts(chunk);
    infos.value.forEach((info, j) => {
      const data = info?.data as ParsedAccountData | undefined;
      if (!data || !("parsed" in data) || data.parsed?.type !== "mint") return;
      const ext = (data.parsed.info.extensions ?? []) as { extension: string; state: Record<string, unknown> }[];
      const md = ext.find((e) => e.extension === "tokenMetadata")?.state;
      const symbol = typeof md?.symbol === "string" ? md.symbol : "";
      if (!wanted.has(symbol)) return;
      const mint = chunk[j].toBase58();
      found.push({
        xStock: symbol,
        mint,
        mintAuthority: data.parsed.info.mintAuthority ?? null,
        name: String(md?.name ?? ""),
        configs: byMint.get(mint)!.map((c) => `${c.id} (curve ${c.curveType}, index ${c.index}, protocol fee ${Number(c.tradeFeeRate) / 10_000}%)`),
      });
    });
  }

  found.sort((a, b) => a.xStock.localeCompare(b.xStock));
  for (const f of found) {
    console.log(`\n${f.xStock}  "${f.name}"`);
    console.log(`  mint            ${f.mint}`);
    console.log(`  mint authority  ${f.mintAuthority}`);
    for (const c of f.configs) console.log(`  config          ${c}`);
  }
  const missing = QUOTES.filter((q) => !found.some((f) => f.xStock === q.xStock)).map((q) => q.xStock);
  if (missing.length) console.log(`\nNo LaunchLab config found for: ${missing.join(", ")}`);

  const symbols = new Map<string, number>();
  for (const f of found) symbols.set(f.xStock, (symbols.get(f.xStock) ?? 0) + 1);
  const dupes = [...symbols].filter(([, n]) => n > 1).map(([s]) => s);
  if (dupes.length) console.log(`\nWARNING: more than one mint claims ${dupes.join(", ")}. Symbols are not proof of issuer.`);

  console.log("\nCandidate env lines. VERIFY each mint against the issuer's published list first:\n");
  for (const f of found) {
    const key = f.xStock.toUpperCase();
    console.log(`# NEXT_PUBLIC_${key}_MINT=${f.mint}`);
    console.log(`# NEXT_PUBLIC_${key}_CONFIG=${f.configs[0].split(" ")[0]}`);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
