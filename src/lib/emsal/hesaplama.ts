import type { EmsalKaydi } from "@/lib/talep/types";

// Parses numbers as typed in Turkish forms: "3.000.000", "45.238,10", "-0,10",
// "+0,10". A comma means dots are thousand separators; without a comma, dots
// grouping exactly three digits ("3.000.000") are thousands, anything else
// ("0.10", "105.5") is a decimal point.
export function parseTrNumber(value: string): number | null {
  const cleaned = value.replace(/[\s₺TLtl]/g, "").replace(/^\+/, "");
  if (!cleaned) return null;
  let normalized: string;
  if (cleaned.includes(",")) normalized = cleaned.replace(/\./g, "").replace(",", ".");
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(cleaned)) normalized = cleaned.replace(/\./g, "");
  else normalized = cleaned;
  if (!/^-?\d*\.?\d+$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatTrNumber(value: number): string {
  return value.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export type EmsalDegerHesaplari = Pick<EmsalKaydi, "birimFiyat" | "netBirimFiyat">;

// Birim Fiyat = Pazarlıklı Fiyat ÷ Gerçekçi Alan.
// Net Birim Fiyat = Birim Fiyat × (1 ± Konum) × (1 ± Yapı) × (1 ± Kat); only the
// şerefiye fields that were filled take part, so with none filled it equals Birim Fiyat.
export function hesaplaEmsalDegerleri(
  kaydi: Pick<EmsalKaydi, "pazarlikliFiyat" | "gercekAlan" | "konumSerefiyesi" | "yapiSerefiyesi" | "katSerefiyesi">,
): EmsalDegerHesaplari {
  const empty = { birimFiyat: "", netBirimFiyat: "" };
  const fiyat = parseTrNumber(kaydi.pazarlikliFiyat);
  const alan = parseTrNumber(kaydi.gercekAlan);
  if (fiyat === null || alan === null || alan <= 0) return empty;

  const birim = fiyat / alan;
  let net = birim;
  for (const raw of [kaydi.konumSerefiyesi, kaydi.yapiSerefiyesi, kaydi.katSerefiyesi]) {
    if (!raw.trim()) continue;
    const serefiye = parseTrNumber(raw);
    if (serefiye === null) continue;
    net *= 1 + serefiye;
  }
  return { birimFiyat: formatTrNumber(birim), netBirimFiyat: net > 0 ? formatTrNumber(net) : "" };
}

export const HESAP_GIRDI_ALANLARI: (keyof EmsalKaydi)[] = [
  "pazarlikliFiyat",
  "gercekAlan",
  "konumSerefiyesi",
  "yapiSerefiyesi",
  "katSerefiyesi",
];
