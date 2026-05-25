"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDeals } from "@/hooks/useDeals";

const tabs = [
  { href: "/swipe", label: "Swipe", icon: "◈" },
  { href: "/saved", label: "Saved", icon: "★" },
  { href: "/discover", label: "Discover", icon: "◎" },
  { href: "/sold", label: "Sold", icon: "✓" },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const { savedDeals, pendingDeals } = useDeals();
  const isSwipe = pathname === "/swipe" || pathname === "/";

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-50 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl ${
        isSwipe
          ? "border-t border-zinc-800/30 bg-gradient-to-t from-zinc-950/95 via-zinc-950/55 to-zinc-950/25"
          : "border-t border-zinc-800 bg-zinc-950/95"
      }`}
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around">
        {tabs.map((tab) => {
          const active =
            pathname === tab.href ||
            (tab.href === "/swipe" && pathname === "/");
          const badge =
            tab.href === "/saved"
              ? savedDeals.length
              : tab.href === "/swipe"
                ? pendingDeals.length
                : 0;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs transition-colors ${
                active
                  ? "text-emerald-400"
                  : isSwipe
                    ? "text-zinc-500/70"
                    : "text-zinc-500"
              }`}
            >
              <span className="text-lg leading-none">{tab.icon}</span>
              <span className="font-medium">{tab.label}</span>
              {badge > 0 && (
                <span className="absolute right-[calc(50%-22px)] top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-zinc-950">
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
