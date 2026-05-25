"use client";

import Link from "next/link";
import { useDeals } from "@/hooks/useDeals";
import { isValidZip } from "@/lib/location";

export function SwipeToolbar() {
  const { location, loadFeed, feedLoading, pendingDeals } = useDeals();

  return (
    <div className="flex items-center gap-2 px-4 pb-2">
      <div className="flex flex-1 items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2 text-xs">
        <span className="text-zinc-500">Near</span>
        <span className="font-semibold text-zinc-200">
          {isValidZip(location.zip) ? location.zip : "—"}
        </span>
        <span className="text-zinc-600">· {location.radiusMiles} mi</span>
      </div>
      <button
        type="button"
        disabled={feedLoading || !isValidZip(location.zip)}
        onClick={() => loadFeed()}
        className="shrink-0 rounded-xl bg-zinc-800 px-3 py-2 text-xs font-medium text-emerald-400 disabled:opacity-40"
      >
        {feedLoading ? "…" : "Refresh"}
      </button>
      {!isValidZip(location.zip) && (
        <Link
          href="/discover"
          className="shrink-0 rounded-xl border border-emerald-500/40 px-3 py-2 text-xs text-emerald-400"
        >
          Set ZIP
        </Link>
      )}
      {isValidZip(location.zip) && pendingDeals.length === 0 && !feedLoading && (
        <Link
          href="/discover"
          className="shrink-0 text-xs text-zinc-500 underline"
        >
          Fetch
        </Link>
      )}
    </div>
  );
}
