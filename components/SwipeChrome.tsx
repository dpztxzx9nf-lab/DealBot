"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useDeals } from "@/hooks/useDeals";

function formatRefreshTime(value: string | null): string {
  if (!value) return "Not yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function SwipeChrome() {
  const {
    statusCounts,
    feedLoading,
    feedError,
    feedStatus,
    searchExpansion,
    sourceMode,
    setSourceMode,
    setSearchExpansion,
    location,
    locationResolving,
    loadFeed,
    hydrated,
  } = useDeals();

  const [diagOpen, setDiagOpen] = useState(false);
  const [watchMode, setWatchMode] = useState(false);
  const [watchHit, setWatchHit] = useState<string | null>(null);
  const previousPending = useRef(statusCounts.pending);
  const pending = hydrated ? statusCounts.pending : "...";

  useEffect(() => {
    if (!watchMode) return;
    const intervalId = window.setInterval(() => {
      void loadFeed();
    }, 120000);
    return () => window.clearInterval(intervalId);
  }, [loadFeed, watchMode]);

  useEffect(() => {
    if (!watchMode) {
      previousPending.current = statusCounts.pending;
      return;
    }

    if (statusCounts.pending > previousPending.current) {
      let cancelled = false;
      queueMicrotask(() => {
        if (!cancelled) setWatchHit("New qualifying lead found.");
      });
      previousPending.current = statusCounts.pending;
      return () => {
        cancelled = true;
      };
    }

    previousPending.current = statusCounts.pending;
  }, [statusCounts.pending, watchMode]);

  const toggleExpansion = (key: keyof typeof searchExpansion) => {
    setSearchExpansion({ [key]: !searchExpansion[key] });
  };

  return (
    <div className="relative z-30 shrink-0 px-3 pb-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-sm font-semibold text-zinc-100">
            <span className="text-emerald-400 tabular-nums">{pending}</span>
            <span className="font-normal text-zinc-500"> leads</span>
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
          {location.zip} / {location.radiusMiles}mi
          <span className="ml-1 text-[10px] text-zinc-600">
            {diagOpen ? "up" : "down"}
          </span>
        </button>
      </div>

      {diagOpen && (
        <div className="mt-2 max-h-[70vh] overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-900/95 p-3 text-xs text-zinc-400 shadow-2xl">
          <div className="grid grid-cols-4 gap-2 pb-3">
            {(
              [
                ["Pending", statusCounts.pending],
                ["Pipeline", statusCounts.saved],
                ["Skipped", statusCounts.skipped],
                ["Sold", statusCounts.sold],
              ] as const
            ).map(([label, val]) => (
              <div key={label} className="text-center">
                <p className="text-[10px] uppercase tracking-wide text-zinc-600">
                  {label}
                </p>
                <p className="text-sm font-bold tabular-nums text-zinc-200">
                  {hydrated ? val : "-"}
                </p>
              </div>
            ))}
          </div>

          <div className="space-y-1 border-t border-zinc-800 pt-2">
            <div className="flex justify-between gap-2">
              <span>Mode</span>
              <span className="capitalize text-zinc-200">{sourceMode}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span>API</span>
              <span className="text-zinc-200">
                {feedStatus.apiReachable === null
                  ? "-"
                  : feedStatus.apiReachable
                    ? "OK"
                    : "Fail"}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span>Items scanned</span>
              <span className="text-zinc-200">{feedStatus.rawDealsFound}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span>Accepted leads</span>
              <span className="text-zinc-200">
                {feedStatus.acceptedProfitableLeads}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span>Rejected</span>
              <span className="text-zinc-200">{feedStatus.rejectedCount}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span>Last refresh</span>
              <span className="text-zinc-200">
                {formatRefreshTime(feedStatus.lastRefreshTime)}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span>Last successful</span>
              <span className="text-zinc-200">
                {formatRefreshTime(feedStatus.lastSuccessfulScanTime)}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span>Active / inactive</span>
              <span className="text-zinc-200">
                {feedStatus.activeSources} / {feedStatus.inactiveSources}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span>Lead density</span>
              <span className="text-zinc-200">
                {feedStatus.rawDealsFound > 0
                  ? `${Math.round((feedStatus.acceptedProfitableLeads / feedStatus.rawDealsFound) * 1000) / 10}%`
                  : "0%"}
              </span>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-1 border-t border-zinc-800 pt-2 text-center">
            <div className="rounded-lg bg-emerald-500/10 p-1.5">
              <p className="text-[10px] text-emerald-500/80">Strong</p>
              <p className="font-bold text-emerald-300">
                {feedStatus.acceptedCounts.strongFlip}
              </p>
            </div>
            <div className="rounded-lg bg-amber-500/10 p-1.5">
              <p className="text-[10px] text-amber-500/80">Decent</p>
              <p className="font-bold text-amber-300">
                {feedStatus.acceptedCounts.decentOpportunity}
              </p>
            </div>
            <div className="rounded-lg bg-red-500/10 p-1.5">
              <p className="text-[10px] text-red-500/80">Risk</p>
              <p className="font-bold text-red-300">
                {feedStatus.acceptedCounts.highRisk}
              </p>
            </div>
          </div>

          <div className="mt-3 border-t border-zinc-800 pt-2">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
              Source diagnostics
            </p>
            {feedStatus.sourceDiagnostics.length > 0 ? (
              <div className="space-y-1">
                {feedStatus.sourceDiagnostics.map((source) => (
                  <div
                    key={source.name}
                    className="rounded-lg bg-zinc-950/50 px-2 py-1"
                  >
                    <div className="flex justify-between gap-3">
                      <span className="min-w-0 truncate text-zinc-300">
                        {source.name}
                      </span>
                      <span className="shrink-0 text-right tabular-nums text-zinc-500">
                        {source.count}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-[10px] text-zinc-600">
                      {source.status ?? "unknown"} /{" "}
                      {source.scanned ? "scanned" : "not scanned"}
                      {` / ${source.health ?? "unknown"} / ${source.latencyMs ?? 0}ms`}
                      {source.error ? ` / ${source.error}` : ""}
                    </p>
                    <p className="mt-0.5 text-[10px] text-zinc-700">
                      accepted {source.accepted ?? 0}, density{" "}
                      {source.profitableDensity ?? 0}%
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-zinc-600">No search run yet.</p>
            )}
          </div>

          {Object.keys(feedStatus.rejectionBuckets).length > 0 && (
            <div className="mt-3 border-t border-zinc-800 pt-2">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
                Rejection buckets
              </p>
              <div className="grid grid-cols-2 gap-1">
                {Object.entries(feedStatus.rejectionBuckets).map(
                  ([bucket, count]) => (
                    <div
                      key={bucket}
                      className="flex justify-between gap-2 rounded-lg bg-zinc-950/50 px-2 py-1"
                    >
                      <span className="truncate text-zinc-400">{bucket}</span>
                      <span className="text-zinc-200">{count}</span>
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          <div className="mt-3 border-t border-zinc-800 pt-2">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
              Top rejection reasons
            </p>
            {feedStatus.topRejectionReasons.length > 0 ? (
              <div className="space-y-1">
                {feedStatus.topRejectionReasons.map((item) => (
                  <div
                    key={item.reason}
                    className="flex justify-between gap-3 rounded-lg bg-zinc-950/50 px-2 py-1"
                  >
                    <span className="min-w-0 truncate text-zinc-300">
                      {item.reason}
                    </span>
                    <span className="shrink-0 tabular-nums text-zinc-500">
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-zinc-600">No rejected items recorded yet.</p>
            )}
          </div>

          <div className="mt-3 border-t border-zinc-800 pt-2">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
              Sourcing mode
            </p>
            <div className="grid grid-cols-3 gap-1 rounded-lg bg-zinc-950/50 p-1">
              {(["nearby", "online", "hybrid"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setSourceMode(mode)}
                  className={`rounded-md py-1.5 text-[11px] font-semibold capitalize ${
                    sourceMode === mode
                      ? "bg-emerald-500 text-zinc-950"
                      : "text-zinc-500"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3 border-t border-zinc-800 pt-2">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
              Expand Search
            </p>
            <div className="space-y-2">
              {(
                [
                  ["lowerProfitMinimum", "Lower profit minimum"],
                  ["lowerDiscountMinimum", "Lower discount minimum"],
                  ["includeOnlineOnly", "Include online-only deals"],
                  ["includeWeakConfidence", "Include weaker resale confidence"],
                ] as const
              ).map(([key, label]) => (
                <label
                  key={key}
                  className="flex items-center justify-between gap-3 rounded-lg bg-zinc-950/50 px-2 py-2 text-zinc-300"
                >
                  <span>{label}</span>
                  <input
                    type="checkbox"
                    checked={searchExpansion[key]}
                    onChange={() => toggleExpansion(key)}
                    className="h-4 w-4 accent-emerald-400"
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="mt-3 border-t border-zinc-800 pt-2">
            <button
              type="button"
              onClick={() => {
                setWatchHit(null);
                setWatchMode((value) => !value);
              }}
              className={`w-full rounded-lg py-2 font-medium ${
                watchMode
                  ? "bg-emerald-500/20 text-emerald-300"
                  : "bg-zinc-950 text-zinc-300"
              }`}
            >
              {watchMode ? "Watch Mode on" : "Start Watch Mode"}
            </button>
            <p className="mt-1 text-center text-[11px] text-zinc-600">
              Checks sources every 2 minutes while this screen is open.
            </p>
            {watchHit && (
              <p className="mt-2 rounded-lg bg-emerald-500/10 px-2 py-1 text-center text-emerald-300">
                {watchHit}
              </p>
            )}
          </div>

          {feedStatus.lastError && (
            <p className="mt-2 break-all text-red-400/90">
              {feedStatus.lastError}
            </p>
          )}
          {feedError && feedError !== feedStatus.lastError && (
            <p className="mt-1 break-all text-amber-400/90">{feedError}</p>
          )}
          {locationResolving && (
            <p className="mt-1 text-zinc-500">Detecting location...</p>
          )}

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => loadFeed()}
              disabled={feedLoading}
              className="flex-1 rounded-lg bg-emerald-500/20 py-2 font-medium text-emerald-400 disabled:opacity-40"
            >
              {feedLoading ? "Searching..." : "Apply & Refresh"}
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
