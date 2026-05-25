import type { DealSource } from "./types";

export type SourceStatus =
  | "active_connector"
  | "placeholder_planned"
  | "failed_source"
  | "source_disabled"
  | "needs_credentials";

export interface SourceCatalogEntry {
  id: DealSource;
  name: string;
  status: SourceStatus;
  scope: "local" | "online" | "nationwide" | "comps";
}

export const SOURCE_CATALOG: SourceCatalogEntry[] = [
  { id: "slickdeals", name: "Slickdeals", status: "active_connector", scope: "nationwide" },
  { id: "reddit", name: "Reddit deal communities", status: "active_connector", scope: "nationwide" },
  { id: "ebay_sold", name: "eBay sold comps", status: "active_connector", scope: "comps" },
  { id: "facebook_marketplace", name: "Facebook Marketplace", status: "placeholder_planned", scope: "local" },
  { id: "craigslist", name: "Craigslist", status: "placeholder_planned", scope: "local" },
  { id: "offerup", name: "OfferUp", status: "placeholder_planned", scope: "local" },
  { id: "mercari", name: "Mercari", status: "placeholder_planned", scope: "online" },
  { id: "amazon_price_drops", name: "Amazon price drops", status: "needs_credentials", scope: "online" },
  { id: "walmart_clearance", name: "Walmart clearance", status: "needs_credentials", scope: "local" },
  { id: "target_clearance", name: "Target clearance", status: "needs_credentials", scope: "local" },
  { id: "best_buy_open_box", name: "Best Buy open-box", status: "needs_credentials", scope: "local" },
  { id: "costco_clearance", name: "Costco clearance", status: "placeholder_planned", scope: "local" },
  { id: "home_depot_clearance", name: "Home Depot clearance", status: "needs_credentials", scope: "local" },
  { id: "lowes_clearance", name: "Lowe's clearance", status: "needs_credentials", scope: "local" },
  { id: "estate_sales", name: "Estate sale discovery", status: "placeholder_planned", scope: "local" },
  { id: "garage_sales", name: "Garage sale discovery", status: "placeholder_planned", scope: "local" },
  { id: "liquidation_auctions", name: "Liquidation and auction sources", status: "placeholder_planned", scope: "local" },
  { id: "discord_deals", name: "Discord deal communities", status: "source_disabled", scope: "nationwide" },
];

export function sourceStatusLabel(status: SourceStatus): string {
  return status.replaceAll("_", " ");
}
