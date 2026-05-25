"use client";

import type { Deal } from "@/lib/types";
import { formatMoney, formatRoi } from "@/lib/money";

export function DealDetailsSheet({
  deal,
  onClose,
}: {
  deal: Deal;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/80 p-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[70vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-700 bg-zinc-900 p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-2">
          <h3 className="text-lg font-semibold text-zinc-100">{deal.itemName}</h3>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 text-zinc-500"
          >
            X
          </button>
        </div>
        <dl className="space-y-2 text-sm text-zinc-400">
          <div className="flex justify-between">
            <dt>ROI</dt>
            <dd className="text-emerald-400">{formatRoi(deal.roiMultiple)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Score</dt>
            <dd>{deal.score}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Buy / resale range</dt>
            <dd>
              {formatMoney(deal.clearancePrice)} to{" "}
              {formatMoney(deal.resaleRangeLow)}-
              {formatMoney(deal.resaleRangeHigh)}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt>Confidence label</dt>
            <dd>{deal.confidenceLabel}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Estimated fees</dt>
            <dd>{formatMoney(deal.estimatedFees)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Estimated shipping</dt>
            <dd>{formatMoney(deal.estimatedShipping)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Net profit</dt>
            <dd className="text-emerald-400">
              {formatMoney(deal.netProfit)}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt>ROI</dt>
            <dd>{deal.roiPercent}%</dd>
          </div>
          <div className="flex justify-between">
            <dt>Recommended action</dt>
            <dd>{deal.recommendation}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Acquisition type</dt>
            <dd>
              {deal.sourcingMode} / {deal.acquisitionMode}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt>Time to sale</dt>
            <dd>~{deal.estimatedTimeToSaleDays} days</dd>
          </div>
          <div className="flex justify-between">
            <dt>Source quality</dt>
            <dd>{deal.sourceQuality}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Stock confidence</dt>
            <dd>
              {deal.stockConfidence} / {deal.inventoryStatus}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt>Freshness</dt>
            <dd>{deal.freshnessScore}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Friction / competition</dt>
            <dd>
              {deal.acquisitionFrictionScore} / {deal.competitionScore}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt>Capital efficiency</dt>
            <dd>{deal.capitalEfficiencyScore}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Source reliability</dt>
            <dd>{deal.sourceReliabilityScore}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Acquisition effort</dt>
            <dd>
              {deal.difficultyLabel} / {deal.acquisitionDifficulty}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt>Demand / brand</dt>
            <dd>
              {deal.demandScore} / {deal.brandScore}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt>Margin / sell-through</dt>
            <dd>
              {deal.marginScore} / {deal.sellThroughScore}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt>Ship ease / risk</dt>
            <dd>
              {deal.shippingEaseScore} / {deal.riskScore}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt>Comp</dt>
            <dd>{deal.compSource}</dd>
          </div>
          {deal.distanceMiles != null && (
            <div className="flex justify-between">
              <dt>Pickup distance</dt>
              <dd>{deal.distanceMiles} mi</dd>
            </div>
          )}
        </dl>
        <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
          <p className="text-[10px] font-semibold uppercase text-zinc-500">
            Why this deal?
          </p>
          <p className="mt-1 text-sm leading-relaxed text-zinc-300">
            {deal.qualityExplanation}
          </p>
        </div>
        <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
          <p className="text-[10px] font-semibold uppercase text-zinc-500">
            Why this deal exists
          </p>
          <p className="mt-1 text-sm leading-relaxed text-zinc-300">
            {deal.dealExistenceReason}
          </p>
        </div>
        <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
          <p className="text-[10px] font-semibold uppercase text-zinc-500">
            Action
          </p>
          <p className="mt-1 text-sm leading-relaxed text-zinc-300">
            {deal.recommendedActionReason}
          </p>
        </div>
        {deal.rejectionReason && (
          <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
            {deal.rejectionReason}
          </p>
        )}
        {deal.notes && (
          <p className="mt-3 text-sm leading-relaxed text-zinc-500">
            {deal.notes}
          </p>
        )}
        {deal.sourceUrl && (
          <a
            href={deal.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 block rounded-xl bg-emerald-500/20 py-3 text-center font-semibold text-emerald-400"
          >
            Open listing source
          </a>
        )}
      </div>
    </div>
  );
}
