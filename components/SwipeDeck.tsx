"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { DealDetailsSheet } from "./DealDetailsSheet";
import { ImmersiveDealCard } from "./ImmersiveDealCard";
import { SwipeChrome } from "./SwipeChrome";
import { useDeals } from "@/hooks/useDeals";
import { hapticLight, hapticMedium } from "@/lib/haptics";
import type { Deal } from "@/lib/types";

const SWIPE_THRESHOLD = 88;
const PULL_TRIGGER = 78;
const PULL_MAX = 112;

export function SwipeDeck() {
  const {
    pendingDeals,
    setStatus,
    feedLoading,
    feedError,
    feedStatus,
    locationResolving,
    loadFeed,
    hydrated,
  } = useDeals();
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [pulling, setPulling] = useState(false);
  const [detailsDeal, setDetailsDeal] = useState<Deal | null>(null);
  const startX = useRef(0);
  const pullStartX = useRef(0);
  const pullStartY = useRef(0);
  const pullActive = useRef(false);
  const hapticFired = useRef<"none" | "skip" | "save">("none");
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const current = pendingDeals[0] ?? null;

  const resetDrag = useCallback(() => {
    setDragX(0);
    setDragging(false);
    hapticFired.current = "none";
  }, []);

  const runRefresh = useCallback(async () => {
    if (feedLoading) return;
    setExiting(false);
    setDetailsDeal(null);
    resetDrag();
    try {
      await loadFeed();
    } finally {
      pullActive.current = false;
      setPulling(false);
      setPullDistance(0);
    }
  }, [feedLoading, loadFeed, resetDrag]);

  useEffect(() => {
    return () => {
      if (exitTimer.current) {
        clearTimeout(exitTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!detailsDeal) return;
    const stillPending = pendingDeals.some((deal) => deal.id === detailsDeal.id);
    if (stillPending) return;

    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setDetailsDeal(null);
    });
    return () => {
      cancelled = true;
    };
  }, [detailsDeal, pendingDeals]);

  const commit = useCallback(
    (action: "skip" | "watch" | "pipeline") => {
      if (!current || exiting) return;

      hapticMedium();
      setExiting(true);
      setStatus(
        current.id,
        action === "pipeline"
          ? "bought"
          : action === "watch"
            ? "saved"
            : "skipped",
        action === "pipeline" ? { strongCandidate: true } : undefined
      );

      if (exitTimer.current) {
        clearTimeout(exitTimer.current);
      }
      exitTimer.current = setTimeout(() => {
        setExiting(false);
        resetDrag();
        exitTimer.current = null;
      }, 200);
    },
    [current, exiting, setStatus, resetDrag]
  );

  const onPointerDown = (e: React.PointerEvent) => {
    if (pulling) return;
    if (!current || (e.target as HTMLElement).closest("[data-no-drag]")) return;
    startX.current = e.clientX;
    setDragging(true);
    hapticFired.current = "none";
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (feedLoading || e.touches.length !== 1) return;
    const touch = e.touches[0];
    pullStartX.current = touch.clientX;
    pullStartY.current = touch.clientY;
    pullActive.current = false;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (feedLoading || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const y = touch.clientY - pullStartY.current;
    const x = touch.clientX - pullStartX.current;
    const absY = Math.abs(y);
    const absX = Math.abs(x);

    if (!pullActive.current) {
      if (y < 14 || absY < absX * 1.35) return;
      pullActive.current = true;
      setPulling(true);
      resetDrag();
    }

    const nextDistance = Math.min(PULL_MAX, Math.max(0, y * 0.55));
    setPullDistance(nextDistance);
  };

  const onTouchEnd = () => {
    if (!pullActive.current) return;
    if (pullDistance >= PULL_TRIGGER) {
      void runRefresh();
      return;
    }
    pullActive.current = false;
    setPulling(false);
    setPullDistance(0);
  };

  const onTouchCancel = () => {
    pullActive.current = false;
    setPulling(false);
    setPullDistance(0);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!current || !dragging) return;
    const x = e.clientX - startX.current;
    setDragX(x);

    if (x > SWIPE_THRESHOLD && hapticFired.current !== "save") {
      hapticFired.current = "save";
      hapticLight();
    } else if (x < -SWIPE_THRESHOLD && hapticFired.current !== "skip") {
      hapticFired.current = "skip";
      hapticLight();
    } else if (x > -SWIPE_THRESHOLD && x < SWIPE_THRESHOLD) {
      hapticFired.current = "none";
    }
  };

  const onPointerUp = () => {
    if (!current || !dragging) {
      resetDrag();
      return;
    }
    if (dragX > SWIPE_THRESHOLD) commit("pipeline");
    else if (dragX < -SWIPE_THRESHOLD) commit("skip");
    else resetDrag();
  };

  const rotate = dragX * 0.065;
  const liftY = -Math.abs(dragX) * 0.06;
  const scale = 1 - Math.min(Math.abs(dragX) / 900, 0.05);
  const skipOpacity = Math.min(Math.max(-dragX / SWIPE_THRESHOLD, 0), 1);
  const saveOpacity = Math.min(Math.max(dragX / SWIPE_THRESHOLD, 0), 1);
  const stackParallax = dragX * 0.04;
  const pullProgress = Math.min(pullDistance / PULL_TRIGGER, 1);
  const pullLabel = feedLoading
    ? "Refreshing deals..."
    : pullDistance >= PULL_TRIGGER
      ? "Release to refresh"
      : "Pull to refresh";
  const pullIndicator = (
    <div
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-14 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-zinc-950/85 px-3 py-2 text-xs font-medium text-zinc-200 shadow-lg backdrop-blur-md transition-opacity"
      style={{
        opacity: pullDistance > 4 || feedLoading ? 1 : 0,
        transform: `translateX(-50%) translateY(${Math.min(pullDistance, 64)}px) scale(${0.92 + pullProgress * 0.08})`,
      }}
    >
      <span
        className={`h-3 w-3 rounded-full border-2 border-zinc-500 border-t-emerald-400 ${
          feedLoading ? "animate-spin" : ""
        }`}
      />
      {pullLabel}
    </div>
  );

  if (!current) {
    return (
      <div
        className="relative flex min-h-0 flex-1 flex-col"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchCancel}
      >
        {pullIndicator}
        <SwipeChrome />
        <div
          data-no-drag
          className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-8 pb-6 text-center"
        >
          {!hydrated || feedLoading || locationResolving || !feedStatus.lastFetchUrl ? (
            <>
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-700 border-t-emerald-400" />
              <p className="text-sm text-zinc-400">Searching nearby deals...</p>
            </>
          ) : (
            <>
              <div className="max-w-xs space-y-2">
                <p className="text-xl font-semibold text-zinc-100">
                  No profitable leads found right now.
                </p>
                <p className="text-sm leading-relaxed text-zinc-500">
                  DealBot searched the current sources and kept unprofitable
                  or risky leads out of the queue. Refresh, expand the search,
                  or use Discover to check more sources.
                </p>
              </div>
              <div className="w-full max-w-xs rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3 text-left text-xs text-zinc-500">
                <div className="flex justify-between gap-2">
                  <span>Sources scanned</span>
                  <span className="text-zinc-200">
                    {
                      feedStatus.sourceDiagnostics.filter((source) => source.scanned)
                        .length
                    }
                  </span>
                </div>
                <div className="mt-1 flex justify-between gap-2">
                  <span>Items checked</span>
                  <span className="text-zinc-200">{feedStatus.rawDealsFound}</span>
                </div>
                <div className="mt-1 flex justify-between gap-2">
                  <span>Rejected</span>
                  <span className="text-zinc-200">{feedStatus.rejectedCount}</span>
                </div>
                {feedStatus.topRejectionReasons.length > 0 && (
                  <div className="mt-3 border-t border-zinc-800 pt-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
                      Why nothing passed
                    </p>
                    <ul className="mt-1 space-y-1">
                      {feedStatus.topRejectionReasons.slice(0, 3).map((item) => (
                        <li key={item.reason} className="flex justify-between gap-2">
                          <span className="truncate">{item.reason}</span>
                          <span className="text-zinc-300">{item.count}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <p className="mt-3 border-t border-zinc-800 pt-2 text-[11px] leading-relaxed text-zinc-600">
                  To expand results, try Hybrid mode, include online-only deals,
                  lower the profit minimum, or widen the ZIP radius in Discover.
                </p>
              </div>
              {feedError && (
                <p className="max-w-xs break-all text-xs text-red-400">
                  {feedError}
                </p>
              )}
              <button
                type="button"
                onClick={() => void runRefresh()}
                disabled={feedLoading}
                className="rounded-full bg-emerald-500 px-6 py-3 text-sm font-bold text-zinc-950 disabled:opacity-40"
              >
                Refresh Deals
              </button>
              <Link
                href="/discover"
                className="rounded-full border border-zinc-700 px-5 py-2.5 text-sm font-medium text-zinc-300"
              >
                Open Discover
              </Link>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative flex min-h-0 flex-1 flex-col"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchCancel}
    >
      {pullIndicator}
      <SwipeChrome />

      <div className="relative mx-3 mb-1 flex min-h-0 flex-1 flex-col justify-center">
        <div className="relative min-h-0 w-full max-h-[94%] flex-1 touch-none select-none">
          {[2, 1].map((stackIdx) => {
            const deal = pendingDeals[stackIdx];
            if (!deal) return null;

            return (
              <div
                key={deal.id}
                className="pointer-events-none absolute inset-0 transition-all duration-300 ease-out"
                style={{
                  transform: `scale(${1 - stackIdx * 0.04}) translateY(${stackIdx * 10}px) translateX(${stackParallax * (0.3 + stackIdx * 0.15)}px)`,
                  opacity: 0.35 + (1 - stackIdx) * 0.25,
                  zIndex: 10 - stackIdx,
                }}
              >
                <ImmersiveDealCard deal={deal} stackIndex={stackIdx} />
              </div>
            );
          })}

          <div
            className={`absolute inset-0 z-20 ${dragging ? "" : "swipe-card-snap-back"} ${exiting ? "opacity-0 transition-opacity duration-200" : ""}`}
            style={{
              transform: `translateX(${dragX}px) translateY(${liftY}px) rotate(${rotate}deg) scale(${scale})`,
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <div
              className="pointer-events-none absolute left-6 top-1/3 z-30 rounded-xl border-4 border-red-500 px-4 py-2 text-2xl font-black uppercase tracking-wider text-red-500"
              style={{
                opacity: skipOpacity,
                transform: `rotate(-12deg) scale(${0.88 + skipOpacity * 0.12})`,
              }}
            >
              Pass
            </div>
            <div
              className="pointer-events-none absolute right-6 top-1/3 z-30 rounded-xl border-4 border-emerald-400 px-4 py-2 text-2xl font-black uppercase tracking-wider text-emerald-400"
              style={{
                opacity: saveOpacity,
                transform: `rotate(12deg) scale(${0.88 + saveOpacity * 0.12})`,
              }}
            >
              Pipeline
            </div>

            <ImmersiveDealCard deal={current} stackIndex={0} />
          </div>
        </div>
      </div>

      <div
        data-no-drag
        className="safe-area-immersive-actions relative z-30 -mt-3 flex shrink-0 items-center justify-center gap-8 px-6 pb-1 pt-0"
      >
        <button
          type="button"
          onClick={() => commit("skip")}
          aria-label="Skip"
          disabled={!current || exiting}
          className="flex h-[3.75rem] w-[3.75rem] items-center justify-center rounded-full border-2 border-red-400/80 bg-zinc-950/80 text-2xl text-red-400 shadow-lg backdrop-blur-md transition-transform active:scale-90 disabled:opacity-40"
        >
          X
        </button>
        <button
          type="button"
          onClick={() => commit("watch")}
          aria-label="Watch"
          disabled={!current}
          className="flex h-14 w-14 items-center justify-center rounded-full border border-amber-400/60 bg-zinc-900/70 text-xs font-bold uppercase text-amber-300 backdrop-blur-md transition-transform active:scale-90 disabled:opacity-40"
        >
          Watch
        </button>
        <button
          type="button"
          onClick={() => commit("pipeline")}
          aria-label="Pipeline"
          disabled={!current || exiting}
          className="flex h-[4.25rem] w-[4.25rem] items-center justify-center rounded-full bg-emerald-400 text-3xl text-zinc-950 shadow-[0_0_28px_rgba(52,211,153,0.45)] transition-transform active:scale-90 disabled:opacity-40"
        >
          P
        </button>
      </div>

      <button
        type="button"
        data-no-drag
        onClick={() => setDetailsDeal(current)}
        disabled={!current}
        className="absolute bottom-[calc(5.4rem+env(safe-area-inset-bottom))] left-1/2 z-30 -translate-x-1/2 rounded-full border border-white/15 bg-zinc-950/70 px-3 py-1 text-xs text-white/80 backdrop-blur-md disabled:opacity-40"
      >
        Details
      </button>

      {detailsDeal && (
        <DealDetailsSheet deal={detailsDeal} onClose={() => setDetailsDeal(null)} />
      )}
    </div>
  );
}
