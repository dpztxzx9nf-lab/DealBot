"use client";

import Link from "next/link";
import { useState } from "react";
import { useDeals } from "@/hooks/useDeals";

export function SwipeChrome() {
  const {
    statusCounts,
    feedLoading,
    feedError,
    feedStatus,
    location,
    locationResolving,
    loadFeed,
    hydrated,
  } = useDeals();

  const [diagOpen, setDiagOpen] = useState(false);
  const pending = hydrated ? statusCounts.pending : "…";

  return (
    <div className="relative z-30 shrink-0 px-3 pb-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-sm font-semibold text-zinc-100">
            <span className="text-emerald-400 tabular-nums">{pending}</span>
            <span className="font-normal text-zinc-500"> left</span>
          </span>
          {feedLoading && (
            <span
              className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-emerald-400"
              aria-hidden
            />
          )}
        </div>

        <button
          type="button"
          onClick={() => setDiagOpen((o) => !o)}
          className="shrink-0 text-xs font-medium text-zinc-400 underline-offset-2 hover:text-zinc-200 active:text-zinc-100"
          aria-expanded={diagOpen}
        >
          {location.zip} · {location.radiusMiles}mi
          <span className="ml-1 text-[10px] text-zinc-600">{diagOpen ? "▲" : "▼"}</span>
        </button>
      </div>

      {diagOpen && (
        <div className="mt-2 rounded-xl border border-zinc-800 bg-zinc-900/95 p-3 text-xs text-zinc-400">
          <div className="grid grid-cols-4 gap-2 pb-3">
            {(
              [
                ["Pending", statusCounts.pending],
                ["Saved", statusCounts.saved],
                ["Skipped", statusCounts.skipped],
                ["Sold", statusCounts.sold],
              ] as const
            ).map(([label, val]) => (
              <div key={label} className="text-center">
                <p className="text-[10px] uppercase tracking-wide text-zinc-600">
                  {label}
                </p>
                <p className="text-sm font-bold tabular-nums text-zinc-200">
                  {hydrated ? val : "—"}
                </p>
              </div>
            ))}
          </div>

          <div className="space-y-1 border-t border-zinc-800 pt-2">
            <div className="flex justify-between gap-2">
              <span>API</span>
              <span className="text-zinc-200">
                {feedStatus.apiReachable === null
                  ? "—"
                  : feedStatus.apiReachable
                    ? "OK"
                    : "fail"}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span>Raw found</span>
              <span className="text-zinc-200">{feedStatus.rawDealsFound}</span>
            </div>
          </div>

          {feedStatus.lastError && (
            <p className="mt-2 break-all text-red-400/90">{feedStatus.lastError}</p>
          )}
          {feedError && feedError !== feedStatus.lastError && (
            <p className="mt-1 break-all text-amber-400/90">{feedError}</p>
          )}
          {locationResolving && (
            <p className="mt-1 text-zinc-500">Detecting location…</p>
          )}

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => loadFeed()}
              disabled={feedLoading}
              className="flex-1 rounded-lg bg-emerald-500/20 py-2 font-medium text-emerald-400 disabled:opacity-40"
            >
              Refresh feed
            </button>
            <Link
              href="/discover"
              className="rounded-lg border border-zinc-700 px-3 py-2 text-zinc-300"
            >
              ZIP
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
