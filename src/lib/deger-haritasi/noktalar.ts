import { oneCikanSonuc } from "@/lib/talep/deger-hesaplama";
import type { HesapYontemi, Talep, Tapu } from "@/lib/talep/types";

// One appraised property on the Değer Haritası: a tapu with a location and,
// when calculated, the value its report puts forward.
export interface DegerNoktasi {
  talep: Talep;
  tapu: Tapu;
  lat: number;
  lng: number;
  deger: number | null;
  birim: number | null;
  yontem: HesapYontemi | null;
  il: string;
  ilce: string;
  mahalle: string;
  nitelik: string;
  durum: string;
}

export type BirimSeviye = "dusuk" | "orta" | "yuksek" | "yok";

export const SEVIYE_RENK: Record<BirimSeviye, string> = {
  dusuk: "#0284c7",
  orta: "#65a30d",
  yuksek: "#dc2626",
  yok: "#94a3b8",
};

// Coordinates are decimal degrees ("41,0082" or "41.008"); parseTrNumber
// would read "41.008" as forty-one thousand.
function derece(value: string): number | null {
  const s = value.trim().replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  return Number(s);
}

function koordinat(tapu: Tapu): { lat: number; lng: number } | null {
  const a = tapu.adresKonum;
  const lat = derece(a.enlem);
  const lng = derece(a.boylam);
  if (lat !== null && lng !== null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && (lat !== 0 || lng !== 0)) {
    return { lat, lng };
  }
  const kml = a.kmlKonumlari.find((k) => Number.isFinite(k.latitude) && Number.isFinite(k.longitude));
  return kml ? { lat: kml.latitude, lng: kml.longitude } : null;
}

// Splits every tapu into those that can go on the map and those missing a
// location (listed separately so the user can fill them in).
export function degerNoktalari(talepler: Talep[]): { noktalar: DegerNoktasi[]; konumsuz: { talep: Talep; tapu: Tapu }[] } {
  const noktalar: DegerNoktasi[] = [];
  const konumsuz: { talep: Talep; tapu: Tapu }[] = [];
  for (const talep of talepler) {
    for (const tapu of talep.tapular) {
      const k = koordinat(tapu);
      if (!k) {
        konumsuz.push({ talep, tapu });
        continue;
      }
      const s = oneCikanSonuc(tapu.degerleme.hesaplamalar);
      const a = tapu.adresKonum;
      noktalar.push({
        talep,
        tapu,
        ...k,
        deger: s.deger,
        birim: s.birim,
        yontem: s.yontem,
        il: a.il || tapu.tapuKaydi.il || "",
        ilce: a.ilce || tapu.tapuKaydi.ilce || "",
        mahalle: a.mahalle || "",
        nitelik: tapu.talepDetayi.tasinmazNiteligi || talep.tasinmazNiteligi || "",
        durum: tapu.raporSonucu.durum || "Belirtilmedi",
      });
    }
  }
  return { noktalar, konumsuz };
}

export function medyan(degerler: number[]): number | null {
  if (degerler.length === 0) return null;
  const s = [...degerler].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// Unit values split into thirds, so colours stay meaningful whatever the
// price level of the portfolio.
export function seviyeEsikleri(birimler: number[]): [number, number] | null {
  if (birimler.length < 3) return null;
  const s = [...birimler].sort((a, b) => a - b);
  return [s[Math.floor(s.length / 3)], s[Math.floor((2 * s.length) / 3)]];
}

export function birimSeviyesi(birim: number | null, esikler: [number, number] | null): BirimSeviye {
  if (birim === null) return "yok";
  if (!esikler) return "orta";
  if (birim < esikler[0]) return "dusuk";
  if (birim >= esikler[1]) return "yuksek";
  return "orta";
}
