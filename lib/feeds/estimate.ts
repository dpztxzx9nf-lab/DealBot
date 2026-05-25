import type { CompSource, Confidence, SellSpeed } from "../types";
import { detectBrandTags } from "./brands";
import type { FilteredLead } from "./filter";

export interface ResaleEstimate {
  estimatedResale: number;
  compSource: CompSource;
  sellSpeed: SellSpeed;
  confidence: Confidence;
}

/** Heuristic resale estimate when eBay comps unavailable. */
export function estimateResaleHeuristic(lead: FilteredLead): ResaleEstimate {
  const text = `${lead.title} ${lead.description ?? ""}`;
  const tags = detectBrandTags(text);
  const buy = lead.dealPrice;
  const retail = lead.retailPrice ?? buy * 2;

  let multiplier = 2.2;
  if (tags.strongBrand) multiplier = 2.8;
  if ((lead.discountPercent ?? 0) >= 60) multiplier += 0.4;
  if (tags.oversaturated) multiplier = 1.6;
  if (tags.bulky) multiplier = 1.9;

  let estimatedResale = Math.round(Math.max(buy * multiplier, retail * 0.55));
  if (retail > buy) {
    estimatedResale = Math.max(estimatedResale, Math.round(retail * 0.62));
  }

  const roi = estimatedResale / buy;
  let sellSpeed: SellSpeed = "MEDIUM";
  let confidence: Confidence = "MEDIUM";

  if (tags.strongBrand && roi >= 2.5) {
    sellSpeed = "FAST";
    confidence = "HIGH";
  } else if (roi < 1.8 || tags.oversaturated) {
    sellSpeed = "SLOW";
    confidence = "LOW";
  }

  return {
    estimatedResale,
    compSource: "heuristic",
    sellSpeed,
    confidence,
  };
}

export function applyEbayComp(
  heuristic: ResaleEstimate,
  medianPrice: number,
  activeCount: number,
  sold = false
): ResaleEstimate {
  if (!medianPrice || activeCount < 3) return heuristic;
  return {
    estimatedResale: Math.round(medianPrice * (sold ? 0.95 : 0.9)),
    compSource: sold ? "ebay_sold" : "ebay_active",
    sellSpeed: activeCount >= 15 ? "FAST" : heuristic.sellSpeed,
    confidence: sold || activeCount >= 8 ? "HIGH" : "MEDIUM",
  };
}
