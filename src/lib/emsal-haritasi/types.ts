export type EmsalDurum = "satilik" | "kiralik";
export type EmsalKaynak = "manuel" | "url-bridge" | "eklenti-bridge" | "talep-senkron";

export interface EmsalHaritaKaydi {
  id: string;
  kaynak: EmsalKaynak;
  // Bir talep/tapu'daki emsal slotundan senkronize edildiyse (Faz 2) dolu olur.
  kaynakTalepId?: string;
  kaynakTapuId?: string;
  kaynakSlot?: string;
  webAdresi?: string;
  gorselUrl?: string;
  durum: EmsalDurum | "";
  emlakTipi: string;
  il: string;
  ilce: string;
  mahalle: string;
  lat: number;
  lng: number;
  m2Brut: string;
  m2Net: string;
  odaSayisi: string;
  binaYasi: string;
  kat: string;
  ilanTarihi: string;
  istenenFiyat: string;
  pazarlikliFiyat: string;
  ekleyenKullaniciId: string;
  ekleyenAdSoyad: string;
  olusturmaTarihi: string;
  guncellemeTarihi: string;
}

export const EMLAK_TIPI_OPTIONS = [
  "Daire",
  "Villa",
  "Müstakil Ev",
  "Rezidans",
  "Yazlık",
  "Arsa",
  "Tarla",
  "Bağ",
  "Bahçe",
  "Dükkan",
  "İşyeri",
  "Ofis",
  "Depo",
  "Fabrika",
  "Atölye",
  "Bina",
] as const;
