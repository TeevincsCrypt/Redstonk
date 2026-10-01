import type { Metadata } from "next";
import { TicketView } from "@/components/ticket";

export const metadata: Metadata = { title: "Ticket · RedStonk" };

export default async function CoinPage({ params }: { params: Promise<{ mint: string }> }) {
  const { mint } = await params;
  return <TicketView mint={decodeURIComponent(mint)} />;
}
