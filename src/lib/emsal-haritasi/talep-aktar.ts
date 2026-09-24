import { createEmptyEmsalKaydi, type EmsalKaydi, type EmsallerData, type KmlKonumu } from "@/lib/talep/types";
import { mesafeMetre } from "./analiz";
import type { EmsalHaritaKaydi } from "./types";

// Bridges the shared Emsal Haritası records into a talep's Emsal Girişleri
// slots (Satılık-1…5 / Kiralık-1…2).

export type EmsalSlotKey = "satilik1" | "satilik2" | "satilik3" | "satilik4" | "satilik5" | "kiralik1" | "kiralik2";

export const SATILIK_SLOTLARI: EmsalSlotKey[] = ["satilik1", "satilik2", "satilik3", "satilik4", "satilik5"];
export const KIRALIK_SLOTLARI: EmsalSlotKey[] = ["kiralik1", "kiralik2"];

export const SLOT_ETIKETI: Record<EmsalSlotKey, string> = {
  satilik1: "Satılık-1",
  satilik2: "Satılık-2",
  satilik3: "Satılık-3",
  satilik4: "Satılık-4",
  satilik5: "Satılık-5",
  kiralik1: "Kiralık-1",
  kiralik2: "Kiralık-2",
};

export function slotlariFor(kaydi: EmsalHaritaKaydi): EmsalSlotKey[] {
  return kaydi.durum === "kiralik" ? KIRALIK_SLOTLARI : SATILIK_SLOTLARI;
}

// A slot counts as used once any identifying or pricing field was entered —
// the same test the Emsaller Listesi uses for "girildi".
export function slotDoluMu(kaydi: EmsalKaydi): boolean {
  return [kaydi.il, kaydi.ilce, kaydi.emlakTipi, kaydi.m2Net, kaydi.gercekAlan, kaydi.istenenFiyat, kaydi.pazarlikliFiyat]
    .some((v) => v.trim() !== "");
}

// Distance to the nearest subject placemark from the KML (a talep can hold
// several parcels); null when there is no KML location.
export function konuMesafesi(kaydi: EmsalHaritaKaydi, konular: KmlKonumu[]): number | null {
  if (konular.length === 0) return null;
  return Math.min(...konular.map((k) => mesafeMetre(k.latitude, k.longitude, kaydi.lat, kaydi.lng)));
}

// Which slot already holds this listing (same ilan URL, or same pin), so the
// list can show it and a second transfer doesn't silently duplicate it.
export function bulunduguSlot(kaydi: EmsalHaritaKaydi, data: EmsallerData): EmsalSlotKey | null {
  const url = kaydi.webAdresi?.trim();
  for (const key of [...SATILIK_SLOTLARI, ...KIRALIK_SLOTLARI]) {
    const slot = data[key];
    if (url && slot.webAdresi.trim() === url) return key;
    const lat = Number(slot.enlem.replace(",", "."));
    const lng = Number(slot.boylam.replace(",", "."));
    if (slot.enlem && slot.boylam && Math.abs(lat - kaydi.lat) < 1e-5 && Math.abs(lng - kaydi.lng) < 1e-5) return key;
  }
  return null;
}

// A full slot record: the target is replaced, not merged, so şerefiye and
// tanım values left over from a previous emsal can't leak into this one.
// The pazarlıklı fiyat falls back to the ilan fiyatı so the Birim Fiyat
// computes right away; the eksper adjusts it in the slot form.
export function emsalKaydinaCevir(kaydi: EmsalHaritaKaydi): EmsalKaydi {
  const d = kaydi.detaylar ?? {};
  return {
    ...createEmptyEmsalKaydi(),
    gorselUrl: kaydi.gorselUrl ?? "",
    webAdresi: kaydi.webAdresi ?? "",
    ilanTarihi: kaydi.ilanTarihi,
    emlakTipi: kaydi.emlakTipi,
    kimden: d.kimden ?? "",
    telefonNo: kaydi.ilanTelNo ?? "",
    m2Brut: kaydi.m2Brut,
    m2Net: kaydi.m2Net,
    gercekAlan: kaydi.m2Net || kaydi.m2Brut,
    odaSayisi: kaydi.odaSayisi,
    binaYasi: kaydi.binaYasi,
    bulunduguKat: kaydi.kat,
    il: kaydi.il,
    ilce: kaydi.ilce,
    koyMahalle: kaydi.mahalle,
    adaNo: d.adaNo ?? "",
    parselNo: d.parselNo ?? "",
    enlem: String(kaydi.lat),
    boylam: String(kaydi.lng),
    istenenFiyat: kaydi.istenenFiyat,
    pazarlikliFiyat: kaydi.pazarlikliFiyat || kaydi.istenenFiyat,
  };
}
