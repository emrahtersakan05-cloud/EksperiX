import type { KonutMahallindekiNitelik, KonutOzellikleriData } from "./types";

// KONUT taşınmaz niteliği: its Ana Gayrimenkul tab is the konut form.
export const KONUT_NITELIGI = "KONUT (APARTMAN DAİRESİ, VİLLA, GECEKONDU, MESKEN, ÜÇ KATA KADAR HER TÜRLÜ KONUT)";

export function konutMu(tasinmazNiteligi: string): boolean {
  return tasinmazNiteligi === KONUT_NITELIGI;
}

export const KONUT_MAHALLINDEKI_NITELIKLER: { value: KonutMahallindekiNitelik; label: string; aciklama: string }[] = [
  { value: "bloklu", label: "BLOKLU ANA GAYRİMENKUL", aciklama: "Birden fazla bloktan oluşan site / yapı adası" },
  { value: "bloksuz", label: "BLOKSUZ ANA GAYRİMENKUL", aciklama: "Tek bloktan oluşan apartman" },
  { value: "mustakil", label: "MÜSTAKİL ANA GAYRİMENKUL", aciklama: "Müstakil konut, villa" },
];

export const NIZAMLAR = ["Bitişik", "Ayrık", "Blok", "Diğer"];

// "A" or "1" when the user left a block unnamed.
export function blokAdi(data: Pick<KonutOzellikleriData, "blokAdlari">, i: number): string {
  return data.blokAdlari[i]?.trim() || String(i + 1);
}

function nizamMetni(nizam: string, diger: string): string {
  const n = nizam === "Diğer" ? diger.trim() : nizam;
  return n ? `${n.toLocaleLowerCase("tr-TR")} nizam` : "";
}

// "A ve B blokları bitişik nizam, C bloğu ayrık nizam" (bloklu) or the single
// building's nizam (bloksuz / müstakil).
export function insaatNizamiOzeti(data: KonutOzellikleriData): string {
  if (data.mahallindekiNitelik !== "bloklu") return nizamMetni(data.insaatNizami, data.insaatNizamiDiger);
  return data.nizamAtamalari
    .map((a) => {
      const adlar = a.bloklar.map((i) => blokAdi(data, i));
      const n = nizamMetni(a.nizam, a.nizamDiger);
      if (!adlar.length || !n) return "";
      const liste = adlar.length > 1 ? `${adlar.slice(0, -1).join(", ")} ve ${adlar[adlar.length - 1]} blokları` : `${adlar[0]} bloğu`;
      return `${liste} ${n}`;
    })
    .filter(Boolean)
    .join(", ");
}

export function projeKatlariMetni(data: KonutOzellikleriData): string {
  return data.projeKatlari
    .filter((k) => k.kat.trim() || k.aciklama.trim())
    .map((k) => (k.kat.trim() ? `${k.kat.trim()}: ${k.aciklama.trim()}` : k.aciklama.trim()))
    .join(" ");
}
