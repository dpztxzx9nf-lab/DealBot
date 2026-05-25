export const STRONG_BRANDS = [
  "apple",
  "airpods",
  "iphone",
  "ipad",
  "sony",
  "nintendo",
  "playstation",
  "xbox",
  "dyson",
  "ninja",
  "kitchenaid",
  "lego",
  "stanley",
  "yeti",
  "beats",
  "samsung",
  "google pixel",
  "bose",
  "nike",
  "adidas",
  "carhartt",
  "patagonia",
  "north face",
  "columbia",
  "makita",
  "dewalt",
  "milwaukee",
  "ridgid",
  "cuisinart",
  "instant pot",
  "roomba",
  "irobot",
  "shark",
  "vitamix",
  "keurig",
  "nespresso",
  "traeger",
  "weber",
  "garmin",
  "gopro",
  "meta quest",
  "oculus",
  "logitech",
  "razer",
  "corsair",
  "asus",
  "msi",
  "lenovo",
  "dell",
  "hp",
  "lg",
  "tcl",
  "hisense",
];

export const OVERSATURATED = [
  "hdmi cable",
  "phone case",
  "screen protector",
  "usb cable",
  "extension cord",
  "aa battery",
  "aaa battery",
];

export const STRONG_CATEGORIES = [
  "electronics",
  "gaming",
  "console",
  "headphone",
  "earbud",
  "speaker",
  "tv",
  "monitor",
  "gpu",
  "graphics card",
  "cpu",
  "processor",
  "ssd",
  "ram",
  "laptop",
  "tablet",
  "camera",
  "drone",
  "tool",
  "vacuum",
  "blender",
  "air fryer",
  "lego",
  "sneaker",
  "boot",
  "jacket",
  "cooler",
  "tumbler",
  "stroller",
  "car seat",
];

export function detectBrandTags(text: string): {
  strongBrand: boolean;
  oversaturated: boolean;
  compact: boolean;
  bulky: boolean;
} {
  const lower = text.toLowerCase();
  const strongBrand = STRONG_BRANDS.some((b) => lower.includes(b));
  const oversaturated = OVERSATURATED.some((b) => lower.includes(b));
  const bulky =
    /\b(tv|television|monitor|sofa|couch|mattress|dresser|desk|treadmill|washer|dryer|refrigerator|freezer)\b/i.test(
      lower
    );
  const compact =
    !bulky &&
    /\b(earbud|airpod|watch|game|controller|lego|tool|knife|flashlight|mouse|keyboard)\b/i.test(
      lower
    );
  return { strongBrand, oversaturated, compact, bulky };
}

export function matchesResaleCategory(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    STRONG_CATEGORIES.some((c) => lower.includes(c)) ||
    STRONG_BRANDS.some((b) => lower.includes(b))
  );
}
