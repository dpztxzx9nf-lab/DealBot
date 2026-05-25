import { ensureSourceId, getDealKey } from "./deal-keys";
import { enrichDeal, sourceQualityFromComp } from "./scoring";
import type { Deal, DealStatus } from "./types";

export const STORAGE_KEY = "dealbot:deals:v1";
export const STORAGE_VERSION_KEY = "dealbot:storage:version";
export const STORAGE_VERSION = "v7";
export const SEED_FLAG_KEY = "dealbot:seeded:v1";

const STATUS_RANK: Record<DealStatus, number> = {
  sold: 5,
  listed: 5,
  bought: 4,
  saved: 3,
  skipped: 2,
  pending: 1,
};

function isValidDeal(d: unknown): d is Deal {
  if (!d || typeof d !== "object") return false;
  const x = d as Record<string, unknown>;
  return (
    typeof x.id === "string" &&
    typeof x.itemName === "string" &&
    typeof x.clearancePrice === "number" &&
    typeof x.status === "string"
  );
}

function normalizeDeal(d: Deal): Deal {
  const withSource = ensureSourceId({
    ...d,
    source: d.source ?? "aggregated",
    compSource: d.compSource ?? "heuristic",
    estimatedResale: d.estimatedResale ?? d.clearancePrice,
    sellSpeed: d.sellSpeed ?? "MEDIUM",
    confidence: d.confidence ?? "LOW",
    sourceQuality:
      d.sourceQuality ?? sourceQualityFromComp(d.compSource ?? "heuristic"),
  });
  return enrichDeal(withSource);
}

function readRawDeals(): Deal[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidDeal).map(normalizeDeal);
  } catch {
    return [];
  }
}

function dedupeByKey(deals: Deal[]): Deal[] {
  const byKey = new Map<string, Deal>();
  for (const d of deals) {
    const key = getDealKey(d);
    const prev = byKey.get(key);
    if (!prev || STATUS_RANK[d.status] > STATUS_RANK[prev.status]) {
      byKey.set(key, d);
    }
  }
  return [...byKey.values()];
}

/**
 * One-time migration: normalize sourceId, dedupe by stable key, drop orphan pending.
 */
export function runStorageMigration(): Deal[] {
  if (typeof window === "undefined") return [];

  const version = localStorage.getItem(STORAGE_VERSION_KEY);
  let deals = readRawDeals();

  if (version === STORAGE_VERSION) {
    return deals;
  }

  console.info("[DealBot] Migrating localStorage to", STORAGE_VERSION);
  deals = dedupeByKey(deals.map(normalizeDeal));

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(deals));
    localStorage.setItem(STORAGE_VERSION_KEY, STORAGE_VERSION);
  } catch {
    /* blocked */
  }

  return deals;
}

export function loadDeals(): Deal[] {
  return runStorageMigration();
}

/** Returns false if localStorage is blocked (e.g. Safari private browsing). */
export function saveDeals(deals: Deal[]): boolean {
  if (typeof window === "undefined") return false;
  try {
    const normalized = dedupeByKey(deals.map(normalizeDeal));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    localStorage.setItem(STORAGE_VERSION_KEY, STORAGE_VERSION);
    return true;
  } catch {
    return false;
  }
}

export function clearStorage(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_VERSION_KEY);
    localStorage.removeItem(SEED_FLAG_KEY);
  } catch {
    /* ignore */
  }
}
