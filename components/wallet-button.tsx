"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletReadyState, type WalletName } from "@solana/wallet-adapter-base";
import { shortAddress } from "@/lib/format";

const SUPPORTED: { name: string; url: string }[] = [
  { name: "Phantom", url: "https://phantom.com/download" },
  { name: "Solflare", url: "https://solflare.com/download" },
  { name: "Backpack", url: "https://backpack.app/downloads" },
];

export function WalletButton({ block = false }: { block?: boolean }) {
  const { publicKey, wallet, connecting, disconnect } = useWallet();
  const [open, setOpen] = useState(false);

  const base =
    "font-mono text-xs uppercase tracking-wider border border-ink px-3 py-2 transition-colors hover:bg-ink hover:text-paper";
  const width = block ? "w-full" : "";

  if (publicKey) {
    return (
      <div className={`flex items-center gap-2 ${width}`}>
        <span className="font-mono text-xs" title={publicKey.toBase58()}>
          {wallet?.adapter.name && <span className="hidden sm:inline">{wallet.adapter.name} · </span>}
          {shortAddress(publicKey.toBase58())}
        </span>
        <button type="button" className={base} onClick={() => disconnect()}>
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <>
      <button type="button" className={`${base} ${width}`} onClick={() => setOpen(true)} disabled={connecting}>
        {connecting ? "Connecting…" : "Connect wallet"}
      </button>
      {open && <WalletSheet onClose={() => setOpen(false)} />}
    </>
  );
}

function WalletSheet({ onClose }: { onClose: () => void }) {
  const { wallets, select, publicKey } = useWallet();

  useEffect(() => {
    if (publicKey) onClose();
  }, [publicKey, onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 md:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Connect a wallet"
        className="w-full max-w-md border-t-2 border-ink bg-paper p-5 md:border-2"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-baseline justify-between">
          <h2 className="text-2xl font-semibold">Connect a wallet</h2>
          <button type="button" onClick={onClose} className="font-mono text-xs uppercase underline">
            Close
          </button>
        </div>
        <p className="mt-1 text-sm text-ink-soft">RedStonk never holds your keys. Your wallet signs every transaction.</p>
        <ul className="mt-4 divide-y divide-ink/30 border-y border-ink">
          {SUPPORTED.map((s) => {
            const w = wallets.find((x) => x.adapter.name === s.name);
            const usable =
              w && (w.readyState === WalletReadyState.Installed || w.readyState === WalletReadyState.Loadable);
            return (
              <li key={s.name} className="flex items-center justify-between py-3">
                <span className="flex items-center gap-3">
                  {w?.adapter.icon ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={w.adapter.icon} alt="" width={24} height={24} />
                  ) : (
                    <span className="inline-block h-6 w-6 border border-ink" />
                  )}
                  <span className="text-lg">{s.name}</span>
                </span>
                {usable ? (
                  <button
                    type="button"
                    className="font-mono text-xs uppercase tracking-wider border border-ink px-3 py-2 hover:bg-ink hover:text-paper"
                    onClick={() => select(s.name as WalletName)}
                  >
                    {w.readyState === WalletReadyState.Installed ? "Connect" : "Open"}
                  </button>
                ) : (
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-xs uppercase tracking-wider text-ink-soft underline"
                  >
                    Not detected
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
