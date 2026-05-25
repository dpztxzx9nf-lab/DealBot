import { loadDeals } from "./storage";
import type { Deal } from "./types";

export type HydrateResult = {
  deals: Deal[];
  error: string | null;
};

const PERSISTED_STATUSES = new Set<Deal["status"]>([
  "saved",
  "bought",
  "sold",
  "skipped",
]);

/**
 * Restore user actions from localStorage. Pending queue is rebuilt from feed.
 */
export function hydrateDeals(): HydrateResult {
  if (typeof window === "undefined") {
    return { deals: [], error: null };
  }

  try {
    const all = loadDeals();
    const deals = all.filter((d) => PERSISTED_STATUSES.has(d.status));
    return { deals, error: null };
  } catch {
    return {
      deals: [],
      error: "Could not read saved deals from this browser.",
    };
  }
}

const TERMINAL = new Set<Deal["status"]>(["saved", "bought", "sold", "skipped"]);

/**
 * Merge feed into queue: keep saved/sold/skipped; only add new pending items.
 */
export function reconcileFeedMerge(
  existing: Deal[],
  incoming: Deal[]
): Deal[] {
  const kept = existing.filter((d) => TERMINAL.has(d.status));
  const terminalKeys = new Set(kept.map((d) => d.sourceId ?? d.id));

  const prevPendingByKey = new Map<string, Deal>();
  for (const d of existing) {
    if (d.status === "pending") {
      prevPendingByKey.set(d.sourceId ?? d.id, d);
    }
  }

  const newPending: Deal[] = [];

  for (const item of incoming) {
    const key = item.sourceId ?? item.id;
    if (terminalKeys.has(key)) continue;

    const prev = prevPendingByKey.get(key);
    newPending.push({
      ...item,
      id: prev?.id ?? item.id,
      status: "pending",
      createdAt: prev?.createdAt ?? item.createdAt,
      strongCandidate: prev?.strongCandidate,
    });
  }

  return [...kept, ...newPending];
}
