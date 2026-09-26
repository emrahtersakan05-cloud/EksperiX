// Data in the app is not kept in ALL CAPS. Tapu PDFs, UAVT, e-imar and
// listing sites often hand over "KIZILAY MAHALLESİ", "AHMET YILMAZ"; those
// (and values typed with caps lock) become "Kızılay Mahallesi", "Ahmet
// Yılmaz". Mixed-case text is never touched.

// Kept upper case: abbreviations that are written that way.
const KISALTMALAR = new Set([
  "TAKS",
  "KAKS",
  "UAVT",
  "TKN",
  "AVM",
  "LPG",
  "TOKİ",
  "KDV",
  "TL",
  "AŞ",
  "A.Ş",
  "LTD",
  "ŞTİ",
  "TC",
  "T.C",
  "BB",
  "SGK",
  "TCDD",
  "TEDAŞ",
  "İSKİ",
  "ASKİ",
  "İZSU",
  "PTT",
  "SPK",
  "BDDK",
  "KKTC",
  "GPS",
  "UTM",
  "ITRF",
  "ED50",
  "WGS84",
  "KML",
  "PDF",
]);

// Lower case inside a title: "Ali ve Veli", "Konut ile Ticaret".
const BAGLACLAR = new Set(["ve", "ile", "veya"]);

const ROMA = /^[IVXLC]+$/;

function harfler(s: string): string[] {
  return s.match(/\p{L}/gu) ?? [];
}

// Every letter is upper case, and there is at least one real word (three
// letters or more, not an abbreviation); "A", "BB 12", "TAKS" stay as they are.
export function tamamiBuyukMu(s: string): boolean {
  const h = harfler(s);
  if (h.length < 3) return false;
  if (s !== s.toLocaleUpperCase("tr-TR") || s === s.toLocaleLowerCase("tr-TR")) return false;
  return s
    .split(/[^\p{L}\p{N}.]+/u)
    .some((k) => harfler(k).length >= 3 && !/\d/.test(k) && !KISALTMALAR.has(k.replace(/\.$/, "")) && !ROMA.test(k));
}

// A word to keep as written: abbreviations, roman numerals, codes with digits,
// single letters (block "A").
function korunur(kelime: string): boolean {
  const k = kelime.replace(/\.$/, "");
  return KISALTMALAR.has(k) || ROMA.test(k) || /\d/.test(k) || harfler(k).length <= 1;
}

const kucuk = (s: string) => s.toLocaleLowerCase("tr-TR");
const ilkBuyuk = (s: string) => s.charAt(0).toLocaleUpperCase("tr-TR") + s.slice(1);

// Words and the separators between them ("ÇANKAYA/ANKARA", "(KONUT)").
const PARCALA = /([\s/()\-,;:"'“”]+)/;

function basliga(s: string): string {
  let ilk = true;
  return s
    .split(PARCALA)
    .map((p) => {
      if (!p || PARCALA.test(p)) return p;
      const sonuc = korunur(p) ? p : !ilk && BAGLACLAR.has(kucuk(p)) ? kucuk(p) : ilkBuyuk(kucuk(p));
      ilk = false;
      return sonuc;
    })
    .join("");
}

function cumleye(s: string): string {
  let cumleBasi = true;
  return s
    .split(PARCALA)
    .map((p) => {
      if (!p || PARCALA.test(p)) return p;
      let sonuc = korunur(p) ? p : kucuk(p);
      if (cumleBasi && !korunur(p)) sonuc = ilkBuyuk(sonuc);
      cumleBasi = /[.!?]$/.test(p);
      return sonuc;
    })
    .join("");
}

// "KIZILAY MAHALLESİ" → "Kızılay Mahallesi"; a longer all-caps text (an
// annotation, a note) becomes a sentence instead: "Kira şerhi: … lehine."
export function normalYazim(s: string): string {
  if (!tamamiBuyukMu(s)) return s;
  const kelimeSayisi = s.trim().split(/\s+/).length;
  return kelimeSayisi > 6 ? cumleye(s) : basliga(s);
}

// Every string in an imported patch (nested records included).
export function normalYazimNesne<T>(deger: T): T {
  if (typeof deger === "string") return normalYazim(deger) as T;
  if (Array.isArray(deger)) return deger.map((d) => normalYazimNesne(d)) as T;
  if (deger && typeof deger === "object") {
    return Object.fromEntries(Object.entries(deger).map(([k, v]) => [k, normalYazimNesne(v)])) as T;
  }
  return deger;
}
