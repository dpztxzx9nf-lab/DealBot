import { buildEbaySoldSearchUrl } from "./sources";

let cachedToken: { token: string; expires: number } | null = null;

export async function getEbayToken(): Promise<string | null> {
  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  if (cachedToken && cachedToken.expires > Date.now()) {
    return cachedToken.token;
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64"
  );
  const res = await fetch(
    "https://api.ebay.com/identity/v1/oauth2/token",
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope",
    }
  );

  if (!res.ok) return null;
  const data = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) return null;

  cachedToken = {
    token: data.access_token,
    expires: Date.now() + (data.expires_in ?? 7200) * 1000 - 60_000,
  };
  return cachedToken.token;
}

export interface EbayCompResult {
  medianPrice: number;
  count: number;
  activeCount: number;
  soldCount: number;
  source: "active" | "sold";
  sampleTitles: string[];
  searchUrl: string;
}

export async function fetchEbayActiveComps(
  query: string,
  limit = 20
): Promise<EbayCompResult | null> {
  const token = await getEbayToken();
  if (!token) return null;

  const params = new URLSearchParams({
    q: query.slice(0, 80),
    limit: String(limit),
    filter: "buyingOptions:{FIXED_PRICE}",
  });

  const res = await fetch(
    `https://api.ebay.com/buy/browse/v1/item_summary/search?${params}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-EBAY-C-ENDUSERCTX": "contextualLocation=country=US",
      },
      next: { revalidate: 3600 },
    }
  );

  if (!res.ok) return null;
  const json = (await res.json()) as {
    total?: number;
    itemSummaries?: { title?: string; price?: { value?: string } }[];
  };

  const prices =
    json.itemSummaries
      ?.map((i) => parseFloat(i.price?.value ?? "0"))
      .filter((p) => p > 0) ?? [];

  if (prices.length < 3) return null;

  prices.sort((a, b) => a - b);
  const mid = Math.floor(prices.length / 2);

  return {
    medianPrice: prices[mid],
    count: json.total ?? prices.length,
    activeCount: json.total ?? prices.length,
    soldCount: 0,
    source: "active",
    sampleTitles:
      json.itemSummaries?.slice(0, 3).map((i) => i.title ?? "") ?? [],
    searchUrl: buildEbaySoldSearchUrl(query),
  };
}

/** Enrich top deals with eBay comps (rate-limited). */
export async function enrichDealsWithEbay<T extends { itemName: string; estimatedResale: number; compSource: string; sellSpeed: string; confidence: string; sourceQuality?: string; notes?: string }>(
  deals: T[],
  maxLookups = 8
): Promise<T[]> {
  const out = [...deals];
  for (let i = 0; i < Math.min(maxLookups, out.length); i++) {
    const comp = await fetchEbayActiveComps(out[i].itemName);
    if (comp) {
      out[i] = {
        ...out[i],
        estimatedResale: Math.round(comp.medianPrice * 0.9),
        compSource: "ebay_active",
        sellSpeed: comp.activeCount >= 15 ? "FAST" : out[i].sellSpeed,
        confidence: comp.activeCount >= 8 ? "HIGH" : out[i].confidence,
        sourceQuality: "decent",
        notes: [
          out[i].notes,
          `Active eBay comps found. For stronger confidence, check sold comps: ${comp.searchUrl}`,
        ]
          .filter(Boolean)
          .join(" "),
      } as T;
    }
  }
  return out;
}
