import { parseTrNumber } from "@/lib/emsal/hesaplama";
import type {
  AlanFarkiDegerlemeData,
  HisseliDegerlemeData,
  NormalDegerlemeData,
  SeviyeSatiri,
} from "./types";

// Blank percentage inputs mean "no adjustment" (100 %).
function yuzdeOrani(raw: string): number | null {
  if (!raw.trim()) return 1;
  const parsed = parseTrNumber(raw);
  return parsed === null ? null : parsed / 100;
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

export interface SeviyeliSonuc {
  satirDegerleri: Record<string, number | null>;
  toplamAlan: number;
  toplamDeger: number;
  ortalamaBirim: number | null;
  hesaplananSatir: number;
}

export function hesaplaSeviyeli(satirlar: SeviyeSatiri[]): SeviyeliSonuc | null {
  const satirDegerleri: Record<string, number | null> = {};
  let toplamAlan = 0;
  let toplamDeger = 0;
  let hesaplananSatir = 0;

  for (const s of satirlar) {
    const alan = parseTrNumber(s.alanM2);
    const birim = parseTrNumber(s.birimDeger);
    const katsayi = yuzdeOrani(s.katsayi);
    if (alan === null || birim === null || katsayi === null || alan < 0 || birim < 0) {
      satirDegerleri[s.id] = null;
      continue;
    }
    const deger = alan * birim * katsayi;
    satirDegerleri[s.id] = deger;
    toplamAlan += alan;
    toplamDeger += deger;
    hesaplananSatir += 1;
  }

  if (hesaplananSatir === 0) return null;
  return {
    satirDegerleri,
    toplamAlan,
    toplamDeger,
    ortalamaBirim: toplamAlan > 0 ? toplamDeger / toplamAlan : null,
    hesaplananSatir,
  };
}

export interface HisseliSonuc {
  satirlar: Record<string, { oran: number; deger: number } | null>;
  toplamOran: number;
  toplamDeger: number;
  hesaplananSatir: number;
}

export function hesaplaHisseli(d: HisseliDegerlemeData): HisseliSonuc | null {
  const tam = parseTrNumber(d.tamDeger);
  if (tam === null || tam < 0) return null;

  const satirlar: HisseliSonuc["satirlar"] = {};
  let toplamOran = 0;
  let toplamDeger = 0;
  let hesaplananSatir = 0;

  for (const s of d.satirlar) {
    const pay = parseTrNumber(s.pay);
    const payda = parseTrNumber(s.payda);
    if (pay === null || payda === null || payda <= 0 || pay < 0) {
      satirlar[s.id] = null;
      continue;
    }
    const oran = pay / payda;
    const deger = tam * oran;
    satirlar[s.id] = { oran, deger };
    toplamOran += oran;
    toplamDeger += deger;
    hesaplananSatir += 1;
  }

  if (hesaplananSatir === 0) return null;
  return { satirlar, toplamOran, toplamDeger, hesaplananSatir };
}
