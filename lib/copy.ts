// Copy that must appear verbatim. Do not edit casually.

export const TAGLINE = "Only the red close.";

/** Required verbatim in the launch footer and on every coin page. */
export const QUOTE_DISCLAIMER =
  "This coin is quoted in a tokenized stock. You do not receive the underlying share, dividend, or vote. The quote can fall. Liquidity follows the launch program’s lock or burn rule. RedStonk does not custody funds.";

/** What each underlying is, for the "pairing is not ownership" line. */
export const UNDERLYING: Record<string, string> = {
  NVDA: "Nvidia",
  AAPL: "Apple",
  TSLA: "Tesla",
  MSFT: "Microsoft",
  AMZN: "Amazon",
  GOOGL: "Alphabet",
  META: "Meta",
  SPY: "the SPDR S&P 500 ETF",
  QQQ: "the Invesco QQQ ETF",
};

export function pairingLine(xStock: string, ticker: string): string {
  const name = UNDERLYING[ticker] ?? ticker;
  return `Pairing with ${xStock} does not mean the buyer owns ${name}. A coin here trades against a token that tracks ${ticker}; it is not ${ticker}, and it is not a claim on ${name}.`;
}

export const GENERIC_PAIRING_LINE =
  "Pairing with an xStock does not mean the buyer owns the stock behind it. A coin here trades against a token that tracks a share; it is not the share, and it is not a claim on the company.";
