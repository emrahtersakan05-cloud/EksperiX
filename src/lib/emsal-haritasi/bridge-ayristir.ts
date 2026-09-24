import { parseEmsalBridgeText, readLabeledValues } from "@/lib/emsal/listing-extract";
import { normalizeLabel } from "@/lib/text/normalize-tr";
import { KATEGORILER, kategoriOf, type EmsalKategori, type KategoriAlani } from "./kategoriler";
import type { EmsalDurum } from "./types";

// Turns what the Eksperix Bridge extension read from a listing page (its
// innerText plus title / url / og:image / map coordinates) into values for the
// Yeni Emsal form. Listing portals print their details as "Label  Value"
// rows, and the per-category field labels in KATEGORILER were chosen to match
// those rows (sahibinden's wording), so most fields are a direct label lookup.

export interface BridgePayload {
  text?: string;
  title?: string;
  url?: string;
  image?: string;
  lat?: string;
  lng?: string;
}

export interface BridgeSonucu {
  kategori?: EmsalKategori;
  durum?: EmsalDurum;
  emlakTipi?: string;
  il?: string;
  ilce?: string;
  mahalle?: string;
  webAdresi?: string;
  gorselUrl?: string;
  ilanNo?: string;
  ilanTelNo?: string;
  ilanTarihi?: string;
  istenenFiyat?: string;
  lat?: string;
  lng?: string;
  // Category field values keyed by KategoriAlani.key.
  degerler: Record<string, string>;
  // Labels of everything that was filled, for the "what came in" summary.
  doldurulanlar: string[];
}

// Extra page labels some portals use for a field, beyond the field's own label.
const ETIKET_ESLERI: Record<string, string[]> = {
  krediyeUygun: ["krediye uygun", "krediye uygunluk"],
  isitma: ["isitma", "isitma tipi"],
  kaks: ["kaks emsal", "kaks", "emsal"],
  bolumOdaSayisi: ["bolum oda sayisi", "bolum sayisi"],
  birKattakiDaire: ["bir kattaki daire", "kattaki daire sayisi"],
  girisYuksekligi: ["giris yuksekligi m", "giris yuksekligi"],
  enerjiKimlik: ["enerji kimlik belgesi", "enerji sinifi"],
  kullanimDurumu: ["kullanim durumu"],
  siteIcerisinde: ["site icerisinde", "site icinde"],
  katSayisi: ["kat sayisi", "toplam kat sayisi"],
  aidat: ["aidat tl", "aidat"],
  acikAlan: ["acik alan m2", "acik alan"],
  kapaliAlan: ["kapali alan m2", "kapali alan"],
};

// Category from the listing URL / title first (portals encode it in the path:
// sahibinden "/ilan/emlak-isyeri-kiralik-…", hepsiemlak "/satilik/arsa"…),
// then from the emlak tipi text.
function kategoriBul(url: string, baslik: string, emlakTipi: string | undefined): EmsalKategori | undefined {
  const kaynak = normalizeLabel(`${url.replace(/[-_/]+/g, " ")} ${baslik}`);
  if (/fabrika|uretim tesisi|imalathane/.test(kaynak)) return "fabrika";
  if (/ciftlik/.test(kaynak) && !/ciftlik evi/.test(kaynak)) return "ciftlik";
  if (/emlak bina|komple bina|satilik bina|kiralik bina/.test(kaynak)) return "bina";
  if (/arsa|tarla|bag bahce|zeytinlik/.test(kaynak)) return "arsa";
  if (/isyeri|dukkan|magaza|ofis|buro|depo|atolye|plaza/.test(kaynak)) return "isyeri";
  if (/konut|daire|villa|rezidans|mustakil|yazlik/.test(kaynak)) return "konut";
  return emlakTipi ? kategoriOf({ emlakTipi }) : undefined;
}

function durumBul(url: string, baslik: string, etiketler: Map<string, string>): EmsalDurum | undefined {
  const metin = normalizeLabel(
    `${etiketler.get("emlak tipi") ?? ""} ${etiketler.get("durumu") ?? ""} ${url.replace(/[-_/]+/g, " ")} ${baslik}`,
  );
  if (/kiralik/.test(metin)) return "kiralik";
  if (/satilik/.test(metin)) return "satilik";
  return undefined;
}

// The page's wording for a choice field rarely matches the option list exactly
// ("Kombi (Doğalgaz)" vs "Kombi Doğalgaz", "Satılık Dükkan & Mağaza"), so
// match normalized text, exact first, then containment either way.
function secenegeEsle(deger: string, secenekler: readonly string[]): string {
  const d = normalizeLabel(deger);
  const tam = secenekler.find((s) => normalizeLabel(s) === d);
  if (tam) return tam;
  const icinde = secenekler
    .filter((s) => normalizeLabel(s).length >= 3 && (d.includes(normalizeLabel(s)) || normalizeLabel(s).includes(d)))
    .sort((a, b) => b.length - a.length)[0];
  return icinde ?? deger;
}

function etiketDegeri(alan: KategoriAlani, etiketler: Map<string, string>): string | undefined {
  const adaylar = [normalizeLabel(alan.label), ...(ETIKET_ESLERI[alan.key] ?? [])];
  for (const aday of adaylar) {
    const deger = etiketler.get(aday)?.trim();
    // Portals print "-" for an empty field; a very long "value" is really the next paragraph.
    if (deger && !/^[-–—\s]+$/.test(deger) && deger.length <= 80) return deger;
  }
  return undefined;
}

// Turkish mobile / landline numbers as portals print them: "0 (532) 111 22 33",
// "+90 532 111 2233", "0312 444 55 66".
function telefonBul(text: string): string | undefined {
  const match = text.match(/(?:\+90|\b0)\s*\(?\s*([2-5]\d{2})\s*\)?\s*(\d{3})\s*(\d{2})\s*(\d{2})\b/);
  return match ? `0${match[1]} ${match[2]} ${match[3]} ${match[4]}` : undefined;
}

function sayiKismi(deger: string): string {
  return deger.match(/-?\d[\d.,]*/)?.[0] ?? deger;
}

export function bridgeVerisiniAyristir(payload: BridgePayload, mevcutKategori: EmsalKategori): BridgeSonucu {
  const text = payload.text ?? "";
  const baslik = payload.title ?? "";
  const url = payload.url ?? "";
  const temel = parseEmsalBridgeText(text, baslik);
  const etiketler = readLabeledValues(text);

  const kategori = kategoriBul(url, baslik, temel.emlakTipi);
  const tanim = KATEGORILER[kategori ?? mevcutKategori];
  const doldurulanlar: string[] = [];

  const sonuc: BridgeSonucu = { kategori, degerler: {}, doldurulanlar };
  const koy = <K extends keyof Omit<BridgeSonucu, "degerler" | "doldurulanlar">>(
    key: K,
    value: BridgeSonucu[K] | undefined,
    etiket: string,
  ) => {
    if (!value) return;
    sonuc[key] = value;
    doldurulanlar.push(etiket);
  };

  koy("durum", durumBul(url, baslik, etiketler), "Durumu");
  const hamTip = etiketler.get("emlak tipi") ?? etiketler.get("turu") ?? temel.emlakTipi;
  koy("emlakTipi", hamTip ? secenegeEsle(hamTip, tanim.tipSecenekleri) : undefined, tanim.tipEtiketi);
  koy("il", temel.il, "İl");
  koy("ilce", temel.ilce, "İlçe");
  koy("mahalle", temel.koyMahalle, "Mahalle");
  koy("webAdresi", /^https?:\/\//i.test(url) ? url : undefined, "İlan Linki");
  koy("gorselUrl", /^https?:\/\//i.test(payload.image ?? "") ? payload.image : undefined, "Görsel");
  koy("ilanNo", etiketler.get("ilan no")?.match(/\d{5,}/)?.[0], "İlan No");
  koy("ilanTelNo", temel.telefonNo ?? telefonBul(text), "İlan Tel No");
  koy("ilanTarihi", temel.ilanTarihi, "İlan Tarihi");
  koy("istenenFiyat", temel.istenenFiyat, "İlan Fiyatı");
  if (payload.lat && payload.lng) {
    koy("lat", payload.lat, "İlan Enlem");
    koy("lng", payload.lng, "İlan Boylam");
  }

  // Top-level columns come from the dedicated parsers (they clean units and
  // formats); the rest by label.
  const ustKaynak = {
    m2Brut: temel.m2Brut,
    m2Net: temel.m2Net,
    odaSayisi: temel.odaSayisi,
    binaYasi: temel.binaYasi,
    kat: temel.bulunduguKat,
  };
  for (const alan of tanim.alanlar) {
    let deger = (alan.ust && ustKaynak[alan.ust]) || etiketDegeri(alan, etiketler);
    if (!deger && alan.key === "kimden") deger = temel.kimden;
    if (!deger) continue;
    if (alan.tip === "sayi") deger = sayiKismi(deger);
    if (alan.tip === "secim" && alan.secenekler) deger = secenegeEsle(deger, alan.secenekler);
    sonuc.degerler[alan.key] = deger;
    doldurulanlar.push(alan.label);
  }

  return sonuc;
}
