import { NextRequest, NextResponse } from "next/server";
import { aggregateDeals } from "@/lib/feed-aggregator";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const zip = req.nextUrl.searchParams.get("zip")?.trim() ?? "";
  const radius = parseInt(req.nextUrl.searchParams.get("radius") ?? "25", 10);
  const debugRaw =
    req.nextUrl.searchParams.get("debugRaw") === "1" ||
    process.env.DEALBOT_DEBUG_RAW_FEED === "1" ||
    process.env.DEALBOT_DEBUG_RAW_FEED === "true";

  console.log("[api/deals/feed] request", { zip, radius, debugRaw });

  if (!/^\d{5}(-\d{4})?$/.test(zip)) {
    console.log("[api/deals/feed] rejected: invalid ZIP");
    return NextResponse.json(
      { error: "Valid 5-digit ZIP required" },
      { status: 400 }
    );
  }

  try {
    const result = await aggregateDeals(zip, radius, [], { debugRaw });
    console.log("[api/deals/feed] response", {
      deals: result.deals.length,
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
