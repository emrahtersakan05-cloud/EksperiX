import { parseTrNumber } from "@/lib/emsal/hesaplama";
import type { EmsalDurum, EmsalHaritaKaydi } from "./types";

// Client-safe helpers for the map page: unit price, filtering, sorting,
// radius (çevre) analysis and CSV export. Nothing here touches the store.

export function birimFiyat(kaydi: EmsalHaritaKaydi): number | null {
  const fiyat = parseTrNumber(kaydi.pazarlikliFiyat) ?? parseTrNumber(kaydi.istenenFiyat);
  const alan = parseTrNumber(kaydi.m2Net) ?? parseTrNumber(kaydi.m2Brut);
  if (fiyat === null || alan === null || alan <= 0 || fiyat <= 0) return null;
  return fiyat / alan;
}

export function alan(kaydi: EmsalHaritaKaydi): number | null {
  return parseTrNumber(kaydi.m2Net) ?? parseTrNumber(kaydi.m2Brut);
}

export interface EmsalIstatistik {
  adet: number;
  fiyatliAdet: number;
  ortalama: number | null;
  medyan: number | null;
  min: number | null;
  max: number | null;
}

export function istatistik(records: EmsalHaritaKaydi[]): EmsalIstatistik {
  const birimler = records
    .map(birimFiyat)
    .filter((v): v is number => v !== null)
    .sort((a, b) => a - b);
  const n = birimler.length;
  if (n === 0) return { adet: records.length, fiyatliAdet: 0, ortalama: null, medyan: null, min: null, max: null };
  const medyan = n % 2 ? birimler[(n - 1) / 2] : (birimler[n / 2 - 1] + birimler[n / 2]) / 2;
  return {
    adet: records.length,
    fiyatliAdet: n,
    ortalama: birimler.reduce((s, v) => s + v, 0) / n,
    medyan,
    min: birimler[0],
    max: birimler[n - 1],
  };
}

// Satılık and kiralık unit prices differ by orders of magnitude, so a pin's
// price colour is judged against the median of its own durum only.
export function durumMedyanlari(records: EmsalHaritaKaydi[]): Record<EmsalDurum, number | null> {
  return {
    satilik: istatistik(records.filter((r) => r.durum !== "kiralik")).medyan,
    kiralik: istatistik(records.filter((r) => r.durum === "kiralik")).medyan,
  };
}

export type FiyatSeviye = "dusuk" | "normal" | "yuksek" | "bilinmiyor";

export function fiyatSeviyesi(kaydi: EmsalHaritaKaydi, medyanlar: Record<EmsalDurum, number | null>): FiyatSeviye {
  const birim = birimFiyat(kaydi);
  const medyan = medyanlar[kaydi.durum === "kiralik" ? "kiralik" : "satilik"];
  if (birim === null || medyan === null) return "bilinmiyor";
  if (birim < medyan * 0.9) return "dusuk";
  if (birim > medyan * 1.1) return "yuksek";
  return "normal";
}

// "45.200" → "45,2 B", "1.250.000" → "1,25 Mn" — short enough for a map label.
export function kisaFiyat(value: number): string {
  const fmt = (v: number, digits: number) => v.toLocaleString("tr-TR", { maximumFractionDigits: digits });
  if (value >= 1_000_000) return `${fmt(value / 1_000_000, 2)} Mn`;
  if (value >= 1_000) return `${fmt(value / 1_000, 1)} B`;
  return fmt(value, 0);
}

// Great-circle distance in metres.
export function mesafeMetre(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function formatMesafe(metre: number): string {
  return metre < 1000 ? `${Math.round(metre)} m` : `${(metre / 1000).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} km`;
}

export interface CevreAnalizi {
  lat: number;
  lng: number;
  yaricap: number;
}

export interface HaritaSinirlari {
  south: number;
  west: number;
  north: number;
  east: number;
}

export type EmsalSiralama = "yeni" | "eski" | "birim-artan" | "birim-azalan" | "alan-artan" | "alan-azalan" | "yakin";

export interface EmsalFiltre {
  arama: string;
  durum: EmsalDurum | "";
  emlakTipi: string;
  il: string;
  ilce: string;
  birimMin: string;
  birimMax: string;
  alanMin: string;
  alanMax: string;
  ilanTarihiBaslangic: string;
  sadeceBenim: boolean;
  sadeceGorunen: boolean;
}

export const BOS_FILTRE: EmsalFiltre = {
  arama: "",
  durum: "",
  emlakTipi: "",
  il: "",
  ilce: "",
  birimMin: "",
  birimMax: "",
  alanMin: "",
  alanMax: "",
  ilanTarihiBaslangic: "",
  sadeceBenim: false,
  sadeceGorunen: false,
};

// Number of filters that narrow the list beyond the always-visible search and
// durum controls — shown as a badge on the "Filtreler" toggle.
export function aktifFiltreSayisi(f: EmsalFiltre): number {
  return [
    f.emlakTipi,
    f.il,
    f.ilce,
    f.birimMin || f.birimMax,
    f.alanMin || f.alanMax,
    f.ilanTarihiBaslangic,
    f.sadeceBenim,
    f.sadeceGorunen,
  ].filter(Boolean).length;
}

const trLower = (s: string) => s.toLocaleLowerCase("tr-TR");

function aralikta(value: number | null, minRaw: string, maxRaw: string): boolean {
  const min = parseTrNumber(minRaw);
  const max = parseTrNumber(maxRaw);
  if (min === null && max === null) return true;
  if (value === null) return false;
  return (min === null || value >= min) && (max === null || value <= max);
}

export function filtrele(
  records: EmsalHaritaKaydi[],
  f: EmsalFiltre,
  ctx: { kullaniciId?: string; sinirlar?: HaritaSinirlari | null; cevre?: CevreAnalizi | null },
): EmsalHaritaKaydi[] {
  const arama = trLower(f.arama.trim());
  return records.filter((r) => {
    if (f.durum && (r.durum || "satilik") !== f.durum) return false;
    if (f.emlakTipi && r.emlakTipi !== f.emlakTipi) return false;
    if (f.il && r.il !== f.il) return false;
    if (f.ilce && r.ilce !== f.ilce) return false;
    if (!aralikta(birimFiyat(r), f.birimMin, f.birimMax)) return false;
    if (!aralikta(alan(r), f.alanMin, f.alanMax)) return false;
    if (f.ilanTarihiBaslangic && (!r.ilanTarihi || r.ilanTarihi < f.ilanTarihiBaslangic)) return false;
    if (f.sadeceBenim && r.ekleyenKullaniciId !== ctx.kullaniciId) return false;
    if (f.sadeceGorunen && ctx.sinirlar) {
      const s = ctx.sinirlar;
      if (r.lat < s.south || r.lat > s.north || r.lng < s.west || r.lng > s.east) return false;
    }
    if (ctx.cevre && mesafeMetre(ctx.cevre.lat, ctx.cevre.lng, r.lat, r.lng) > ctx.cevre.yaricap) return false;
    if (arama) {
      const metin = trLower(
        [r.emlakTipi, r.il, r.ilce, r.mahalle, r.odaSayisi, r.ekleyenAdSoyad, r.webAdresi].filter(Boolean).join(" "),
      );
      if (!metin.includes(arama)) return false;
    }
    return true;
  });
}

// Records without the sort key always go last, whichever direction is chosen.
function sayiKarsilastir(a: number | null, b: number | null, yon: 1 | -1): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return (a - b) * yon;
}

export function sirala(
  records: EmsalHaritaKaydi[],
  siralama: EmsalSiralama,
  cevre?: CevreAnalizi | null,
): EmsalHaritaKaydi[] {
  const list = [...records];
  switch (siralama) {
    case "eski":
      return list.sort((a, b) => a.olusturmaTarihi.localeCompare(b.olusturmaTarihi));
    case "birim-artan":
      return list.sort((a, b) => sayiKarsilastir(birimFiyat(a), birimFiyat(b), 1));
    case "birim-azalan":
      return list.sort((a, b) => sayiKarsilastir(birimFiyat(a), birimFiyat(b), -1));
    case "alan-artan":
      return list.sort((a, b) => sayiKarsilastir(alan(a), alan(b), 1));
    case "alan-azalan":
      return list.sort((a, b) => sayiKarsilastir(alan(a), alan(b), -1));
    case "yakin":
      if (cevre) {
        const d = (r: EmsalHaritaKaydi) => mesafeMetre(cevre.lat, cevre.lng, r.lat, r.lng);
        return list.sort((a, b) => d(a) - d(b));
      }
      return list.sort((a, b) => b.olusturmaTarihi.localeCompare(a.olusturmaTarihi));
    default:
      return list.sort((a, b) => b.olusturmaTarihi.localeCompare(a.olusturmaTarihi));
  }
}

// Semicolon-separated with a BOM and comma decimals, which is what Excel in a
// Turkish locale opens correctly by double-click.
export function csvOlustur(records: EmsalHaritaKaydi[]): string {
  const sayi = (v: number | null, digits = 2) =>
    v === null ? "" : v.toLocaleString("tr-TR", { useGrouping: false, maximumFractionDigits: digits });
  const hucre = (v: string) => (/[";\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const basliklar = [
    "Durum",
    "Emlak Tipi",
    "İl",
    "İlçe",
    "Mahalle",
    "Enlem",
    "Boylam",
    "m² Brüt",
    "m² Net",
    "Oda Sayısı",
    "Bina Yaşı",
    "Kat",
    "İlan Tarihi",
    "İlan Fiyatı",
    "Pazarlıklı Fiyat",
    "Birim Fiyat (₺/m²)",
    "İlan Adresi",
    "Ekleyen",
    "Eklenme Tarihi",
  ];
  const satirlar = records.map((r) =>
    [
      r.durum === "kiralik" ? "Kiralık" : "Satılık",
      r.emlakTipi,
      r.il,
      r.ilce,
      r.mahalle,
      sayi(r.lat, 6),
      sayi(r.lng, 6),
      r.m2Brut,
      r.m2Net,
      r.odaSayisi,
      r.binaYasi,
      r.kat,
      r.ilanTarihi,
      r.istenenFiyat,
      r.pazarlikliFiyat,
      sayi(birimFiyat(r)),
      r.webAdresi ?? "",
      r.ekleyenAdSoyad,
      r.olusturmaTarihi.slice(0, 10),
    ]
      .map((v) => hucre(String(v ?? "")))
      .join(";"),
  );
  return "﻿" + [basliklar.join(";"), ...satirlar].join("\r\n");
}

// Linear-interpolated percentile (p in 0..1) of an ascending-sorted list.
export function yuzdelik(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

// A listing whose ilan (or, failing that, entry) date is over a year old no
// longer reflects the market well; the UI fades and badges it.
export const ESKI_ILAN_GUN = 365;

export function ilanYasiGun(kaydi: EmsalHaritaKaydi, simdi = Date.now()): number | null {
  const tarih = Date.parse(kaydi.ilanTarihi || kaydi.olusturmaTarihi);
  return Number.isFinite(tarih) ? Math.floor((simdi - tarih) / 86_400_000) : null;
}

export function eskiIlanMi(kaydi: EmsalHaritaKaydi, simdi = Date.now()): boolean {
  const gun = ilanYasiGun(kaydi, simdi);
  return gun !== null && gun > ESKI_ILAN_GUN;
}

function normalizeUrl(value: string | undefined): string {
  if (!value) return "";
  return value.trim().toLowerCase().replace(/^https?:\/\/(www\.)?/, "").replace(/[?#].*$/, "").replace(/\/+$/, "");
}

export interface MukerrerAday {
  kaydi: EmsalHaritaKaydi;
  neden: string;
}

// Possible duplicates of a record being entered: the same listing URL, or a
// pin within 30 m with the same durum and area. Advisory only — two flats in
// one building can legitimately match.
export function mukerrerAdaylari(
  aday: {
    id?: string;
    webAdresi?: string;
    durum: string;
    lat?: number;
    lng?: number;
    m2Net: string;
    m2Brut: string;
  },
  records: EmsalHaritaKaydi[],
): MukerrerAday[] {
  const url = normalizeUrl(aday.webAdresi);
  const adayAlan = parseTrNumber(aday.m2Net) ?? parseTrNumber(aday.m2Brut);
  const sonuc: MukerrerAday[] = [];
  for (const r of records) {
    if (r.id === aday.id) continue;
    if (url && normalizeUrl(r.webAdresi) === url) {
      sonuc.push({ kaydi: r, neden: "Aynı ilan adresi" });
      continue;
    }
    if (aday.lat === undefined || aday.lng === undefined || adayAlan === null) continue;
    if ((r.durum || "satilik") !== (aday.durum || "satilik")) continue;
    const rAlan = alan(r);
    if (rAlan === null || Math.abs(rAlan - adayAlan) > 1) continue;
    const d = mesafeMetre(aday.lat, aday.lng, r.lat, r.lng);
    if (d <= 30) sonuc.push({ kaydi: r, neden: `${Math.round(d)} m yakında, aynı m²` });
  }
  return sonuc;
}

export type GuvenSeviyesi = "yuksek" | "orta" | "dusuk";

export interface DegerTahmini {
  kullanilan: EmsalHaritaKaydi[];
  aykiri: EmsalHaritaKaydi[];
  medyan: number;
  ortalama: number;
  p25: number;
  p75: number;
  // Inverse-distance weighted mean ₺/m²; only when a çevre centre is known.
  agirlikli: number | null;
  degisimKatsayisi: number;
  guven: GuvenSeviyesi;
}

// Unit-price estimate from a set of comparables. Outliers are dropped with
// the 1.5×IQR rule (only once there are enough points for quartiles to mean
// anything); confidence depends on sample size and dispersion.
export function degerTahmini(
  records: EmsalHaritaKaydi[],
  opts: { aykiriTemizle: boolean; merkez?: { lat: number; lng: number } | null },
): DegerTahmini | null {
  const fiyatli = records
    .map((r) => ({ r, b: birimFiyat(r) }))
    .filter((x): x is { r: EmsalHaritaKaydi; b: number } => x.b !== null);
  if (fiyatli.length === 0) return null;

  let kullanilan = fiyatli;
  let aykiri: typeof fiyatli = [];
  if (opts.aykiriTemizle && fiyatli.length >= 5) {
    const s = fiyatli.map((x) => x.b).sort((a, b) => a - b);
    const q1 = yuzdelik(s, 0.25)!;
    const q3 = yuzdelik(s, 0.75)!;
    const iqr = q3 - q1;
    const alt = q1 - 1.5 * iqr;
    const ust = q3 + 1.5 * iqr;
    kullanilan = fiyatli.filter((x) => x.b >= alt && x.b <= ust);
    aykiri = fiyatli.filter((x) => x.b < alt || x.b > ust);
  }

  const s = kullanilan.map((x) => x.b).sort((a, b) => a - b);
  const n = s.length;
  const ortalama = s.reduce((t, v) => t + v, 0) / n;
  const sapma = Math.sqrt(s.reduce((t, v) => t + (v - ortalama) ** 2, 0) / n);
  const degisimKatsayisi = ortalama > 0 ? sapma / ortalama : 0;

  let agirlikli: number | null = null;
  if (opts.merkez) {
    const m = opts.merkez;
    // 50 m floor so a comparable sitting on the centre doesn't take all the weight.
    const agirliklar = kullanilan.map((x) => 1 / Math.max(50, mesafeMetre(m.lat, m.lng, x.r.lat, x.r.lng)));
    const toplam = agirliklar.reduce((t, w) => t + w, 0);
    agirlikli = kullanilan.reduce((t, x, i) => t + x.b * agirliklar[i], 0) / toplam;
  }

  const guven: GuvenSeviyesi =
    n >= 8 && degisimKatsayisi <= 0.2 ? "yuksek" : n >= 4 && degisimKatsayisi <= 0.35 ? "orta" : "dusuk";

  return {
    kullanilan: kullanilan.map((x) => x.r),
    aykiri: aykiri.map((x) => x.r),
    medyan: yuzdelik(s, 0.5)!,
    ortalama,
    p25: yuzdelik(s, 0.25)!,
    p75: yuzdelik(s, 0.75)!,
    agirlikli,
    degisimKatsayisi,
    guven,
  };
}
