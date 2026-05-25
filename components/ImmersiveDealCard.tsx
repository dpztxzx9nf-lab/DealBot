"use client";

import Image from "next/image";
import type { Deal } from "@/lib/types";
import { formatMoney } from "@/lib/money";

interface ImmersiveDealCardProps {
  deal: Deal;
  stackIndex?: number;
  style?: React.CSSProperties;
  className?: string;
}

function recommendationLabel(deal: Deal): string {
  if (deal.recommendation === "SKIP") return "Skip";
  if (deal.recommendation === "WATCH") return "Watch";
  if (deal.sourceQuality === "strong" || deal.sellThroughScore >= 78) {
    return "Buy";
  }
  return "Buy";
}

export function ImmersiveDealCard({
  deal,
  stackIndex = 0,
  style,
  className = "",
}: ImmersiveDealCardProps) {
  const sourceLabel = deal.feedLabel ?? deal.source;
  const isHot = deal.recommendation === "BUY" && deal.confidence === "HIGH";

  return (
    <article
      style={style}
      className={`immersive-card-depth relative h-full w-full overflow-hidden rounded-[1.75rem] bg-zinc-900 ${
        stackIndex === 0 ? "animate-deal-enter" : ""
      } ${isHot ? "ring-1 ring-emerald-400/40" : ""} ${className}`}
    >
      <div className="absolute inset-0 bg-zinc-800">
        {deal.imageUrl ? (
          <Image
            src={deal.imageUrl}
            alt=""
            fill
            className="object-cover object-[50%_32%]"
            priority={stackIndex === 0}
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-950 text-6xl opacity-40">
            Box
          </div>
        )}
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/70 via-black/30 to-transparent" />
      <div className="absolute left-3 right-3 top-3 z-10 flex items-start justify-between gap-3 pt-1">
        <span className="max-w-[45%] truncate rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/90 backdrop-blur-sm">
          {sourceLabel}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          {deal.discountPercent != null && deal.discountPercent >= 25 && (
            <span className="rounded-full bg-red-500/95 px-2 py-0.5 text-[10px] font-bold text-white">
              -{deal.discountPercent}%
            </span>
          )}
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
              deal.recommendation === "BUY"
                ? "bg-emerald-400 text-zinc-950"
                : deal.recommendation === "WATCH"
                  ? "bg-amber-400 text-zinc-950"
                  : "bg-zinc-600/90 text-white"
            }`}
          >
            {recommendationLabel(deal)}
          </span>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[66%] bg-gradient-to-t from-black via-black/90 to-black/20" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black to-transparent" />

      <div className="absolute inset-x-0 bottom-0 z-10 px-5 pb-6 pt-14">
        <h2 className="line-clamp-3 max-h-[4.5rem] text-[1.25rem] font-bold leading-snug tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
          {deal.itemName}
        </h2>
        {deal.store && (
          <p className="mt-1 text-sm font-medium text-white/60">{deal.store}</p>
        )}

        <div className="mt-4 flex items-end gap-4">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-widest text-white/45">
              Buy
            </p>
            <p className="text-xl font-bold tabular-nums text-white">
              {formatMoney(deal.clearancePrice)}
            </p>
          </div>
          <div className="pb-0.5 text-lg text-white/30">to</div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-widest text-white/45">
              Sold comp
            </p>
            <p className="text-xl font-bold tabular-nums text-emerald-300">
              {formatMoney(deal.estimatedResale)}
            </p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-[10px] font-medium uppercase tracking-widest text-emerald-400/80">
              Net
            </p>
            <p className="text-2xl font-black tabular-nums text-emerald-400">
              +{formatMoney(deal.netProfit)}
            </p>
          </div>
        </div>

        <p className="mt-3 text-xs font-medium text-white/50">
          {deal.sellThroughConfidence} sell-through - {deal.inventoryStatus} stock -{" "}
          {deal.roiPercent}% ROI
          {deal.strongCandidate && (
            <span className="ml-2 text-cyan-300">Hot pick</span>
          )}
        </p>
        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-white/65">
          {deal.qualityExplanation}
        </p>
      </div>
    </article>
  );
}
