"use client";

import Image from "next/image";
import type { Deal } from "@/lib/types";
import { formatMoney, formatRoi } from "@/lib/money";

const recStyles: Record<Deal["recommendation"], string> = {
  BUY: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
  WATCH: "bg-amber-500/20 text-amber-400 border-amber-500/40",
  SKIP: "bg-zinc-500/20 text-zinc-400 border-zinc-600/40",
};

const compLabels: Record<Deal["compSource"], string> = {
  heuristic: "Risky estimate",
  estimated: "Estimated resale",
  ebay_active: "eBay active comps",
  ebay_sold: "eBay sold comps",
  manual: "Manual comp",
};

const qualityLabels: Record<Deal["sourceQuality"], string> = {
  strong: "Strong source",
  decent: "Decent source",
  risky: "Risky source",
};

const speedStyles: Record<Deal["sellSpeed"], string> = {
  FAST: "text-emerald-400",
  MEDIUM: "text-amber-400",
  SLOW: "text-red-400",
};

function recommendationLabel(deal: Deal): string {
  if (deal.recommendation === "SKIP") return "Skip";
  if (deal.recommendation === "WATCH") return "Watch";
  if (deal.sourceQuality === "strong" || deal.sellThroughScore >= 78) {
    return "Buy";
  }
  return "Buy";
}

interface DealCardProps {
  deal: Deal;
  style?: React.CSSProperties;
  className?: string;
  compact?: boolean;
}

export function DealCard({ deal, style, className = "", compact }: DealCardProps) {
  const isHot = deal.recommendation === "BUY" && deal.confidence === "HIGH";

  return (
    <article
      style={style}
      className={`relative flex flex-col overflow-hidden rounded-2xl border bg-zinc-900 ${
        isHot
          ? "border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.25)]"
          : "border-zinc-800"
      } ${compact ? "text-sm" : ""} ${className}`}
    >
      <div className={`relative ${compact ? "h-32" : "h-44"} w-full bg-zinc-800`}>
        {deal.imageUrl ? (
          <Image
            src={deal.imageUrl}
            alt={deal.itemName}
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl text-zinc-600">
            Box
          </div>
        )}
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <span
            className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${recStyles[deal.recommendation]}`}
          >
            {recommendationLabel(deal)}
          </span>
          {deal.discountPercent != null && deal.discountPercent >= 40 && (
            <span className="rounded-full bg-red-500/30 px-2.5 py-0.5 text-xs font-bold text-red-300">
              -{deal.discountPercent}%
            </span>
          )}
          {deal.strongCandidate && (
            <span className="rounded-full bg-cyan-500/30 px-2.5 py-0.5 text-xs font-bold text-cyan-300">
              HOT
            </span>
          )}
        </div>
        <span className="absolute right-3 top-3 rounded-full bg-zinc-950/80 px-2 py-0.5 font-mono text-xs text-emerald-400">
          {formatRoi(deal.roiMultiple)}
        </span>
      </div>

      <div className={`flex flex-1 flex-col gap-3 ${compact ? "p-3" : "p-4"}`}>
        <div>
          <h2
            className={`font-semibold leading-tight text-zinc-50 ${compact ? "text-base" : "text-lg"}`}
          >
            {deal.itemName}
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            {deal.feedLabel ?? deal.source}
            {deal.store && ` - ${deal.store}`}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-zinc-800/80 p-2">
            <p className="text-[10px] uppercase text-zinc-500">Buy</p>
            <p className="font-semibold text-red-400">
              {formatMoney(deal.clearancePrice)}
            </p>
          </div>
          <div className="rounded-lg bg-zinc-800/80 p-2">
            <p className="text-[10px] uppercase text-zinc-500">Sold comp</p>
            <p className="font-semibold text-emerald-400">
              {formatMoney(deal.estimatedResale)}
            </p>
          </div>
          <div className="rounded-lg bg-zinc-800/80 p-2">
            <p className="text-[10px] uppercase text-zinc-500">Net profit</p>
            <p className="font-semibold text-zinc-50">
              {formatMoney(deal.netProfit)}
            </p>
          </div>
        </div>

        {!compact && (
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-zinc-950/70 p-2">
              <p className="text-[10px] uppercase text-zinc-500">ROI</p>
              <p className="font-semibold text-zinc-100">{deal.roiPercent}%</p>
            </div>
            <div className="rounded-lg bg-zinc-950/70 p-2">
              <p className="text-[10px] uppercase text-zinc-500">Sale time</p>
              <p className="font-semibold text-zinc-100">
                ~{deal.estimatedTimeToSaleDays}d
              </p>
            </div>
            <div className="rounded-lg bg-zinc-950/70 p-2">
              <p className="text-[10px] uppercase text-zinc-500">Stock</p>
              <p className="font-semibold text-zinc-100">
                {deal.stockConfidence}
              </p>
            </div>
          </div>
        )}

        {!compact && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-2.5">
            <p className="text-[10px] font-semibold uppercase text-zinc-500">
              Why this deal?
            </p>
            <p className="mt-1 text-xs leading-relaxed text-zinc-300">
              {deal.qualityExplanation}
            </p>
          </div>
        )}

        {!compact && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-500">
              Speed{" "}
              <span className={`font-semibold ${speedStyles[deal.sellSpeed]}`}>
                {deal.sellSpeed}
              </span>
            </span>
            <span className="text-zinc-500">
              Conf{" "}
              <span className="font-semibold text-zinc-300">
                {deal.confidence}
              </span>
            </span>
            <span className="text-zinc-500">
              Fresh{" "}
              <span className="font-semibold text-zinc-300">
                {deal.freshnessScore}
              </span>
            </span>
          </div>
        )}

        {!compact && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-500">
              Source{" "}
              <span className="font-semibold text-zinc-300">
                {deal.feedLabel ?? deal.source}
              </span>
            </span>
            <span className="text-zinc-500">
              Type{" "}
              <span className="font-semibold text-zinc-300">
                {deal.sourcingMode}
              </span>
            </span>
            <span className="text-zinc-500">
              Score{" "}
              <span className="font-semibold text-zinc-300">
                {deal.finalScore}
              </span>
            </span>
          </div>
        )}

        {!compact && (
          <p className="text-xs text-zinc-600">
            {compLabels[deal.compSource]}
            {` - ${qualityLabels[deal.sourceQuality]}`}
            {deal.estimatedFees > 0 &&
              ` - Fees ${formatMoney(deal.estimatedFees)}`}
            {deal.estimatedShipping > 0 &&
              ` - Ship ${formatMoney(deal.estimatedShipping)}`}
            {deal.retailPrice != null &&
              ` - Retail ${formatMoney(deal.retailPrice)}`}
          </p>
        )}

        {deal.sourceUrl && !compact && (
          <a
            href={deal.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-emerald-400 underline"
          >
            View listing source
          </a>
        )}
      </div>
    </article>
  );
}
