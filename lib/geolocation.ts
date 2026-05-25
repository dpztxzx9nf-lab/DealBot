import { isValidZip } from "./location";

export function getCurrentPosition(
  timeoutMs = 10_000
): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
      return;
    }

    const timer = window.setTimeout(
      () => reject(new Error("Geolocation timed out")),
      timeoutMs
    );

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        window.clearTimeout(timer);
        resolve(pos);
      },
      (err) => {
        window.clearTimeout(timer);
        reject(err);
      },
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 300_000 }
    );
  });
}

export async function reverseGeocodeZip(
  lat: number,
  lng: number
): Promise<string | null> {
  const res = await fetch(
    `/api/geocode?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`
  );
  const data = (await res.json()) as { zip?: string; error?: string };
  if (!res.ok || !data.zip) return null;
  return isValidZip(data.zip) ? data.zip : null;
}

export async function detectZipFromBrowser(): Promise<{
  zip: string | null;
  source: "geo" | "failed";
}> {
  try {
    const pos = await getCurrentPosition();
    const zip = await reverseGeocodeZip(
      pos.coords.latitude,
      pos.coords.longitude
    );
    return { zip, source: zip ? "geo" : "failed" };
  } catch {
    return { zip: null, source: "failed" };
  }
}
