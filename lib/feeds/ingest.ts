import { enrichDeal } from "../scoring";
import type { Deal, DealInput, RawFeedItem } from "../types";
import { detectBrandTags } from "./brands";
import { filterFeedItems, type FilteredLead } from "./filter";
import { estimateResaleHeuristic } from "./estimate";
import { extractStore, inferDealAndRetail } from "./parse-prices";

export function rawToDealInput(
  lead: FilteredLead,
  zip: string,
  estimate = estimateResaleHeuristic(lead)
): DealInput {
  const text = `${lead.title} ${lead.description ?? ""}`;
  const brandTags = detectBrandTags(text);

  return {
    itemName: lead.title.slice(0, 120),
    imageUrl: lead.imageUrl,
    store: lead.store,
    clearancePrice: lead.dealPrice,
    retailPrice: lead.retailPrice,
    discountPercent: lead.discountPercent,
    estimatedResale: estimate.estimatedResale,
    compSource: estimate.compSource,
    sellSpeed: estimate.sellSpeed,
    confidence: estimate.confidence,
    notes: lead.description?.slice(0, 280),
    source: lead.source,
    sourceUrl: lead.link,
    sourceId: lead.sourceId,
    feedLabel: lead.feedLabel,
    tags: {
      strongBrand: brandTags.strongBrand,
      compact: brandTags.compact,
      bulky: brandTags.bulky,
      oversaturated: brandTags.oversaturated,
      localPickupFriendly: true,
      niche: /\b(refurb|open box| ymmv)\b/i.test(text),
    },
  };
}

export function buildDealFromLead(
  lead: FilteredLead,
  zip: string,
  status: Deal["status"] = "pending"
): Deal {
  const input = rawToDealInput(lead, zip);
  return enrichDeal({
    ...input,
    id: `${lead.source}-${lead.sourceId}`,
    createdAt: new Date().toISOString(),
    status,
    distanceMiles: undefined,
  });
}

/** DEBUG: bypass filter — convert every raw RSS/Reddit item to a swipe card. */
export function buildDealsFromRawBypass(
  raw: RawFeedItem[],
  zip: string
): Deal[] {
  const seen = new Set<string>();
  const deals: Deal[] = [];

  for (const item of raw) {
    const key = item.sourceId || item.title.slice(0, 60);
    if (seen.has(key)) continue;
    seen.add(key);

    const { dealPrice, retailPrice, discountPercent } = inferDealAndRetail(
      item.title,
      item.description
    );
    const price = item.price ?? dealPrice ?? 25;

    const lead: FilteredLead = {
      ...item,
      dealPrice: price,
      retailPrice: retailPrice ?? price * 2,
      discountPercent: discountPercent ?? 50,
      store: item.store ?? extractStore(`${item.title} ${item.description ?? ""}`),
    };

    deals.push(buildDealFromLead(lead, zip));
  }

  return deals.sort((a, b) => b.score - a.score);
}

export function filterAndBuildDeals(
  raw: RawFeedItem[],
  zip: string
): Deal[] {
  const filtered = filterFeedItems(raw);
  return filtered
    .map((lead) => buildDealFromLead(lead, zip))
    .sort((a, b) => b.score - a.score);
}
