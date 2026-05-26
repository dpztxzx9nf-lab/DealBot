import type { DealSource, SourceConnector, SourceLayerKind, SourcingMode } from "./types";

export type SourceStatus =
  | "active_connector"
  | "automated_feasible"
  | "browser_assisted_restricted"
  | "planned_connector"
  | "planned_signal_source"
  | "planned_source_registry"
  | "intelligence_layer"
  | "placeholder_planned"
  | "failed_source"
  | "source_disabled"
  | "needs_credentials";

export interface SourceCatalogEntry {
  id: DealSource;
  name: string;
  status: SourceStatus;
  scope: "local" | "online" | "nationwide" | "comps";
  layer: SourceLayerKind | "market_truth";
  requiresCredentials: boolean;
  supportsMode: SourcingMode[];
}

export const SOURCE_CATALOG: SourceCatalogEntry[] = [
  { id: "slickdeals", name: "Slickdeals", status: "active_connector", scope: "nationwide", layer: "deal_feed", requiresCredentials: false, supportsMode: ["online", "hybrid"] },
  { id: "reddit", name: "Reddit deal communities", status: "active_connector", scope: "nationwide", layer: "community", requiresCredentials: false, supportsMode: ["online", "hybrid"] },
  { id: "ebay_sold", name: "eBay sold comps", status: "active_connector", scope: "comps", layer: "market_truth", requiresCredentials: false, supportsMode: ["nearby", "online", "hybrid"] },
  { id: "facebook_marketplace", name: "Facebook Marketplace", status: "browser_assisted_restricted", scope: "local", layer: "local_marketplace", requiresCredentials: true, supportsMode: ["nearby", "hybrid"] },
  { id: "craigslist", name: "Craigslist", status: "automated_feasible", scope: "local", layer: "local_marketplace", requiresCredentials: false, supportsMode: ["nearby", "hybrid"] },
  { id: "offerup", name: "OfferUp", status: "browser_assisted_restricted", scope: "local", layer: "local_marketplace", requiresCredentials: true, supportsMode: ["nearby", "hybrid"] },
  { id: "mercari", name: "Mercari", status: "placeholder_planned", scope: "online", layer: "deal_feed", requiresCredentials: false, supportsMode: ["online", "hybrid"] },
  { id: "amazon_price_drops", name: "Amazon price drops", status: "needs_credentials", scope: "online", layer: "deal_feed", requiresCredentials: true, supportsMode: ["online", "hybrid"] },
  { id: "walmart_clearance", name: "Walmart clearance", status: "planned_connector", scope: "local", layer: "clearance", requiresCredentials: true, supportsMode: ["nearby", "hybrid"] },
  { id: "target_clearance", name: "Target clearance", status: "needs_credentials", scope: "local", layer: "clearance", requiresCredentials: true, supportsMode: ["nearby", "hybrid"] },
  { id: "best_buy_open_box", name: "Best Buy open-box", status: "needs_credentials", scope: "local", layer: "clearance", requiresCredentials: true, supportsMode: ["nearby", "online", "hybrid"] },
  { id: "costco_clearance", name: "Costco clearance", status: "placeholder_planned", scope: "local", layer: "clearance", requiresCredentials: false, supportsMode: ["nearby", "hybrid"] },
  { id: "home_depot_clearance", name: "Home Depot clearance", status: "needs_credentials", scope: "local", layer: "clearance", requiresCredentials: true, supportsMode: ["nearby", "hybrid"] },
  { id: "lowes_clearance", name: "Lowe's clearance", status: "needs_credentials", scope: "local", layer: "clearance", requiresCredentials: true, supportsMode: ["nearby", "hybrid"] },
  { id: "estate_sales", name: "Estate sale discovery", status: "placeholder_planned", scope: "local", layer: "local_marketplace", requiresCredentials: false, supportsMode: ["nearby", "hybrid"] },
  { id: "garage_sales", name: "Garage sale discovery", status: "placeholder_planned", scope: "local", layer: "local_marketplace", requiresCredentials: false, supportsMode: ["nearby", "hybrid"] },
  { id: "hidden_clearances", name: "Hidden Clearances", status: "planned_signal_source", scope: "local", layer: "clearance", requiresCredentials: false, supportsMode: ["nearby", "hybrid"] },
  { id: "local_liquidation", name: "Local liquidation", status: "planned_source_registry", scope: "local", layer: "liquidation_auction", requiresCredentials: false, supportsMode: ["nearby", "hybrid"] },
  { id: "regional_pricing_mismatches", name: "Regional pricing mismatches", status: "intelligence_layer", scope: "local", layer: "pricing_intelligence", requiresCredentials: false, supportsMode: ["nearby", "hybrid"] },
  { id: "liquidation_auctions", name: "Liquidation and auction sources", status: "planned_source_registry", scope: "local", layer: "liquidation_auction", requiresCredentials: false, supportsMode: ["nearby", "hybrid"] },
  { id: "discord_deals", name: "Discord deal communities", status: "source_disabled", scope: "nationwide", layer: "community", requiresCredentials: true, supportsMode: ["online", "hybrid"] },
];

export function sourceStatusLabel(status: SourceStatus): string {
  return status.replaceAll("_", " ");
}

export function sourceConnectors(): SourceConnector[] {
  return SOURCE_CATALOG.filter((source) => source.layer !== "market_truth").map(
    (source) => ({
      id: source.id,
      name: source.name,
      layer: source.layer as SourceLayerKind,
      status: sourceStatusLabel(source.status),
      scope:
        source.scope === "local" || source.scope === "online"
          ? source.scope
          : "nationwide",
      requiresCredentials: source.requiresCredentials,
      supportsMode: source.supportsMode,
    })
  );
}
