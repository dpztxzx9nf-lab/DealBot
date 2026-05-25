import type { RawFeedItem } from "../types";

const RSS_URLS = [
  "https://slickdeals.net/newsearch.php?mode=frontpage&searcharea=deals&searchin=first&rss=1",
  "https://slickdeals.net/newsearch.php?searcharea=deals&searchin=first&q=clearance&rss=1",
];

function parseRssItems(xml: string, feedLabel: string): RawFeedItem[] {
  const items: RawFeedItem[] = [];
  const blocks = xml.match(/<item>[\s\S]*?<\/item>/gi) ?? [];

  for (const block of blocks.slice(0, 40)) {
    const title = unescapeXml(block.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i)?.[1] ?? "");
    const link = block.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i)?.[1]?.trim();
    const desc = unescapeXml(
      block.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i)?.[1] ?? ""
    );
    const guid = block.match(/<guid[^>]*>([\s\S]*?)<\/guid>/i)?.[1]?.trim() ?? link ?? title;

    if (!title || title.length < 8) continue;

    items.push({
      source: "slickdeals",
      sourceId: `sd-${hash(guid)}`,
      title: stripHtml(title),
      description: stripHtml(desc).slice(0, 500),
      link,
      feedLabel,
    });
  }
  return items;
}

function unescapeXml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function hash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

export async function fetchSlickdeals(): Promise<{
  items: RawFeedItem[];
  error?: string;
}> {
  const items: RawFeedItem[] = [];
  const errors: string[] = [];

  await Promise.all(
    RSS_URLS.map(async (url, i) => {
      try {
        const res = await fetch(url, {
          headers: { "User-Agent": "DealBot/1.0 (personal resale aggregator)" },
          next: { revalidate: 300 },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const xml = await res.text();
        items.push(...parseRssItems(xml, i === 0 ? "Slickdeals Frontpage" : "Slickdeals Clearance"));
      } catch (e) {
        errors.push(e instanceof Error ? e.message : "Slickdeals fetch failed");
      }
    })
  );

  return {
    items,
    error: errors.length ? errors.join("; ") : undefined,
  };
}
