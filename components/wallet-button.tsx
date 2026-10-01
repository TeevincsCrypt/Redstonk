"use client";

import { useEffect, useRef, useState } from "react";
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
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenu(false);
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [menu]);

  const width = block ? "w-full" : "";

  if (publicKey) {
    return (
      <div ref={menuRef} className={`relative ${width}`}>
        <button
          type="button"
          className={`btn btn-dark h-10 px-4 text-sm ${width}`}
          onClick={() => setMenu((m) => !m)}
          aria-expanded={menu}
          title={publicKey.toBase58()}
        >
          <span className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden />
          {wallet?.adapter.icon && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={wallet.adapter.icon} alt="" width={16} height={16} className="hidden sm:block" />
          )}
          <span className="font-mono text-xs">{shortAddress(publicKey.toBase58())}</span>
        </button>
        {menu && (
          <div className="card absolute right-0 z-50 mt-2 w-56 p-2 text-sm">
            <p className="px-3 py-2 text-xs text-mute">
              {wallet?.adapter.name ?? "Wallet"} ·{" "}
              <span className="font-mono">{shortAddress(publicKey.toBase58(), 6)}</span>
            </p>
            <button
              type="button"
              className="w-full rounded-xl px-3 py-2 text-left text-ink hover:bg-blush"
              onClick={() => {
                setMenu(false);
                void disconnect();
              }}
            >
              Disconnect
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        className={`btn btn-dark h-10 px-4 text-sm ${width}`}
        onClick={() => setOpen(true)}
        disabled={connecting}
      >
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
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-3 backdrop-blur-sm md:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Connect a wallet"
        className="card w-full max-w-md p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Connect a wallet</h2>
            <p className="mt-1 text-sm text-mute">RedStonk never holds your keys. Your wallet signs every transaction.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-mute hover:bg-blush hover:text-ink"
          >
            ✕
          </button>
        </div>
        <ul className="mt-5 space-y-2">
          {SUPPORTED.map((s) => {
            const w = wallets.find((x) => x.adapter.name === s.name);
            const usable =
              w && (w.readyState === WalletReadyState.Installed || w.readyState === WalletReadyState.Loadable);
            return (
              <li key={s.name}>
                {usable ? (
                  <button
                    type="button"
                    onClick={() => select(s.name as WalletName)}
                    className="flex w-full items-center justify-between rounded-2xl border border-line px-4 py-3 text-left transition-colors hover:border-[#f2b8bf] hover:bg-blush"
                  >
                    <WalletRowLabel name={s.name} icon={w.adapter.icon} />
                    <span className="text-xs font-medium text-brand">
                      {w.readyState === WalletReadyState.Installed ? "Detected" : "Open"}
                    </span>
                  </button>
                ) : (
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex w-full items-center justify-between rounded-2xl border border-dashed border-line px-4 py-3 text-mute transition-colors hover:bg-canvas"
                  >
                    <WalletRowLabel name={s.name} icon={w?.adapter.icon} />
                    <span className="text-xs">Install ↗</span>
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

function WalletRowLabel({ name, icon }: { name: string; icon?: string }) {
  return (
    <span className="flex items-center gap-3">
      {icon ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={icon} alt="" width={28} height={28} className="rounded-lg" />
      ) : (
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-blush text-xs font-semibold text-brand">
          {name[0]}
        </span>
      )}
      <span className="font-medium text-ink">{name}</span>
    </span>
  );
}
