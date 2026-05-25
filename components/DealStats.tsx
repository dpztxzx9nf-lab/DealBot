"use client";

import { useDeals } from "@/hooks/useDeals";
export function DealStats() {
  const { hydrated, statusCounts } = useDeals();

  const loading = !hydrated;

  const stats = [
    { label: "Queue", value: loading ? "…" : String(statusCounts.pending) },
    { label: "Saved", value: loading ? "…" : String(statusCounts.saved) },
    { label: "Skipped", value: loading ? "…" : String(statusCounts.skipped) },
    { label: "Sold", value: loading ? "…" : String(statusCounts.sold) },
  ];

  return (
    <div className="flex gap-2 overflow-x-auto px-4 pb-2 scrollbar-none">
      {stats.map((s) => (
        <div
          key={s.label}
          className="flex shrink-0 flex-col rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2"
        >
          <span className="text-[10px] uppercase tracking-wider text-zinc-500">
            {s.label}
          </span>
          <span className="text-sm font-semibold text-zinc-100">{s.value}</span>
        </div>
      ))}
    </div>
  );
}
