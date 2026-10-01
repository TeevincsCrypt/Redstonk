"use client";

import { useMemo, type ReactNode } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import { RPC_URL } from "@/lib/env";

/**
 * Phantom and Solflare are registered explicitly. Backpack (and any other Wallet Standard
 * wallet) is discovered automatically by the wallet adapter when the extension is installed.
 */
export function Providers({ children }: { children: ReactNode }) {
  const wallets = useMemo(() => [new PhantomWalletAdapter(), new SolflareWalletAdapter()], []);
  const inner = (
    <WalletProvider wallets={wallets} autoConnect>
      {children}
    </WalletProvider>
  );
  // Without an RPC the app still renders; chain reads report "RPC not configured".
  return RPC_URL ? <ConnectionProvider endpoint={RPC_URL}>{inner}</ConnectionProvider> : inner;
}
