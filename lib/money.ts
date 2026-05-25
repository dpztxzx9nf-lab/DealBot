export function calcEstimatedFees(resale: number): number {
  if (resale <= 0) return 0;
  return Math.round(resale * 0.1 * 100) / 100;
}

export function calcProfit(
  clearance: number,
  resale: number,
  fees = calcEstimatedFees(resale)
): number {
  return Math.round((resale - clearance - fees) * 100) / 100;
}

export function calcRoiMultiple(clearance: number, resale: number): number {
  if (clearance <= 0) return 0;
  return Math.round((resale / clearance) * 10) / 10;
}

export function formatMoney(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatRoi(multiple: number): string {
  return `${multiple.toFixed(1)}x`;
}
