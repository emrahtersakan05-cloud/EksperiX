import { parseTrNumber } from "@/lib/emsal/hesaplama";
import type {
  AlanFarkiDegerlemeData,
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
