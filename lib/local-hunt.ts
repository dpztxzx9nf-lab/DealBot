import { SOURCE_CATALOG, type SourceCatalogEntry } from "./source-catalog";
import type { DealInput, DealSource, SourceQuality } from "./types";

export type LocalHuntStatus =
  | "automated"
  | "assisted"
  | "planned"
  | "restricted"
  | "intelligence";

export interface LocalHuntMission {
  category: string;
  budget: number;
  radiusMiles: number;
  desiredProfit: number;
}

export interface LocalHuntSource {
  id: DealSource;
  name: string;
  status: LocalHuntStatus;
  quality: SourceQuality;
  expectedQuality: string;
  why: string;
  nextAction: string;
  restriction?: string;
  buildUrl?: (term: string, zip: string) => string;
}

const SOURCE_IDS: DealSource[] = [
  "facebook_marketplace",
  "offerup",
  "craigslist",
  "walmart_clearance",
  "hidden_clearances",
  "local_liquidation",
  "regional_pricing_mismatches",
];

const CATEGORY_TERMS: Record<string, string[]> = {
  Electronics: [
    "sony headphones",
    "nintendo switch bundle",
    "meta quest",
    "bose speaker",
    "gopro camera",
  ],
  Tools: [
    "dewalt battery kit",
    "milwaukee m18",
    "makita impact driver",
    "ridgid tool bundle",
    "ryobi lot",
  ],
  "Small appliances": [
    "dyson vacuum",
    "shark vacuum",
    "kitchenaid mixer",
    "vitamix blender",
    "ninja air fryer",
  ],
  Toys: [
    "lego lot",
    "lego star wars",
    "pokemon collection",
    "hot wheels lot",
    "nintendo amiibo",
  ],
  "Outdoor gear": [
    "yeti cooler",
    "garmin watch",
    "patagonia jacket",
    "north face coat",
    "traeger grill parts",
  ],
};

function q(value: string): string {
  return encodeURIComponent(value.trim());
}

function localSource(id: DealSource): SourceCatalogEntry {
  const source = SOURCE_CATALOG.find((entry) => entry.id === id);
  if (!source) throw new Error(`Missing source catalog entry: ${id}`);
  return source;
}

function sourceStatus(entry: SourceCatalogEntry): LocalHuntStatus {
  if (entry.status === "active_connector" || entry.status === "automated_feasible") {
    return "automated";
  }
  if (entry.status === "browser_assisted_restricted") return "assisted";
  if (entry.status === "intelligence_layer") return "intelligence";
  return "planned";
}

export function localHuntSources(): LocalHuntSource[] {
  return SOURCE_IDS.map((id) => {
    const source = localSource(id);
    if (id === "facebook_marketplace") {
      return {
        id,
        name: source.name,
        status: "assisted",
        quality: "decent",
        expectedQuality: "High variance, high upside",
        why: "Fresh local listings can be underpriced when sellers use weak titles, poor photos, or pickup-only pricing.",
        nextAction: "Open assisted search",
        restriction: "No scraping, login automation, captcha bypass, or account automation.",
        buildUrl: (term) => `https://www.facebook.com/marketplace/search/?query=${q(term)}`,
      };
    }
    if (id === "offerup") {
      return {
        id,
        name: source.name,
        status: "assisted",
        quality: "risky",
        expectedQuality: "Medium upside, higher listing risk",
        why: "Nearby pickup listings can lag eBay value, but seller quality and item condition need human review.",
        nextAction: "Open assisted search",
        restriction: "No scraping, login automation, captcha bypass, or account automation.",
        buildUrl: (term) => `https://offerup.com/search?q=${q(term)}`,
      };
    }
    if (id === "craigslist") {
      return {
        id,
        name: source.name,
        status: sourceStatus(source),
        quality: "decent",
        expectedQuality: "Older inventory, less competition",
        why: "Search and RSS-style discovery are feasible for public local listings, especially stale pickup items.",
        nextAction: "Open public search",
        buildUrl: (term) => `https://www.craigslist.org/search/sss?query=${q(term)}`,
      };
    }
    if (id === "walmart_clearance") {
      return {
        id,
        name: source.name,
        status: "planned",
        quality: "risky",
        expectedQuality: "Good only with local verification",
        why: "Store-level markdowns can diverge from national pricing, but stock and final price need a connector or importer.",
        nextAction: "Plan connector/import",
        buildUrl: (term) => `https://www.walmart.com/search?q=${q(`${term} clearance`)}`,
      };
    }
    if (id === "hidden_clearances") {
      return {
        id,
        name: source.name,
        status: "planned",
        quality: "risky",
        expectedQuality: "Signal source, not proof",
        why: "Hidden markdown signals can point to regional anomalies before they appear in generic deal feeds.",
        nextAction: "Track signals",
      };
    }
    if (id === "local_liquidation") {
      return {
        id,
        name: source.name,
        status: "planned",
        quality: "risky",
        expectedQuality: "Bundle upside, operationally heavy",
        why: "Local lots can create margin through bundling, but transport, manifests, and condition risk dominate.",
        nextAction: "Add source registry",
      };
    }
    return {
      id,
      name: source.name,
      status: "intelligence",
      quality: "decent",
      expectedQuality: "Ranking layer",
      why: "Regional price gaps help decide which local leads deserve Swipe and Pipeline attention first.",
      nextAction: "Use in ranking",
    };
  });
}

export function targetCategories(): string[] {
  return Object.keys(CATEGORY_TERMS);
}

export function generateLocalSearchTerms(mission: LocalHuntMission): string[] {
  const base = CATEGORY_TERMS[mission.category] ?? [
    mission.category.toLowerCase(),
    `${mission.category.toLowerCase()} bundle`,
    `${mission.category.toLowerCase()} lot`,
  ];
  const modifiers = ["bundle", "lot", "new in box", "open box", "moving sale"];
  const terms = [
    ...base,
    ...base.slice(0, 3).map((term) => `${term} ${modifiers[0]}`),
    `${mission.category.toLowerCase()} under ${mission.budget}`,
    `${mission.category.toLowerCase()} pickup`,
  ];
  return [...new Set(terms)].slice(0, 10);
}

export function rankLocalSources(
  mission: LocalHuntMission,
  sources = localHuntSources()
): Array<LocalHuntSource & { rankScore: number }> {
  return sources
    .map((source) => {
      const statusBoost =
        source.status === "automated"
          ? 18
          : source.status === "assisted"
            ? 12
            : source.status === "intelligence"
              ? 8
              : 2;
      const qualityBoost =
        source.quality === "strong" ? 20 : source.quality === "decent" ? 12 : 3;
      const localBoost =
        source.id === "facebook_marketplace" ||
        source.id === "craigslist" ||
        source.id === "offerup"
          ? 14
          : 6;
      const profitBoost = Math.min(20, Math.max(0, mission.desiredProfit / 4));
      const budgetFit = mission.budget <= 150 ? 8 : mission.budget <= 400 ? 12 : 6;
      return {
        ...source,
        rankScore: Math.round(statusBoost + qualityBoost + localBoost + profitBoost + budgetFit),
      };
    })
    .sort((a, b) => b.rankScore - a.rankScore);
}

export function buildLocalHuntCandidates(
  mission: LocalHuntMission,
  zip: string,
  source: DealSource,
  terms = generateLocalSearchTerms(mission).slice(0, 3)
): DealInput[] {
  const buyPrice = Math.max(15, Math.min(mission.budget, Math.round(mission.budget * 0.72)));
  const resale = buyPrice + mission.desiredProfit + 34;
  return terms.map((term, index) => ({
    itemName: `${term} local hunt candidate`,
    store: zip,
    clearancePrice: buyPrice + index * 5,
    retailPrice: Math.round(resale * 1.15),
    discountPercent: 42,
    estimatedResale: resale + index * 12,
    compSource: "manual",
    sellSpeed: index === 0 ? "FAST" : "MEDIUM",
    confidence: "MEDIUM",
    source,
    sourceId: `local-hunt-${source}-${term}-${zip}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    feedLabel: "Local Hunt",
    notes: `Mission target: ${mission.category}, ${mission.radiusMiles} miles, desired profit $${mission.desiredProfit}. Verify exact condition, model, seller, and sold comps before buying.`,
    tags: {
      localPickupFriendly: true,
      compact: mission.category !== "Outdoor gear",
      strongBrand: true,
    },
  }));
}
