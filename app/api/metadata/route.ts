// Stores token metadata JSON and returns its URI for the LaunchLab initialize instruction.
//
// - IRYS_PRIVATE_KEY set → image and JSON are uploaded to Irys (paid by that key, not the user).
// - unset, devnet        → a dev-only inline data URI (image dropped, blurb trimmed to 200 bytes).
// - unset, mainnet-beta  → refused. Mainnet launch is disabled without permanent storage.

import { NextResponse } from "next/server";
import { CLUSTER, RPC_URL } from "@/lib/env";
import {
  devDataUri,
  normalizeTicker,
  parseImageDataUrl,
  validateListing,
  type ListingFields,
} from "@/lib/metadata";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export interface MetadataResponse {
  uri: string;
  mode: "irys" | "data-uri";
  notes: string[];
}

async function irysUploader() {
  const { Uploader } = await import("@irys/upload");
  const { Solana } = await import("@irys/upload-solana");
  const raw = (process.env.IRYS_PRIVATE_KEY ?? "").trim();
  // Accept a base58 secret key or a JSON byte array (solana-keygen format); Irys takes either.
  const key: string | Uint8Array = raw.startsWith("[") ? Uint8Array.from(JSON.parse(raw) as number[]) : raw;
  if (!RPC_URL) throw new Error("NEXT_PUBLIC_RPC_URL is required for Irys uploads.");
  const builder = Uploader(Solana).withWallet(key).withRpc(RPC_URL);
  return CLUSTER === "devnet" ? builder.devnet() : builder.mainnet();
}

function gateway(id: string): string {
  return CLUSTER === "devnet" ? `https://devnet.irys.xyz/${id}` : `https://gateway.irys.xyz/${id}`;
}

export async function POST(request: Request) {
  let body: Partial<ListingFields & { image: string | null }>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body must be JSON." }, { status: 400 });
  }

  const fields: ListingFields = {
    name: String(body.name ?? "").trim(),
    symbol: normalizeTicker(String(body.symbol ?? "")),
    description: String(body.description ?? "").trim(),
  };
  const errors = validateListing(fields);
  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ error: Object.values(errors).join(" ") }, { status: 400 });
  }

  let image: { bytes: Uint8Array; contentType: string } | null = null;
  if (body.image) {
    try {
      image = parseImageDataUrl(body.image);
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 400 });
    }
  }

  if (!process.env.IRYS_PRIVATE_KEY) {
    if (CLUSTER === "mainnet-beta") {
      return NextResponse.json(
        { error: "Mainnet launch is disabled: IRYS_PRIVATE_KEY is not set, so metadata cannot be stored permanently." },
        { status: 403 },
      );
    }
    const { uri, trimmedBlurb } = devDataUri(fields);
    const notes = ["Dev-only inline metadata (no IRYS_PRIVATE_KEY)."];
    if (image) notes.push("The image was not stored: it cannot fit in a 200-byte on-chain URI.");
    if (trimmedBlurb) notes.push("The blurb was trimmed to fit the 200-byte URI.");
    return NextResponse.json({ uri, mode: "data-uri", notes } satisfies MetadataResponse);
  }

  try {
    const irys = await irysUploader();
    let imageUri: string | undefined;
    if (image) {
      const receipt = await irys.upload(Buffer.from(image.bytes), {
        tags: [{ name: "Content-Type", value: image.contentType }],
      });
      imageUri = gateway(receipt.id);
    }
    const json = {
      name: fields.name,
      symbol: fields.symbol,
      description: fields.description,
      ...(imageUri ? { image: imageUri } : {}),
      ...(imageUri
        ? { properties: { files: [{ uri: imageUri, type: image!.contentType }], category: "image" } }
        : {}),
    };
    const receipt = await irys.upload(JSON.stringify(json), {
      tags: [{ name: "Content-Type", value: "application/json" }],
    });
    return NextResponse.json({ uri: gateway(receipt.id), mode: "irys", notes: [] } satisfies MetadataResponse);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `Metadata upload to Irys failed: ${msg}` }, { status: 502 });
  }
}
