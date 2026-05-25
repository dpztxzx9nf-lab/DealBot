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
            <dt>Buy / sold comp</dt>
            <dd>
              {formatMoney(deal.clearancePrice)} to{" "}
              {formatMoney(deal.estimatedResale)}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt>Estimated fees</dt>
            <dd>{formatMoney(deal.estimatedFees)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Net profit</dt>
            <dd className="text-emerald-400">
              {formatMoney(deal.estimatedProfit)}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt>Source quality</dt>
            <dd>{deal.sourceQuality}</dd>
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
