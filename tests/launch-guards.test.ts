import { describe, expect, it } from "vitest";
import { assertConfigQuote, assertLaunchable, LaunchBlocked, PLATFORM_NOT_CONFIGURED } from "@/lib/launch-guards";
import { assertBuildable } from "@/lib/launch-tx";
import type { PrintResponse } from "@/lib/print-response";
import type { CurveSheet } from "@/lib/launch-sheet";

const winner = {
  ticker: "NVDA",
  xStock: "NVDAx",
  mint: "Mint1111111111111111111111111111111111111111",
  configId: "Cfg11111111111111111111111111111111111111111",
  changePct: -4.2,
  close: 172.41,
  prevClose: 179.98,
  sessionDate: "2026-09-30",
};

function print(over: Partial<PrintResponse> = {}): PrintResponse {
  return {
    asOf: "2026-10-01T21:00:00.000Z",
    window: "open",
    nextOpen: "2026-10-02T13:30:00.000Z",
    nextClose: "2026-10-02T20:00:00.000Z",
    sessionDate: "2026-10-01",
    winner,
    print: null,
    board: [],
    verdict: "print",
    message: "",
    source: { kind: "fixture", label: "fixture" },
    cluster: "devnet",
    ...over,
  };
}

const PLATFORM = "Plat1111111111111111111111111111111111111111";

describe("assertLaunchable", () => {
  it("returns the print's winner when everything lines up", () => {
    expect(assertLaunchable(print(), "NVDA", PLATFORM)).toEqual(winner);
  });

  it("refuses without a platform id, before anything else", () => {
    expect(() => assertLaunchable(print(), "NVDA", "")).toThrow(PLATFORM_NOT_CONFIGURED);
    expect(() => assertLaunchable(print({ window: "shut" }), "NVDA", "")).toThrow(PLATFORM_NOT_CONFIGURED);
  });

  it("refuses a quote other than today's print", () => {
    expect(() => assertLaunchable(print(), "TSLA", PLATFORM)).toThrow(/print changed from TSLA to NVDA/);
  });

  it("refuses when the window is shut", () => {
    expect(() => assertLaunchable(print({ window: "shut" }), "NVDA", PLATFORM)).toThrow(/Pad shut/);
  });

  it("refuses when there is no winner", () => {
    expect(() => assertLaunchable(print({ winner: null, verdict: "no-red-print" }), "NVDA", PLATFORM)).toThrow(
      LaunchBlocked,
    );
    expect(() =>
      assertLaunchable(print({ winner: null, verdict: "no-curve-config" }), "NVDA", PLATFORM),
    ).toThrow(/No curve config/);
  });

  it("refuses a winner with no config", () => {
    expect(() => assertLaunchable(print({ winner: { ...winner, configId: "" } }), "NVDA", PLATFORM)).toThrow(
      /No curve config/,
    );
  });
});

describe("assertConfigQuote", () => {
  it("refuses a config quoted in another mint", () => {
    expect(() => assertConfigQuote("So11111111111111111111111111111111111111112", winner)).toThrow(/not NVDAx/);
    expect(() => assertConfigQuote(winner.mint, winner)).not.toThrow();
  });
});

describe("assertBuildable", () => {
  const sheet = { problems: [] } as unknown as CurveSheet;
  it("never builds without a platform id", () => {
    expect(() => assertBuildable(sheet, "")).toThrow(PLATFORM_NOT_CONFIGURED);
  });
  it("never builds with open problems", () => {
    expect(() => assertBuildable({ ...sheet, problems: ["No LaunchLab GlobalConfig"] }, PLATFORM)).toThrow(
      "No LaunchLab GlobalConfig",
    );
  });
});
