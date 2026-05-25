import type { LocationPrefs } from "./types";

export const LOCATION_KEY = "dealbot:location:v1";

export const BOOT_LOCATION: LocationPrefs = {
  zip: "80503",
  radiusMiles: 25,
};

const DEFAULT: LocationPrefs = { zip: "", radiusMiles: 25 };

export function hasStoredLocation(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(LOCATION_KEY) != null;
  } catch {
    return false;
  }
}

export function loadLocation(): LocationPrefs {
  if (typeof window === "undefined") return BOOT_LOCATION;
  try {
    const raw = localStorage.getItem(LOCATION_KEY);
    if (!raw) return BOOT_LOCATION;
    const parsed = JSON.parse(raw) as LocationPrefs;
    return {
      zip: String(parsed.zip ?? "").trim() || BOOT_LOCATION.zip,
      radiusMiles: Number(parsed.radiusMiles) || BOOT_LOCATION.radiusMiles,
    };
  } catch {
    return BOOT_LOCATION;
  }
}

export function saveLocation(prefs: LocationPrefs): boolean {
  if (typeof window === "undefined") return false;
  try {
    localStorage.setItem(LOCATION_KEY, JSON.stringify(prefs));
    return true;
  } catch {
    return false;
  }
}

export function clearLocation(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(LOCATION_KEY);
  } catch {
    /* ignore */
  }
}

export function isValidZip(zip: string): boolean {
  return /^\d{5}(-\d{4})?$/.test(zip.trim());
}
