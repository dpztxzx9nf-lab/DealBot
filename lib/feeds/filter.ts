import type { RawFeedItem } from "../types";
import { findTrapRejectionReason } from "../scoring";
import { matchesResaleCategory, detectBrandTags } from "./brands";
import { extractStore, inferDealAndRetail } from "./parse-prices";

const MAX_DEAL_PRICE = 200;
const MIN_DISCOUNT = 25;
const MIN_PRICE = 1;
const REJECT_TEXT =
  /\b(food|snack|drink|beverage|supplement|vitamin|medicine|diaper|detergent|cleaner|soap|shampoo|lotion|grocery|expired|sold out|dead|ymmv only|not a deal|as-is|for parts|damaged|untested|unknown condition)\b/i;
const HIGH_EFFORT =
  /\b(sofa|couch|mattress|dresser|desk|treadmill|washer|dryer|refrigerator|freezer|furniture|pallet)\b/i;
const WEAK_TITLE =
  /\b(misc|assorted|various|random|stuff|cheap|clearance item|sale item)\b/i;

export interface FilteredLead extends RawFeedItem {
  dealPrice: number;
  retailPrice?: number;
  discountPercent?: number;
  store?: string;
}

export type FeedFilterTier = "strict" | "moderate" | "broad" | "frontpage";

export interface FeedFilterStats {
  rejectedReasons: Record<string, number>;
}

export interface FeedFilterOptions {
  minDiscount?: number;
}

function reject(stats: FeedFilterStats, reason: string): void {
  stats.rejectedReasons[reason] = (stats.rejectedReasons[reason] ?? 0) + 1;
}

export function filterFeedItemsWithStats(
  items: RawFeedItem[],
  tier: FeedFilterTier = "strict",
  options: FeedFilterOptions = {}
): { items: FilteredLead[]; stats: FeedFilterStats } {
  const seen = new Set<string>();
  const out: FilteredLead[] = [];
  const stats: FeedFilterStats = { rejectedReasons: {} };
  const broad = tier === "broad" || tier === "frontpage";
  const moderate = tier === "moderate" || broad;
  const defaultMinDiscount =
    tier === "strict" ? MIN_DISCOUNT : tier === "moderate" ? 15 : 0;
  const minDiscount = options.minDiscount ?? defaultMinDiscount;
  const maxPrice = tier === "strict" ? MAX_DEAL_PRICE : tier === "moderate" ? 350 : 500;

  for (const item of items) {
    const key = item.sourceId || item.title.slice(0, 60);
    if (seen.has(key)) continue;
    seen.add(key);

    const text = `${item.title} ${item.description ?? ""}`;
    if (!matchesResaleCategory(text) && !/\$\d/.test(text)) {
      reject(stats, "no category or price");
      continue;
    }
    if (REJECT_TEXT.test(text)) {
      reject(stats, "blocked product/condition text");
      continue;
    }
    const trapReason = findTrapRejectionReason(text);
    if (trapReason) {
      reject(stats, trapReason);
      continue;
    }
    if (!broad && HIGH_EFFORT.test(text)) {
      reject(stats, "too bulky or high effort");
      continue;
    }
    if (!broad && (WEAK_TITLE.test(item.title) || item.title.trim().length < 14)) {
      reject(stats, "weak title");
      continue;
    }

    const { dealPrice, retailPrice, discountPercent } = inferDealAndRetail(
      item.title,
      item.description
    );
    const price = item.price ?? dealPrice;
    if (!price || price < MIN_PRICE || price > maxPrice) {
      reject(stats, "price missing or out of range");
      continue;
    }

    const discount =
      discountPercent ??
      (retailPrice && retailPrice > price
        ? Math.round(((retailPrice - price) / retailPrice) * 100)
        : undefined);

    const tags = detectBrandTags(text);
    if (!moderate && !tags.strongBrand && !matchesResaleCategory(text)) {
      reject(stats, "weak brand/category");
      continue;
    }
    if (!broad && tags.oversaturated && (discount ?? 0) < 60) {
      reject(stats, "oversaturated category");
      continue;
    }
    if ((discount ?? 0) < minDiscount && !tags.strongBrand) {
      reject(stats, "discount too low");
      continue;
    }
    if (tier === "strict" && !tags.strongBrand && (discount ?? 0) < 35) {
      reject(stats, "strict discount too low");
      continue;
    }

    out.push({
      ...item,
      dealPrice: price,
      retailPrice: item.retailPrice ?? retailPrice,
      discountPercent: discount,
      store: item.store ?? extractStore(text),
    });
  }

  return { items: out, stats };
}

export function filterFeedItems(
  items: RawFeedItem[],
  tier: FeedFilterTier = "strict",
  options: FeedFilterOptions = {}
): FilteredLead[] {
  return filterFeedItemsWithStats(items, tier, options).items;
}
