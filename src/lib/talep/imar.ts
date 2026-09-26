import type { ImarDurumuData, TapuKaydiData } from "./types";

// "0,30" / "0.30" / "1.250,50" / "Emsal: 1.5" / "%30" → number (or null).
export function sayiOku(deger: string): number | null {
  const m = /\d[\d.,]*/.exec(deger);
  if (!m) return null;
  let s = m[0].replace(/[.,]$/, "");
  if (s.includes(",") && s.includes(".")) s = s.replace(/\./g, "").replace(",", ".");
  else if (s.includes(",")) s = s.replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

// TAKS is a ratio; "%30" or "30" means 0.30.
function oranOku(deger: string): number | null {
  const n = sayiOku(deger);
  if (n === null) return null;
  return deger.includes("%") || (n > 1 && n <= 100) ? n / 100 : n;
}

const m2 = (n: number) => `${n.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} m²`;

// Building rights from hesap alanı × TAKS / KAKS.
export function yapilasmaHakki(d: ImarDurumuData): { taban: number | null; toplam: number | null } {
  const alan = sayiOku(d.hesapAlani);
  const taks = oranOku(d.taks);
  const kaks = sayiOku(d.kaks);
  return {
    taban: alan && taks ? alan * taks : null,
    toplam: alan && kaks ? alan * kaks : null,
  };
}

// ---- Comparison with the Tapu Kaydı tab ----------------------------------------

const yerAdi = (s: string) =>
  s
    .toLocaleUpperCase("tr-TR")
    .replace(/(^|\s)(MAHALLESİ|MAHALLE|MAH\.?|KÖYÜ|KÖY)(?=\s|$)/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export interface TapuFarki {
  etiket: string;
  imar: string;
  tapu: string;
}

const KARSILASTIRMALAR: {
  etiket: string;
  imar: keyof ImarDurumuData;
  tapu: keyof TapuKaydiData;
  ayni: (a: string, b: string) => boolean;
}[] = [
  { etiket: "Ada", imar: "ada", tapu: "ada", ayni: (a, b) => a.trim() === b.trim() },
  { etiket: "Parsel", imar: "parsel", tapu: "parsel", ayni: (a, b) => a.trim() === b.trim() },
  { etiket: "İlçe", imar: "ilce", tapu: "ilce", ayni: (a, b) => yerAdi(a) === yerAdi(b) },
  { etiket: "Mahalle", imar: "mahalle", tapu: "mahalleKoyAdi", ayni: (a, b) => yerAdi(a) === yerAdi(b) },
];

// Fields filled on both sides that disagree.
export function tapuFarklari(d: ImarDurumuData, t: TapuKaydiData): TapuFarki[] {
  return KARSILASTIRMALAR.flatMap((k) => {
    const imar = d[k.imar];
    const tapu = t[k.tapu] as string;
    return imar.trim() && tapu.trim() && !k.ayni(imar, tapu) ? [{ etiket: k.etiket, imar, tapu }] : [];
  });
}

// The empty imar fields the Tapu Kaydı can fill (hesap alanı from the parsel yüzölçümü).
export function tapudanDoldurulacaklar(d: ImarDurumuData, t: TapuKaydiData): Partial<ImarDurumuData> {
  const kaynak: Partial<ImarDurumuData> = {
    ada: t.ada,
    parsel: t.parsel,
    ilce: t.ilce,
    mahalle: t.mahalleKoyAdi,
    hesapAlani: t.atYuzolcum,
  };
  return Object.fromEntries(
    Object.entries(kaynak).filter(([k, v]) => v?.trim() && !d[k as keyof ImarDurumuData].trim()),
  ) as Partial<ImarDurumuData>;
}

// "39.92, 32.85" / "39.92 32.85" → Google Maps link (lat, lng in Turkey's range).
export function haritaLinki(koordinat: string): string | null {
  const sayilar = koordinat.match(/\d{2}[.,]\d+/g)?.map((s) => Number(s.replace(",", ".")));
  if (!sayilar || sayilar.length < 2) return null;
  const [a, b] = sayilar;
  const uygun = (lat: number, lng: number) => lat >= 35 && lat <= 43 && lng >= 25 && lng <= 45;
  const [lat, lng] = uygun(a, b) ? [a, b] : uygun(b, a) ? [b, a] : [null, null];
  return lat === null ? null : `https://www.google.com/maps?q=${lat},${lng}`;
}

// ---- Report text ------------------------------------------------------------------

function tarihYaz(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : iso;
}

// The İmar Durumu text, as the report prints it.
export function imarMetni(d: ImarDurumuData): string {
  const parsel = [d.pafta && `Pafta ${d.pafta}`, d.ada && `ada ${d.ada}`, d.parsel && `parsel ${d.parsel}`].filter(Boolean).join(", ");
  const bahce = [d.onBahce && `ön ${d.onBahce}`, d.yanBahce && `yan ${d.yanBahce}`, d.arkaBahce && `arka ${d.arkaBahce}`]
    .filter(Boolean)
    .join(", ");
  const { taban, toplam } = yapilasmaHakki(d);
  const hak = [taban && `TAKS'a göre ${m2(taban)} taban alanı`, toplam && `KAKS'a göre ${m2(toplam)} toplam inşaat alanı`]
    .filter(Boolean)
    .join(", ");
  return [
    d.meriImarPlani && `Taşınmaz ${d.meriImarPlani} kapsamında kalmaktadır.`,
    d.fonksiyon && `Fonksiyon ${d.fonksiyon} olarak belirtilmiştir.`,
    d.tasdikTarihi && `Tasdik tarihi ${tarihYaz(d.tasdikTarihi)}.`,
    parsel && `${parsel} olarak kayıtlıdır.`,
    (d.ilce || d.mahalle) && `${[d.mahalle, d.ilce].filter(Boolean).join(" mahallesi, ")} sınırları içinde yer almaktadır.`,
    d.hesapAlani && `Hesap alanı ${d.hesapAlani} m² olarak belirlenmiştir.`,
    d.katAdedi && `Kat adedi ${d.katAdedi}.`,
    d.binaYuksekligi && `Bina yüksekliği ${d.binaYuksekligi}.`,
    d.insaatNizami && `İnşaat nizamı ${d.insaatNizami} olarak belirtilmiştir.`,
    d.taks && `TAKS ${d.taks}.`,
    d.kaks && `KAKS (Emsal) ${d.kaks}.`,
    bahce && `Bahçe mesafeleri: ${bahce}.`,
    d.kotAlinacakNokta && `Kot alınacak nokta: ${d.kotAlinacakNokta}.`,
    hak && `Buna göre parsel üzerinde ${hak} yapılaşma hakkı bulunmaktadır.`,
  ]
    .filter(Boolean)
    .join(" ");
}
