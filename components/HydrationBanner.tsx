"use client";

import { useDeals } from "@/hooks/useDeals";

export function HydrationBanner() {
  const { hydrationError } = useDeals();

  if (!hydrationError) return null;

  return (
    <div
      role="alert"
      className="mx-4 mb-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2.5"
    >
      <p className="text-xs leading-relaxed text-amber-200/90">
        {hydrationError}
      </p>
    </div>
  );
}
