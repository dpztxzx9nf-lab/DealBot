import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Free reverse geocode via OpenStreetMap Nominatim (US ZIP). */
export async function GET(req: NextRequest) {
  const lat = req.nextUrl.searchParams.get("lat");
  const lng = req.nextUrl.searchParams.get("lng");

  if (!lat || !lng) {
    return NextResponse.json({ error: "lat and lng required" }, { status: 400 });
  }

  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("lat", lat);
    url.searchParams.set("lon", lng);
    url.searchParams.set("format", "json");
    url.searchParams.set("addressdetails", "1");

    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": "DealBot/1.0 (personal resale app)",
        Accept: "application/json",
      },
      next: { revalidate: 86400 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Geocode HTTP ${res.status}` },
        { status: 502 }
      );
    }

    const data = (await res.json()) as {
      address?: { postcode?: string };
    };

    const raw = data.address?.postcode ?? "";
    const zip = raw.match(/\d{5}/)?.[0] ?? null;

    if (!zip) {
      return NextResponse.json(
        { error: "No US ZIP found for coordinates" },
        { status: 404 }
      );
    }

    return NextResponse.json({ zip });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Geocode failed" },
      { status: 500 }
    );
  }
}
