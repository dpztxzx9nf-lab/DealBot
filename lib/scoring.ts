import type {
  CompSource,
  Confidence,
  DifficultyLabel,
  FlipConfidenceLabel,
  AcquisitionMode,
  Deal,
  InventoryStatus,
  Recommendation,
  SourceQuality,
} from "./types";
import {
  calcEstimatedFees,
  calcEstimatedShipping,
  calcProfit,
  calcRoiMultiple,
  calcRoiPercent,
  formatMoney,
  formatPercent,
} from "./money";

const HIGH_DEMAND =
  /\b(apple|airpods|iphone|ipad|nintendo|switch|playstation|ps5|xbox|dyson|lego|dewalt|milwaukee|makita|ridgid|sony|bose|garmin|gopro|meta quest|oculus|logitech|razer|rtx|gpu|graphics card|cpu|processor|ssd|laptop|tablet|camera|drone|vacuum|kitchenaid|vitamix|ninja|shark|yeti|stanley|patagonia|north face|carhartt|nike|adidas)\b/i;
const RECOGNIZABLE_BRAND =
  /\b(apple|sony|nintendo|playstation|xbox|dyson|ninja|kitchenaid|lego|stanley|yeti|beats|samsung|google pixel|bose|nike|adidas|carhartt|patagonia|north face|columbia|makita|dewalt|milwaukee|ridgid|cuisinart|instant pot|roomba|irobot|shark|vitamix|keurig|nespresso|traeger|weber|garmin|gopro|meta quest|oculus|logitech|razer|corsair|asus|msi|lenovo|dell|hp|lg|tcl|hisense)\b/i;
const EASY_LOCAL_RESALE =
  /\b(console|controller|game|headphone|earbud|speaker|watch|phone|tablet|laptop|camera|drone|tool|vacuum|blender|air fryer|lego|shoe|sneaker|boot|jacket|cooler|tumbler|keyboard|mouse|ssd|ram)\b/i;
const HEAVY_OR_OVERSIZED =
  /\b(sofa|couch|mattress|dresser|desk|treadmill|washer|dryer|refrigerator|freezer|appliance|furniture|sectional|king bed|queen bed|75\"|85\"|large tv|pallet)\b/i;
const CONSUMABLE_OR_PERISHABLE =
  /\b(food|snack|candy|drink|beverage|coffee pods|supplement|vitamin|protein powder|medicine|diaper|soap|shampoo|lotion|detergent|cleaner|grocery|perishable)\b/i;
const LOW_SELL_THROUGH =
  /\b(cable|case|screen protector|generic|off brand|decor|wall art|costume|collectible lot|parts only|open package|refill|ink cartridge|toner|phone case|charging cable|pop socket|sticker|poster)\b/i;
const UNKNOWN_CONDITION =
  /\b(used|as-is|for parts|damaged|untested|unknown condition|missing|scratch|dent|refurb|renewed|open box)\b/i;
const WEAK_TITLE =
  /\b(misc|assorted|bundle|lot|various|random|stuff|clearance item|sale item|deal|cheap)\b/i;
const SUSPICIOUS_LISTING =
  /\b(too good to be true|no receipt|cash only|wire|zelle only|ship only|no meetup|replica|clone|locked iphone|icloud locked|activation locked|stolen|serial removed|broken seal)\b/i;
const SATURATED_ITEM =
  /\b(funko|squishmallow|beanie baby|phone case|screen protector|dropship|temu|shein|fidget|generic led|hoverboard|fitness tracker)\b/i;
const TRAP_RULES: Array<[RegExp, string]> = [
  [/\b(sign ?up|new account|account required|first time user|new customer)\b/i, "Requires signup"],
  [/\b(subscription|subscribe|auto-?renew|monthly plan|annual plan)\b/i, "Subscription required"],
  [/\b(membership|members only|paid membership|plus members|prime only|walmart\+|my best buy plus|costco membership|sam'?s club)\b/i, "Membership-only"],
  [/\b(rebate|mail[- ]in rebate|mir|after rebate)\b/i, "Rebate required"],
  [/\b(stack|stacking|coupon code|promo code|clip coupon|digital coupon|referral|invite code)\b/i, "Too many promo conditions"],
  [/\b(app only|in app|mobile app only)\b/i, "App-only checkout"],
  [/\b(financing|affirm|klarna|afterpay|store card|credit card required)\b/i, "Financing or store card required"],
  [/\b(ymmv|your mileage may vary|hidden discount|price may vary|manager markdown)\b/i, "Unclear final price"],
];

export interface QualityScores {
  demandScore: number;
  brandScore: number;
  marginScore: number;
  sellThroughScore: number;
  shippingEaseScore: number;
  riskScore: number;
  finalScore: number;
  rejectionReason?: string;
  qualityExplanation: string;
}

export function sourceQualityFromComp(
  compSource: CompSource,
  fallback: SourceQuality = "risky"
): SourceQuality {
  if (compSource === "ebay_sold") return "strong";
  if (compSource === "ebay_active" || compSource === "manual") return "decent";
  return fallback;
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function confidenceRank(confidence: Confidence): number {
  return { LOW: 0, MEDIUM: 1, HIGH: 2 }[confidence];
}

function sourceReliabilityScore(sourceQuality: SourceQuality, compSource: CompSource): number {
  if (compSource === "ebay_sold") return 92;
  if (sourceQuality === "strong") return 86;
  if (sourceQuality === "decent") return 64;
  return 28;
}

function inferInventoryStatus(deal: Pick<Deal, "source" | "lastVerifiedAt" | "estimatedStockCount">): InventoryStatus {
  if (deal.estimatedStockCount != null && deal.estimatedStockCount <= 0) return "out_of_stock";
  if (!deal.lastVerifiedAt) return "unknown";
  const verifiedAt = new Date(deal.lastVerifiedAt).getTime();
  if (!Number.isFinite(verifiedAt)) return "unknown";
  const ageHours = (Date.now() - verifiedAt) / 36e5;
  if (ageHours > 48) return "stale";
  return deal.estimatedStockCount != null ? "verified" : "likely";
}

function inferAcquisitionMode(source: Deal["source"]): AcquisitionMode {
  if (
    source === "facebook_marketplace" ||
    source === "craigslist" ||
    source === "offerup" ||
    source === "estate_sales" ||
    source === "garage_sales"
  ) {
    return "marketplace";
  }
  if (
    source === "walmart_clearance" ||
    source === "target_clearance" ||
    source === "home_depot_clearance" ||
    source === "lowes_clearance" ||
    source === "best_buy_open_box" ||
    source === "costco_clearance" ||
    source === "clearance" ||
    source === "hidden_clearances"
  ) {
    return "retail_clearance";
  }
  if (source === "liquidation_auctions" || source === "local_liquidation") {
    return "marketplace";
  }
  return "online";
}

function estimateTimeToSaleDays(sellSpeed: Deal["sellSpeed"], confidence: Confidence): number {
  const base = { FAST: 4, MEDIUM: 12, SLOW: 28 }[sellSpeed];
  return Math.max(2, base + (confidence === "LOW" ? 10 : confidence === "MEDIUM" ? 3 : 0));
}

function confidenceLabel(
  finalScore: number,
  riskScore: number,
  sourceQuality: SourceQuality,
  confidence: Confidence
): FlipConfidenceLabel {
  if (finalScore >= 72 && riskScore <= 32 && confidence === "HIGH") {
    return "Strong Flip";
  }
  if (finalScore >= 52 && sourceQuality !== "risky" && confidence !== "LOW") {
    return "Decent Opportunity";
  }
  return "High Risk";
}

function difficultyLabel(score: number): DifficultyLabel {
  if (score <= 32) return "Easy";
  if (score <= 62) return "Moderate";
  return "Hard";
}

function resaleRange(resale: number, sourceQuality: SourceQuality): {
  resaleRangeLow: number;
  resaleRangeHigh: number;
} {
  const lowMultiplier = sourceQuality === "strong" ? 0.9 : sourceQuality === "decent" ? 0.82 : 0.7;
  const highMultiplier = sourceQuality === "strong" ? 1.08 : sourceQuality === "decent" ? 1.15 : 1.25;
  return {
    resaleRangeLow: Math.round(resale * lowMultiplier),
    resaleRangeHigh: Math.round(resale * highMultiplier),
  };
}

function scoreFreshness(createdAt?: string): number {
  if (!createdAt) return 45;
  const created = new Date(createdAt).getTime();
  if (!Number.isFinite(created)) return 45;
  const ageHours = Math.max(0, (Date.now() - created) / 36e5);
  if (ageHours <= 4) return 95;
  if (ageHours <= 12) return 82;
  if (ageHours <= 24) return 68;
  if (ageHours <= 72) return 45;
  return 18;
}

function scoreCompetition(text: string, source: Deal["source"], tags: Deal["tags"] = {}): number {
  const publicDealPenalty =
    source === "slickdeals" || source === "reddit" || /\b(frontpage|viral|popular|hot deal)\b/i.test(text)
      ? 35
      : 0;
  const saturationPenalty = tags.oversaturated || LOW_SELL_THROUGH.test(text) ? 28 : 0;
  const hiddenOpportunityBoost =
    /\b(misspell|poor photo|local pickup|open box|clearance|markdown|newly listed)\b/i.test(text)
      ? 18
      : 0;
  return clampScore(55 - publicDealPenalty - saturationPenalty + hiddenOpportunityBoost);
}

function buildDealExistenceReason(
  deal: Pick<
    Deal,
    | "discountPercent"
    | "compSource"
    | "sourcingMode"
    | "competitionScore"
    | "freshnessScore"
    | "sourceQuality"
  >,
  text: string
): string {
  if (deal.compSource === "ebay_sold") {
    return "Sold comps suggest the market values this above the buy price.";
  }
  if ((deal.discountPercent ?? 0) >= 45) {
    return "The listed discount creates enough spread to test against resale comps.";
  }
  if (deal.freshnessScore >= 75) {
    return "Fresh listing signals can create a short window before other buyers react.";
  }
  if (deal.competitionScore >= 65 || /\b(open box|clearance|markdown|local pickup)\b/i.test(text)) {
    return "This appears underexposed compared with common public deal feeds.";
  }
  if (deal.sourcingMode === "online") {
    return "National pricing may leave a resale spread after fees and shipping.";
  }
  return "DealBot found a possible buy/resale spread, but it needs verification.";
}

export function findTrapRejectionReason(text: string): string | undefined {
  return TRAP_RULES.find(([pattern]) => pattern.test(text))?.[1];
}

function buildQualityExplanation(
  deal: Pick<
    Deal,
    | "discountPercent"
    | "estimatedProfit"
    | "netProfit"
    | "roiPercent"
    | "stockConfidence"
    | "sourceReliabilityScore"
    | "freshnessScore"
    | "acquisitionFrictionScore"
    | "tags"
    | "sourceQuality"
    | "confidence"
  >,
  scores: Omit<QualityScores, "qualityExplanation">
): string {
  if (scores.rejectionReason) return scores.rejectionReason;

  const parts: string[] = [];
  if (scores.brandScore >= 70) parts.push("Strong brand");
  else if (scores.brandScore >= 45) parts.push("Recognizable brand");
  if ((deal.discountPercent ?? 0) >= 35) parts.push(`${deal.discountPercent}% off`);
  if (scores.shippingEaseScore >= 70) parts.push("easy to ship");
  if (scores.sellThroughScore >= 70) parts.push("fast local resale");
  if (deal.sourceQuality === "strong") parts.push("sold-comp backed");
  else if (deal.confidence === "HIGH") parts.push("high confidence");
  if (deal.sourceReliabilityScore >= 80) parts.push("reliable source");
  if (deal.stockConfidence >= 70) parts.push("stock looks actionable");
  if (deal.freshnessScore >= 75) parts.push("fresh lead");
  if (deal.acquisitionFrictionScore <= 35) parts.push("low friction");
  parts.push(`estimated ${formatMoney(deal.netProfit)} net profit`);
  if (deal.roiPercent >= 40) parts.push(`${formatPercent(deal.roiPercent)} ROI`);

  return `${parts.slice(0, 5).join(", ")}.`;
}

export function calculateQualityScores(
  deal: Pick<
    Deal,
    | "itemName"
    | "notes"
    | "clearancePrice"
    | "estimatedResale"
    | "estimatedFees"
    | "estimatedShipping"
    | "estimatedProfit"
    | "netProfit"
    | "roiPercent"
    | "stockConfidence"
    | "sourceReliabilityScore"
    | "freshnessScore"
    | "acquisitionFrictionScore"
    | "competitionScore"
    | "capitalEfficiencyScore"
    | "inventoryStatus"
    | "sourcingMode"
    | "acquisitionDifficulty"
    | "sellSpeed"
    | "confidence"
    | "tags"
    | "distanceMiles"
    | "discountPercent"
    | "compSource"
    | "sourceQuality"
  >
): QualityScores {
  const text = `${deal.itemName} ${deal.notes ?? ""}`;
  const tags = deal.tags ?? {};
  const discount = deal.discountPercent ?? 0;
  const roi = calcRoiMultiple(deal.clearancePrice, deal.estimatedResale);
  const profit = deal.netProfit;
  const trapReason = findTrapRejectionReason(text);

  const demandScore = clampScore(
    (HIGH_DEMAND.test(text) ? 70 : EASY_LOCAL_RESALE.test(text) ? 55 : 25) +
      (tags.localPickupFriendly ? 10 : 0) +
      (LOW_SELL_THROUGH.test(text) ? -35 : 0) +
      (SATURATED_ITEM.test(text) ? -35 : 0) +
      (CONSUMABLE_OR_PERISHABLE.test(text) ? -45 : 0)
  );

  const brandScore = clampScore(
    (tags.strongBrand || RECOGNIZABLE_BRAND.test(text) ? 75 : 20) +
      (tags.oversaturated ? -30 : 0) +
      (SATURATED_ITEM.test(text) ? -25 : 0) +
      (/\b(generic|unbranded|unknown brand|off brand)\b/i.test(text) ? -45 : 0)
  );

  const marginScore = clampScore(
    (profit >= 100 ? 90 : profit >= 60 ? 78 : profit >= 30 ? 62 : profit >= 15 ? 42 : 10) +
      (roi >= 3 ? 12 : roi >= 2 ? 6 : -12)
  );

  const sellThroughScore = clampScore(
    { FAST: 78, MEDIUM: 55, SLOW: 20 }[deal.sellSpeed] +
      (deal.sourceQuality === "strong" ? 12 : deal.sourceQuality === "decent" ? 5 : -18) +
      (confidenceRank(deal.confidence) * 8) +
      (deal.sourceReliabilityScore >= 80 ? 8 : 0) +
      (LOW_SELL_THROUGH.test(text) ? -30 : 0)
  );

  const shippingEaseScore = clampScore(
    (tags.compact || EASY_LOCAL_RESALE.test(text) ? 78 : 48) +
      (tags.bulky || HEAVY_OR_OVERSIZED.test(text) ? -50 : 0) +
      (tags.fragile ? -20 : 0) +
      (deal.estimatedShipping >= 25 ? -24 : deal.estimatedShipping >= 15 ? -10 : 0)
  );

  const riskScore = clampScore(
    (deal.sourceQuality === "risky" ? 35 : deal.sourceQuality === "decent" ? 15 : 4) +
      (deal.confidence === "LOW" ? 35 : deal.confidence === "MEDIUM" ? 12 : 0) +
      (100 - deal.stockConfidence) * 0.18 +
      (100 - deal.sourceReliabilityScore) * 0.14 +
      (100 - deal.freshnessScore) * 0.12 +
      (100 - deal.competitionScore) * 0.1 +
      deal.acquisitionFrictionScore * 0.12 +
      (deal.acquisitionDifficulty >= 70 ? 18 : deal.acquisitionDifficulty >= 45 ? 8 : 0) +
      (deal.inventoryStatus === "out_of_stock" ? 100 : deal.inventoryStatus === "stale" ? 40 : 0) +
      (discount < 25 ? 18 : 0) +
      (UNKNOWN_CONDITION.test(text) ? 18 : 0) +
      (WEAK_TITLE.test(text) || deal.itemName.trim().length < 14 ? 16 : 0) +
      (SUSPICIOUS_LISTING.test(text) ? 55 : 0) +
      (SATURATED_ITEM.test(text) ? 24 : 0) +
      (tags.hardToPrice ? 16 : 0) +
      (tags.niche ? 12 : 0) +
      (CONSUMABLE_OR_PERISHABLE.test(text) ? 35 : 0) +
      (HEAVY_OR_OVERSIZED.test(text) ? 25 : 0) +
      (trapReason ? 45 : 0)
  );

  const finalScore = clampScore(
    demandScore * 0.2 +
      brandScore * 0.18 +
      marginScore * 0.28 +
      sellThroughScore * 0.18 +
      shippingEaseScore * 0.16 -
      riskScore * 0.45 +
      Math.min(deal.roiPercent, 150) * 0.05 +
      deal.freshnessScore * 0.08 +
      deal.capitalEfficiencyScore * 0.08 +
      deal.competitionScore * 0.06
  );

  let rejectionReason: string | undefined;
  if (trapReason) rejectionReason = `Rejected: ${trapReason}.`;
  else if (SUSPICIOUS_LISTING.test(text))
    rejectionReason = "Rejected: suspicious listing or unsafe transaction signal.";
  else if (SATURATED_ITEM.test(text))
    rejectionReason = "Rejected: saturated item with weak resale edge.";
  else if (profit < 10) rejectionReason = "Rejected: estimated profit is under $10.";
  else if (profit < 20 && deal.estimatedShipping >= 15)
    rejectionReason = "Rejected: shipping risk erases too much profit.";
  else if (profit < 15 && riskScore >= 35)
    rejectionReason = "Rejected: margin is too small for the risk.";
  else if (deal.confidence === "LOW" || deal.sourceQuality === "risky")
    rejectionReason = "Rejected: confidence is too weak for a resale card.";
  else if (deal.inventoryStatus === "out_of_stock")
    rejectionReason = "Rejected: no purchasable inventory found.";
  else if (deal.inventoryStatus === "stale")
    rejectionReason = "Rejected: inventory signal is stale.";
  else if (deal.stockConfidence < 25)
    rejectionReason = "Rejected: stock confidence is too low.";
  else if (deal.freshnessScore < 15)
    rejectionReason = "Rejected: lead is too stale.";
  else if (deal.acquisitionFrictionScore > 82)
    rejectionReason = "Rejected: acquisition friction is too high.";
  else if (brandScore < 35 && demandScore < 45)
    rejectionReason = "Rejected: weak brand and low demand category.";
  else if (shippingEaseScore < 35)
    rejectionReason = "Rejected: too bulky or high-effort to flip easily.";
  else if (sellThroughScore < 40)
    rejectionReason = "Rejected: weak sell-through demand.";
  else if (CONSUMABLE_OR_PERISHABLE.test(text))
    rejectionReason = "Rejected: consumable or perishable item.";
  else if (discount < 25 && deal.sourceQuality !== "strong")
    rejectionReason = "Rejected: discount is not clear enough.";
  else if (finalScore < 45)
    rejectionReason = "Rejected: overall resale quality is too low.";

  const withoutExplanation = {
    demandScore,
    brandScore,
    marginScore,
    sellThroughScore,
    shippingEaseScore,
    riskScore,
    finalScore,
    rejectionReason,
  };

  return {
    ...withoutExplanation,
    qualityExplanation: buildQualityExplanation(deal, withoutExplanation),
  };
}

export function scoreDeal(
  deal: Parameters<typeof calculateQualityScores>[0]
): number {
  return calculateQualityScores(deal).finalScore;
}

export function recommend(score: number): Recommendation {
  if (score >= 70) return "BUY";
  if (score >= 50) return "WATCH";
  return "SKIP";
}

type EnrichableDeal = Omit<
  Deal,
  | "roiMultiple"
  | "estimatedProfit"
  | "resaleRangeLow"
  | "resaleRangeHigh"
  | "estimatedFees"
  | "estimatedShipping"
  | "grossProfit"
  | "netProfit"
  | "roiPercent"
  | "score"
  | "demandScore"
  | "brandScore"
  | "marginScore"
  | "sellThroughScore"
  | "shippingEaseScore"
  | "riskScore"
  | "finalScore"
  | "rejectionReason"
  | "qualityExplanation"
  | "recommendedActionReason"
  | "dealExistenceReason"
  | "recommendation"
  | "confidenceLabel"
  | "sourceQuality"
  | "sellThroughConfidence"
  | "estimatedTimeToSaleDays"
  | "acquisitionDifficulty"
  | "difficultyLabel"
  | "stockConfidence"
  | "sourceReliabilityScore"
  | "freshnessScore"
  | "acquisitionFrictionScore"
  | "competitionScore"
  | "capitalEfficiencyScore"
  | "inventoryStatus"
  | "acquisitionMode"
  | "sourcingMode"
> &
  Partial<
    Pick<
      Deal,
      | "estimatedFees"
      | "estimatedShipping"
      | "sourceQuality"
      | "stockConfidence"
      | "sourceReliabilityScore"
      | "freshnessScore"
      | "acquisitionFrictionScore"
      | "competitionScore"
      | "capitalEfficiencyScore"
      | "inventoryStatus"
      | "acquisitionMode"
      | "sourcingMode"
      | "acquisitionDifficulty"
      | "lastVerifiedAt"
      | "estimatedStockCount"
    >
  >;

export function enrichDeal<T extends EnrichableDeal>(
  deal: T
): T & {
  estimatedFees: number;
  estimatedShipping: number;
  resaleRangeLow: number;
  resaleRangeHigh: number;
  grossProfit: number;
  netProfit: number;
  roiPercent: number;
  sourceQuality: SourceQuality;
  confidenceLabel: FlipConfidenceLabel;
  sellThroughConfidence: Confidence;
  estimatedTimeToSaleDays: number;
  acquisitionDifficulty: number;
  difficultyLabel: DifficultyLabel;
  stockConfidence: number;
  sourceReliabilityScore: number;
  freshnessScore: number;
  acquisitionFrictionScore: number;
  competitionScore: number;
  capitalEfficiencyScore: number;
  inventoryStatus: InventoryStatus;
  acquisitionMode: AcquisitionMode;
  sourcingMode: Deal["sourcingMode"];
  roiMultiple: number;
  estimatedProfit: number;
  score: number;
  demandScore: number;
  brandScore: number;
  marginScore: number;
  sellThroughScore: number;
  shippingEaseScore: number;
  riskScore: number;
  finalScore: number;
  rejectionReason?: string;
  qualityExplanation: string;
  dealExistenceReason: string;
  recommendedActionReason: string;
  recommendation: Recommendation;
} {
  const estimatedFees = deal.estimatedFees ?? calcEstimatedFees(deal.estimatedResale);
  const sourceQuality =
    deal.sourceQuality ?? sourceQualityFromComp(deal.compSource);
  const { resaleRangeLow, resaleRangeHigh } = resaleRange(
    deal.estimatedResale,
    sourceQuality
  );
  const acquisitionMode = deal.acquisitionMode ?? inferAcquisitionMode(deal.source);
  const sourcingMode = deal.sourcingMode ?? "hybrid";
  const estimatedShipping =
    deal.estimatedShipping ??
    calcEstimatedShipping(deal.estimatedResale, {
      bulky: deal.tags?.bulky,
      fragile: deal.tags?.fragile,
      localPickupFriendly:
        deal.tags?.localPickupFriendly || acquisitionMode === "local_pickup",
    });
  const grossProfit =
    Math.round((deal.estimatedResale - deal.clearancePrice) * 100) / 100;
  const roiMultiple = calcRoiMultiple(deal.clearancePrice, deal.estimatedResale);
  const netProfit = calcProfit(
    deal.clearancePrice,
    deal.estimatedResale,
    estimatedFees,
    estimatedShipping
  );
  const estimatedProfit = netProfit;
  const roiPercent = calcRoiPercent(deal.clearancePrice, netProfit);
  const sellThroughConfidence: Confidence =
    deal.confidence === "HIGH" && deal.sellSpeed === "FAST"
      ? "HIGH"
      : deal.confidence === "LOW" || deal.sellSpeed === "SLOW"
        ? "LOW"
        : "MEDIUM";
  const estimatedTimeToSaleDays = estimateTimeToSaleDays(
    deal.sellSpeed,
    sellThroughConfidence
  );
  const sourceReliability =
    deal.sourceReliabilityScore ??
    sourceReliabilityScore(sourceQuality, deal.compSource);
  const stockConfidence =
    deal.stockConfidence ??
    (deal.estimatedStockCount != null
      ? deal.estimatedStockCount > 0
        ? 82
        : 0
      : deal.lastVerifiedAt
        ? 68
        : sourceQuality === "strong"
          ? 55
          : 35);
  const inventoryStatus =
    deal.inventoryStatus ??
    inferInventoryStatus({
      source: deal.source,
      lastVerifiedAt: deal.lastVerifiedAt,
      estimatedStockCount: deal.estimatedStockCount,
    });
  const acquisitionDifficulty =
    deal.acquisitionDifficulty ??
    clampScore(
      (deal.distanceMiles != null ? Math.min(deal.distanceMiles * 2, 50) : 18) +
        (deal.tags?.bulky ? 30 : 0) +
        (deal.tags?.fragile ? 12 : 0) +
        (acquisitionMode === "marketplace" ? 16 : 0) +
        (inventoryStatus === "unknown" ? 12 : inventoryStatus === "stale" ? 28 : 0)
    );
  const labelDifficulty = difficultyLabel(acquisitionDifficulty);
  const freshnessScore = deal.freshnessScore ?? scoreFreshness(deal.createdAt);
  const acquisitionFrictionScore =
    deal.acquisitionFrictionScore ?? acquisitionDifficulty;
  const competitionScore =
    deal.competitionScore ??
    scoreCompetition(`${deal.itemName} ${deal.notes ?? ""}`, deal.source, deal.tags);
  const capitalEfficiencyScore =
    deal.capitalEfficiencyScore ??
    clampScore(
      Math.min(Math.max(roiPercent, 0), 180) * 0.45 +
        Math.max(0, 45 - estimatedTimeToSaleDays) * 1.1 +
        (netProfit >= 20 ? 10 : 0)
    );
  const quality = calculateQualityScores({
    ...deal,
    estimatedFees,
    estimatedShipping,
    estimatedProfit,
    grossProfit,
    netProfit,
    roiPercent,
    sourceQuality,
    sellThroughConfidence,
    estimatedTimeToSaleDays,
    acquisitionDifficulty,
    stockConfidence,
    sourceReliabilityScore: sourceReliability,
    freshnessScore,
    acquisitionFrictionScore,
    competitionScore,
    capitalEfficiencyScore,
    inventoryStatus,
    acquisitionMode,
    sourcingMode,
  });
  const recommendation = quality.rejectionReason
    ? "SKIP"
    : recommend(quality.finalScore);
  const labelConfidence = confidenceLabel(
    quality.finalScore,
    quality.riskScore,
    sourceQuality,
    deal.confidence
  );
  const dealExistenceReason = buildDealExistenceReason(
    {
      ...deal,
      sourceQuality,
      sourcingMode,
      competitionScore,
      freshnessScore,
    },
    `${deal.itemName} ${deal.notes ?? ""}`
  );
  const recommendedActionReason =
    recommendation === "BUY"
      ? `Buy if available: ${formatMoney(netProfit)} estimated net profit after fees and shipping.`
      : recommendation === "WATCH"
        ? "Watch or verify inventory before buying; profit path exists but confidence is not top tier."
        : quality.rejectionReason ?? "Skip: risk-adjusted profit is too weak.";

  return {
    ...deal,
    estimatedFees,
    estimatedShipping,
    resaleRangeLow,
    resaleRangeHigh,
    grossProfit,
    netProfit,
    roiPercent,
    sourceQuality,
    confidenceLabel: labelConfidence,
    sellThroughConfidence,
    estimatedTimeToSaleDays,
    acquisitionDifficulty,
    difficultyLabel: labelDifficulty,
    stockConfidence,
    sourceReliabilityScore: sourceReliability,
    freshnessScore,
    acquisitionFrictionScore,
    competitionScore,
    capitalEfficiencyScore,
    inventoryStatus,
    acquisitionMode,
    sourcingMode,
    roiMultiple,
    estimatedProfit,
    score: quality.finalScore,
    ...quality,
    dealExistenceReason,
    recommendedActionReason,
    recommendation,
  };
}

export function isSwipeEligibleDeal(
  deal: Pick<
    Deal,
    | "estimatedProfit"
    | "netProfit"
    | "recommendation"
    | "sourceQuality"
    | "confidence"
    | "rejectionReason"
    | "inventoryStatus"
    | "stockConfidence"
    | "freshnessScore"
    | "acquisitionFrictionScore"
  >,
  options: { minProfit?: number; includeWeakConfidence?: boolean } = {}
): boolean {
  const minProfit = options.minProfit ?? 10;
  return (
    deal.netProfit >= minProfit &&
    !deal.rejectionReason &&
    deal.recommendation !== "SKIP" &&
    deal.sourceQuality !== "risky" &&
    deal.inventoryStatus !== "out_of_stock" &&
    deal.inventoryStatus !== "stale" &&
    deal.stockConfidence >= 25 &&
    deal.freshnessScore >= 15 &&
    deal.acquisitionFrictionScore <= 82 &&
    (options.includeWeakConfidence || deal.confidence !== "LOW")
  );
}
