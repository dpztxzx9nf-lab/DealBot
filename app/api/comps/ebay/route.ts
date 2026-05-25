import { NextRequest, NextResponse } from "next/server";
import { fetchEbayActiveComps } from "@/lib/ebay";
import { buildEbaySoldSearchUrl } from "@/lib/sources";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ error: "Query required" }, { status: 400 });
  }

  const comp = await fetchEbayActiveComps(q);
  const soldSearchUrl = buildEbaySoldSearchUrl(q);
  if (!comp) {
    return NextResponse.json(
      {
        error:
          process.env.EBAY_CLIENT_ID
            ? "No active comps found"
            : "eBay API not configured (set EBAY_CLIENT_ID and EBAY_CLIENT_SECRET)",
        soldSearchUrl,
      },
      { status: 404 }
    );
  }

  return NextResponse.json({
    ...comp,
    soldSearchUrl,
    label: "eBay active listings (median); verify sold comps before buying",
  });
}
