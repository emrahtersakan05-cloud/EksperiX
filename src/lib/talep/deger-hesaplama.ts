import { hesaplaEmsalDegerleri, parseTrNumber } from "@/lib/emsal/hesaplama";
import type {
  AlanFarkiDegerlemeData,
  DegerHesaplamalari,
  EmsalKaydi,
  HesapYontemi,
  HisseliDegerlemeData,
  NormalDegerlemeData,
  SeviyeliDegerlemeData,
} from "./types";

// Blank percentage inputs mean "no adjustment" (100 %).
function yuzdeOrani(raw: string): number | null {
  if (!raw.trim()) return 1;
  const parsed = parseTrNumber(raw);
  return parsed === null ? null : parsed / 100;
}

// Nearest multiple of 5.000 (half rounds up): 1.562.500 → 1.565.000.
export const YUVARLAMA_KATI = 5000;
export function yuvarla(deger: number): number {
  return Math.round(deger / YUVARLAMA_KATI) * YUVARLAMA_KATI;
}

function pozitif(raw: string): number | null {
  const parsed = parseTrNumber(raw);
  return parsed === null || parsed < 0 ? null : parsed;
}

export function hesaplaNormal(d: NormalDegerlemeData): number | null {
  const alan = parseTrNumber(d.alanM2);
  const birim = parseTrNumber(d.birimDeger);
  if (alan === null || birim === null || alan < 0 || birim < 0) return null;
  return alan * birim;
}

export interface AlanFarkiSonuc {
  alanFarki: number;
  resmiDeger: number;
  farkDeger: number;
  toplam: number;
}

export function hesaplaAlanFarki(d: AlanFarkiDegerlemeData): AlanFarkiSonuc | null {
  const resmi = parseTrNumber(d.resmiAlanM2);
  const fiili = parseTrNumber(d.fiiliAlanM2);
  const birim = parseTrNumber(d.birimDeger);
  const katsayi = yuzdeOrani(d.farkKatsayisi);
  if (resmi === null || fiili === null || birim === null || katsayi === null) return null;
  if (resmi < 0 || fiili < 0 || birim < 0) return null;

  const alanFarki = fiili - resmi;
  const resmiDeger = resmi * birim;
  const farkDeger = alanFarki * birim * katsayi;
  return { alanFarki, resmiDeger, farkDeger, toplam: resmiDeger + farkDeger };
}

// Shared "Yasal ve Mevcut Durum" block: Alan × Birim Fiyat = Net Fiyat, rounded to Yuvarlanmış Fiyat.
export interface DurumDegeri {
  alan: number;
  birim: number;
  net: number;
  yuvarlanmis: number;
}

function hesaplaDurumDegeri(alanRaw: string, birimRaw: string): DurumDegeri | null {
  const alan = pozitif(alanRaw);
  const birim = pozitif(birimRaw);
  if (alan === null || birim === null) return null;
  const net = alan * birim;
  return { alan, birim, net, yuvarlanmis: yuvarla(net) };
}

export interface SeviyeliSonuc {
  durum: DurumDegeri | null;
  maliyet: { birim: number; oran: number; net: number; yuvarlanmis: number } | null;
  guncel: number | null;
}

// Net Maliyet = Alan × Maliyet Birim Fiyat × (1 − Seviye Oranı); Yuvarlanmış Maliyet is that same amount.
// Güncel Satış Değeri = Yuvarlanmış Fiyat − Yuvarlanmış Maliyet Fiyatı.
export function hesaplaSeviyeli(d: SeviyeliDegerlemeData): SeviyeliSonuc {
  const durum = hesaplaDurumDegeri(d.alanM2, d.birimFiyat);
  const maliyetBirim = pozitif(d.maliyetBirimFiyat);
  const oran = d.seviyeOrani.trim() ? parseTrNumber(d.seviyeOrani) : null;

  let maliyet: SeviyeliSonuc["maliyet"] = null;
  const alan = pozitif(d.alanM2);
  if (alan !== null && maliyetBirim !== null && oran !== null && oran >= 0 && oran <= 100) {
    const net = alan * maliyetBirim * (1 - oran / 100);
    maliyet = { birim: maliyetBirim, oran: oran / 100, net, yuvarlanmis: net };
  }

  return { durum, maliyet, guncel: durum && maliyet ? durum.yuvarlanmis - maliyet.yuvarlanmis : null };
}

export interface HisseliSonuc {
  durum: DurumDegeri | null;
  satirlar: Record<string, { oran: number; deger: number } | null>;
  toplamOran: number;
  hesaplananSatir: number;
}

export function hesaplaHisseli(d: HisseliDegerlemeData): HisseliSonuc {
  const durum = hesaplaDurumDegeri(d.alanM2, d.birimFiyat);
  const satirlar: HisseliSonuc["satirlar"] = {};
  let toplamOran = 0;
  let hesaplananSatir = 0;

  for (const s of d.satirlar) {
    const pay = parseTrNumber(s.pay);
    const payda = parseTrNumber(s.payda);
    if (!durum || pay === null || payda === null || payda <= 0 || pay < 0) {
      satirlar[s.id] = null;
      continue;
    }
    const oran = pay / payda;
    satirlar[s.id] = { oran, deger: durum.yuvarlanmis * oran };
    toplamOran += oran;
    hesaplananSatir += 1;
  }

  return { durum, satirlar, toplamOran, hesaplananSatir };
}

// --- Text formatting (report style: "1.565.000-TL", "12.500-TL/m2", "125 m2") ---

function sayi(n: number): string {
  return n.toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export const formatTL = (n: number) => `${sayi(n)}-TL`;
export const formatBirim = (n: number) => `${sayi(n)}-TL/m2`;
export const formatAlan = (n: number) => `${sayi(n)} m2`;

export function normalMetni(d: NormalDegerlemeData): string {
  const deger = hesaplaNormal(d);
  const alan = parseTrNumber(d.alanM2);
  const birim = parseTrNumber(d.birimDeger);
  if (deger === null || alan === null || birim === null) return "";
  return `Normal değerleme yöntemiyle ${formatAlan(alan)} x ${formatBirim(birim)} = ${formatTL(deger)} değer hesaplanmıştır.`;
}

export function alanFarkiMetni(d: AlanFarkiDegerlemeData): string {
  const s = hesaplaAlanFarki(d);
  const resmi = parseTrNumber(d.resmiAlanM2);
  const fiili = parseTrNumber(d.fiiliAlanM2);
  const birim = parseTrNumber(d.birimDeger);
  if (!s || resmi === null || fiili === null || birim === null) return "";
  const katsayi = d.farkKatsayisi.trim() ? `%${d.farkKatsayisi.trim()}` : "%100";
  const fark = `${s.alanFarki > 0 ? "+" : ""}${sayi(s.alanFarki)} m2`;
  return (
    `Alan farkı değerlemesinde resmi alan ${formatAlan(resmi)}, fiili alan ${formatAlan(fiili)} ` +
    `(${fark} fark, ${katsayi} katsayı) ve birim değer ${formatBirim(birim)} esas alınarak ` +
    `toplam ${formatTL(s.toplam)} değer hesaplanmıştır.`
  );
}

// "Alan x Birim = Yuvarlanmış" line of the Yasal ve Mevcut Durum block.
function durumSatiri(d: DurumDegeri): string {
  return `${formatAlan(d.alan)} x ${formatBirim(d.birim)} = ${formatTL(d.yuvarlanmis)}`;
}

export function seviyeliMetni(s: SeviyeliSonuc): string {
  if (!s.durum) return "";
  const lines = ["DEĞERLEME DETAYI", "Bitmesi Halindeki Yasal ve Mevcut Değeri:", durumSatiri(s.durum)];
  if (s.maliyet && s.guncel !== null) {
    lines.push(
      "Güncel Değeri:",
      `${formatTL(s.durum.yuvarlanmis)} - ${formatTL(s.maliyet.yuvarlanmis)} = ${formatTL(s.guncel)}`,
    );
  }
  return lines.join("\n");
}

export function hisseliMetni(d: HisseliDegerlemeData, s: HisseliSonuc): string {
  if (!s.durum) return "";
  const lines = ["Yasal ve Mevcut Durum Değeri:", `${durumSatiri(s.durum)} olarak takdir edilmiştir.`];
  const hisseSatirlari = d.satirlar.flatMap((satir) => {
    const sonuc = s.satirlar[satir.id];
    if (!sonuc) return [];
    const ad = satir.malik.trim() || "Hissedar";
    return [`${ad} (${satir.pay.trim()}/${satir.payda.trim()}) Hissesine Düşen Değer: ${formatTL(sonuc.deger)}`];
  });
  if (hisseSatirlari.length > 0) lines.push("Hisse Bazlı Bilgi Amaçlı Değeri:", ...hisseSatirlari);
  return lines.join("\n");
}

// --- Method overview, sensitivity, amount in words, emsal basis ---

export const YONTEM_ADLARI: Record<HesapYontemi, string> = {
  normal: "Normal Değerleme",
  alanFarki: "Alan Farkı Değerleme",
  seviyeli: "Seviyeli Değerleme",
  hisseli: "Hisseli Değerleme",
};

// The headline figure of each method — the same one the report quotes.
export function yontemSonuclari(h: DegerHesaplamalari): Record<HesapYontemi, number | null> {
  return {
    normal: hesaplaNormal(h.normal),
    alanFarki: hesaplaAlanFarki(h.alanFarki)?.toplam ?? null,
    seviyeli: hesaplaSeviyeli(h.seviyeli).guncel,
    hisseli: hesaplaHisseli(h.hisseli).durum?.yuvarlanmis ?? null,
  };
}

// The unit value a method currently uses (for the sensitivity table and the
// deviation-from-emsal badge).
export function yontemBirimi(yontem: HesapYontemi, h: DegerHesaplamalari): number | null {
  const raw = {
    normal: h.normal.birimDeger,
    alanFarki: h.alanFarki.birimDeger,
    seviyeli: h.seviyeli.birimFiyat,
    hisseli: h.hisseli.birimFiyat,
  }[yontem];
  const n = parseTrNumber(raw);
  return n === null || n < 0 ? null : n;
}

// The method's result recomputed with a different unit value, everything
// else unchanged (seviyeli's remaining cost does not depend on it).
export function birimleHesapla(yontem: HesapYontemi, h: DegerHesaplamalari, birim: number): number | null {
  const b = birim.toLocaleString("tr-TR", { useGrouping: false, maximumFractionDigits: 4 });
  switch (yontem) {
    case "normal":
      return hesaplaNormal({ ...h.normal, birimDeger: b });
    case "alanFarki":
      return hesaplaAlanFarki({ ...h.alanFarki, birimDeger: b })?.toplam ?? null;
    case "seviyeli":
      return hesaplaSeviyeli({ ...h.seviyeli, birimFiyat: b }).guncel;
    case "hisseli":
      return hesaplaHisseli({ ...h.hisseli, birimFiyat: b }).durum?.yuvarlanmis ?? null;
  }
}

const BIRLER = ["", "bir", "iki", "üç", "dört", "beş", "altı", "yedi", "sekiz", "dokuz"];
const ONLAR = ["", "on", "yirmi", "otuz", "kırk", "elli", "altmış", "yetmiş", "seksen", "doksan"];
const BUYUKLER = ["", "bin", "milyon", "milyar", "trilyon"];

function ucBasamak(n: number): string {
  const yuz = Math.floor(n / 100);
  const on = Math.floor((n % 100) / 10);
  const bir = n % 10;
  // "yüz", not "bir yüz".
  return [yuz === 0 ? "" : yuz === 1 ? "yüz" : `${BIRLER[yuz]} yüz`, ONLAR[on], BIRLER[bir]].filter(Boolean).join(" ");
}

// 1565000 → "bir milyon beş yüz altmış beş bin". Integers only.
export function sayiyiYaziyaCevir(n: number): string {
  const tam = Math.floor(Math.abs(n));
  if (tam === 0) return "sıfır";
  const parcalar: string[] = [];
  let kalan = tam;
  for (let i = 0; kalan > 0 && i < BUYUKLER.length; i++) {
    const grup = kalan % 1000;
    if (grup > 0) {
      // "bin", not "bir bin"; but "bir milyon".
      const soz = i === 1 && grup === 1 ? "" : ucBasamak(grup);
      parcalar.unshift([soz, BUYUKLER[i]].filter(Boolean).join(" "));
    }
    kalan = Math.floor(kalan / 1000);
  }
  return (n < 0 ? "eksi " : "") + parcalar.join(" ");
}

// "Bir milyon beş yüz altmış beş bin Türk Lirası" (+ kuruş when present), as
// written under the figure in valuation reports.
export function tutarYaziyla(n: number): string {
  const kurus = Math.round((Math.abs(n) % 1) * 100);
  let metin = `${sayiyiYaziyaCevir(n)} Türk Lirası`;
  if (kurus > 0) metin += ` ${sayiyiYaziyaCevir(kurus)} kuruş`;
  return metin.charAt(0).toLocaleUpperCase("tr-TR") + metin.slice(1);
}

export interface EmsalDayanagiSatiri {
  etiket: string;
  konum: string;
  birim: number | null;
  net: number | null;
}

export interface EmsalDayanagi {
  satirlar: EmsalDayanagiSatiri[];
  // Over the rows that have a value.
  ortalamaBirim: number | null;
  ortalamaNet: number | null;
  medyanNet: number | null;
  minNet: number | null;
  maxNet: number | null;
  // Coefficient of variation of the net unit values (std / mean).
  degisimKatsayisi: number | null;
}

function medyan(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// Summary of the talep's satılık emsaller as the basis for the unit value.
// Net figures fall back to the plain unit price where no şerefiye was entered.
export function emsalDayanagi(kayitlar: { etiket: string; kaydi: EmsalKaydi }[]): EmsalDayanagi {
  const satirlar = kayitlar.map(({ etiket, kaydi }) => {
    const hesap = hesaplaEmsalDegerleri(kaydi);
    const birim = parseTrNumber(hesap.birimFiyat);
    const net = parseTrNumber(hesap.netBirimFiyat) ?? birim;
    return { etiket, konum: [kaydi.koyMahalle, kaydi.ilce].filter(Boolean).join(", "), birim, net };
  });
  const birimler = satirlar.map((s) => s.birim).filter((v): v is number => v !== null);
  const netler = satirlar.map((s) => s.net).filter((v): v is number => v !== null);
  const ort = (v: number[]) => (v.length ? v.reduce((t, x) => t + x, 0) / v.length : null);
  const ortalamaNet = ort(netler);
  const sapma =
    ortalamaNet !== null && netler.length > 1
      ? Math.sqrt(netler.reduce((t, x) => t + (x - ortalamaNet) ** 2, 0) / netler.length)
      : null;
  return {
    satirlar,
    ortalamaBirim: ort(birimler),
    ortalamaNet,
    medyanNet: medyan(netler),
    minNet: netler.length ? Math.min(...netler) : null,
    maxNet: netler.length ? Math.max(...netler) : null,
    degisimKatsayisi: sapma !== null && ortalamaNet ? sapma / ortalamaNet : null,
  };
}
