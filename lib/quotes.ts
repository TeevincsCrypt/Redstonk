// The supported liquid set. These are the only names that can ever be the day's quote.
//
// Mints and LaunchLab GlobalConfig ids come from env only. An empty mint or config means the
// name can still show on the board, but it can never be launched against. Never paste a mint
// here that you have not verified against the issuer's published list.

export type QuoteIssuer = "xStocks";

export interface QuoteConfig {
  /** US ticker of the underlying, as the market-data feed knows it. */
  ticker: string;
  /** Tokenized-stock symbol on Solana. */
  xStock: string;
  /** SPL / Token-2022 mint of the tokenized stock on the write cluster. */
  mint: string;
  /** Raydium LaunchLab GlobalConfig whose mintB is `mint`. */
  configId: string;
  issuer: QuoteIssuer;
  /**
   * Optional graduation target in whole quote units, used only when Raydium publishes no
   * default `totalFundRaisingB` for `configId`. Empty means "use the LaunchLab default or refuse".
   */
  raise: string;
}

export const QUOTES: readonly QuoteConfig[] = [
  {
    ticker: "NVDA",
    xStock: "NVDAx",
    mint: process.env.NEXT_PUBLIC_NVDAX_MINT ?? "",
    configId: process.env.NEXT_PUBLIC_NVDAX_CONFIG ?? "",
    issuer: "xStocks",
    raise: process.env.NEXT_PUBLIC_NVDAX_RAISE ?? "",
  },
  {
    ticker: "AAPL",
    xStock: "AAPLx",
    mint: process.env.NEXT_PUBLIC_AAPLX_MINT ?? "",
    configId: process.env.NEXT_PUBLIC_AAPLX_CONFIG ?? "",
    issuer: "xStocks",
    raise: process.env.NEXT_PUBLIC_AAPLX_RAISE ?? "",
  },
  {
    ticker: "TSLA",
    xStock: "TSLAx",
    mint: process.env.NEXT_PUBLIC_TSLAX_MINT ?? "",
    configId: process.env.NEXT_PUBLIC_TSLAX_CONFIG ?? "",
    issuer: "xStocks",
    raise: process.env.NEXT_PUBLIC_TSLAX_RAISE ?? "",
  },
  {
    ticker: "MSFT",
    xStock: "MSFTx",
    mint: process.env.NEXT_PUBLIC_MSFTX_MINT ?? "",
    configId: process.env.NEXT_PUBLIC_MSFTX_CONFIG ?? "",
    issuer: "xStocks",
    raise: process.env.NEXT_PUBLIC_MSFTX_RAISE ?? "",
  },
  {
    ticker: "AMZN",
    xStock: "AMZNx",
    mint: process.env.NEXT_PUBLIC_AMZNX_MINT ?? "",
    configId: process.env.NEXT_PUBLIC_AMZNX_CONFIG ?? "",
    issuer: "xStocks",
    raise: process.env.NEXT_PUBLIC_AMZNX_RAISE ?? "",
  },
  {
    ticker: "GOOGL",
    xStock: "GOOGLx",
    mint: process.env.NEXT_PUBLIC_GOOGLX_MINT ?? "",
    configId: process.env.NEXT_PUBLIC_GOOGLX_CONFIG ?? "",
    issuer: "xStocks",
    raise: process.env.NEXT_PUBLIC_GOOGLX_RAISE ?? "",
  },
  {
    ticker: "META",
    xStock: "METAx",
    mint: process.env.NEXT_PUBLIC_METAX_MINT ?? "",
    configId: process.env.NEXT_PUBLIC_METAX_CONFIG ?? "",
    issuer: "xStocks",
    raise: process.env.NEXT_PUBLIC_METAX_RAISE ?? "",
  },
  {
    ticker: "SPY",
    xStock: "SPYx",
    mint: process.env.NEXT_PUBLIC_SPYX_MINT ?? "",
    configId: process.env.NEXT_PUBLIC_SPYX_CONFIG ?? "",
    issuer: "xStocks",
    raise: process.env.NEXT_PUBLIC_SPYX_RAISE ?? "",
  },
  {
    ticker: "QQQ",
    xStock: "QQQx",
    mint: process.env.NEXT_PUBLIC_QQQX_MINT ?? "",
    configId: process.env.NEXT_PUBLIC_QQQX_CONFIG ?? "",
    issuer: "xStocks",
    raise: process.env.NEXT_PUBLIC_QQQX_RAISE ?? "",
  },
].map((q) => ({ ...q, mint: q.mint.trim(), configId: q.configId.trim(), raise: q.raise.trim() })) as QuoteConfig[];

export function findQuote(ticker: string): QuoteConfig | undefined {
  return QUOTES.find((q) => q.ticker === ticker);
}

export function findQuoteByMint(mint: string): QuoteConfig | undefined {
  return QUOTES.find((q) => q.mint !== "" && q.mint === mint);
}

export function isConfigured(q: QuoteConfig): boolean {
  return q.mint !== "" && q.configId !== "";
}
