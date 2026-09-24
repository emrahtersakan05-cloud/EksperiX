import { parseEmsalBridgeText, readLabeledValues } from "@/lib/emsal/listing-extract";
import { normalizeLabel } from "@/lib/text/normalize-tr";
import { KATEGORILER, kategoriOf, type EmsalKategori } from "./kategoriler";
import type { EmsalDurum } from "./types";

// Turns what the Eksperix Bridge extension read from a listing page into
// values for the Yeni Emsal form. Two sources, best first:
//  1. `alanlar` — structured values the extension pulled from the site's own
//     data (hepsiemlak's page state), already under this form's field labels;
//  2. the page's innerText, whose "Label  Value" rows are matched against the
//     KATEGORILER labels (sahibinden's wording) plus the aliases below.

export interface BridgePayload {
  text?: string;
  title?: string;
  url?: string;
  image?: string;
  lat?: string;
  lng?: string;
  // Field label → value, from a site-specific structured read (extension ≥ 0.6.1).
  alanlar?: Record<string, string>;
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

// Other page labels for a field, beyond the field's own label (normalized).
// Covers sahibinden's and hepsiemlak's wording.
const ETIKET_ESLERI: Record<string, string[]> = {
  m2: ["m2", "metrekare", "m2 brut"],
  krediyeUygun: ["krediye uygun", "krediye uygunluk"],
  isitma: ["isitma", "isitma tipi", "isinma tipi", "isinma"],
  esyali: ["esyali", "esya durumu"],
  kaks: ["kaks emsal", "kaks", "emsal"],
  imarDurumu: ["imar durumu", "arsa tipi"],
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

const bosMu = (v: string | undefined) => !v || /^[-–—\s]+$/.test(v);

// Category from the extension's structured read, when present: hepsiemlak's
// main category ("Konut", "İşyeri", "Arsa", "Bina") plus the sub type to split
// İşyeri into fabrika / çiftlik.
function yapisalKategori(ana: string | undefined, tip: string | undefined): EmsalKategori | undefined {
  const a = normalizeLabel(ana ?? "");
  const t = normalizeLabel(tip ?? "");
  if (!a) return undefined;
  if (a.includes("konut")) return "konut";
  if (a.includes("arsa")) return "arsa";
  if (a.includes("bina")) return "bina";
  if (a.includes("isyeri")) {
    if (/fabrika|uretim|imalat/.test(t)) return "fabrika";
    if (/ciftlik/.test(t)) return "ciftlik";
    if (/bina/.test(t)) return "bina";
    return "isyeri";
  }
  return undefined;
}

// Otherwise from the listing URL / title (portals encode it in the path:
// sahibinden "/ilan/emlak-isyeri-kiralik-…", hepsiemlak "…-satilik/tarla/…"),
// then from the emlak tipi text.
function kategoriBul(url: string, baslik: string, emlakTipi: string | undefined): EmsalKategori | undefined {
  const kaynak = normalizeLabel(`${url.replace(/[-_/]+/g, " ")} ${baslik}`);
  if (/fabrika|uretim tesisi|imalathane/.test(kaynak)) return "fabrika";
  if (/ciftlik/.test(kaynak) && !/ciftlik evi/.test(kaynak)) return "ciftlik";
  if (/emlak bina|komple bina|satilik bina|kiralik bina/.test(kaynak)) return "bina";
  // Before konut: hepsiemlak files zoned land as ".../imarli-konut/...".
  if (/arsa|tarla|imarli|bag bahce|zeytinlik/.test(kaynak)) return "arsa";
  if (/isyeri|dukkan|magaza|ofis|buro|depo|atolye|plaza/.test(kaynak)) return "isyeri";
  if (/konut|daire|villa|rezidans|mustakil|yazlik/.test(kaynak)) return "konut";
  return emlakTipi ? kategoriOf({ emlakTipi }) : undefined;
}

function durumBul(url: string, baslik: string, etiket: (k: string) => string | undefined): EmsalDurum | undefined {
  const metin = normalizeLabel(
    [etiket("durumu"), etiket("ilan durumu"), etiket("emlak tipi"), url.replace(/[-_/]+/g, " "), baslik].join(" "),
  );
  if (/kiralik/.test(metin)) return "kiralik";
  if (/satilik/.test(metin)) return "satilik";
  return undefined;
}

// The page's wording for a choice field rarely matches the option list exactly
// ("Kombi (Doğalgaz)" vs "Kombi Doğalgaz", "Kat Mülkiyeti" vs "Kat Mülkiyetli",
// "Uygun değil" for Hayır), so: yes/no-style fields by meaning, then normalized
// exact match, then containment either way.
function secenegeEsle(deger: string, secenekler: readonly string[]): string {
  const d = normalizeLabel(deger);
  const evetHayir = secenekler.includes("Evet") && secenekler.includes("Hayır");
  const varYok = secenekler.includes("Var") && secenekler.includes("Yok");
  if (evetHayir || varYok) {
    const olumsuz = /\b(degil|yok|hayir)\b/.test(d);
    const olumlu = /\b(evet|var|uygun|mevcut|esyali)\b/.test(d);
    if (olumsuz) return evetHayir ? "Hayır" : "Yok";
    if (olumlu) return evetHayir ? "Evet" : "Var";
  }
  const tam = secenekler.find((s) => normalizeLabel(s) === d);
  if (tam) return tam;
  const icinde = secenekler
    .filter((s) => normalizeLabel(s).length >= 3 && (d.includes(normalizeLabel(s)) || normalizeLabel(s).includes(d)))
    .sort((a, b) => b.length - a.length)[0];
  if (icinde) return icinde;
  // Same word, different suffix ("Kat Mülkiyeti" / "Kat Mülkiyetli"): a shared
  // prefix covering all but the last couple of letters of the shorter one.
  const ortakOnek = (a: string, b: string) => {
    let i = 0;
    while (i < a.length && i < b.length && a[i] === b[i]) i++;
    return i;
  };
  const kok = secenekler.find((s) => {
    const o = normalizeLabel(s);
    return ortakOnek(o, d) >= Math.max(6, Math.min(o.length, d.length) - 2);
  });
  return kok ?? deger;
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

// "10500000" → "10.500.000", matching how prices are typed in the form.
function fiyatBicimi(deger: string | undefined): string | undefined {
  if (!deger) return undefined;
  return /^\d+$/.test(deger) ? Number(deger).toLocaleString("tr-TR") : deger;
}

export function bridgeVerisiniAyristir(payload: BridgePayload, mevcutKategori: EmsalKategori): BridgeSonucu {
  const text = payload.text ?? "";
  const baslik = payload.title ?? "";
  const url = payload.url ?? "";
  const temel = parseEmsalBridgeText(text, baslik);
  const metin = readLabeledValues(text);
  const yapisal = new Map(
    Object.entries(payload.alanlar ?? {})
      .filter(([, v]) => typeof v === "string" && !bosMu(v))
      .map(([k, v]) => [normalizeLabel(k), v.trim()] as const),
  );
  // Structured value first, then the page text's labelled rows.
  const etiket = (k: string): string | undefined => {
    const v = yapisal.get(k) ?? metin.get(k)?.trim();
    // Portals print "-" for an empty field; a very long "value" is really the next paragraph.
    return v && !bosMu(v) && v.length <= 80 ? v : undefined;
  };

  const hamTip = etiket("emlak tipi") ?? etiket("konut tipi") ?? etiket("turu") ?? temel.emlakTipi;
  const kategori =
    yapisalKategori(yapisal.get("kategori"), yapisal.get("emlak tipi")) ?? kategoriBul(url, baslik, hamTip);
  const tanim = KATEGORILER[kategori ?? mevcutKategori];
  const doldurulanlar: string[] = [];

  const sonuc: BridgeSonucu = { kategori, degerler: {}, doldurulanlar };
  const koy = <K extends keyof Omit<BridgeSonucu, "degerler" | "doldurulanlar">>(
    key: K,
    value: BridgeSonucu[K] | undefined,
    label: string,
  ) => {
    if (!value) return;
    sonuc[key] = value;
    doldurulanlar.push(label);
  };

  koy("durum", durumBul(url, baslik, etiket), "Durumu");
  koy("emlakTipi", hamTip ? secenegeEsle(hamTip, tanim.tipSecenekleri) : undefined, tanim.tipEtiketi);
  koy("il", yapisal.get("il") ?? temel.il, "İl");
  koy("ilce", yapisal.get("ilce") ?? temel.ilce, "İlçe");
  koy("mahalle", yapisal.get("mahalle") ?? temel.koyMahalle, "Mahalle");
  koy("webAdresi", /^https?:\/\//i.test(url) ? url : undefined, "İlan Linki");
  koy("gorselUrl", /^https?:\/\//i.test(payload.image ?? "") ? payload.image : undefined, "Görsel");
  // sahibinden: "1187654321"; hepsiemlak: "171189-3".
  koy("ilanNo", etiket("ilan no")?.match(/\d[\d-]{3,}\d/)?.[0], "İlan No");
  koy("ilanTelNo", yapisal.get("ilan tel no") ?? temel.telefonNo ?? telefonBul(text), "İlan Tel No");
  koy("ilanTarihi", yapisal.get("ilan tarihi") ?? temel.ilanTarihi, "İlan Tarihi");
  koy("istenenFiyat", fiyatBicimi(yapisal.get("fiyat")) ?? temel.istenenFiyat, "İlan Fiyatı");
  if (payload.lat && payload.lng) {
    koy("lat", payload.lat, "İlan Enlem");
    koy("lng", payload.lng, "İlan Boylam");
  }

  // Text-only fallbacks for rows that pack two fields into one:
  // hepsiemlak "Brüt / Net M2: 130 m2 / 115 m2" and "Ada / Parsel No: 156 / 1".
  const brutNet = etiket("brut / net m2")?.match(/(\d[\d.,]*)\s*(?:m2)?\s*\/\s*(\d[\d.,]*)/);
  const adaParsel = etiket("ada / parsel no")?.match(/([\w.]+)\s*\/\s*([\w.]+)/);
  const ustKaynak: Record<string, string | undefined> = {
    // The explicit "Brüt / Net" row beats the free-text scan, which can latch
    // onto numbers in the description.
    m2Brut: brutNet?.[1] ?? temel.m2Brut,
    m2Net: brutNet?.[2] ?? temel.m2Net,
    odaSayisi: temel.odaSayisi,
    binaYasi: temel.binaYasi,
    kat: temel.bulunduguKat,
  };
  const ekKaynak: Record<string, string | undefined> = {
    adaNo: adaParsel?.[1],
    parselNo: adaParsel?.[2],
    // hepsiemlak has no "Kimden" row, only "Yetkili Ofis: Evet".
    kimden: temel.kimden ?? (/^evet/i.test(etiket("yetkili ofis") ?? "") ? "Emlak Ofisinden" : undefined),
  };

  for (const alan of tanim.alanlar) {
    const adaylar = [normalizeLabel(alan.label), ...(ETIKET_ESLERI[alan.key] ?? [])];
    const yapisalDeger = adaylar.map((a) => yapisal.get(a)).find(Boolean);
    let deger =
      yapisalDeger ||
      (alan.ust && ustKaynak[alan.ust]) ||
      adaylar.map((a) => etiket(a)).find(Boolean) ||
      ekKaynak[alan.key];
    if (!deger) continue;
    // Text-only: hepsiemlak splits heating into "Isınma Tipi: Kombi" + "Yakıt Tipi: Doğalgaz".
    if (alan.key === "isitma" && !yapisalDeger) {
      const yakit = etiket("yakit tipi");
      if (yakit && !normalizeLabel(deger).includes(normalizeLabel(yakit))) deger = `${deger} (${yakit})`;
    }
    if (alan.tip === "sayi") deger = sayiKismi(deger);
    if (alan.tip === "secim" && alan.secenekler) deger = secenegeEsle(deger, alan.secenekler);
    sonuc.degerler[alan.key] = deger;
    doldurulanlar.push(alan.label);
  }

  return sonuc;
}
