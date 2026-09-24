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
