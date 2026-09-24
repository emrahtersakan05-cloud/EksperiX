// Address / place search for the Emsal Haritası, proxied to OpenStreetMap
// Nominatim so the request carries an identifying User-Agent (required by its
// usage policy). The client only calls this on an explicit submit — the policy
// forbids search-as-you-type autocomplete.

export interface KonumSonucu {
  ad: string;
  lat: number;
  lng: number;
  tur: string;
}

interface NominatimItem {
  display_name?: string;
  lat?: string;
  lon?: string;
  type?: string;
  addresstype?: string;
}

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 3) {
    return Response.json({ error: "En az 3 karakter girin." }, { status: 400 });
  }
  if (q.length > 200) {
    return Response.json({ error: "Arama metni çok uzun." }, { status: 400 });
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("countrycodes", "tr");
  url.searchParams.set("limit", "6");
  url.searchParams.set("accept-language", "tr");

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Eksperix-EmsalHaritasi/1.0 (gayrimenkul degerleme)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      return Response.json({ error: "Konum servisi yanıt vermedi." }, { status: 502 });
    }
    const items = (await res.json()) as NominatimItem[];
    const sonuclar: KonumSonucu[] = items
      .map((item) => ({
        ad: item.display_name ?? "",
        lat: Number(item.lat),
        lng: Number(item.lon),
        tur: item.addresstype ?? item.type ?? "",
      }))
      .filter((s) => s.ad && Number.isFinite(s.lat) && Number.isFinite(s.lng));
    return Response.json({ sonuclar });
  } catch {
    return Response.json({ error: "Konum servisine ulaşılamadı." }, { status: 502 });
  }
}
