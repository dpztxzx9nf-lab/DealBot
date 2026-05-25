import type { RawFeedItem } from "../types";
import { matchesResaleCategory, detectBrandTags } from "./brands";
import { extractStore, inferDealAndRetail } from "./parse-prices";

const MAX_DEAL_PRICE = 200;
const MIN_DISCOUNT = 35;
const MIN_PRICE = 1;

export interface FilteredLead extends RawFeedItem {
  dealPrice: number;
  retailPrice?: number;
  discountPercent?: number;
  store?: string;
}

export function filterFeedItems(items: RawFeedItem[]): FilteredLead[] {
  const seen = new Set<string>();
  const out: FilteredLead[] = [];

  for (const item of items) {
    const key = item.sourceId || item.title.slice(0, 60);
    if (seen.has(key)) continue;
    seen.add(key);

    const text = `${item.title} ${item.description ?? ""}`;
    if (!matchesResaleCategory(text) && !/\$\d/.test(text)) continue;
    if (/\b(expired|sold out|dead|ymmv only|not a deal)\b/i.test(text)) continue;

    const { dealPrice, retailPrice, discountPercent } = inferDealAndRetail(
      item.title,
      item.description
    );
    const price = item.price ?? dealPrice;
    if (!price || price < MIN_PRICE || price > MAX_DEAL_PRICE) continue;

    const discount =
      discountPercent ??
      (retailPrice && retailPrice > price
        ? Math.round(((retailPrice - price) / retailPrice) * 100)
        : undefined);

    const tags = detectBrandTags(text);
    if (tags.oversaturated && (discount ?? 0) < 60) continue;
    if ((discount ?? 0) < MIN_DISCOUNT && !tags.strongBrand) continue;
    if (!tags.strongBrand && (discount ?? 0) < 45) continue;

    out.push({
      ...item,
      dealPrice: price,
      retailPrice: item.retailPrice ?? retailPrice,
      discountPercent: discount,
      store: item.store ?? extractStore(text),
    });
  }

  return out;
}
