// Akıcı metin şablonları: each form (keyed by its title) has a numbered
// list of templates ("Şablon – 1", "Şablon – 2", …). A template is free text
// with {Alan Adı} tokens; filling it swaps every token for that field's
// current value, so the author decides where each piece of data sits.
// Templates are stored on the server and edited only by the Sistem Yöneticisi.

export const VARSAYILAN_SABLON_SAYISI = 6;

export interface FormAlani {
  etiket: string;
  deger: string;
}

export function jeton(etiket: string): string {
  return `{${etiket}}`;
}

export function sablonAdi(sira: number): string {
  return `Şablon – ${sira + 1}`;
}

// Starting templates for a form nobody has customised yet, built from the
// fields that have a value (all fields while the form is still empty).
export function varsayilanSablonlar(baslik: string, alanlar: FormAlani[]): string[] {
  const dolu = alanlar.filter((a) => a.deger.trim());
  const etiketler = [...new Set((dolu.length ? dolu : alanlar).map((a) => a.etiket))];
  if (etiketler.length === 0) return Array(VARSAYILAN_SABLON_SAYISI).fill("");
  const kucukBaslik = baslik
    .replace(/\s*(Formu|Sekmesi)$/i, "")
    .replace(/\s*Bilgi(leri)?$/i, "")
    .trim()
    .toLocaleLowerCase("tr-TR");
  return [
    `${etiketler.map((e) => `${e} ${jeton(e)}`).join(", ")} olarak tespit edilmiştir.`,
    etiketler.map((e) => `${e}: ${jeton(e)}`).join("\n"),
    etiketler.map((e) => `• ${e}: ${jeton(e)}`).join("\n"),
    etiketler.slice(0, 4).map(jeton).join(" / "),
    `Taşınmaza ilişkin ${kucukBaslik} bilgileri incelenmiş olup ${etiketler
      .map((e) => `${e.toLocaleLowerCase("tr-TR")} ${jeton(e)}`)
      .join("; ")} olarak belirlenmiştir.`,
    "",
  ];
}

// ---- Filling -------------------------------------------------------------------
//
// A field without data leaves no trace in the text: the words written around
// it go too.
//  • [ … ] marks an optional part: dropped if any field inside is empty,
//    otherwise printed without the brackets.
//    "[Ön Bahçe Mesafesi: {Ön Bahçe} m]"
//  • Without brackets the text is cut at lines, sentences and list items
//    (", " "; " " / "): a piece whose fields are all empty is dropped. When
//    the last item of a sentence goes, the sentence ending after its field
//    ("… olarak tespit edilmiştir.") moves to the item before.

const JETON = /\{([^{}\n]+)\}/g;
// Units written right after a field; they go with it.
const BIRIM = /^\s*(m²|m2|m|km|cm|%|TL|₺|adet|kat)(?=[\s.,;:!?)]|$)/i;

function degerHaritasi(alanlar: FormAlani[]): Map<string, string> {
  const degerler = new Map<string, string>();
  for (const a of alanlar) if (!degerler.has(a.etiket)) degerler.set(a.etiket, a.deger.trim());
  return degerler;
}

function jetonlar(parca: string): string[] {
  return [...parca.matchAll(JETON)].map((m) => m[1].trim());
}

const doluMu = (d: Map<string, string>, etiket: string) => Boolean(d.get(etiket));
// Has fields, and none of them has a value.
const hepsiBos = (d: Map<string, string>, parca: string) => {
  const j = jetonlar(parca);
  return j.length > 0 && j.every((e) => !doluMu(d, e));
};

// [ … ] groups, innermost first; a bracket without a field is plain text.
function gruplariCoz(metin: string, d: Map<string, string>): string {
  let onceki: string;
  let sonuc = metin;
  do {
    onceki = sonuc;
    sonuc = sonuc.replace(/\[([^[\]]*)\]/g, (tam, ic: string) => {
      const j = jetonlar(ic);
      if (j.length === 0) return tam;
      return j.every((e) => doluMu(d, e)) ? ic : "";
    });
  } while (sonuc !== onceki);
  return sonuc;
}

const ilkHarfBuyuk = (s: string) => s.replace(/^(\s*)(\p{Ll})/u, (_, b: string, h: string) => b + h.toLocaleUpperCase("tr-TR"));

function cumleyiTemizle(cumle: string, d: Map<string, string>): string {
  if (jetonlar(cumle).length === 0) return cumle;
  if (hepsiBos(d, cumle)) return "";
  // Items and the separators between them.
  const parcalar = cumle.split(/(,\s+|;\s*|\s+\/\s+)/);
  const maddeler: { metin: string; ayrac: string }[] = [];
  for (let i = 0; i < parcalar.length; i += 2) maddeler.push({ metin: parcalar[i], ayrac: parcalar[i + 1] ?? "" });

  const kalan: { metin: string; ayrac: string }[] = [];
  maddeler.forEach((m, i) => {
    if (!hepsiBos(d, m.metin)) {
      kalan.push({ ...m });
      return;
    }
    // The last item carries the sentence ending: keep it on the item before.
    if (i === maddeler.length - 1 && kalan.length > 0) {
      const sonJeton = [...m.metin.matchAll(JETON)].pop()!;
      const kuyruk = m.metin.slice(sonJeton.index! + sonJeton[0].length).replace(BIRIM, "");
      kalan[kalan.length - 1].metin += kuyruk;
      kalan[kalan.length - 1].ayrac = "";
    }
  });
  if (kalan.length === 0) return "";
  kalan[kalan.length - 1].ayrac = "";
  const sonuc = kalan.map((m) => m.metin + m.ayrac).join("");
  // The first item went: the sentence still starts with a capital.
  return /^\s*\p{Lu}/u.test(cumle) ? ilkHarfBuyuk(sonuc) : sonuc;
}

function satiriTemizle(satir: string, d: Map<string, string>): string | null {
  if (jetonlar(satir).length === 0) return satir;
  if (hepsiBos(d, satir)) return null;
  const cumleler = satir.split(/(?<=[.!?])(\s+)/);
  const sonuc: string[] = [];
  for (let i = 0; i < cumleler.length; i += 2) {
    const c = cumleyiTemizle(cumleler[i], d);
    if (c.trim()) sonuc.push(c.trim());
  }
  return sonuc.length ? satir.match(/^\s*/)![0] + sonuc.join(" ") : null;
}

// Fills a template: every {Alan} becomes its value; the parts belonging to
// empty fields are left out (see above).
export function sablonuDoldur(metin: string, alanlar: FormAlani[]): string {
  const d = degerHaritasi(alanlar);
  const satirlar = gruplariCoz(metin, d)
    .split("\n")
    .map((s) => satiriTemizle(s, d))
    .filter((s): s is string => s !== null);
  return satirlar
    .join("\n")
    .replace(JETON, (_, etiket: string) => d.get(etiket.trim()) ?? "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ +([.,;:!?])/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// How many fields the template uses that have no value (left out of the text).
export function bosAlanSayisi(metin: string, alanlar: FormAlani[]): number {
  const d = degerHaritasi(alanlar);
  return new Set(jetonlar(metin).filter((e) => !doluMu(d, e))).size;
}
