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

export interface AdresSonucu {
  il: string;
  ilce: string;
  mahalle: string;
}

interface NominatimAddress {
  province?: string;
  state?: string;
  town?: string;
  county?: string;
  city_district?: string;
  suburb?: string;
  quarter?: string;
  neighbourhood?: string;
  village?: string;
}

// Nominatim's Turkish addresses: il in `province`, ilçe in `town` (or
// `county`), and the mahalle as "… Mahallesi" in whichever of suburb /
// city_district / quarter carries it — or `village` for köyler.
function adresCoz(a: NominatimAddress): AdresSonucu {
  const adaylar = [a.suburb, a.city_district, a.quarter, a.neighbourhood].filter((v): v is string => !!v);
  const mahalle = adaylar.find((v) => /mahalle/i.test(v)) ?? a.village ?? adaylar[0] ?? "";
  return {
    il: a.province ?? a.state ?? "",
    ilce: a.town ?? a.county ?? "",
    mahalle: mahalle.replace(/\s+mahallesi$|\s+mahalle$|\s+mah\.?$/i, "").trim(),
  };
}

// GET ?lat=&lng= — reverse lookup, used to fill il / ilçe / mahalle from a
// point picked on the map.
async function tersAra(lat: number, lng: number) {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("zoom", "17");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("accept-language", "tr");
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Eksperix-EmsalHaritasi/1.0 (gayrimenkul degerleme)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return Response.json({ error: "Konum servisi yanıt vermedi." }, { status: 502 });
    const body = (await res.json()) as { address?: NominatimAddress };
    if (!body.address) return Response.json({ error: "Bu nokta için adres bulunamadı." }, { status: 404 });
    return Response.json({ adres: adresCoz(body.address) });
  } catch {
    return Response.json({ error: "Konum servisine ulaşılamadı." }, { status: 502 });
  }
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const lat = Number(params.get("lat"));
  const lng = Number(params.get("lng"));
  if (params.has("lat") && params.has("lng")) {
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return Response.json({ error: "Geçersiz koordinat." }, { status: 400 });
    }
    return tersAra(lat, lng);
  }

  const q = params.get("q")?.trim() ?? "";
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
