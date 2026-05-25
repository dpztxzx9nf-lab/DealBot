export function calcEstimatedFees(resale: number): number {
  if (resale <= 0) return 0;
  return Math.round(resale * 0.1 * 100) / 100;
}

export function calcEstimatedShipping(
  resale: number,
  options: { bulky?: boolean; fragile?: boolean; localPickupFriendly?: boolean } = {}
): number {
  if (resale <= 0 || options.localPickupFriendly) return 0;
  const base = options.bulky ? 32 : options.fragile ? 16 : resale >= 100 ? 12 : 8;
  return Math.round(base * 100) / 100;
}

export function calcProfit(
  clearance: number,
  resale: number,
  fees = calcEstimatedFees(resale),
  shipping = 0
): number {
  return Math.round((resale - clearance - fees - shipping) * 100) / 100;
}

export function calcRoiMultiple(clearance: number, resale: number): number {
  if (clearance <= 0) return 0;
  return Math.round((resale / clearance) * 10) / 10;
}

export function calcRoiPercent(clearance: number, profit: number): number {
  if (clearance <= 0) return 0;
  return Math.round((profit / clearance) * 100);
}

export function formatMoney(n: number): string {
  const value = Number.isFinite(n) ? n : 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatRoi(multiple: number): string {
  if (!Number.isFinite(multiple)) return "n/a";
  return `${multiple.toFixed(1)}x`;
}

export function formatPercent(n: number): string {
  if (!Number.isFinite(n)) return "n/a";
  return `${Math.round(n)}%`;
}
