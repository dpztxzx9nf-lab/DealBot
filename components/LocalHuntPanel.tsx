"use client";

import { useMemo, useState } from "react";
import { useDeals } from "@/hooks/useDeals";
import {
  buildLocalHuntCandidates,
  generateLocalSearchTerms,
  localHuntSources,
  rankLocalSources,
  targetCategories,
  type LocalHuntStatus,
} from "@/lib/local-hunt";
import { isValidZip } from "@/lib/location";
import type { DealSource, SourceQuality } from "@/lib/types";

function statusLabel(status: LocalHuntStatus): string {
  if (status === "automated") return "Automated";
  if (status === "assisted") return "Assisted";
  if (status === "restricted") return "Restricted";
  if (status === "intelligence") return "Intelligence";
  return "Planned";
}

function statusClass(status: LocalHuntStatus): string {
  if (status === "automated") return "bg-emerald-500/15 text-emerald-300";
  if (status === "assisted") return "bg-sky-500/15 text-sky-300";
  if (status === "intelligence") return "bg-violet-500/15 text-violet-300";
  return "bg-zinc-700/60 text-zinc-300";
}

function qualityClass(quality: SourceQuality): string {
  if (quality === "strong") return "text-emerald-300";
  if (quality === "decent") return "text-amber-300";
  return "text-zinc-400";
}

export function LocalHuntPanel() {
  const {
    location,
    setLocation,
    loadFeed,
    feedLoading,
    feedError,
    feedStatus,
    pendingDeals,
    pipelineDeals,
    addDeal,
    setSourceMode,
  } = useDeals();
  const [category, setCategory] = useState("Electronics");
  const [zip, setZip] = useState(location.zip);
  const [budget, setBudget] = useState("150");
  const [radius, setRadius] = useState(String(location.radiusMiles));
  const [desiredProfit, setDesiredProfit] = useState("45");
  const [candidateSource, setCandidateSource] =
    useState<DealSource>("craigslist");
  const [stagedCount, setStagedCount] = useState(0);

  const mission = useMemo(
    () => ({
      category,
      budget: Math.max(1, parseInt(budget, 10) || 1),
      radiusMiles: Math.max(1, parseInt(radius, 10) || 25),
      desiredProfit: Math.max(1, parseInt(desiredProfit, 10) || 25),
    }),
    [budget, category, desiredProfit, radius]
  );

  const terms = useMemo(() => generateLocalSearchTerms(mission), [mission]);
  const sources = useMemo(
    () => rankLocalSources(mission, localHuntSources()),
    [mission]
  );
  const selectedSource = sources.find((source) => source.id === candidateSource) ?? sources[0];
  const activeDiagnostics = feedStatus.sourceDiagnostics.filter(
    (source) =>
      source.scope === "local" ||
      source.name.includes("Craigslist") ||
      source.name.includes("Facebook") ||
      source.name.includes("OfferUp") ||
      source.name.includes("clearance") ||
      source.name.includes("liquidation")
  );

  const runDiagnostics = async () => {
    const prefs = { zip: zip.trim(), radiusMiles: mission.radiusMiles };
    setLocation(prefs);
    setSourceMode("nearby");
    if (!isValidZip(prefs.zip)) return;
    await loadFeed(prefs);
  };

  const stageCandidates = () => {
    const inputs = buildLocalHuntCandidates(
      mission,
      zip.trim() || location.zip,
      candidateSource,
      terms.slice(0, 3)
    );
    let staged = 0;
    for (const input of inputs) {
      const deal = addDeal(input);
      if (deal.status === "pending") staged += 1;
    }
    setStagedCount((count) => count + staged);
  };

  return (
    <div className="flex flex-col gap-5 overflow-y-auto px-4 pb-8">
      <section className="border-b border-zinc-800 pb-5 pt-1">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase text-emerald-400">
              Local Hunt
            </p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-zinc-50">
              Market opportunity hunter
            </h2>
          </div>
          <div className="grid shrink-0 grid-cols-2 gap-2 text-center text-xs">
            <div className="rounded-lg bg-zinc-900 px-3 py-2">
              <p className="text-zinc-500">Swipe</p>
              <p className="font-bold text-emerald-300">{pendingDeals.length}</p>
            </div>
            <div className="rounded-lg bg-zinc-900 px-3 py-2">
              <p className="text-zinc-500">Pipeline</p>
              <p className="font-bold text-zinc-100">{pipelineDeals.length}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="text-xs text-zinc-500">ZIP</span>
            <input
              value={zip}
              onChange={(event) => setZip(event.target.value)}
              inputMode="numeric"
              className="input"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-zinc-500">Radius</span>
            <input
              value={radius}
              onChange={(event) => setRadius(event.target.value)}
              type="number"
              min={5}
              max={100}
              className="input"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-zinc-500">Budget</span>
            <input
              value={budget}
              onChange={(event) => setBudget(event.target.value)}
              type="number"
              min={10}
              className="input"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-zinc-500">Profit target</span>
            <input
              value={desiredProfit}
              onChange={(event) => setDesiredProfit(event.target.value)}
              type="number"
              min={10}
              className="input"
            />
          </label>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {targetCategories().map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
                category === item
                  ? "border-emerald-500/50 bg-emerald-500 text-zinc-950"
                  : "border-zinc-800 bg-zinc-950/40 text-zinc-400"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={runDiagnostics}
          disabled={feedLoading || !isValidZip(zip)}
          className="mt-4 w-full rounded-lg bg-emerald-500 py-3 text-sm font-bold text-zinc-950 disabled:opacity-40"
        >
          {feedLoading ? "Checking local diagnostics..." : "Run local diagnostics"}
        </button>
        {feedError && <p className="mt-2 text-xs text-amber-300">{feedError}</p>}
      </section>

      <section>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-zinc-200">Mission terms</h2>
          <span className="text-xs text-zinc-500">
            {mission.category} under ${mission.budget}
          </span>
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {terms.map((term) => (
            <span
              key={term}
              className="shrink-0 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-200"
            >
              {term}
            </span>
          ))}
        </div>
      </section>

      <section className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-zinc-200">Source ranking</h2>
          <span className="text-xs text-zinc-500">
            Desired profit ${mission.desiredProfit}
          </span>
        </div>
        {sources.map((source) => {
          const href = source.buildUrl?.(terms[0] ?? mission.category, zip.trim() || location.zip);
          return (
            <article
              key={source.id}
              className="rounded-lg border border-zinc-800 bg-zinc-900/65 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-bold text-zinc-100">{source.name}</h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${statusClass(source.status)}`}
                    >
                      {statusLabel(source.status)}
                    </span>
                  </div>
                  <p className={`mt-1 text-xs font-semibold ${qualityClass(source.quality)}`}>
                    {source.expectedQuality}
                  </p>
                </div>
                <div className="rounded-lg bg-zinc-950 px-2.5 py-1.5 text-center">
                  <p className="text-[10px] text-zinc-600">Rank</p>
                  <p className="text-sm font-black text-zinc-100">{source.rankScore}</p>
                </div>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-zinc-500">
                {source.why}
              </p>
              {source.restriction && (
                <p className="mt-2 rounded-lg bg-zinc-950/70 px-3 py-2 text-[11px] text-zinc-500">
                  {source.restriction}
                </p>
              )}
              <div className="mt-3 flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-xs text-zinc-500">
                  <input
                    type="radio"
                    checked={candidateSource === source.id}
                    onChange={() => setCandidateSource(source.id)}
                    className="accent-emerald-500"
                  />
                  Stage from source
                </label>
                {href ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-emerald-500/40 px-3 py-2 text-xs font-semibold text-emerald-300"
                  >
                    {source.nextAction}
                  </a>
                ) : (
                  <span className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-400">
                    {source.nextAction}
                  </span>
                )}
              </div>
            </article>
          );
        })}
      </section>

      <section className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-zinc-100">
              Prepare for Swipe
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500">
              {selectedSource.name} candidates will enter the normal score,
              Swipe, and Pipeline flow with manual comp confidence.
            </p>
          </div>
          <span className="rounded-lg bg-zinc-950 px-3 py-2 text-xs font-bold text-zinc-300">
            {stagedCount} staged
          </span>
        </div>
        <button
          type="button"
          onClick={stageCandidates}
          className="mt-4 w-full rounded-lg bg-zinc-100 py-3 text-sm font-bold text-zinc-950"
        >
          Stage top candidates
        </button>
      </section>

      <section className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-4">
        <h2 className="text-sm font-bold text-zinc-100">
          Local opportunity diagnostics
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg bg-zinc-950/60 p-3">
            <p className="text-zinc-600">Accepted leads</p>
            <p className="mt-1 text-lg font-bold text-emerald-300">
              {feedStatus.acceptedProfitableLeads}
            </p>
          </div>
          <div className="rounded-lg bg-zinc-950/60 p-3">
            <p className="text-zinc-600">Rejected</p>
            <p className="mt-1 text-lg font-bold text-zinc-100">
              {feedStatus.rejectedCount}
            </p>
          </div>
          <div className="rounded-lg bg-zinc-950/60 p-3">
            <p className="text-zinc-600">Active sources</p>
            <p className="mt-1 text-lg font-bold text-zinc-100">
              {feedStatus.activeSources}
            </p>
          </div>
          <div className="rounded-lg bg-zinc-950/60 p-3">
            <p className="text-zinc-600">Inactive/planned</p>
            <p className="mt-1 text-lg font-bold text-zinc-100">
              {feedStatus.inactiveSources}
            </p>
          </div>
        </div>
        {activeDiagnostics.length > 0 && (
          <div className="mt-3 space-y-2">
            {activeDiagnostics.slice(0, 6).map((source) => (
              <div
                key={`${source.name}-${source.status}`}
                className="rounded-lg bg-zinc-950/60 px-3 py-2 text-xs"
              >
                <div className="flex justify-between gap-3">
                  <span className="truncate text-zinc-300">{source.name}</span>
                  <span className="text-zinc-500">{source.health ?? "inactive"}</span>
                </div>
                <p className="mt-1 text-[11px] text-zinc-600">
                  {source.status} | accepted {source.accepted ?? 0} | density{" "}
                  {source.profitableDensity ?? 0}%
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
