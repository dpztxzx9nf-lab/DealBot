import { NextRequest, NextResponse } from "next/server";
import { buildDealFromLead } from "@/lib/feeds/ingest";
import { filterFeedItems } from "@/lib/feeds/filter";
import { inferDealAndRetail } from "@/lib/feeds/parse-prices";
import type { RawFeedItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    url?: string;
    title?: string;
    zip?: string;
  };

  const url = body.url?.trim();
  const zip = body.zip?.trim() ?? "00000";
  if (!url || !url.startsWith("http")) {
    return NextResponse.json({ error: "Valid URL required" }, { status: 400 });
  }

  let title = body.title?.trim() ?? "";
  if (!title) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "DealBot/1.0" },
        signal: AbortSignal.timeout(8000),
      });
      const html = await res.text();
      const ogTitle = html.match(
        /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i
      )?.[1];
      const pageTitle = html.match(/<title>([^<]+)<\/title>/i)?.[1];
      title = (ogTitle ?? pageTitle ?? url).trim();
    } catch {
      title = url;
    }
  }

  const item: RawFeedItem = {
    source: "pasted",
    sourceId: `paste-${hash(url)}`,
    title,
    link: url,
    feedLabel: "Pasted URL",
  };

  let filtered = filterFeedItems([item]);
  if (filtered.length === 0) {
    const { dealPrice, retailPrice, discountPercent } = inferDealAndRetail(title);
    const price = dealPrice ?? 20;
    filtered = [
      {
        ...item,
        dealPrice: price,
        retailPrice: retailPrice ?? price * 2,
        discountPercent: discountPercent ?? 50,
      },
    ];
  }

  const deals = filtered.map((lead) => buildDealFromLead(lead, zip));
  return NextResponse.json({ deals });
}

function hash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}
