import type { CompSource, Deal, Recommendation, SourceQuality } from "./types";
import { calcEstimatedFees, calcProfit, calcRoiMultiple } from "./money";

export function sourceQualityFromComp(
  compSource: CompSource,
  fallback: SourceQuality = "risky"
): SourceQuality {
  if (compSource === "ebay_sold") return "strong";
  if (compSource === "ebay_active" || compSource === "manual") return "decent";
  return fallback;
}

export function scoreDeal(deal: Pick<
  Deal,
  | "clearancePrice"
  | "estimatedResale"
  | "sellSpeed"
  | "confidence"
  | "tags"
  | "distanceMiles"
  | "discountPercent"
  | "compSource"
  | "sourceQuality"
  | "estimatedFees"
>): number {
  const roi = calcRoiMultiple(deal.clearancePrice, deal.estimatedResale);
  const profit = calcProfit(
    deal.clearancePrice,
    deal.estimatedResale,
    deal.estimatedFees
  );
  let s = 0;

  if (roi >= 10) s += 40;
  else if (roi >= 5) s += 30;
  else if (roi >= 3) s += 20;
  else if (roi >= 2) s += 8;
  else s -= 15;

  if (profit >= 100) s += 20;
  else if (profit >= 60) s += 15;
  else if (profit >= 30) s += 8;
  else if (profit < 15) s -= 18;

  s += { FAST: 20, MEDIUM: 8, SLOW: -15 }[deal.sellSpeed];
  s += { HIGH: 15, MEDIUM: 5, LOW: -10 }[deal.confidence];

  const t = deal.tags ?? {};
  if (t.strongBrand) s += 10;
  if (t.compact) s += 8;
  if (t.localPickupFriendly) s += 6;
  if (t.bulky) s -= 12;
  if (t.fragile) s -= 8;
  if (t.oversaturated) s -= 10;
  if (t.niche) s -= 8;
  if (t.hardToPrice) s -= 12;

  if (deal.distanceMiles != null) {
    if (deal.distanceMiles <= 5) s += 8;
    else if (deal.distanceMiles <= 15) s += 3;
    else if (deal.distanceMiles > 35) s -= 14;
    else if (deal.distanceMiles > 20) s -= 8;
  }

  const disc = deal.discountPercent ?? 0;
  if (disc >= 70) s += 5;
  else if (disc >= 50) s += 3;

  const quality = deal.sourceQuality ?? sourceQualityFromComp(deal.compSource);
  if (quality === "strong") s += 18;
  else if (quality === "decent") s += 6;
  else s -= 12;

  if (deal.compSource === "ebay_sold") s += 10;
  else if (deal.compSource === "ebay_active") s += 4;

  return s;
}

export function recommend(score: number): Recommendation {
  if (score >= 55) return "BUY";
  if (score >= 30) return "MAYBE";
  return "SKIP";
}

type EnrichableDeal = Omit<
  Deal,
  | "roiMultiple"
  | "estimatedProfit"
  | "estimatedFees"
  | "score"
  | "recommendation"
  | "sourceQuality"
> &
  Partial<Pick<Deal, "estimatedFees" | "sourceQuality">>;

export function enrichDeal<T extends EnrichableDeal>(
  deal: T
): T & {
  estimatedFees: number;
  sourceQuality: SourceQuality;
  roiMultiple: number;
  estimatedProfit: number;
  score: number;
  recommendation: Recommendation;
} {
  const estimatedFees = deal.estimatedFees ?? calcEstimatedFees(deal.estimatedResale);
  const sourceQuality =
    deal.sourceQuality ?? sourceQualityFromComp(deal.compSource);
  const roiMultiple = calcRoiMultiple(deal.clearancePrice, deal.estimatedResale);
  const estimatedProfit = calcProfit(
    deal.clearancePrice,
    deal.estimatedResale,
    estimatedFees
  );
  const scoredDeal = { ...deal, estimatedFees, sourceQuality };
  const score = scoreDeal(scoredDeal);
  const recommendation = recommend(score);
  return {
    ...deal,
    estimatedFees,
    sourceQuality,
    roiMultiple,
    estimatedProfit,
    score,
    recommendation,
  };
}
