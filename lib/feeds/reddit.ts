import type { RawFeedItem } from "../types";

const SUBREDDITS = [
  { sub: "deals", label: "r/deals" },
  { sub: "BuildAPCSales", label: "r/BuildAPCSales" },
  { sub: "frugalmalefashion", label: "r/frugalmalefashion" },
  { sub: "GameDeals", label: "r/GameDeals" },
];

interface RedditPost {
  data?: {
    id?: string;
    title?: string;
    selftext?: string;
    url?: string;
    permalink?: string;
    thumbnail?: string;
    preview?: { images?: { source?: { url?: string } }[] };
  };
}

export async function fetchRedditDeals(): Promise<{
  items: RawFeedItem[];
  error?: string;
}> {
  const items: RawFeedItem[] = [];
  const errors: string[] = [];

  await Promise.all(
    SUBREDDITS.map(async ({ sub, label }) => {
      try {
        const res = await fetch(
          `https://www.reddit.com/r/${sub}/hot.json?limit=20`,
          {
            headers: {
              "User-Agent": "DealBot/1.0 (personal resale aggregator)",
            },
            next: { revalidate: 300 },
          }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as { data?: { children?: RedditPost[] } };
        for (const child of json.data?.children ?? []) {
          const d = child.data;
          if (!d?.title || d.title.length < 10) continue;
          const thumb = d.preview?.images?.[0]?.source?.url?.replace(/&amp;/g, "&");
          const imageUrl =
            thumb && !thumb.includes("default") ? thumb : undefined;
          items.push({
            source: "reddit",
            sourceId: `rd-${d.id}`,
            title: d.title,
            description: (d.selftext ?? "").slice(0, 400),
            link: d.url?.startsWith("http")
              ? d.url
              : `https://www.reddit.com${d.permalink ?? ""}`,
            imageUrl,
            feedLabel: label,
          });
        }
      } catch (e) {
        errors.push(
          `${label}: ${e instanceof Error ? e.message : "fetch failed"}`
        );
      }
    })
  );

  return {
    items,
    error: errors.length ? errors.join("; ") : undefined,
  };
}
