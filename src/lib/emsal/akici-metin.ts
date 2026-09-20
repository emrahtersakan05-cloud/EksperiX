import { hesaplaEmsalDegerleri, parseTrNumber } from "@/lib/emsal/hesaplama";
import type { EmsalKaydi } from "@/lib/talep/types";

export type EmsalTuru = "satilik" | "kiralik";

const trLower = (value: string) => value.toLocaleLowerCase("tr-TR");

function binaYasiCumlesi(binaYasi: string): string {
  const raw = binaYasi.trim();
  if (!raw) return "";
  const sayi = parseTrNumber(raw);
  if (sayi === 0) return "yeni binanın,";
  return `yaklaşık ${raw} yıllık binanın,`;
}

// "3", "Zemin", "Zemin Kat" → "3", "Zemin", "Zemin" (the sentence adds "katında").
function katMetni(kat: string): string {
  const raw = kat.trim().replace(/\s*kat[ıi]?$/i, "");
  return raw ? `${raw} katında konumlu` : "";
}

function formatSerefiye(value: number): string {
  return Math.abs(value).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

const SEREFIYELER = [
  { alan: "konumSerefiyesi", ad: "konum" },
  { alan: "yapiSerefiyesi", ad: "yapı" },
  { alan: "katSerefiyesi", ad: "kat" },
] as const;

// Builds the "akıcı metin" description of an emsal from its form fields. Parts whose data
// is missing are left out, so the text grows as the form gets filled.
export function olusturEmsalMetni(kaydi: EmsalKaydi, tur: EmsalTuru): string {
  const satilik = tur === "satilik";

  const netAlan = kaydi.m2Net.trim();
  const gercekAlan = kaydi.gercekAlan.trim();
  const net = parseTrNumber(netAlan);
  const gercek = parseTrNumber(gercekAlan);
  const alanFarkli =
    netAlan !== "" && gercekAlan !== "" && (net === null || gercek === null ? netAlan !== gercekAlan : net !== gercek);

  const govde: string[] = [];
  if (kaydi.tanim1.trim()) govde.push(kaydi.tanim1.trim());
  if (kaydi.tanim2.trim()) govde.push(kaydi.tanim2.trim());
  govde.push(binaYasiCumlesi(kaydi.binaYasi));
  govde.push(katMetni(kaydi.bulunduguKat));
  if (netAlan) {
    govde.push(`${kaydi.odaSayisi.trim()} ${netAlan} m² kullanım alanlı olduğu beyan edilen,`.trim());
  } else if (kaydi.odaSayisi.trim()) {
    govde.push(`${kaydi.odaSayisi.trim()},`);
  }
  if (alanFarkli) govde.push(`ancak mimari projesinde ${gercekAlan} m² kullanım alanlı olabileceği öngörülen,`);

  const emlakTipi = trLower(kaydi.emlakTipi.trim());
  const ilanFiyati = kaydi.istenenFiyat.trim();
  const durum = satilik ? "satılıktır" : "kiralıktır";
  if (ilanFiyati) govde.push(`${emlakTipi} ${ilanFiyati} TL bedel ile ${durum}.`.trim());
  else if (emlakTipi) govde.push(`${emlakTipi} ${durum}.`);

  const govdeMetni = govde.filter(Boolean).join(" ").replace(/,$/, ".");

  const baslik = [satilik ? "Satılık" : "Kiralık", kaydi.kimden.trim(), kaydi.telefonNo.trim()]
    .filter(Boolean)
    .join("- ");

  // Only the type word ("Satılık") and nothing else filled in yet → nothing to describe.
  const cumleler: string[] = [];
  if (govdeMetni) cumleler.push(`${baslik}: ${govdeMetni}`);

  const pazarlikli = kaydi.pazarlikliFiyat.trim();
  if (pazarlikli) {
    cumleler.push(
      satilik
        ? `Emsal taşınmazın satış fiyatı üzerinden pazarlığı bulunmakta olup, pazarlıklı fiyatı ${pazarlikli} TL olacağı düşünülmektedir.`
        : `Emsal taşınmazın kira bedeli üzerinden pazarlığı bulunmakta olup, pazarlıklı bedeli ${pazarlikli} TL olacağı düşünülmektedir.`,
    );
  }

  const carpanlar: string[] = [];
  for (const { alan, ad } of SEREFIYELER) {
    const deger = parseTrNumber(kaydi[alan]);
    if (deger === null || deger === 0) continue;
    cumleler.push(`Emsal taşınmaz ${ad} şerefiyesi açısından ${deger < 0 ? "dezavantajlıdır" : "avantajlıdır"}.`);
    carpanlar.push(`(1 ${deger < 0 ? "-" : "+"} ${formatSerefiye(deger)} ${ad} şerefiyesi)`);
  }

  const metin = cumleler.join(" ");
  const { birimFiyat, netBirimFiyat } = hesaplaEmsalDegerleri(kaydi);
  if (!birimFiyat) return metin;

  const birimSatiri =
    carpanlar.length > 0
      ? `Birim Fiyat : ${birimFiyat} TL/m2 x ${carpanlar.join(" x ")} = ${netBirimFiyat} TL/m2`
      : `Birim Fiyat : ${birimFiyat} TL/m2`;
  return metin ? `${metin}\n\n${birimSatiri}` : birimSatiri;
}
