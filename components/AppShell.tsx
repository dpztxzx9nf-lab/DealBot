"use client";

import { BottomNav } from "./BottomNav";
import { DealStats } from "./DealStats";
import { HydrationBanner } from "./HydrationBanner";
import { PwaHttpWarning } from "./PwaHttpWarning";

export function AppShell({
  title,
  children,
  showStats = false,
  variant = "default",
}: {
  title: string;
  children: React.ReactNode;
  showStats?: boolean;
  variant?: "default" | "swipe" | "immersive";
}) {
  const isImmersive = variant === "immersive" || variant === "swipe";

  if (isImmersive) {
    return (
      <div className="flex min-h-dvh flex-col bg-zinc-950 text-zinc-100">
        <PwaHttpWarning />
        <main className="safe-area-immersive-top relative flex min-h-0 flex-1 flex-col overflow-hidden pb-[calc(3.75rem+env(safe-area-inset-bottom,0px))]">
          {children}
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-40 shrink-0 border-b border-zinc-800/80 bg-zinc-950/95 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-md">
        <h1 className="text-base font-bold tracking-tight">
          <span className="text-emerald-400">Deal</span>Bot
        </h1>
        <p className="text-xs text-zinc-500">{title}</p>
      </header>
      <PwaHttpWarning />
      <HydrationBanner />
      {showStats && <DealStats />}
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden pb-[calc(4.5rem+env(safe-area-inset-bottom))]">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
