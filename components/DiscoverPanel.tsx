"use client";

import { useState } from "react";
import { useDeals } from "@/hooks/useDeals";
import { isValidZip } from "@/lib/location";
import { FREE_SOURCE_SLOTS, qualityLabel } from "@/lib/sources";

const modes = [
  {
    id: "nearby",
    label: "Nearby",
    description: "Local pickup, retail clearance, and same-day acquisition.",
    sources: ["Walmart", "Target", "Costco", "Home Depot", "Lowe's", "Facebook Marketplace", "Craigslist", "OfferUp"],
  },
  {
    id: "online",
    label: "Online",
    description: "Shippable arbitrage from national online sources.",
    sources: ["Amazon", "eBay", "Best Buy", "Slickdeals", "Reddit communities"],
  },
  {
    id: "hybrid",
    label: "Hybrid",
    description: "Best profit path regardless of acquisition channel.",
    sources: ["Local clearance", "Marketplaces", "Online-only flips", "Sold comps"],
  },
] as const;

export function DiscoverPanel() {
  const {
    location,
    setLocation,
    loadFeed,
    feedLoading,
    feedError,
    feedStatus,
    lastFeedMeta,
    addDeal,
    pendingDeals,
    sourceMode,
    setSourceMode,
  } = useDeals();

  const [zip, setZip] = useState(location.zip);
  const [radius, setRadius] = useState(String(location.radiusMiles));
  const mode = sourceMode;
  const [searchTerm, setSearchTerm] = useState("");
  const [pasteUrl, setPasteUrl] = useState("");
  const [pasteTitle, setPasteTitle] = useState("");
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [pasteLoading, setPasteLoading] = useState(false);

  const saveAndFetch = async () => {
    const r = parseInt(radius, 10) || 25;
    const prefs = { zip: zip.trim(), radiusMiles: r };
    setLocation(prefs);
    if (!isValidZip(prefs.zip)) return;
    await loadFeed(prefs);
  };

  const handlePaste = async () => {
    if (!pasteUrl.trim()) return;
    setPasteLoading(true);
    setPasteError(null);
    try {
      const res = await fetch("/api/deals/paste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: pasteUrl,
          title: pasteTitle || undefined,
          zip: zip.trim() || "00000",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Paste failed");
      for (const deal of data.deals) {
        addDeal({ ...deal, source: "pasted" });
      }
      setPasteUrl("");
      setPasteTitle("");
    } catch (e) {
      setPasteError(e instanceof Error ? e.message : "Paste failed");
    } finally {
      setPasteLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 overflow-y-auto px-4 pb-8">
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
        <h2 className="text-sm font-semibold text-zinc-200">
          Find profitable resale leads.
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          Pick a sourcing mode, set your ZIP, and build a queue from leads with
          a realistic path to net profit.
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-zinc-950/70 p-1">
          {modes.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSourceMode(item.id)}
              className={`rounded-lg px-2 py-2 text-xs font-semibold ${
                mode === item.id
                  ? "bg-emerald-500 text-zinc-950"
                  : "text-zinc-400"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
          {modes
            .filter((item) => item.id === mode)
            .map((item) => (
              <div key={item.id}>
                <p className="text-xs text-zinc-300">{item.description}</p>
                <p className="mt-2 text-[11px] leading-relaxed text-zinc-600">
                  {item.sources.join(" - ")}
                </p>
              </div>
            ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="block space-y-1">
            <span className="text-xs text-zinc-500">ZIP code</span>
            <input
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              placeholder="90210"
              inputMode="numeric"
              className="input"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-zinc-500">Radius (mi)</span>
            <input
              value={radius}
              onChange={(e) => setRadius(e.target.value)}
              type="number"
              min={5}
              max={100}
              className="input"
            />
          </label>
        </div>
        <label className="mt-3 block space-y-1">
          <span className="text-xs text-zinc-500">Item to search</span>
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Dyson vacuum, Lego, DeWalt..."
            className="input"
          />
        </label>
        <button
          type="button"
          disabled={feedLoading || !isValidZip(zip)}
          onClick={saveAndFetch}
          className="mt-4 w-full rounded-xl bg-emerald-500 py-3.5 font-bold text-zinc-950 disabled:opacity-40"
        >
          {feedLoading ? "Finding resale leads..." : "Build intelligence queue"}
        </button>
        {feedError && (
          <p className="mt-2 text-xs text-amber-400/90">{feedError}</p>
        )}
        {lastFeedMeta && (
          <p className="mt-2 text-xs text-zinc-500">
            {lastFeedMeta.queued} opportunities -{" "}
            {lastFeedMeta.sources.map((s) => `${s.name} (${s.count})`).join(" - ")}
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
        <h2 className="text-sm font-semibold text-zinc-200">
          Scan diagnostics
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-xl bg-zinc-950/60 p-3">
            <p className="text-zinc-600">Active sources</p>
            <p className="mt-1 text-lg font-bold text-zinc-100">
              {feedStatus.activeSources}
            </p>
          </div>
          <div className="rounded-xl bg-zinc-950/60 p-3">
            <p className="text-zinc-600">Inactive/planned</p>
            <p className="mt-1 text-lg font-bold text-zinc-100">
              {feedStatus.inactiveSources}
            </p>
          </div>
          <div className="rounded-xl bg-zinc-950/60 p-3">
            <p className="text-zinc-600">Listings fetched</p>
            <p className="mt-1 text-lg font-bold text-zinc-100">
              {feedStatus.rawDealsFound}
            </p>
          </div>
          <div className="rounded-xl bg-zinc-950/60 p-3">
            <p className="text-zinc-600">Accepted leads</p>
            <p className="mt-1 text-lg font-bold text-emerald-400">
              {feedStatus.acceptedProfitableLeads}
            </p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-xl bg-emerald-500/10 p-2">
            <p className="text-[10px] text-emerald-500/80">Strong</p>
            <p className="font-bold text-emerald-300">
              {feedStatus.acceptedCounts.strongFlip}
            </p>
          </div>
          <div className="rounded-xl bg-amber-500/10 p-2">
            <p className="text-[10px] text-amber-500/80">Decent</p>
            <p className="font-bold text-amber-300">
              {feedStatus.acceptedCounts.decentOpportunity}
            </p>
          </div>
          <div className="rounded-xl bg-red-500/10 p-2">
            <p className="text-[10px] text-red-500/80">High risk</p>
            <p className="font-bold text-red-300">
              {feedStatus.acceptedCounts.highRisk}
            </p>
          </div>
        </div>
        <div className="mt-3 rounded-xl bg-zinc-950/50 p-3 text-xs text-zinc-500">
          <div className="flex justify-between gap-2">
            <span>Rejected</span>
            <span className="text-zinc-200">{feedStatus.rejectedCount}</span>
          </div>
          <div className="mt-1 flex justify-between gap-2">
            <span>Last successful scan</span>
            <span className="text-zinc-200">
              {feedStatus.lastSuccessfulScanTime
                ? new Date(feedStatus.lastSuccessfulScanTime).toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                  })
                : "None yet"}
            </span>
          </div>
        </div>
        {feedStatus.topRejectionReasons.length > 0 && (
          <div className="mt-3 text-xs">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
              Top rejection reasons
            </p>
            <div className="mt-1 space-y-1">
              {feedStatus.topRejectionReasons.map((item) => (
                <div
                  key={item.reason}
                  className="flex justify-between gap-3 rounded-lg bg-zinc-950/50 px-2 py-1 text-zinc-400"
                >
                  <span className="truncate">{item.reason}</span>
                  <span className="text-zinc-200">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {Object.keys(feedStatus.rejectionBuckets).length > 0 && (
          <div className="mt-3 text-xs">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
              Rejection buckets
            </p>
            <div className="mt-1 grid grid-cols-2 gap-1">
              {Object.entries(feedStatus.rejectionBuckets).map(([bucket, count]) => (
                <div
                  key={bucket}
                  className="flex justify-between gap-2 rounded-lg bg-zinc-950/50 px-2 py-1 text-zinc-400"
                >
                  <span className="truncate">{bucket}</span>
                  <span className="text-zinc-200">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {feedStatus.sourceDiagnostics.length > 0 && (
          <div className="mt-3 text-xs">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
              Source health
            </p>
            <div className="mt-1 space-y-1">
              {feedStatus.sourceDiagnostics.slice(0, 8).map((source) => (
                <div
                  key={source.name}
                  className="rounded-lg bg-zinc-950/50 px-2 py-1 text-zinc-400"
                >
                  <div className="flex justify-between gap-3">
                    <span className="truncate text-zinc-300">{source.name}</span>
                    <span className="shrink-0">
                      {source.health ?? "unknown"} / {source.latencyMs ?? 0}ms
                    </span>
                  </div>
                  <p className="mt-0.5 text-[10px] text-zinc-600">
                    fetched {source.count}, accepted {source.accepted ?? 0}, density{" "}
                    {source.profitableDensity ?? 0}%
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
        <h2 className="text-sm font-semibold text-zinc-200">
          Source intelligence
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          Active sources scan automatically. Manual and connector slots stay
          visible so DealBot does not pretend unsupported sources were scanned.
        </p>
        <div className="mt-3 grid gap-2">
          {FREE_SOURCE_SLOTS.map((source) => {
            const href =
              source.buildUrl && searchTerm.trim()
                ? source.buildUrl(searchTerm, zip.trim() || location.zip)
                : null;

            return (
              <div
                key={source.id}
                className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-zinc-200">
                      {source.name}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {source.bestFor}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                      source.quality === "strong"
                        ? "bg-emerald-500/20 text-emerald-300"
                        : source.quality === "decent"
                          ? "bg-amber-500/20 text-amber-300"
                          : "bg-zinc-700 text-zinc-300"
                    }`}
                  >
                    {qualityLabel(source.quality)}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-zinc-600">
                  {source.workflow}
                </p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-[10px] uppercase text-zinc-600">
                    {source.mode === "planned"
                      ? "Source slot"
                      : source.mode === "manual"
                        ? "Manual workflow"
                        : "Quick search"}
                  </span>
                  {href && (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-emerald-500/40 px-2.5 py-1 text-xs font-medium text-emerald-400"
                    >
                      Open
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-[11px] text-zinc-600">
          No fake MSRP wins. Save listings only when local buy price beats real
          resale value after fees and pickup effort.
        </p>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
        <h2 className="text-sm font-semibold text-zinc-200">
          Paste a local listing
        </h2>
        <input
          value={pasteUrl}
          onChange={(e) => setPasteUrl(e.target.value)}
          placeholder="https://..."
          className="input mt-2"
        />
        <input
          value={pasteTitle}
          onChange={(e) => setPasteTitle(e.target.value)}
          placeholder="Optional title override"
          className="input mt-2"
        />
        <button
          type="button"
          disabled={pasteLoading || !pasteUrl.trim()}
          onClick={handlePaste}
          className="mt-3 w-full rounded-xl border border-zinc-600 py-2.5 text-sm text-zinc-200 disabled:opacity-40"
        >
          {pasteLoading ? "Parsing..." : "Add listing to resale queue"}
        </button>
        {pasteError && (
          <p className="mt-2 text-xs text-red-400">{pasteError}</p>
        )}
      </section>

      <p className="text-center text-xs text-zinc-600">
        {pendingDeals.length} profitable leads in swipe
      </p>
    </div>
  );
}
