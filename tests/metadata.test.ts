import { describe, expect, it } from "vitest";
import { devDataUri, normalizeTicker, parseImageDataUrl, URI_MAX, validateListing } from "@/lib/metadata";
import { uiToRaw, rawToUi } from "@/lib/quote-mint";

describe("listing fields", () => {
  it("uppercases tickers and strips junk", () => {
    expect(normalizeTicker("red candle!")).toBe("REDCANDLE");
    expect(normalizeTicker("abcdefghijklmnop")).toHaveLength(10);
  });

  it("rejects empty name and ticker", () => {
    const e = validateListing({ name: "  ", symbol: "", description: "" });
    expect(e.name).toBeDefined();
    expect(e.symbol).toBeDefined();
    expect(validateListing({ name: "Red Candle", symbol: "CANDLE", description: "" })).toEqual({});
  });

  it("enforces the 32-byte name limit", () => {
    expect(validateListing({ name: "x".repeat(33), symbol: "X", description: "" }).name).toBeDefined();
  });
});

describe("dev data URI", () => {
  it("always fits Metaplex's 200-byte URI field", () => {
    const { uri, trimmedBlurb } = devDataUri({
      name: "N".repeat(32),
      symbol: "SYMBOLSYMB",
      description: "A long blurb ".repeat(30),
    });
    expect(uri.length).toBeLessThanOrEqual(URI_MAX);
    expect(trimmedBlurb).toBe(true);
    const json = JSON.parse(Buffer.from(uri.split(",")[1], "base64").toString("utf8"));
    expect(json.name).toHaveLength(32);
    expect(json.symbol).toBe("SYMBOLSYMB");
  });

  it("keeps a short blurb intact", () => {
    const { uri, trimmedBlurb } = devDataUri({ name: "Red", symbol: "RED", description: "Down bad." });
    expect(trimmedBlurb).toBe(false);
    expect(JSON.parse(Buffer.from(uri.split(",")[1], "base64").toString()).description).toBe("Down bad.");
  });
});

describe("images", () => {
  it("rejects non-image data", () => {
    expect(() => parseImageDataUrl("data:text/html;base64,PGgxPg==")).toThrow();
    expect(parseImageDataUrl("data:image/png;base64,iVBORw0KGgo=").contentType).toBe("image/png");
  });
});

describe("scaled UI amounts", () => {
  it("converts wallet amounts to raw base units through the multiplier", () => {
    expect(uiToRaw("1", 8)).toBe(BigInt(100_000_000));
    expect(uiToRaw("0.5", 8, 1.25)).toBe(BigInt(40_000_000));
    expect(rawToUi(BigInt(40_000_000), 8, 1.25)).toBeCloseTo(0.5);
    expect(() => uiToRaw("abc", 8)).toThrow();
  });
});
