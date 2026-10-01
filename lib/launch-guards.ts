// Pre-flight checks run immediately before any launch transaction is built.

import type { PrintResponse, PrintWinner } from "./print-response";

export class LaunchBlocked extends Error {}

export const PLATFORM_NOT_CONFIGURED = "Platform not configured. Set NEXT_PUBLIC_PLATFORM_ID.";

/**
 * Takes a freshly fetched print and the quote the user confirmed. Returns the only quote a launch
 * may bind to, or throws. The quote always comes from the server's print, never from form state.
 */
export function assertLaunchable(print: PrintResponse, confirmedTicker: string, platformId: string): PrintWinner {
  if (!platformId) throw new LaunchBlocked(PLATFORM_NOT_CONFIGURED);
  if (print.window !== "open") throw new LaunchBlocked("Pad shut. The launch window closed at the cash open.");
  const w = print.winner;
  if (!w) {
    throw new LaunchBlocked(
      print.verdict === "no-curve-config" ? "No curve config for this print." : "There is no print to list against.",
    );
  }
  if (!w.mint || !w.configId) throw new LaunchBlocked("No curve config for this print.");
  if (w.ticker !== confirmedTicker) {
    throw new LaunchBlocked(
      `The print changed from ${confirmedTicker} to ${w.ticker}. Only today's print can be the quote. Confirm it again.`,
    );
  }
  return w;
}

/** The GlobalConfig's quote mint must be the print's xStock mint. */
export function assertConfigQuote(configMintB: string, winner: PrintWinner): void {
  if (configMintB !== winner.mint) {
    throw new LaunchBlocked(
      `LaunchLab config ${winner.configId} is quoted in ${configMintB}, not ${winner.xStock} (${winner.mint}). Refusing to launch.`,
    );
  }
}
