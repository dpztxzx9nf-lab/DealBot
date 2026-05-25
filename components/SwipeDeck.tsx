"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { ImmersiveDealCard } from "./ImmersiveDealCard";
import { SwipeChrome } from "./SwipeChrome";
import { DealDetailsSheet } from "./DealDetailsSheet";
import { useDeals } from "@/hooks/useDeals";
import { hapticLight, hapticMedium } from "@/lib/haptics";

const SWIPE_THRESHOLD = 88;

export function SwipeDeck() {
  const { pendingDeals, setStatus, feedLoading, feedError } = useDeals();
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [detailsDeal, setDetailsDeal] = useState<(typeof pendingDeals)[0] | null>(
    null
  );
  const startX = useRef(0);
  const hapticFired = useRef<"none" | "skip" | "save">("none");
  const current = pendingDeals[0];

  const resetDrag = useCallback(() => {
    setDragX(0);
    setDragging(false);
    hapticFired.current = "none";
  }, []);

  const commit = useCallback(
    (action: "skip" | "save") => {
      if (!current || exiting) return;
      hapticMedium();
      setExiting(true);
      setStatus(
        current.id,
        action === "save" ? "saved" : "skipped",
        action === "save" ? { strongCandidate: true } : undefined
      );
      window.setTimeout(() => {
        setExiting(false);
        resetDrag();
      }, 200);
    },
    [current, exiting, setStatus, resetDrag]
  );

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("[data-no-drag]")) return;
    startX.current = e.clientX;
    setDragging(true);
    hapticFired.current = "none";
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
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
    if (!dragging) return;
    if (dragX > SWIPE_THRESHOLD) commit("save");
    else if (dragX < -SWIPE_THRESHOLD) commit("skip");
    else resetDrag();
  };

  const rotate = dragX * 0.065;
  const liftY = -Math.abs(dragX) * 0.06;
  const scale = 1 - Math.min(Math.abs(dragX) / 900, 0.05);
  const skipOpacity = Math.min(Math.max(-dragX / SWIPE_THRESHOLD, 0), 1);
  const saveOpacity = Math.min(Math.max(dragX / SWIPE_THRESHOLD, 0), 1);
  const stackParallax = dragX * 0.04;

  if (!current) {
    return (
      <div className="relative flex flex-1 flex-col">
        <SwipeChrome />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
          {feedLoading ? (
            <>
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-700 border-t-emerald-400" />
              <p className="text-sm text-zinc-400">Scanning deals near you…</p>
            </>
          ) : (
            <>
              <p className="text-lg font-medium text-zinc-200">Queue empty</p>
              {feedError && (
                <p className="max-w-xs break-all text-xs text-red-400">{feedError}</p>
              )}
              <Link
                href="/discover"
                className="rounded-full bg-emerald-500 px-6 py-3 text-sm font-bold text-zinc-950"
              >
                Refresh deals
              </Link>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <SwipeChrome />

      <div className="relative mx-3 mb-1 flex min-h-0 flex-1 flex-col justify-center">
        <div className="relative min-h-0 w-full max-h-[94%] flex-1 touch-none select-none">
          {[2, 1].map(
            (stackIdx) =>
              pendingDeals[stackIdx] && (
                <div
                  key={pendingDeals[stackIdx].id}
                  className="pointer-events-none absolute inset-0 transition-all duration-300 ease-out"
                  style={{
                    transform: `scale(${1 - stackIdx * 0.04}) translateY(${stackIdx * 10}px) translateX(${stackParallax * (0.3 + stackIdx * 0.15)}px)`,
                    opacity: 0.35 + (1 - stackIdx) * 0.25,
                    zIndex: 10 - stackIdx,
                  }}
                >
                  <ImmersiveDealCard deal={pendingDeals[stackIdx]} stackIndex={stackIdx} />
                </div>
              )
          )}

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
              Save
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
          className="flex h-[3.75rem] w-[3.75rem] items-center justify-center rounded-full border-2 border-red-400/80 bg-zinc-950/80 text-2xl text-red-400 shadow-lg backdrop-blur-md transition-transform active:scale-90"
        >
          ✕
        </button>
        <button
          type="button"
          onClick={() => setDetailsDeal(current)}
          aria-label="Details"
          className="flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-zinc-900/70 text-lg text-white/90 backdrop-blur-md transition-transform active:scale-90"
        >
          i
        </button>
        <button
          type="button"
          onClick={() => commit("save")}
          aria-label="Save"
          className="flex h-[4.25rem] w-[4.25rem] items-center justify-center rounded-full bg-emerald-400 text-3xl text-zinc-950 shadow-[0_0_28px_rgba(52,211,153,0.45)] transition-transform active:scale-90"
        >
          ♥
        </button>
      </div>

      {detailsDeal && (
        <DealDetailsSheet deal={detailsDeal} onClose={() => setDetailsDeal(null)} />
      )}
    </div>
  );
}
