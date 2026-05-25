import { enrichDealsWithEbay } from "./ebay";
import { fetchRedditDeals } from "./feeds/reddit";
import { fetchSlickdeals } from "./feeds/slickdeals";
import {
  buildDealsFromRawBypass,
  filterAndBuildDeals,
} from "./feeds/ingest";
import { enrichDeal } from "./scoring";
import type { Deal, FeedMeta, FeedResponse, RawFeedItem } from "./types";

/** Filters OFF by default until explicitly enabled. */
export const DEBUG_RAW_FEED =
  process.env.DEALBOT_FILTERS_ON !== "1" &&
  process.env.DEALBOT_FILTERS_ON !== "true";

export interface FeedDebugInfo {
  debugRaw: boolean;
  slickdealsFetchOk: boolean;
  slickdealsRawCount: number;
  slickdealsError?: string;
  redditFetchOk: boolean;
  redditRawCount: number;
  redditError?: string;
  totalRawCount: number;
  afterFilterCount: number;
  finalReturnedCount: number;
}

export async function aggregateDeals(
  zip: string,
  radiusMiles: number,
  extraItems: RawFeedItem[] = [],
  options?: { debugRaw?: boolean }
): Promise<FeedResponse & { debug?: FeedDebugInfo }> {
  const debugRaw = options?.debugRaw ?? DEBUG_RAW_FEED;
  const errors: string[] = [];
  const sourceResults: FeedMeta["sources"] = [];

  console.log("[feed] aggregateDeals start", { zip, radiusMiles, debugRaw });

  const [slick, reddit] = await Promise.all([
    fetchSlickdeals(),
    fetchRedditDeals(),
  ]);

  const slickOk = !slick.error && slick.items.length > 0;
  const redditOk = !reddit.error && reddit.items.length > 0;

  console.log("[feed] Slickdeals:", {
    ok: slickOk,
    rawCount: slick.items.length,
    error: slick.error ?? null,
  });
  console.log("[feed] Reddit:", {
    ok: redditOk,
    rawCount: reddit.items.length,
    error: reddit.error ?? null,
  });

  if (slick.error) errors.push(slick.error);
  if (reddit.error) errors.push(reddit.error);

  sourceResults.push({
    name: "Slickdeals RSS",
    count: slick.items.length,
    error: slick.error,
  });
  sourceResults.push({
    name: "Reddit communities",
    count: reddit.items.length,
    error: reddit.error,
  });

  const raw: RawFeedItem[] = [...slick.items, ...reddit.items, ...extraItems];
  console.log("[feed] total raw parsed items:", raw.length);

  let deals: Deal[];
  let afterFilterCount: number;

  if (debugRaw) {
    console.log("[feed] DEBUG_RAW: bypassing filters, eBay, ZIP restrictions");
    deals = buildDealsFromRawBypass(raw, zip);
    afterFilterCount = deals.length;
  } else {
    const filtered = filterAndBuildDeals(raw, zip);
    afterFilterCount = filtered.length;
    console.log("[feed] after filterAndBuildDeals:", afterFilterCount);
    deals = filtered;

    try {
      const enriched = await enrichDealsWithEbay(deals, 10);
      deals = enriched.map((d) => enrichDeal(d));
      console.log("[feed] after eBay enrich:", deals.length);
    } catch (e) {
      console.log("[feed] eBay enrich skipped:", e);
      errors.push("eBay comps skipped");
    }
  }

  console.log("[feed] final returned count:", deals.length);

  const meta: FeedMeta = {
    zip,
    radiusMiles,
    fetchedAt: new Date().toISOString(),
    sources: sourceResults,
    filtered: raw.length,
    queued: deals.length,
  };

  const debug: FeedDebugInfo = {
    debugRaw,
    slickdealsFetchOk: slickOk,
    slickdealsRawCount: slick.items.length,
    slickdealsError: slick.error,
    redditFetchOk: redditOk,
    redditRawCount: reddit.items.length,
    redditError: reddit.error,
    totalRawCount: raw.length,
    afterFilterCount,
    finalReturnedCount: deals.length,
  };

  return { deals, meta, errors, debug };
}
