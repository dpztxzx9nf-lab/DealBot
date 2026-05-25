import { enrichDealsWithEbay } from "./ebay";
import { fetchRedditDeals } from "./feeds/reddit";
import { fetchSlickdeals } from "./feeds/slickdeals";
import { buildDealFromLead, buildDealsFromRawBypass } from "./feeds/ingest";
import { filterFeedItemsWithStats, type FilteredLead } from "./feeds/filter";
import { enrichDeal, isSwipeEligibleDeal } from "./scoring";
import { SOURCE_CATALOG, sourceStatusLabel } from "./source-catalog";
import type { Deal, FeedMeta, FeedResponse, RawFeedItem, SourcingMode } from "./types";

export const DEBUG_RAW_FEED =
  process.env.DEALBOT_DEBUG_RAW_FEED === "1" ||
  process.env.DEALBOT_DEBUG_RAW_FEED === "true";

const MAX_RETURNED_DEALS = 60;

export interface FeedSearchOptions {
  debugRaw?: boolean;
  mode?: SourcingMode;
  minProfit?: number;
  minDiscount?: number;
  includeOnlineOnly?: boolean;
  includeWeakConfidence?: boolean;
}

export interface FeedDebugInfo {
  debugRaw: boolean;
  mode: SourcingMode;
  slickdealsFetchOk: boolean;
  slickdealsRawCount: number;
  slickdealsError?: string;
  redditFetchOk: boolean;
  redditRawCount: number;
  redditError?: string;
  totalRawCount: number;
  afterFilterCount: number;
  finalReturnedCount: number;
  rejectedCount: number;
  rejectedReasons: Record<string, number>;
  tierCounts: Record<string, number>;
  sourcesSearched: { name: string; count: number; error?: string }[];
  sourceDiagnostics: FeedMeta["sources"];
  activeSources: number;
  inactiveSources: number;
  failedSources: number;
  acceptedProfitableLeads: number;
  lastSuccessfulScanTime: string | null;
  lastRefreshTime: string;
  expanded: boolean;
}

function shouldScanSource(mode: SourcingMode, scope: "local" | "online" | "nationwide" | "comps"): boolean {
  if (scope === "comps") return true;
  if (mode === "hybrid") return scope === "online" || scope === "nationwide" || scope === "local";
  if (mode === "online") return scope === "online" || scope === "nationwide";
  return scope === "local";
}

function sourceInactiveReason(status: string): string {
  if (status === "placeholder_planned") return "placeholder/planned source";
  if (status === "needs_credentials") return "needs credentials/API";
  if (status === "source_disabled") return "source disabled";
  if (status === "failed_source") return "failed source";
  return status;
}

function mergeRejectedReasons(
  target: Record<string, number>,
  next: Record<string, number>
): void {
  for (const [reason, count] of Object.entries(next)) {
    target[reason] = (target[reason] ?? 0) + count;
  }
}

function dedupeDeals(deals: Deal[]): Deal[] {
  const byKey = new Map<string, Deal>();
  for (const deal of deals) {
    const key = deal.sourceId ?? `${deal.source}-${deal.itemName}-${deal.clearancePrice}`;
    const prev = byKey.get(key);
    if (!prev || deal.finalScore > prev.finalScore) {
      byKey.set(key, deal);
    }
  }
  return [...byKey.values()].sort((a, b) => {
    const profitDelta = b.netProfit - a.netProfit;
    if (Math.abs(profitDelta) >= 15) return profitDelta;
    const roiDelta = b.roiPercent - a.roiPercent;
    if (Math.abs(roiDelta) >= 20) return roiDelta;
    const reliabilityDelta = b.sourceReliabilityScore - a.sourceReliabilityScore;
    if (Math.abs(reliabilityDelta) >= 15) return reliabilityDelta;
    return b.finalScore - a.finalScore;
  });
}

function buildFromLeads(leads: FilteredLead[], zip: string, mode: SourcingMode): Deal[] {
  return leads.map((lead) => {
    const deal = buildDealFromLead(lead, zip);
    return enrichDeal({
      ...deal,
      sourcingMode: mode,
      ...(mode !== "nearby" ? { acquisitionMode: "online" as const } : {}),
      tags:
        mode !== "nearby"
          ? { ...deal.tags, localPickupFriendly: false }
          : deal.tags,
    });
  });
}

async function enrichCandidates(deals: Deal[]): Promise<Deal[]> {
  const enriched = await enrichDealsWithEbay(deals, 12);
  return enriched.map((deal) => enrichDeal(deal));
}

function tierCandidates(
  deals: Deal[],
  options: Required<Pick<FeedSearchOptions, "minProfit" | "includeWeakConfidence">>
): {
  tier1: Deal[];
  tier2: Deal[];
  tier3: Deal[];
} {
  const eligible = deals.filter((deal) =>
    isSwipeEligibleDeal(deal, {
      minProfit: options.minProfit,
      includeWeakConfidence: options.includeWeakConfidence,
    })
  );

  const tier1 = eligible.filter(
    (deal) =>
      deal.netProfit >= Math.max(20, options.minProfit) &&
      deal.finalScore >= 55 &&
      deal.riskScore <= 35 &&
      deal.stockConfidence >= 45
  );
  const tier2 = eligible.filter(
    (deal) =>
      !tier1.includes(deal) &&
      deal.netProfit >= options.minProfit &&
      deal.finalScore >= 40
  );
  const tier3 = eligible.filter(
    (deal) =>
      !tier1.includes(deal) &&
      !tier2.includes(deal) &&
      deal.netProfit >= options.minProfit
  );
  return { tier1, tier2, tier3 };
}

export async function aggregateDeals(
  zip: string,
  radiusMiles: number,
  extraItems: RawFeedItem[] = [],
  options: FeedSearchOptions = {}
): Promise<FeedResponse & { debug?: FeedDebugInfo }> {
  const debugRaw = options.debugRaw ?? DEBUG_RAW_FEED;
  const mode = options.mode ?? "hybrid";
  const minProfit = options.minProfit ?? 10;
  const minDiscount = options.minDiscount ?? 25;
  const includeWeakConfidence = options.includeWeakConfidence ?? false;
  const expanded =
    minProfit < 10 ||
    minDiscount < 25 ||
    options.includeOnlineOnly === true ||
    includeWeakConfidence;
  const errors: string[] = [];
  const rejectedReasons: Record<string, number> = {};
  const fetchedAt = new Date().toISOString();

  console.log("[feed] aggregateDeals start", {
    mode,
    zip,
    radiusMiles,
    debugRaw,
    minProfit,
    minDiscount,
    includeWeakConfidence,
    includeOnlineOnly: options.includeOnlineOnly ?? false,
  });

  const scanSlickdeals = shouldScanSource(mode, "nationwide");
  const scanReddit = shouldScanSource(mode, "nationwide");

  const [slick, reddit] = await Promise.all([
    scanSlickdeals
      ? fetchSlickdeals()
      : Promise.resolve({ items: [], error: "not scanned in nearby mode" }),
    scanReddit
      ? fetchRedditDeals()
      : Promise.resolve({ items: [], error: "not scanned in nearby mode" }),
  ]);

  const sourceResults: FeedMeta["sources"] = [
    {
      name: "Slickdeals RSS",
      count: slick.items.length,
      status: "active connector",
      scope: "nationwide",
      scanned: scanSlickdeals,
      error: slick.error,
    },
    {
      name: "Reddit communities",
      count: reddit.items.length,
      status: "active connector",
      scope: "nationwide",
      scanned: scanReddit,
      error: reddit.error,
    },
    {
      name: "eBay sold comps",
      count: 0,
      status: "active connector",
      scope: "comps",
      scanned: true,
      error: "enrichment only",
    },
    ...SOURCE_CATALOG.filter((source) => source.status !== "active_connector" && source.id !== "ebay_sold").map(
      (source) => ({
        name: source.name,
        count: 0,
        status: sourceStatusLabel(source.status),
        scope: source.scope,
        scanned: false,
        error: sourceInactiveReason(source.status),
      })
    ),
  ];

  const slickOk = !slick.error && slick.items.length > 0;
  const redditOk = !reddit.error && reddit.items.length > 0;
  if (slick.error) errors.push(slick.error);
  if (reddit.error) errors.push(reddit.error);

  const raw: RawFeedItem[] = [...slick.items, ...reddit.items, ...extraItems];
  console.log("[feed] fetched count:", {
    slickdeals: slick.items.length,
    reddit: reddit.items.length,
    extra: extraItems.length,
    total: raw.length,
  });

  let deals: Deal[] = [];
  let afterFilterCount = 0;
  let tierCounts: Record<string, number> = { tier1: 0, tier2: 0, tier3: 0 };

  if (debugRaw) {
    deals = buildDealsFromRawBypass(raw, zip, { onlyEligible: false }).map((deal) =>
      enrichDeal({
        ...deal,
        sourcingMode: mode,
        ...(mode !== "nearby" ? { acquisitionMode: "online" as const } : {}),
        tags:
          mode !== "nearby"
            ? { ...deal.tags, localPickupFriendly: false }
            : deal.tags,
      })
    );
    afterFilterCount = deals.length;
  } else if (raw.length > 0) {
    const strict = filterFeedItemsWithStats(raw, "strict", { minDiscount });
    mergeRejectedReasons(rejectedReasons, strict.stats.rejectedReasons);

    const strictDeals = buildFromLeads(strict.items, zip, mode);
    afterFilterCount = strictDeals.length;

    console.log("[feed] filtered count:", { strict: strictDeals.length });
    console.log("[feed] rejected reasons:", rejectedReasons);

    let candidates = dedupeDeals(strictDeals);
    try {
      candidates = await enrichCandidates(candidates);
    } catch (e) {
      console.log("[feed] eBay enrich skipped:", e);
      errors.push("eBay comps skipped");
      candidates = candidates.map((deal) => enrichDeal(deal));
    }

    const tiers = tierCandidates(candidates, { minProfit, includeWeakConfidence });
    tierCounts = {
      tier1: tiers.tier1.length,
      tier2: tiers.tier2.length,
      tier3: tiers.tier3.length,
    };

    deals = dedupeDeals([...tiers.tier1, ...tiers.tier2, ...tiers.tier3]).slice(
      0,
      MAX_RETURNED_DEALS
    );
  }

  const rejectedCount = Object.values(rejectedReasons).reduce(
    (sum, count) => sum + count,
    0
  );
  const activeSources = sourceResults.filter(
    (source) => source.status === "active connector"
  ).length;
  const inactiveSources = sourceResults.filter(
    (source) => source.status !== "active connector"
  ).length;
  const failedSources = sourceResults.filter(
    (source) =>
      source.status === "active connector" &&
      source.scanned &&
      Boolean(source.error) &&
      source.error !== "enrichment only"
  ).length;
  const lastSuccessfulScanTime = sourceResults.some(
    (source) =>
      source.status === "active connector" &&
      source.scanned &&
      !source.error &&
      source.count > 0
  )
    ? fetchedAt
    : null;

  console.log("[feed] run summary:", {
    mode,
    zip,
    radiusMiles,
    fetchedCount: raw.length,
    rejectedCount,
    acceptedCount: deals.length,
    rejectionBuckets: rejectedReasons,
    sourceFailures: sourceResults
      .filter(
        (source) => source.error && source.scanned && source.error !== "enrichment only"
      )
      .map((source) => ({ name: source.name, error: source.error })),
  });
  console.log("[feed] diagnostics:", {
    mode,
    scanned: raw.length,
    rejectedCount,
    acceptedProfitableLeads: deals.length,
    rejectedReasons,
    tierCounts,
    expanded,
  });

  const meta: FeedMeta = {
    zip,
    radiusMiles,
    mode,
    fetchedAt,
    sources: sourceResults,
    filtered: raw.length,
    queued: deals.length,
  };

  const debug: FeedDebugInfo = {
    debugRaw,
    mode,
    slickdealsFetchOk: slickOk,
    slickdealsRawCount: slick.items.length,
    slickdealsError: slick.error,
    redditFetchOk: redditOk,
    redditRawCount: reddit.items.length,
    redditError: reddit.error,
    totalRawCount: raw.length,
    afterFilterCount,
    finalReturnedCount: deals.length,
    rejectedCount,
    rejectedReasons,
    tierCounts,
    sourcesSearched: sourceResults,
    sourceDiagnostics: sourceResults,
    activeSources,
    inactiveSources,
    failedSources,
    acceptedProfitableLeads: deals.length,
    lastSuccessfulScanTime,
    lastRefreshTime: fetchedAt,
    expanded,
  };

  return { deals, meta, errors, debug };
}
