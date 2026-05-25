/** Extract dollar amounts from deal titles/descriptions. */
export function extractPrices(text: string): number[] {
  const prices: number[] = [];
  const patterns = [
    /\$\s*([\d,]+(?:\.\d{1,2})?)/g,
    /([\d,]+(?:\.\d{1,2})?)\s*(?:USD|usd)/g,
  ];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const n = parseFloat(m[1].replace(/,/g, ""));
      if (n > 0 && n < 50000) prices.push(n);
    }
  }
  return [...new Set(prices)].sort((a, b) => a - b);
}

export function inferDealAndRetail(
  title: string,
  description?: string
): { dealPrice?: number; retailPrice?: number; discountPercent?: number } {
  const text = `${title} ${description ?? ""}`;
  const prices = extractPrices(text);

  const discountMatch = text.match(/(\d{1,2})\s*%/);
  const statedDiscount = discountMatch ? parseInt(discountMatch[1], 10) : undefined;

  const wasMatch = text.match(/(?:was|reg\.?|msrp|list)\s*\$?\s*([\d,]+(?:\.\d{1,2})?)/i);
  const nowMatch = text.match(/(?:now|only|sale|for)\s*\$?\s*([\d,]+(?:\.\d{1,2})?)/i);

  let retailPrice = wasMatch
    ? parseFloat(wasMatch[1].replace(/,/g, ""))
    : undefined;
  let dealPrice = nowMatch
    ? parseFloat(nowMatch[1].replace(/,/g, ""))
    : undefined;

  if (!dealPrice && prices.length >= 1) dealPrice = prices[0];
  if (!retailPrice && prices.length >= 2) retailPrice = prices[prices.length - 1];
  if (retailPrice && dealPrice && retailPrice < dealPrice) {
    [retailPrice, dealPrice] = [dealPrice, retailPrice];
  }

  let discountPercent = statedDiscount;
  if (
    retailPrice &&
    dealPrice &&
    retailPrice > dealPrice &&
    (!discountPercent || discountPercent < 5)
  ) {
    discountPercent = Math.round(((retailPrice - dealPrice) / retailPrice) * 100);
  }

  return { dealPrice, retailPrice, discountPercent };
}

export function extractStore(text: string): string | undefined {
  const stores = [
    "Amazon",
    "Walmart",
    "Target",
    "Best Buy",
    "Home Depot",
    "Lowe's",
    "Costco",
    "Sam's Club",
    "Kohl's",
    "Macy's",
    "Nike",
    "Adidas",
    "GameStop",
    "BJ's",
    "Meijer",
    "CVS",
    "Walgreens",
    "Staples",
    "Office Depot",
    "Newegg",
    "B&H",
  ];
  const lower = text.toLowerCase();
  for (const s of stores) {
    if (lower.includes(s.toLowerCase())) return s;
  }
  const atMatch = text.match(/\bat\s+([A-Za-z0-9&'.\s]{2,30})/i);
  if (atMatch) return atMatch[1].trim().slice(0, 40);
  return undefined;
}
