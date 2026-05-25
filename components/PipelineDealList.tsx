"use client";

import { useDeals } from "@/hooks/useDeals";
import { formatMoney } from "@/lib/money";
import { DealCard } from "./DealCard";

export function PipelineDealList() {
  const { pipelineDeals, setStatus, deleteDeal, hydrated } = useDeals();

  if (!hydrated) {
    return <p className="p-4 text-zinc-500">Loading...</p>;
  }

  if (pipelineDeals.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-8 text-center text-zinc-500">
        <p className="text-4xl">P</p>
        <p>No pipeline leads yet. Move serious or watchlisted opportunities here from Swipe.</p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-4 overflow-y-auto px-4 py-2">
      {pipelineDeals.map((deal) => (
        <li key={deal.id} className="space-y-2">
          <DealCard deal={deal} compact />
          <div className="flex flex-wrap gap-2">
            {deal.sourceUrl && (
              <a
                href={deal.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-emerald-500/40 px-3 py-1.5 text-xs text-emerald-400"
              >
                Check listing
              </a>
            )}
            <button
              type="button"
              onClick={() => {
                const price = prompt(
                  "Sold price? (blank = est. resale)",
                  String(deal.estimatedResale)
                );
                if (price === null) return;
                setStatus(deal.id, "sold", {
                  soldPrice: price ? parseFloat(price) : deal.estimatedResale,
                  soldAt: new Date().toISOString(),
                });
              }}
              className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-medium text-emerald-400"
            >
              Mark sold
            </button>
            {deal.status !== "bought" && (
              <button
                type="button"
                onClick={() => setStatus(deal.id, "bought", { strongCandidate: true })}
                className="rounded-lg bg-cyan-500/20 px-3 py-1.5 text-xs font-medium text-cyan-300"
              >
                Make active
              </button>
            )}
            <button
              type="button"
              onClick={() => setStatus(deal.id, "pending")}
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400"
            >
              Re-queue
            </button>
            <button
              type="button"
              onClick={() => {
                if (confirm("Delete this deal?")) deleteDeal(deal.id);
              }}
              className="rounded-lg px-3 py-1.5 text-xs text-red-400"
            >
              Delete
            </button>
          </div>
          <p className="text-xs text-cyan-400">
            {deal.status === "bought" ? "Active sourcing target" : "Watchlisted opportunity"}
          </p>
          <p className="text-xs text-zinc-600">
            Net {formatMoney(deal.netProfit)} - {deal.roiPercent}% ROI -{" "}
            {deal.recommendation} - {deal.inventoryStatus} stock
          </p>
        </li>
      ))}
    </ul>
  );
}
