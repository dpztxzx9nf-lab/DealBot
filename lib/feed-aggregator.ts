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
  rejectionBuckets: Record<RejectionBucket, number>;
  tierCounts: Record<string, number>;
  acceptedCounts: {
    strongFlip: number;
    decentOpportunity: number;
    highRisk: number;
  };
  sourceContributionRates: Record<string, {
    fetched: number;
    accepted: number;
    profitableDensity: number;
  }>;
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

type RejectionBucket =
  | "low margin"
  | "saturated"
  | "risky shipping"
  | "weak demand"
  | "suspicious listing"
  | "poor discount"
  | "weak sell-through"
  | "incomplete data";

function bucketFromReason(reason: string): RejectionBucket {
  const lower = reason.toLowerCase();
  if (lower.includes("profit") || lower.includes("margin")) return "low margin";
  if (lower.includes("saturat") || lower.includes("oversaturated")) return "saturated";
  if (lower.includes("shipping") || lower.includes("bulky") || lower.includes("effort")) return "risky shipping";
  if (lower.includes("demand") || lower.includes("brand") || lower.includes("category")) return "weak demand";
  if (lower.includes("suspicious") || lower.includes("scam") || lower.includes("unsafe")) return "suspicious listing";
  if (lower.includes("discount") || lower.includes("msrp")) return "poor discount";
  if (lower.includes("sell-through") || lower.includes("slow")) return "weak sell-through";
  return "incomplete data";
}

function mergeBucket(
  buckets: Record<RejectionBucket, number>,
  reason: string,
  count = 1
): void {
  const bucket = bucketFromReason(reason);
  buckets[bucket] = (buckets[bucket] ?? 0) + count;
}

function buildBuckets(reasons: Record<string, number>): Record<RejectionBucket, number> {
  const buckets = {} as Record<RejectionBucket, number>;
  for (const [reason, count] of Object.entries(reasons)) {
    mergeBucket(buckets, reason, count);
  }
  return buckets;
}

type FeedFetchResult = {
  items: RawFeedItem[];
  error?: string;
};

async function timedFetch(
  fn: () => Promise<FeedFetchResult>,
  skippedError?: string
): Promise<FeedFetchResult & { latencyMs: number }> {
  const start = Date.now();
  if (skippedError) {
    return { items: [], error: skippedError, latencyMs: 0 };
  }
  const result = await fn();
  return { ...result, latencyMs: Date.now() - start };
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

function sourceKeyForDeal(deal: Deal): string {
  if (deal.source === "slickdeals") return "Slickdeals RSS";
  if (deal.source === "reddit") return "Reddit communities";
  return deal.feedLabel ?? deal.source;
}

function sourceHealth(source: FeedMeta["sources"][number]): NonNullable<FeedMeta["sources"][number]["health"]> {
  if (!source.scanned) return source.status === "active connector" ? "not_scanned" : "inactive";
  if (source.error && source.error !== "enrichment only") return "failed";
  return "ok";
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
    timedFetch(
      fetchSlickdeals,
      scanSlickdeals ? undefined : "not scanned in nearby mode"
    ),
    timedFetch(
      fetchRedditDeals,
      scanReddit ? undefined : "not scanned in nearby mode"
    ),
  ]);

  let sourceResults: FeedMeta["sources"] = [
    {
      name: "Slickdeals RSS",
      count: slick.items.length,
      status: "active connector",
      scope: "nationwide",
      scanned: scanSlickdeals,
      latencyMs: slick.latencyMs,
      quality: "decent",
      error: slick.error,
    },
    {
      name: "Reddit communities",
      count: reddit.items.length,
      status: "active connector",
      scope: "nationwide",
      scanned: scanReddit,
      latencyMs: reddit.latencyMs,
      quality: "decent",
      error: reddit.error,
    },
    {
      name: "eBay sold comps",
      count: 0,
      status: "active connector",
      scope: "comps",
      scanned: true,
      latencyMs: 0,
      quality: "strong",
      error: "enrichment only",
    },
    ...SOURCE_CATALOG.filter((source) => source.status !== "active_connector" && source.id !== "ebay_sold").map(
      (source) => ({
        name: source.name,
        count: 0,
        status: sourceStatusLabel(source.status),
        scope: source.scope,
        scanned: false,
        latencyMs: 0,
        health: "inactive" as const,
        quality: "inactive",
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
  let acceptedCounts = {
    strongFlip: 0,
    decentOpportunity: 0,
    highRisk: 0,
  };
  let sourceContributionRates: FeedDebugInfo["sourceContributionRates"] = {};

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

    for (const candidate of candidates) {
      if (
        !isSwipeEligibleDeal(candidate, {
          minProfit,
          includeWeakConfidence,
        }) &&
        candidate.rejectionReason
      ) {
        mergeRejectedReasons(rejectedReasons, {
          [candidate.rejectionReason]: 1,
        });
      }
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

  acceptedCounts = {
    strongFlip: deals.filter((deal) => deal.confidenceLabel === "Strong Flip").length,
    decentOpportunity: deals.filter((deal) => deal.confidenceLabel === "Decent Opportunity").length,
    highRisk: deals.filter((deal) => deal.confidenceLabel === "High Risk").length,
  };

  const acceptedBySource = deals.reduce<Record<string, number>>((acc, deal) => {
    const key = sourceKeyForDeal(deal);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  sourceResults = sourceResults.map((source) => {
    const accepted = acceptedBySource[source.name] ?? 0;
    const profitableDensity =
      source.count > 0 ? Math.round((accepted / source.count) * 1000) / 10 : 0;
    return {
      ...source,
      health: source.health ?? sourceHealth(source),
      accepted,
      profitableDensity,
    };
  });

  sourceContributionRates = Object.fromEntries(
    sourceResults.map((source) => [
      source.name,
      {
        fetched: source.count,
        accepted: source.accepted ?? 0,
        profitableDensity: source.profitableDensity ?? 0,
      },
    ])
  );

  const rejectedCount = Object.values(rejectedReasons).reduce(
    (sum, count) => sum + count,
    0
  );
  const rejectionBuckets = buildBuckets(rejectedReasons);
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
    rejectionDistribution: rejectionBuckets,
    acceptedCounts,
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
    rejectionBuckets,
    tierCounts,
    acceptedCounts,
    sourceContributionRates,
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
    rejectionBuckets,
    tierCounts,
    acceptedCounts,
    sourceContributionRates,
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
