// The /api/print response shape, shared by the route and the client.

import type { BoardRow, Verdict } from "./print";
import type { Cluster } from "./env";

export interface PrintWinner {
  ticker: string;
  xStock: string;
  mint: string;
  configId: string;
  changePct: number;
  close: number;
  prevClose: number;
  sessionDate: string;
}

export interface PrintResponse {
  asOf: string;
  window: "open" | "shut";
  nextOpen: string;
  nextClose: string;
  /** Session the board describes (YYYY-MM-DD, New York). */
  sessionDate: string;
  winner: PrintWinner | null;
  /** The reddest close, even when it cannot launch (e.g. no curve config). */
  print: BoardRow | null;
  board: BoardRow[];
  verdict: Verdict | "shut" | "error";
  message: string;
  source: { kind: "fixture" | "feed"; label: string } | null;
  cluster: Cluster;
  error?: string;
}
