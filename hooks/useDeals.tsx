"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { hydrateDeals, reconcileFeedMerge } from "@/lib/hydrate";
import { ensureSourceId } from "@/lib/deal-keys";
import { detectZipFromBrowser } from "@/lib/geolocation";
import {
  BOOT_LOCATION,
  clearLocation,
  hasStoredLocation,
  loadLocation,
  saveLocation,
} from "@/lib/location";
import { enrichDeal } from "@/lib/scoring";
import { clearStorage, saveDeals } from "@/lib/storage";
import type {
  Deal,
  DealInput,
  DealStatus,
  FeedMeta,
  FeedResponse,
  LocationPrefs,
} from "@/lib/types";
import type { FeedDebugInfo } from "@/lib/feed-aggregator";

export interface FeedStatus {
  apiReachable: boolean | null;
  rawDealsFound: number;
  visibleCardsLoaded: number;
  lastError: string | null;
  lastFetchUrl: string | null;
}

interface DealsContextValue {
  hydrated: boolean;
  hydrationError: string | null;
  location: LocationPrefs;
  locationNote: string | null;
  locationResolving: boolean;
  setLocation: (prefs: LocationPrefs) => void;
  deals: Deal[];
  pendingDeals: Deal[];
  savedDeals: Deal[];
  soldDeals: Deal[];
  skippedCount: number;
  statusCounts: {
    pending: number;
    saved: number;
    sold: number;
    skipped: number;
  };
  feedLoading: boolean;
  feedError: string | null;
  feedStatus: FeedStatus;
  lastFeedMeta: FeedMeta | null;
  loadFeed: (override?: LocationPrefs) => Promise<void>;
  resetAppData: () => void;
  addDeal: (input: DealInput) => Deal;
  updateDeal: (id: string, patch: Partial<DealInput>) => void;
  setStatus: (id: string, status: DealStatus, extra?: Partial<Deal>) => void;
  deleteDeal: (id: string) => void;
}

const DealsContext = createContext<DealsContextValue | null>(null);

const FEED_URL = (zip: string, radius: number) =>
  `/api/deals/feed?zip=${encodeURIComponent(zip)}&radius=${radius}&debugRaw=1`;

function newId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `deal-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function DealsProvider({ children }: { children: React.ReactNode }) {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [hydrationError, setHydrationError] = useState<string | null>(null);
  const [location, setLocationState] = useState<LocationPrefs>(BOOT_LOCATION);
  const [locationNote, setLocationNote] = useState<string | null>(null);
  const [locationResolving, setLocationResolving] = useState(false);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [lastFeedMeta, setLastFeedMeta] = useState<FeedMeta | null>(null);
  const [feedStatus, setFeedStatus] = useState<FeedStatus>({
    apiReachable: null,
    rawDealsFound: 0,
    visibleCardsLoaded: 0,
    lastError: null,
    lastFetchUrl: null,
  });
  const bootFetched = useRef(false);

  const runHydration = useCallback(() => {
    try {
      const result = hydrateDeals();
      setDeals(result.deals);
      setHydrationError(result.error);
      setLocationState(loadLocation());
    } catch {
      setDeals([]);
      setHydrationError("Could not load saved deals.");
      setLocationState(BOOT_LOCATION);
    }
    setHydrated(true);
  }, []);

  useLayoutEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) runHydration();
    });
    return () => {
      cancelled = true;
    };
  }, [runHydration]);

  const loadFeed = useCallback(async (override?: LocationPrefs) => {
    const loc = override ?? location;
    const url = FEED_URL(loc.zip, loc.radiusMiles);

    setFeedLoading(true);
    setFeedError(null);
    setFeedStatus((s) => ({
      ...s,
      lastFetchUrl: url,
      lastError: null,
    }));

    try {
      const res = await fetch(url);
      let data: FeedResponse & {
        error?: string;
        debug?: FeedDebugInfo;
      };

      try {
        data = await res.json();
      } catch (parseErr) {
        const msg =
          parseErr instanceof Error
            ? `Bad JSON: ${parseErr.message}`
            : "Bad JSON response (wrong server/port?)";
        throw new Error(msg);
      }

      const incoming = Array.isArray(data.deals) ? data.deals : [];
      const rawCount =
        data.debug?.totalRawCount ?? data.meta?.filtered ?? incoming.length;

      if (!res.ok) {
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }

      setLastFeedMeta(data.meta ?? null);
      setFeedStatus({
        apiReachable: true,
        rawDealsFound: rawCount,
        visibleCardsLoaded: incoming.length,
        lastError: data.errors?.length ? data.errors.join(" · ") : null,
        lastFetchUrl: url,
      });

      if (data.errors?.length) {
        setFeedError(data.errors.join(" · "));
      } else {
        setFeedError(null);
      }

      setDeals((prev) => {
        const next = reconcileFeedMerge(prev, incoming);
        saveDeals(next);
        const pending = next.filter((d) => d.status === "pending").length;
        setFeedStatus((s) => ({
          ...s,
          visibleCardsLoaded: pending,
        }));
        console.log("[DealBot] feed merged", {
          incoming: incoming.length,
          pending,
          saved: next.filter((d) => d.status === "saved" || d.status === "bought")
            .length,
          skipped: next.filter((d) => d.status === "skipped").length,
          sold: next.filter((d) => d.status === "sold").length,
        });
        return next;
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load deals";
      setFeedError(msg);
      setFeedStatus({
        apiReachable: false,
        rawDealsFound: 0,
        visibleCardsLoaded: 0,
        lastError: msg,
        lastFetchUrl: url,
      });
    } finally {
      setFeedLoading(false);
    }
  }, [location]);

  useEffect(() => {
    if (!hydrated || bootFetched.current) return;
    bootFetched.current = true;

    (async () => {
      setLocationResolving(true);
      const stored = loadLocation();
      let prefs: LocationPrefs = {
        zip: stored.zip,
        radiusMiles: stored.radiusMiles || 25,
      };
      let note = "";

      const geo = await detectZipFromBrowser();
      if (geo.zip) {
        prefs = { zip: geo.zip, radiusMiles: prefs.radiusMiles };
        saveLocation(prefs);
        setLocationState(prefs);
        note = `Deals near ${geo.zip} (your location)`;
      } else if (hasStoredLocation()) {
        setLocationState(prefs);
        note = `Deals near ${prefs.zip} (saved ZIP)`;
      } else {
        prefs = { ...BOOT_LOCATION };
        saveLocation(prefs);
        setLocationState(prefs);
        note = `Deals near ${prefs.zip} (default)`;
      }

      setLocationNote(note);
      setLocationResolving(false);
      void loadFeed(prefs);
    })();
  }, [hydrated, loadFeed]);

  const setLocation = useCallback((prefs: LocationPrefs) => {
    setLocationState(prefs);
    saveLocation(prefs);
    setLocationNote(`Deals near ${prefs.zip}`);
  }, []);

  const resetAppData = useCallback(() => {
    clearStorage();
    clearLocation();
    if (typeof window !== "undefined") {
      window.localStorage.clear();
      window.location.reload();
    }
  }, []);

  const addDeal = useCallback(
    (input: DealInput): Deal => {
      const withKey = ensureSourceId({
        ...input,
        id: "pending",
        source: input.source ?? "pasted",
      });
      const deal = enrichDeal({
        ...withKey,
        id: newId(),
        createdAt: new Date().toISOString(),
        status: "pending",
      });
      setDeals((prev) => {
        const next = [...prev, deal];
        saveDeals(next);
        return next;
      });
      return deal;
    },
    []
  );

  const updateDeal = useCallback((id: string, patch: Partial<DealInput>) => {
    setDeals((prev) => {
      const next = prev.map((d) => {
        if (d.id !== id) return d;
        return enrichDeal({ ...d, ...patch });
      });
      saveDeals(next);
      return next;
    });
  }, []);

  const setStatus = useCallback(
    (id: string, status: DealStatus, extra?: Partial<Deal>) => {
      setDeals((prev) => {
        const next = prev.map((d) => {
          if (d.id !== id) return d;
          const updated = enrichDeal({ ...d, ...extra, status });
          if (status === "sold" && !updated.soldAt) {
            updated.soldAt = new Date().toISOString();
          }
          return updated;
        });
        saveDeals(next);
        return next;
      });
    },
    []
  );

  const deleteDeal = useCallback((id: string) => {
    setDeals((prev) => {
      const next = prev.filter((d) => d.id !== id);
      saveDeals(next);
      return next;
    });
  }, []);

  const pendingDeals = useMemo(
    () =>
      deals
        .filter((d) => d.status === "pending")
        .sort((a, b) => b.score - a.score),
    [deals]
  );

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setFeedStatus((s) => ({
        ...s,
        visibleCardsLoaded: pendingDeals.length,
      }));
    });
    return () => {
      cancelled = true;
    };
  }, [pendingDeals.length]);

  const savedDeals = useMemo(
    () =>
      deals
        .filter((d) => d.status === "saved" || d.status === "bought")
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
    [deals]
  );

  const soldDeals = useMemo(
    () =>
      deals
        .filter((d) => d.status === "sold")
        .sort(
          (a, b) =>
            new Date(b.soldAt ?? b.createdAt).getTime() -
            new Date(a.soldAt ?? a.createdAt).getTime()
        ),
    [deals]
  );

  const skippedCount = useMemo(
    () => deals.filter((d) => d.status === "skipped").length,
    [deals]
  );

  const statusCounts = useMemo(
    () => ({
      pending: deals.filter((d) => d.status === "pending").length,
      saved: deals.filter(
        (d) => d.status === "saved" || d.status === "bought"
      ).length,
      sold: deals.filter((d) => d.status === "sold").length,
      skipped: deals.filter((d) => d.status === "skipped").length,
    }),
    [deals]
  );

  const value: DealsContextValue = {
    hydrated,
    hydrationError,
    location,
    locationNote,
    locationResolving,
    setLocation,
    deals,
    pendingDeals,
    savedDeals,
    soldDeals,
    skippedCount,
    statusCounts,
    feedLoading,
    feedError,
    feedStatus,
    lastFeedMeta,
    loadFeed,
    resetAppData,
    addDeal,
    updateDeal,
    setStatus,
    deleteDeal,
  };

  return (
    <DealsContext.Provider value={value}>{children}</DealsContext.Provider>
  );
}

export function useDeals(): DealsContextValue {
  const ctx = useContext(DealsContext);
  if (!ctx) throw new Error("useDeals must be used within DealsProvider");
  return ctx;
}
