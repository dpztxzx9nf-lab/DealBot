import { SOURCE_CATALOG, sourceConnectors } from "./source-catalog";
import type { MarketTruthProvider } from "./types";

export const MARKET_TRUTH_PROVIDERS: MarketTruthProvider[] = [
  {
    id: "ebay_sold",
    name: "eBay sold comps",
    kind: "sold_comps",
    status: "active connector",
    requiresCredentials: false,
  },
  {
    id: "terapeak",
    name: "Terapeak product research",
    kind: "product_research",
    status: "planned",
    requiresCredentials: true,
  },
  {
    id: "amazon_historical",
    name: "Amazon historical pricing",
    kind: "historical_pricing",
    status: "planned",
    requiresCredentials: true,
  },
];

export const RESALE_INTELLIGENCE_LAYERS = {
  source: {
    description: "Raw opportunity ingestion from feeds, marketplaces, clearance, auctions, and communities.",
    connectors: sourceConnectors(),
  },
  marketTruth: {
    description: "Independent resale value and demand evidence. eBay is one provider, not the whole system.",
    providers: MARKET_TRUTH_PROVIDERS,
  },
  intelligence: {
    description: "Risk-adjusted scoring for profit, demand, saturation, shipping, difficulty, and opportunity reason.",
  },
  operational: {
    description: "Workflow stages that turn leads into tracked resale operations.",
    stages: ["swipe", "pipeline", "bought", "listed", "sold"],
  },
  learning: {
    description: "Future feedback loop from sold history, realized profit, days to sale, source ROI, and category win rate.",
  },
} as const;

export function activeSourceCoverage() {
  return SOURCE_CATALOG.map((source) => ({
    id: source.id,
    name: source.name,
    layer: source.layer,
    status: source.status,
    scope: source.scope,
    modes: source.supportsMode,
    requiresCredentials: source.requiresCredentials,
  }));
}
