"use client";

import { useDeals } from "@/hooks/useDeals";
import { formatMoney, formatRoi } from "@/lib/money";

export function SoldDealList() {
  const { soldDeals, hydrated } = useDeals();

  if (!hydrated) {
    return <p className="p-4 text-zinc-500">Loading…</p>;
  }

  if (soldDeals.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-8 text-center text-zinc-500">
        <p className="text-4xl">✓</p>
        <p>No sold history yet. Mark deals sold from Saved.</p>
      </div>
    );
  }

  const totalProfit = soldDeals.reduce((sum, d) => {
    const sold = d.soldPrice ?? d.estimatedResale;
    return sum + (sold - d.clearancePrice);
  }, 0);

  return (
    <div className="flex flex-col gap-4 overflow-y-auto px-4 py-2">
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
        <p className="text-xs uppercase text-emerald-500/80">Total realized profit</p>
        <p className="text-2xl font-bold text-emerald-400">
          {formatMoney(totalProfit)}
        </p>
        <p className="text-xs text-zinc-500">{soldDeals.length} flips</p>
      </div>

      <ul className="flex flex-col gap-3">
        {soldDeals.map((deal) => {
          const sold = deal.soldPrice ?? deal.estimatedResale;
          const profit = sold - deal.clearancePrice;
          return (
            <li
              key={deal.id}
              className="rounded-xl border border-zinc-800 bg-zinc-900 p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-medium text-zinc-100">{deal.itemName}</h3>
                <span className="shrink-0 text-sm font-semibold text-emerald-400">
                  +{formatMoney(profit)}
                </span>
              </div>
              <p className="mt-1 text-xs text-zinc-500">
                {deal.store ?? "—"}
                {deal.soldAt &&
                  ` · ${new Date(deal.soldAt).toLocaleDateString()}`}
              </p>
              <div className="mt-2 flex gap-4 text-xs text-zinc-400">
                <span>Bought {formatMoney(deal.clearancePrice)}</span>
                <span>Sold {formatMoney(sold)}</span>
                <span>{formatRoi(deal.roiMultiple)}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
