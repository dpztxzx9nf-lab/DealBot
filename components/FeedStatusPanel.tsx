"use client";

import { useDeals } from "@/hooks/useDeals";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-zinc-800 py-2 text-sm last:border-0">
      <span className="text-zinc-500">{label}</span>
      <span className="text-right font-mono font-semibold text-zinc-100">
        {value}
      </span>
    </div>
  );
}

export function FeedStatusPanel() {
  const {
    feedStatus,
    feedLoading,
    feedError,
    statusCounts,
    loadFeed,
    resetAppData,
    location,
    hydrated,
  } = useDeals();

  const apiLabel =
    feedStatus.apiReachable === null
      ? feedLoading
        ? "checking…"
        : "—"
      : feedStatus.apiReachable
        ? "YES"
        : "NO";

  return (
    <div className="mx-4 mb-3 rounded-2xl border-2 border-zinc-700 bg-zinc-900 p-4">
      <h2 className="mb-3 text-base font-bold text-emerald-400">Feed status</h2>
      <Row label="API reachable" value={apiLabel} />
      <Row
        label="Raw deals found"
        value={String(feedStatus.rawDealsFound)}
      />
      <Row
        label="Pending (swipe)"
        value={hydrated ? String(statusCounts.pending) : "…"}
      />
      <Row label="Pipeline" value={hydrated ? String(statusCounts.saved) : "…"} />
      <Row label="Skipped" value={hydrated ? String(statusCounts.skipped) : "…"} />
      <Row label="Sold" value={hydrated ? String(statusCounts.sold) : "…"} />
      <Row
        label="ZIP / radius"
        value={`${location.zip} / ${location.radiusMiles}mi`}
      />
      {feedStatus.lastError && (
        <div className="mt-3 rounded-lg border border-red-500/50 bg-red-500/10 p-3">
          <p className="text-xs font-semibold uppercase text-red-400">
            Last error
          </p>
          <p className="mt-1 break-all text-sm text-red-200">
            {feedStatus.lastError}
          </p>
        </div>
      )}
      {feedError && feedError !== feedStatus.lastError && (
        <div className="mt-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
          <p className="break-all text-sm text-amber-200">{feedError}</p>
        </div>
      )}
      {feedLoading && (
        <p className="mt-3 text-center text-sm text-zinc-400">
          Fetching raw deals…
        </p>
      )}
      <div className="mt-4 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => loadFeed()}
          disabled={feedLoading}
          className="w-full rounded-xl bg-emerald-500 py-3 font-bold text-zinc-950 disabled:opacity-50"
        >
          Refresh feed
        </button>
        <button
          type="button"
          onClick={resetAppData}
          className="w-full rounded-xl border-2 border-red-500/60 py-3 font-semibold text-red-400"
        >
          Reset app data
        </button>
      </div>
      {feedStatus.lastFetchUrl && (
        <p className="mt-2 break-all text-[10px] text-zinc-600">
          {feedStatus.lastFetchUrl}
        </p>
      )}
    </div>
  );
}
