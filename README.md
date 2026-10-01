# RedStonk

**Only the red close.**

RedStonk is a Solana launchpad with one rule. Every US trading day, the pad opens against a
single quote: the supported tokenized stock (xStock) with the worst regular-session close
against its prior close. A memecoin listed here trades against that xStock on a Raydium
LaunchLab bonding curve. No quote picker. No platform token. No team allocation. No custody.

Pairing with NVDAx does not mean the buyer owns Nvidia. The app says that on every launch
screen and every token page.

- `/` — **Tape.** Today's print, or "Pad shut" with a countdown to 16:00 ET. Below it, the board.
- `/launch` — **List.** Three steps: the coin, the quote (the print only), fees and sign.
- `/coin/[mint]` — **Ticket.** Name, ticker, quote, curve progress read from the LaunchLab pool,
  mint and freeze authority, LP policy, fees, and cluster.
- `/desk` — **Desk.** The floor manual: the rule, the rail, what happens at the open, and what
  we do not promise.

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000
```

With no `.env.local` at all, the app boots on devnet with the **labeled fixture closes**
(`data/fixture-closes.json`: NVDA closes −4.21%, three names close green) and no wallet. No
quote has a mint or config yet, so the tape shows NVDAx −4.2% with "no curve config for this
print", and listing stays hidden. That is the honest state until you bind a config.

Dev-only helpers (ignored by production builds):

| What | How |
| --- | --- |
| Fake the clock | append `?now=2026-10-01T21:05:00Z` to `/` or `/launch` |
| Green-only board ("no red print") | `PRINT_FIXTURE=green npm run dev` |

Other commands: `npm test` (vitest), `npm run typecheck`, `npm run build`.

## The rule

1. **Session date** (America/New_York). After the 16:00 close on a trading day, the session is
   today. Before 09:30, it is the previous trading day. Between 09:30 and 16:00 the pad is
   shut. Weekends and NYSE full-day holidays sit inside the window that opened at the last
   close. On early-close days the pad still waits for 16:00. Holidays are rule-based
   (`lib/market-clock.ts`); ad-hoc closures are not modeled. On such a day the feed has no
   close, so no print is named.
2. **Change** = `(close − prevClose) / prevClose` for each supported ticker.
3. **The print** is the most negative change. Ties go to the larger dollar volume
   (close × volume), then the alphabetical ticker. Flat and green closes are ineligible.
4. **Eligible** = red *and* a mint and config are set *and* the config is verified on chain:
   it exists, LaunchLab owns it, and its `mintB` is that xStock's mint.
5. **Winner** = the print, if it is eligible. If the worst close has no usable config, the
   answer is "no curve config for this print" and there is **no launch that day**. RedStonk
   does not fall through to the next red name. "The reddest close or nothing" is the product,
   so a second-worst quote would break it.
6. If **any** supported close is missing, no print is named. The worst close is unknown, and
   a price is never filled in.

`GET /api/print` returns:

```ts
{
  asOf, window: "open" | "shut", nextOpen, nextClose,
  winner: { ticker, xStock, mint, configId, changePct, close, prevClose, sessionDate } | null,
  board: Array<{ ticker, xStock, changePct, eligible, reason, status, close, prevClose, dollarVolume, isPrint }>,
  // also: sessionDate, print (the reddest close even when it cannot launch), verdict, message, source, cluster
}
```

`changePct` is a percentage (−4.21 means −4.21%). Closes and config checks are cached in
memory for 5 minutes (60 s while anything is missing). When the data source fails, the route
returns HTTP 503 with `verdict: "error"` and an empty board. No prices are shown.

## The rail: Raydium LaunchLab

No custom program. A listing is `raydium.launchpad.createLaunchpad` from
`@raydium-io/raydium-sdk-v2`, signed by the user's wallet:

| | |
| --- | --- |
| Quote mint | Read from the LaunchLab **GlobalConfig** bound by `configId`, then checked against the print's xStock mint. Never taken from the form. |
| Platform | Always `NEXT_PUBLIC_PLATFORM_ID`, passed explicitly. The SDK silently defaults to Raydium's own platform; RedStonk never lets it. |
| Supply / decimals | 1,000,000,000 / 6. |
| Curve sell | Raydium's published default for that config; otherwise LaunchLab's standard 793.1M. |
| Graduation target | Raydium's published default `totalFundRaisingB` for the config. If Raydium publishes none, `NEXT_PUBLIC_<X>_RAISE`. If neither exists, launch is refused. RedStonk does not invent one. |
| Fees | Read from chain and shown before signing. The target is 1% (0.5% creator / 0.5% platform) via the platform config, plus Raydium's protocol fee from the GlobalConfig (0.25% on the xStock configs today). |
| Migration | `cpmm`. |
| LP | Burned or locked by LaunchLab, per the platform config's `migrateCpLockNftScale`. RedStonk refuses to list through a platform that gives the creator any LP share. |
| Authorities | LaunchLab mints with no mint or freeze authority. The ticket page reads both from chain. |

Facts checked on mainnet on 2026-10-01 while building this:

- LaunchLab already has GlobalConfigs whose quote mint is each of NVDAx, AAPLx, TSLAx, MSFTx,
  AMZNx, GOOGLx, METAx, SPYx, and QQQx. There are thousands of live NVDAx-quoted pools. So
  LaunchLab can bind every seeded quote, and the optional Meteora DBC path was **not built**.
- xStock mints are Token-2022 with a freeze authority, a permanent delegate, a pause switch,
  and a scaled-UI multiplier. The quote and ticket screens show these issuer controls live.
  First-buy amounts are converted through the multiplier.
- A create-only listing and a listing with a first NVDAx buy were both built with this app's
  code (`buildLaunchTransactions`) and **simulated successfully** against mainnet: one V0
  transaction each, about 115k and 200k CU. Reproduce with `npm run simulate:launch`.

### The launch transaction

1. Require a connected wallet (Phantom, Solflare, or Backpack via Wallet Standard).
2. Re-fetch `/api/print`. Abort if the window is shut, there is no winner, the winner lacks a
   mint or config, the platform id is missing, or the winner is not the quote the user
   confirmed (`lib/launch-guards.ts`).
3. Upload metadata `{ name, symbol, description, image }` and use its URI.
4. Build `createLaunchpad` bound to the winner's `configId` and `NEXT_PUBLIC_PLATFORM_ID`, with
   every curve parameter explicit.
5. Simulate. On failure, show the program logs and send nothing.
6. Hand every transaction to the wallet in **one** prompt (`signAllTransactions`). Today that is
   always a single transaction. After the wallet signs, add the new mint's keypair signature,
   send in order, and confirm. Nothing is sent that the user did not see.
7. Poll for the pool account, then show the mint, the signature(s), and a link to `/coin/[mint]`.

### What happens at the cash open: no on-chain refunds in v1

LaunchLab and Meteora DBC have no instruction that refunds an unfilled curve at a deadline,
and RedStonk does not invent one. At 09:30 ET the only thing that changes is that **new
listings stop**. Curves already listed keep trading under LaunchLab's normal rules, and
graduate if they reach their target. There is no "refunded" state anywhere in the UI.

## Devnet vs mainnet

`NEXT_PUBLIC_SOLANA_CLUSTER` picks where launches are **written** and coin tickets are
**read**. A coin created on devnet does not exist on mainnet, so the ticket must read the same
cluster.

**Devnet (default).**
- LaunchLab devnet program `DRay6fNdQ5J82H7xV6uq2aV3mNrUZ1J4PgSKsWgptcm6`.
- xStocks do not exist on devnet. To exercise a launch, bind a ticker to a devnet stand-in
  mint plus a devnet LaunchLab GlobalConfig whose `mintB` is that mint. The UI shows a banner
  that devnet quotes are stand-ins.
- `NEXT_PUBLIC_RPC_URL` may be empty in `next dev` (falls back to the public devnet RPC).
- Without `IRYS_PRIVATE_KEY`, metadata is a dev-only inline data URI. Metaplex caps the URI at
  200 bytes, so the image is dropped and the blurb trimmed, and a banner says so.
- Fixture closes are allowed.

**Mainnet-beta.** Set `NEXT_PUBLIC_SOLANA_CLUSTER=mainnet-beta` and all of:
- `NEXT_PUBLIC_RPC_URL`: a real RPC. There is no public fallback.
- `NEXT_PUBLIC_PLATFORM_ID`: your LaunchLab platform (`npm run platform:create`).
- Verified `NEXT_PUBLIC_<X>_MINT` / `_CONFIG` pairs (`npm run scan:configs`, then verify each
  mint against the issuer's list).
- `IRYS_PRIVATE_KEY`, or launch is disabled.
- `STOCK_DATA_URL`. The fixture is never used on mainnet; without a feed the tape shows an
  error state.

## Environment variables

Documented line by line in [`.env.example`](.env.example).

| Variable | Side | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SOLANA_CLUSTER` | client | `devnet` (default) or `mainnet-beta`. Write cluster and ticket reads. |
| `NEXT_PUBLIC_RPC_URL` | client | RPC for that cluster. Required on mainnet. Devnet falls back to the public RPC only in `next dev`. |
| `NEXT_PUBLIC_PLATFORM_ID` | client | Your LaunchLab platform config. Empty means Sign is disabled with "platform not configured". |
| `NEXT_PUBLIC_<X>_MINT` | client | xStock mint for each of NVDAX, AAPLX, TSLAX, MSFTX, AMZNX, GOOGLX, METAX, SPYX, QQQX. |
| `NEXT_PUBLIC_<X>_CONFIG` | client | LaunchLab GlobalConfig quoted in that mint. Empty means the name can never launch. |
| `NEXT_PUBLIC_<X>_RAISE` | client | Optional graduation target in whole quote tokens, used only when Raydium publishes no default. |
| `IRYS_PRIVATE_KEY` | server | Pays for Irys metadata storage (base58 or JSON byte array). Unset means dev data URI, and mainnet launch is disabled. |
| `STOCK_DATA_URL` | server | Daily closes URL template (`{symbol}` / `{symbol_lower}`). CSV with Date/Close[/Volume], or JSON rows. Unset means the fixture (dev only). |
| `PRINT_FIXTURE` | server | Dev only. `green` serves the green-only fixture. |

## Operator scripts

All read `.env.local`.

```bash
npm run scan:configs                      # list LaunchLab configs quoted in each supported xStock (mainnet, read-only)
npm run platform:create -- --keypair admin.json            # dry run: simulate a 0.5%/0.5%, LP-burn platform
npm run platform:create -- --keypair admin.json --send     # create it, prints NEXT_PUBLIC_PLATFORM_ID
npm run simulate:launch -- --ticker NVDA --payer <addr> [--buy 0.5]   # build + simulate a listing, sends nothing
```

## Layout

```
app/                 pages (tape, launch, coin/[mint], desk) and API routes
  api/print          the daily print
  api/curve-defaults Raydium's published LaunchLab config defaults (server-side proxy)
  api/metadata       Irys upload, or the dev data URI
components/          tape, launch flow, ticket, board, wallet sheet, nav
lib/
  quotes.ts          the supported set, env-bound
  market-clock.ts    NY session, window, NYSE holidays
  print.ts           pure ranking rules
  closes.ts          feed + fixture sources
  config-check.ts    on-chain GlobalConfig verification
  launch-guards.ts   pre-flight refusals
  launch-sheet.ts    config/platform/quote/economics read before signing
  launch-tx.ts       createLaunchpad build, simulate, sign, send
  launchlab-layout.ts  light decoders for LaunchLab accounts (tested against the SDK layouts)
  coin-read.ts       ticket reads (mint, metadata, pool by PDA)
data/                fixture closes (labeled, not market data)
scripts/             scan, platform creation, launch simulation
tests/               vitest
```

## Not in v1

- No custom Solana program, no refund instruction, no withdraw-LP button, no transfer tax.
- No platform token and no team allocation.
- No database. The print is cached in memory, and tickets are read straight from chain.
- No volume, holder counts, or charts. Only what the chain or the feed actually says.
- No Meteora DBC path. LaunchLab binds every seeded quote today.
