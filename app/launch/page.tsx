import type { Metadata } from "next";
import { LaunchFlow } from "@/components/launch-flow";
import { getPrint, resolveNow } from "@/lib/print-service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "List · RedStonk" };

export default async function LaunchPage({ searchParams }: { searchParams: Promise<{ now?: string }> }) {
  const { now } = await searchParams;
  const override = process.env.NODE_ENV !== "production" ? now : undefined;
  const { body } = await getPrint(resolveNow(override));
  // Only whether Irys is configured crosses to the client, never the key.
  const irysReady = Boolean(process.env.IRYS_PRIVATE_KEY);
  return <LaunchFlow initial={body} irysReady={irysReady} nowOverride={override} />;
}
