"use client";

import { useState } from "react";
import { useDeals } from "@/hooks/useDeals";
import { isValidZip } from "@/lib/location";
import { FREE_SOURCE_SLOTS, qualityLabel } from "@/lib/sources";

export function DiscoverPanel() {
  const {
    location,
    setLocation,
    loadFeed,
    feedLoading,
    feedError,
    lastFeedMeta,
    addDeal,
    pendingDeals,
  } = useDeals();

  const [zip, setZip] = useState(location.zip);
  const [radius, setRadius] = useState(String(location.radiusMiles));
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
          Find underpriced items you can resell locally.
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          Use your ZIP and a simple search term to check local listings, sold
          comps, and clearance sources before you buy.
        </p>
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
          {feedLoading ? "Finding resale leads..." : "Build resale queue"}
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
          Source checklist
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          Strong means sold comps. Decent means active comps. Risky means verify
          hard before driving.
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
        {pendingDeals.length} listings in resale queue
      </p>
    </div>
  );
}
