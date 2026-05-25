export type SellSpeed = "FAST" | "MEDIUM" | "SLOW";
export type Confidence = "LOW" | "MEDIUM" | "HIGH";
export type Recommendation = "BUY" | "MAYBE" | "SKIP";
export type DealStatus = "pending" | "saved" | "skipped" | "bought" | "sold";
export type CompSource =
  | "heuristic"
  | "estimated"
  | "ebay_active"
  | "ebay_sold"
  | "manual";
export type SourceQuality = "strong" | "decent" | "risky";
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
  | "slickdeals"
  | "reddit"
  | "clearance"
  | "pasted"
  | "aggregated";

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
  estimatedFees: number;
  compSource: CompSource;
  sourceQuality: SourceQuality;

  sellSpeed: SellSpeed;
  confidence: Confidence;
  notes?: string;
  tags?: DealTags;

  source: DealSource;
  sourceUrl?: string;
  sourceId?: string;
  feedLabel?: string;

  roiMultiple: number;
  estimatedProfit: number;
  score: number;
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
  | "estimatedFees"
  | "score"
  | "recommendation"
  | "sourceQuality"
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
  fetchedAt: string;
  sources: { name: string; count: number; error?: string }[];
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
