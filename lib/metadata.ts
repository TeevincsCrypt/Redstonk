// Listing fields and metadata URIs. Shared by the launch form and the metadata route.

/** Metaplex limits: name 32 bytes, symbol 10 bytes, uri 200 bytes. */
export const NAME_MAX_BYTES = 32;
export const SYMBOL_MAX = 10;
export const BLURB_MAX = 280;
export const URI_MAX = 200;
export const IMAGE_MAX_BYTES = 1_000_000;
export const IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"] as const;

export interface ListingFields {
  name: string;
  symbol: string;
  description: string;
}

export type ListingErrors = Partial<Record<keyof ListingFields | "image", string>>;

const utf8Length = (s: string) => new TextEncoder().encode(s).length;

/** Uppercases and strips anything that is not A–Z or 0–9. */
export function normalizeTicker(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, SYMBOL_MAX);
}

export function validateListing(f: ListingFields): ListingErrors {
  const errors: ListingErrors = {};
  const name = f.name.trim();
  if (name === "") errors.name = "Name is required.";
  else if (utf8Length(name) > NAME_MAX_BYTES) errors.name = `Name is limited to ${NAME_MAX_BYTES} bytes on-chain.`;
  if (f.symbol === "") errors.symbol = "Ticker is required.";
  else if (f.symbol !== normalizeTicker(f.symbol)) errors.symbol = "Ticker is A–Z and 0–9 only, uppercase.";
  else if (f.symbol.length > SYMBOL_MAX) errors.symbol = `Ticker is at most ${SYMBOL_MAX} characters.`;
  if (f.description.length > BLURB_MAX) errors.description = `Blurb is at most ${BLURB_MAX} characters.`;
  return errors;
}

function toBase64(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

/**
 * Dev-only metadata: a base64 JSON data URI that fits Metaplex's 200-byte URI limit. The image
 * never fits and is dropped; the blurb is trimmed until the URI fits.
 */
export function devDataUri(f: ListingFields): { uri: string; trimmedBlurb: boolean } {
  const build = (description: string | null) =>
    `data:application/json;base64,${toBase64(
      JSON.stringify(
        description == null
          ? { name: f.name.trim(), symbol: f.symbol }
          : { name: f.name.trim(), symbol: f.symbol, description },
      ),
    )}`;
  const full = f.description.trim();
  let description = full;
  let uri = build(description || null);
  while (uri.length > URI_MAX && description.length > 0) {
    description = description.slice(0, -1);
    uri = build(description ? `${description.trimEnd()}…` : null);
  }
  return { uri, trimmedBlurb: description !== full };
}

/** Parses a data: URL into bytes and content type, enforcing the image limits. */
export function parseImageDataUrl(dataUrl: string): { bytes: Uint8Array; contentType: string } {
  const m = /^data:([^;,]+);base64,(.*)$/s.exec(dataUrl);
  if (!m) throw new Error("Image must be a base64 data URL.");
  const contentType = m[1];
  if (!(IMAGE_TYPES as readonly string[]).includes(contentType)) throw new Error("Image must be PNG, JPEG, GIF, or WebP.");
  const bin = atob(m[2]);
  if (bin.length > IMAGE_MAX_BYTES) throw new Error("Image is larger than 1 MB.");
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { bytes, contentType };
}
