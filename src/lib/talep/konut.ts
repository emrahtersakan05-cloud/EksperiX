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

// ---- Konum tespiti ------------------------------------------------------------

// The parcel as a 3×3 plan, north up: where a block sits.
export const PARSEL_KONUMLARI = [
  "Kuzeybatı",
  "Kuzey",
  "Kuzeydoğu",
  "Batı",
  "Orta",
  "Doğu",
  "Güneybatı",
  "Güney",
  "Güneydoğu",
];

const KONUM_EKI: Record<string, string> = {
  Kuzey: "kuzeyinde",
  Güney: "güneyinde",
  Doğu: "doğusunda",
  Batı: "batısında",
  Kuzeydoğu: "kuzeydoğusunda",
  Kuzeybatı: "kuzeybatısında",
  Güneydoğu: "güneydoğusunda",
  Güneybatı: "güneybatısında",
  Orta: "ortasında",
};

// "Kuzeydoğu" → "kuzeydoğusunda", "Orta" → "ortasında".
export function konumEki(konum: string): string {
  return KONUM_EKI[konum] ?? konum.toLocaleLowerCase("tr-TR");
}

export const GIRIS_TURLERI = ["Ana giriş", "Yan giriş", "Otopark girişi", "Servis girişi"];

export const GIRIS_KATLARI = ["Zemin Kat", "Yüksek Zemin Kat", "Bodrum Kat", "Bahçe Katı", "Asma Kat", "1. Kat"];

// "Zemin Kat" → "zemin kattan", "Bahçe Katı" → "bahçe kattan", "2" → "2. kattan".
export function kattan(kat: string): string {
  let k = kat.trim().toLocaleLowerCase("tr-TR");
  if (!k) return "";
  if (/^\d+$/.test(k)) k = `${k}.`;
  if (/kat[ıi]$/.test(k)) return k.replace(/kat[ıi]$/, "kattan");
  if (/kat$/.test(k)) return `${k}tan`;
  return `${k} kattan`;
}

// "…bağımsız bölüm, parselin kuzeydoğusunda konumlu A blokta yer almaktadır."
export function blokTespitiCumlesi(k: KonutOzellikleriData): string {
  if (k.blokTespiti !== "Evet") return "";
  const blok = k.konuBlok.trim();
  const konum = KONUM_EKI[k.blokKonumu];
  if (!blok && !konum) return "";
  const blokMetni = blok ? `${blok} blokta` : "blokta";
  return konum
    ? `Değerlemeye konu bağımsız bölüm, parselin ${konum} konumlu ${blokMetni} yer almaktadır.`
    : `Değerlemeye konu bağımsız bölüm ${blokMetni} yer almaktadır.`;
}

// "Binanın ana girişi kuzey cepheden, Atatürk Caddesi üzerinden; yan girişi
// doğu cepheden sağlanmaktadır."
export function binaGirisCumlesi(k: KonutOzellikleriData): string {
  if (k.binaGirisTespiti !== "Evet") return "";
  const parcalar = k.binaGirisleri
    .filter((g) => g.yon)
    .map((g) => {
      const tur = (g.tur || "giriş").toLocaleLowerCase("tr-TR").replace(/giriş$/, "girişi");
      const yol = g.yol.trim() ? `, ${g.yol.trim()} üzerinden` : "";
      const kat = g.kat?.trim() ? `, ${kattan(g.kat)}` : "";
      return `${tur} ${g.yon.toLocaleLowerCase("tr-TR")} cepheden${yol}${kat}`;
    });
  if (!parcalar.length) return "";
  const kapilar = k.binaGirisleri.filter((g) => g.yon && g.kapi?.trim());
  const tek = k.binaGirisleri.filter((g) => g.yon).length === 1;
  const kapiCumleleri = kapilar.map((g) => {
    const kapi = g.kapi!.trim();
    // "montajı yapılmamıştır." reads as "kapısının montajı …".
    const ozne = /^montaj/i.test(kapi) ? "bina giriş kapısının" : "bina giriş kapısı";
    const cumle = `${tek ? "" : `${g.yon} cephesindeki `}${ozne} ${kapi}`;
    return (cumle.charAt(0).toLocaleUpperCase("tr-TR") + cumle.slice(1)).replace(/([^.])$/, "$1.");
  });
  return [`Binanın ${parcalar.join("; ")} sağlanmaktadır.`, ...kapiCumleleri].join(" ");
}
