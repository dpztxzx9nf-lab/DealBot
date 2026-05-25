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
import { enrichDeal, isSwipeEligibleDeal } from "@/lib/scoring";
import { clearStorage, saveDeals } from "@/lib/storage";
import type {
  Deal,
  DealInput,
  DealStatus,
  FeedMeta,
  FeedResponse,
  LocationPrefs,
  SourcingMode,
} from "@/lib/types";
import type { FeedDebugInfo } from "@/lib/feed-aggregator";

export interface FeedStatus {
  apiReachable: boolean | null;
  rawDealsFound: number;
  visibleCardsLoaded: number;
  sourcesSearched: { name: string; count: number; error?: string }[];
  sourceDiagnostics: FeedMeta["sources"];
  activeSources: number;
  inactiveSources: number;
  failedSources: number;
  acceptedProfitableLeads: number;
  lastSuccessfulScanTime: string | null;
  rejectedCount: number;
  topRejectionReasons: { reason: string; count: number }[];
  lastRefreshTime: string | null;
  lastError: string | null;
  lastFetchUrl: string | null;
}

export interface SearchExpansion {
  lowerProfitMinimum: boolean;
  lowerDiscountMinimum: boolean;
  includeOnlineOnly: boolean;
  includeWeakConfidence: boolean;
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
  pipelineDeals: Deal[];
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
  searchExpansion: SearchExpansion;
  sourceMode: SourcingMode;
  lastFeedMeta: FeedMeta | null;
  setSearchExpansion: (patch: Partial<SearchExpansion>) => void;
  setSourceMode: (mode: SourcingMode) => void;
  loadFeed: (override?: LocationPrefs) => Promise<void>;
  resetAppData: () => void;
  addDeal: (input: DealInput) => Deal;
  updateDeal: (id: string, patch: Partial<DealInput>) => void;
  setStatus: (id: string, status: DealStatus, extra?: Partial<Deal>) => void;
  deleteDeal: (id: string) => void;
}

const DealsContext = createContext<DealsContextValue | null>(null);

const DEFAULT_EXPANSION: SearchExpansion = {
  lowerProfitMinimum: false,
  lowerDiscountMinimum: false,
  includeOnlineOnly: false,
  includeWeakConfidence: false,
};

const FEED_URL = (
  zip: string,
  radius: number,
  expansion: SearchExpansion,
  mode: SourcingMode
) => {
  const params = new URLSearchParams({
    zip,
    radius: String(radius),
    mode,
    minProfit: expansion.lowerProfitMinimum ? "5" : "10",
    minDiscount: expansion.lowerDiscountMinimum ? "10" : "25",
  });
  if (expansion.includeOnlineOnly) params.set("includeOnlineOnly", "1");
  if (expansion.includeWeakConfidence) params.set("includeWeakConfidence", "1");
  return `/api/deals/feed?${params.toString()}`;
};

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
  const [searchExpansion, setSearchExpansionState] =
    useState<SearchExpansion>(DEFAULT_EXPANSION);
  const [sourceMode, setSourceModeState] = useState<SourcingMode>("hybrid");
  const [feedStatus, setFeedStatus] = useState<FeedStatus>({
    apiReachable: null,
    rawDealsFound: 0,
    visibleCardsLoaded: 0,
    sourcesSearched: [],
    sourceDiagnostics: [],
    activeSources: 0,
    inactiveSources: 0,
    failedSources: 0,
    acceptedProfitableLeads: 0,
    lastSuccessfulScanTime: null,
    rejectedCount: 0,
    topRejectionReasons: [],
    lastRefreshTime: null,
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
    const url = FEED_URL(loc.zip, loc.radiusMiles, searchExpansion, sourceMode);

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
      const topRejectionReasons = Object.entries(
        data.debug?.rejectedReasons ?? {}
      )
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 4);

      if (!res.ok) {
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }

      setLastFeedMeta(data.meta ?? null);
      setFeedStatus({
        apiReachable: true,
        rawDealsFound: rawCount,
        visibleCardsLoaded: incoming.length,
        sourcesSearched: data.debug?.sourcesSearched ?? data.meta?.sources ?? [],
        sourceDiagnostics:
          data.debug?.sourceDiagnostics ?? data.meta?.sources ?? [],
        activeSources: data.debug?.activeSources ?? 0,
        inactiveSources: data.debug?.inactiveSources ?? 0,
        failedSources: data.debug?.failedSources ?? 0,
        acceptedProfitableLeads:
          data.debug?.acceptedProfitableLeads ?? incoming.length,
        lastSuccessfulScanTime: data.debug?.lastSuccessfulScanTime ?? null,
        rejectedCount: data.debug?.rejectedCount ?? 0,
        topRejectionReasons,
        lastRefreshTime:
          data.debug?.lastRefreshTime ??
          data.meta?.fetchedAt ??
          new Date().toISOString(),
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
        sourcesSearched: [],
        sourceDiagnostics: [],
        activeSources: 0,
        inactiveSources: 0,
        failedSources: 0,
        acceptedProfitableLeads: 0,
        lastSuccessfulScanTime: null,
        rejectedCount: 0,
        topRejectionReasons: [],
        lastRefreshTime: new Date().toISOString(),
        lastError: msg,
        lastFetchUrl: url,
      });
    } finally {
      setFeedLoading(false);
    }
  }, [location, searchExpansion, sourceMode]);

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

  const setSearchExpansion = useCallback((patch: Partial<SearchExpansion>) => {
    setSearchExpansionState((prev) => ({ ...prev, ...patch }));
  }, []);

  const setSourceMode = useCallback((mode: SourcingMode) => {
    setSourceModeState(mode);
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
      const nextDeal: Deal = isSwipeEligibleDeal(deal)
        ? deal
        : { ...deal, status: "skipped" };
      setDeals((prev) => {
        const next = [...prev, nextDeal];
        saveDeals(next);
        return next;
      });
      return nextDeal;
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
        .sort((a, b) => {
          const profitDelta = b.netProfit - a.netProfit;
          if (Math.abs(profitDelta) >= 15) return profitDelta;
          const roiDelta = b.roiPercent - a.roiPercent;
          if (Math.abs(roiDelta) >= 20) return roiDelta;
          return b.score - a.score;
        }),
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
  const pipelineDeals = savedDeals;

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
    pipelineDeals,
    soldDeals,
    skippedCount,
    statusCounts,
    feedLoading,
    feedError,
    feedStatus,
    searchExpansion,
    sourceMode,
    lastFeedMeta,
    setSearchExpansion,
    setSourceMode,
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
