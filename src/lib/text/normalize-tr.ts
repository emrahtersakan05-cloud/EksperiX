// Unicode superscript/subscript digits (e.g. "m²" for square meters, common
// throughout this app's field labels) fold to their plain-digit form. Without
// this the character-whitelist strip below just deletes them outright —
// "Yüzölçüm(m²)" would normalize to "...m" with the "2" silently gone,
// breaking any label match that expects "m2".
const SUPERSCRIPT_DIGITS: Record<string, string> = {
  "⁰": "0",
  "¹": "1",
  "²": "2",
  "³": "3",
  "⁴": "4",
  "⁵": "5",
  "⁶": "6",
  "⁷": "7",
  "⁸": "8",
  "⁹": "9",
};

// Normalizes Turkish text to plain ASCII lowercase so extraction noise
// (missing cedillas/dots, mixed case, OCR artifacts) doesn't break label
// matching. Shared by the UAVT OCR parser and the Tapu PDF parser.
export function normalizeLabel(s: string): string {
  return s
    .toLocaleLowerCase("tr-TR")
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (c) => SUPERSCRIPT_DIGITS[c])
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u")
    .replace(/[^a-z0-9\s/]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
