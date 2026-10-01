import { Tape } from "@/components/tape";
import { getPrint, resolveNow } from "@/lib/print-service";

export const dynamic = "force-dynamic";

export default async function TapePage({ searchParams }: { searchParams: Promise<{ now?: string }> }) {
  const { now } = await searchParams;
  const override = process.env.NODE_ENV !== "production" ? now : undefined;
  const { body } = await getPrint(resolveNow(override));
  return <Tape initial={body} nowOverride={override} />;
}
