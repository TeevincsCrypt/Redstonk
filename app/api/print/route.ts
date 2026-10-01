import { NextResponse } from "next/server";
import { getPrint, resolveNow } from "@/lib/print-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const now = resolveNow(new URL(request.url).searchParams.get("now"));
  const { status, body } = await getPrint(now);
  return NextResponse.json(body, { status, headers: { "cache-control": "no-store" } });
}
