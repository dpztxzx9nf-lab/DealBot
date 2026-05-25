import type { DealSource, SourceQuality } from "./types";

export type SourceMode = "manual" | "link" | "planned";

export interface DealSourceSlot {
  id: DealSource;
  name: string;
  quality: SourceQuality;
  mode: SourceMode;
  bestFor: string;
  workflow: string;
  buildUrl?: (query: string, zip: string) => string;
}

function q(value: string): string {
  return encodeURIComponent(value.trim());
}

export function buildEbaySoldSearchUrl(query: string): string {
  const params = new URLSearchParams({
    _nkw: query.slice(0, 80),
    LH_Sold: "1",
    LH_Complete: "1",
  });
  return `https://www.ebay.com/sch/i.html?${params}`;
}

export const FREE_SOURCE_SLOTS: DealSourceSlot[] = [
  {
    id: "facebook_marketplace",
    name: "Facebook Marketplace",
    quality: "decent",
    mode: "manual",
    bestFor: "local underpriced flips",
    workflow: "Search locally, paste promising listings, then verify with sold comps.",
    buildUrl: (query) => `https://www.facebook.com/marketplace/search/?query=${q(query)}`,
  },
  {
    id: "craigslist",
    name: "Craigslist",
    quality: "risky",
    mode: "link",
    bestFor: "older local listings and garage-sale leftovers",
    workflow: "Open local search, sort newest, and paste listings with clear prices.",
    buildUrl: (query) => `https://www.craigslist.org/search/sss?query=${q(query)}`,
  },
  {
    id: "offerup",
    name: "OfferUp",
    quality: "risky",
    mode: "manual",
    bestFor: "nearby pickup deals",
    workflow: "Search in the app, check seller history, and paste the listing URL.",
    buildUrl: (query) => `https://offerup.com/search?q=${q(query)}`,
  },
  {
    id: "mercari",
    name: "Mercari",
    quality: "decent",
    mode: "link",
    bestFor: "active resale comps and shippable items",
    workflow: "Use as an active comp check, not proof of sold value.",
    buildUrl: (query) => `https://www.mercari.com/search/?keyword=${q(query)}`,
  },
  {
    id: "ebay_sold",
    name: "eBay sold comps",
    quality: "strong",
    mode: "link",
    bestFor: "actual resale value",
    workflow: "Use sold and completed filters; price local flips below the median sold comp.",
    buildUrl: (query) => buildEbaySoldSearchUrl(query),
  },
  {
    id: "walmart_clearance",
    name: "Walmart clearance",
    quality: "risky",
    mode: "link",
    bestFor: "retail clearance flips",
    workflow: "Check local availability, then confirm sold comps before buying.",
    buildUrl: (query) => `https://www.walmart.com/search?q=${q(`${query} clearance`)}`,
  },
  {
    id: "target_clearance",
    name: "Target clearance",
    quality: "risky",
    mode: "link",
    bestFor: "small home, toy, and electronics clearance",
    workflow: "Search clearance terms, verify store availability, and avoid MSRP-only math.",
    buildUrl: (query) => `https://www.target.com/s?searchTerm=${q(`${query} clearance`)}`,
  },
  {
    id: "home_depot_clearance",
    name: "Home Depot clearance",
    quality: "risky",
    mode: "link",
    bestFor: "tools, smart home, and seasonal items",
    workflow: "Check clearance or special-buy prices, then compare sold tool comps.",
    buildUrl: (query) => `https://www.homedepot.com/s/${q(`${query} clearance`)}`,
  },
  {
    id: "lowes_clearance",
    name: "Lowe's clearance",
    quality: "risky",
    mode: "link",
    bestFor: "tools, hardware, and appliances",
    workflow: "Use local pickup availability and avoid bulky items unless profit is large.",
    buildUrl: (query) => `https://www.lowes.com/search?searchTerm=${q(`${query} clearance`)}`,
  },
  {
    id: "best_buy_open_box",
    name: "Best Buy open-box",
    quality: "decent",
    mode: "link",
    bestFor: "electronics with clear model numbers",
    workflow: "Only save listings with exact model numbers and sold comps.",
    buildUrl: (query) => `https://www.bestbuy.com/site/searchpage.jsp?st=${q(`${query} open box`)}`,
  },
  {
    id: "estate_sales",
    name: "EstateSales.net",
    quality: "risky",
    mode: "link",
    bestFor: "bundles, tools, furniture, and collectibles",
    workflow: "Find nearby sales, preview photos, and build a short target list.",
    buildUrl: (_query, zip) => `https://www.estatesales.net/zip/${q(zip)}`,
  },
  {
    id: "garage_sales",
    name: "Garage sales",
    quality: "risky",
    mode: "manual",
    bestFor: "local cash buys with negotiation room",
    workflow: "Search neighborhood posts and paste any item-specific listing you can comp.",
    buildUrl: (query) => `https://www.google.com/search?q=${q(`${query} garage sale near me`)}`,
  },
  {
    id: "costco_clearance",
    name: "Costco clearance notes",
    quality: "risky",
    mode: "manual",
    bestFor: "asterisk deals and manager markdowns",
    workflow: "Use in-store notes or community finds, then comp exact model numbers.",
  },
  {
    id: "discord_deals",
    name: "Discord deal communities",
    quality: "risky",
    mode: "planned",
    bestFor: "early alerts from trusted groups",
    workflow: "Reserved source slot for invite-only communities and pasted alerts.",
  },
];

export function qualityLabel(quality: SourceQuality): string {
  if (quality === "strong") return "Strong";
  if (quality === "decent") return "Decent";
  return "Risky";
}
