export type SellSpeed = "FAST" | "MEDIUM" | "SLOW";
export type Confidence = "LOW" | "MEDIUM" | "HIGH";
export type FlipConfidenceLabel = "Strong Flip" | "Decent Opportunity" | "High Risk";
export type DifficultyLabel = "Easy" | "Moderate" | "Hard";
export type Recommendation = "BUY" | "WATCH" | "SKIP";
export type DealStatus =
  | "pending"
  | "saved"
  | "skipped"
  | "bought"
  | "listed"
  | "sold";
export type OperationalStage =
  | "swipe"
  | "pipeline"
  | "bought"
  | "listed"
  | "sold";
export type SourceLayerKind =
  | "deal_feed"
  | "local_marketplace"
  | "clearance"
  | "liquidation_auction"
  | "community"
  | "manual";
export type MarketTruthKind =
  | "sold_comps"
  | "product_research"
  | "historical_pricing"
  | "sell_through"
  | "manual";
export type CompSource =
  | "heuristic"
  | "estimated"
  | "ebay_active"
  | "ebay_sold"
  | "manual";
export type SourceQuality = "strong" | "decent" | "risky";
export type InventoryStatus = "verified" | "likely" | "unknown" | "stale" | "out_of_stock";
export type AcquisitionMode = "local_pickup" | "online" | "marketplace" | "retail_clearance";
export type SourcingMode = "nearby" | "online" | "hybrid";
export type DealSource =
  | "facebook_marketplace"
  | "craigslist"
  | "offerup"
  | "mercari"
  | "ebay_sold"
  | "walmart_clearance"
  | "target_clearance"
  | "home_depot_clearance"
  | "lowes_clearance"
  | "best_buy_open_box"
  | "estate_sales"
  | "garage_sales"
  | "costco_clearance"
  | "discord_deals"
  | "amazon_price_drops"
  | "liquidation_auctions"
  | "slickdeals"
  | "reddit"
  | "clearance"
  | "pasted"
  | "aggregated";

export type RejectionBucket =
  | "low margin"
  | "saturated"
  | "risky shipping"
  | "weak demand"
  | "suspicious listing"
  | "poor discount"
  | "weak sell-through"
  | "incomplete data";

export interface SourceDiagnostic {
  name: string;
  count: number;
  status?: string;
  scope?: string;
  scanned?: boolean;
  latencyMs?: number;
  health?: "ok" | "failed" | "inactive" | "not_scanned";
  quality?: string;
  accepted?: number;
  profitableDensity?: number;
  error?: string;
}

export interface SourceConnector {
  id: DealSource;
  name: string;
  layer: SourceLayerKind;
  status: string;
  scope: "local" | "online" | "nationwide";
  requiresCredentials: boolean;
  supportsMode: SourcingMode[];
}

export interface SourceIngestionRequest {
  zip: string;
  radiusMiles: number;
  mode: SourcingMode;
  query?: string;
}

export interface SourceIngestionResult {
  connector: SourceConnector;
  items: RawFeedItem[];
  diagnostic: SourceDiagnostic;
}

export interface MarketTruthProvider {
  id: DealSource | "terapeak" | "amazon_historical" | "manual";
  name: string;
  kind: MarketTruthKind;
  status: string;
  requiresCredentials: boolean;
}

export interface MarketTruthSignal {
  provider: DealSource | "terapeak" | "amazon_historical" | "manual";
  kind: MarketTruthKind;
  available: boolean;
  confidence: Confidence;
  resaleRangeLow?: number;
  resaleRangeHigh?: number;
  medianSoldPrice?: number;
  sellThroughRate?: number;
  sampleSize?: number;
  latencyMs?: number;
  error?: string;
}

export interface IntelligenceSignal {
  confidenceLabel: FlipConfidenceLabel;
  netProfit: number;
  roiPercent: number;
  demandScore: number;
  saturationRisk: number;
  shippingRisk: number;
  difficultyLabel: DifficultyLabel;
  reason: string;
  rejectionReason?: string;
}

export interface IntelligenceInput {
  sourceItem: RawFeedItem;
  marketTruth: MarketTruthSignal[];
  mode: SourcingMode;
}

export interface IntelligenceOutput {
  deal?: Deal;
  signal: IntelligenceSignal;
  rejectionBucket?: RejectionBucket;
}

export interface OperationalRecord {
  dealId: string;
  stage: OperationalStage;
  source: DealSource;
  createdAt: string;
  updatedAt?: string;
  buyPrice?: number;
  listedPrice?: number;
  soldPrice?: number;
  realizedProfit?: number;
}

export interface LearningSignal {
  dealId: string;
  source: DealSource;
  category?: string;
  realizedProfit?: number;
  daysToSale?: number;
  sourceRoiPercent?: number;
  won: boolean;
  recordedAt: string;
}

export interface LearningProfile {
  soldHistory: LearningSignal[];
  sourceRoi: Record<DealSource, number>;
  categoryWinRate: Record<string, number>;
  averageDaysToSale: number | null;
  preferredModes: SourcingMode[];
}

export interface DealTags {
  strongBrand?: boolean;
  compact?: boolean;
  bulky?: boolean;
  fragile?: boolean;
  oversaturated?: boolean;
  niche?: boolean;
  hardToPrice?: boolean;
  localPickupFriendly?: boolean;
}

export interface Deal {
  id: string;
  createdAt: string;
  status: DealStatus;
  strongCandidate?: boolean;

  itemName: string;
  imageUrl?: string;
  store?: string;
  distanceMiles?: number;
  clearancePrice: number;
  retailPrice?: number;
  discountPercent?: number;
  estimatedResale: number;
  resaleRangeLow: number;
  resaleRangeHigh: number;
  estimatedFees: number;
  estimatedShipping: number;
  grossProfit: number;
  netProfit: number;
  roiPercent: number;
  compSource: CompSource;
  sourceQuality: SourceQuality;

  sellSpeed: SellSpeed;
  confidence: Confidence;
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
  sourcingMode: SourcingMode;
  pickupEligible?: boolean;
  estimatedStockCount?: number;
  lastVerifiedAt?: string;
  notes?: string;
  tags?: DealTags;

  source: DealSource;
  sourceUrl?: string;
  sourceId?: string;
  feedLabel?: string;

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

  soldPrice?: number;
  soldAt?: string;
}

export type DealInput = Omit<
  Deal,
  | "id"
  | "createdAt"
  | "status"
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
  | "strongCandidate"
  | "soldPrice"
  | "soldAt"
>;

export interface RawFeedItem {
  source: DealSource;
  sourceId: string;
  title: string;
  description?: string;
  link?: string;
  imageUrl?: string;
  store?: string;
  price?: number;
  retailPrice?: number;
  discountPercent?: number;
  feedLabel?: string;
}

export interface FeedMeta {
  zip: string;
  radiusMiles: number;
  mode?: SourcingMode;
  fetchedAt: string;
  sources: SourceDiagnostic[];
  filtered: number;
  queued: number;
}

export interface FeedResponse {
  deals: Deal[];
  meta: FeedMeta;
  errors: string[];
}

export interface LocationPrefs {
  zip: string;
  radiusMiles: number;
}
