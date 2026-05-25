import { NextRequest, NextResponse } from "next/server";
import { aggregateDeals } from "@/lib/feed-aggregator";
import type { SourcingMode } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const zip = req.nextUrl.searchParams.get("zip")?.trim() ?? "";
  const radius = parseInt(req.nextUrl.searchParams.get("radius") ?? "25", 10);
  const rawMode = req.nextUrl.searchParams.get("mode");
  const mode: SourcingMode =
    rawMode === "nearby" || rawMode === "online" || rawMode === "hybrid"
      ? rawMode
      : "hybrid";
  const minProfit = parseFloat(req.nextUrl.searchParams.get("minProfit") ?? "10");
  const minDiscount = parseFloat(req.nextUrl.searchParams.get("minDiscount") ?? "25");
  const includeOnlineOnly =
    req.nextUrl.searchParams.get("includeOnlineOnly") === "1";
  const includeWeakConfidence =
    req.nextUrl.searchParams.get("includeWeakConfidence") === "1";
  const debugRaw =
    req.nextUrl.searchParams.get("debugRaw") === "1" ||
    process.env.DEALBOT_DEBUG_RAW_FEED === "1" ||
    process.env.DEALBOT_DEBUG_RAW_FEED === "true";

  console.log("[api/deals/feed] request", {
    mode,
    zip,
    radius,
    debugRaw,
    minProfit,
    minDiscount,
    includeOnlineOnly,
    includeWeakConfidence,
  });

  if (!/^\d{5}(-\d{4})?$/.test(zip)) {
    console.log("[api/deals/feed] rejected: invalid ZIP");
    return NextResponse.json(
      { error: "Valid 5-digit ZIP required" },
      { status: 400 }
    );
  }

  try {
    const result = await aggregateDeals(zip, radius, [], {
      debugRaw,
      mode,
      minProfit: Number.isFinite(minProfit) ? minProfit : 10,
      minDiscount: Number.isFinite(minDiscount) ? minDiscount : 25,
      includeOnlineOnly,
      includeWeakConfidence,
    });
    console.log("[api/deals/feed] response", {
      mode,
      zip,
      radius,
      deals: result.deals.length,
      fetchedCount: result.debug?.totalRawCount,
      rejectedCount: result.debug?.rejectedCount,
      acceptedCount: result.debug?.acceptedProfitableLeads,
      rejectionBuckets: result.debug?.rejectedReasons,
      rejectionDistribution: result.debug?.rejectionBuckets,
      acceptedCounts: result.debug?.acceptedCounts,
      sourceContributionRates: result.debug?.sourceContributionRates,
      sourceFailures: result.debug?.sourceDiagnostics
        .filter(
          (source) => source.error && source.scanned && source.error !== "enrichment only"
        )
        .map((source) => ({ name: source.name, error: source.error })),
      debug: result.debug,
      errors: result.errors,
    });
    return NextResponse.json(result);
  } catch (e) {
    console.error("[api/deals/feed] error", e);
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Feed aggregation failed",
        deals: [],
        meta: null,
        errors: [],
      },
      { status: 500 }
    );
  }
}
