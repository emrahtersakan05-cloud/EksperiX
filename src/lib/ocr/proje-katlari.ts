// Turns OCR text of an approved-project page (kat planı listesi, vaziyet
// açıklaması …) into rows of "Bulunduğu Kat" + "Kat Detay Açıklaması".
// A line that starts with a floor name opens a row; the lines under it
// until the next floor name become that row's description.

export interface OkunanKat {
  kat: string;
  aciklama: string;
}

// "2. Bodrum Kat", "Bodrum Kat", "Zemin Kat", "1. Normal Kat", "3. Kat",
// "Çatı Katı", "Asma Kat", "Çekme Kat", "Bahçe Katı", "Giriş Katı",
// "Kat 2", "-1. Kat"… at the start of a line, optionally followed by ":" / "-".
const KAT_BASLIGI =
  /^\s*([-–]?\d+\s*\.?\s*(?:normal\s*|bodrum\s*)?kat[ıi]?|kat\s*\d+|(?:bodrum|zemin|giri[sş]|bah[cç]e|asma|[cç]ekme|[cç]at[ıi])(?:\s*kat[ıi]?)?)(?![a-zçğıöşü])\s*[:\-–—]?\s*/i;

function temizle(s: string): string {
  return (
    s
      .replace(/[|_~•·]+/g, " ")
      .replace(/\s+/g, " ")
      // OCR reads the "+" of a room count as "4" or "14": "341 daire" /
      // "3141 daire" → "3+1 daire" (only right before a unit word).
      .replace(/\b([1-9])\s*(?:\+|14|4|1\+)\s*([0-9])(?=\s*(?:daire|konut|mesken|oda|dubleks|tripleks))/gi, "$1+$2")
      .trim()
  );
}

// "zemin kat" → "Zemin Kat", keeping the number.
function katAdi(ham: string): string {
  return temizle(ham)
    .replace(/[:\-–—]+$/, "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/(^|\s)(\S)/g, (_, bosluk: string, harf: string) => bosluk + harf.toLocaleUpperCase("tr-TR"));
}

function cumle(parcalar: string[]): string {
  const metin = temizle(parcalar.join(" "));
  if (!metin) return "";
  const buyuk = metin.charAt(0).toLocaleUpperCase("tr-TR") + metin.slice(1);
  return /[.!?]$/.test(buyuk) ? buyuk : `${buyuk}.`;
}

export function projeKatlariniAyristir(metin: string): OkunanKat[] {
  const satirlar = metin
    .split(/\r?\n/)
    .map(temizle)
    .filter((s) => s.length > 1);
  const katlar: { kat: string; parcalar: string[] }[] = [];
  const baslik: string[] = [];

  for (const satir of satirlar) {
    const m = KAT_BASLIGI.exec(satir);
    if (m) {
      katlar.push({ kat: katAdi(m[1]), parcalar: [satir.slice(m[0].length)] });
    } else if (katlar.length) {
      katlar[katlar.length - 1].parcalar.push(satir);
    } else {
      baslik.push(satir);
    }
  }

  if (katlar.length === 0) {
    const tum = cumle(baslik);
    return tum ? [{ kat: "", aciklama: tum }] : [];
  }
  return katlar.map((k) => ({ kat: k.kat, aciklama: cumle(k.parcalar) })).filter((k) => k.kat || k.aciklama);
}
