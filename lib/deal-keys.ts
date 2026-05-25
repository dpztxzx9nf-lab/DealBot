import type { Deal } from "./types";

function hashString(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

/** Stable key for feed reconciliation (persisted on deal as sourceId when possible). */
export function getDealKey(
  deal: Pick<Deal, "sourceId" | "id" | "itemName" | "clearancePrice" | "source">
): string {
  if (deal.sourceId?.trim()) return deal.sourceId.trim();
  const raw = `${deal.source ?? "x"}|${deal.itemName.trim().toLowerCase()}|${deal.clearancePrice}`;
  return `hash-${hashString(raw)}`;
}

export function ensureSourceId<T extends Pick<Deal, "sourceId" | "id" | "itemName" | "clearancePrice" | "source">>(
  deal: T
): T & { sourceId: string } {
  const sourceId = deal.sourceId?.trim() || getDealKey(deal);
  return { ...deal, sourceId };
}
