"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const NAV_ITEMS = [
  { href: "/", label: "Tape" },
  { href: "/launch", label: "List" },
  { href: "/desk", label: "Desk" },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/** Desktop: the white pill nav centered in the header. */
export function PillNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Primary" className="hidden md:block">
      <ul className="flex items-center gap-1 rounded-full bg-white/95 p-1 shadow-[0_8px_24px_-12px_rgba(16,13,14,0.35)] ring-1 ring-black/5">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`block rounded-full px-4 py-1.5 text-sm transition-colors ${
                  active ? "bg-ink text-white" : "text-ink-soft hover:bg-blush hover:text-ink"
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Phones: a floating pill at the bottom of the screen. */
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-4 z-40 md:hidden"
      style={{ bottom: "calc(1rem + env(safe-area-inset-bottom))" }}
    >
      <ul className="glass mx-auto grid max-w-sm grid-cols-3 gap-1 rounded-full p-1.5 shadow-[0_18px_40px_-16px_rgba(16,13,14,0.45)]">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`block rounded-full py-2.5 text-center text-sm font-medium transition-colors ${
                  active ? "bg-ink text-white" : "text-ink-soft"
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
