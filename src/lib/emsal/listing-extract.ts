import { ilSeed } from "@/lib/talep/adres-referans";
import { normalizeLabel } from "@/lib/text/normalize-tr";
import type { EmsalKaydi } from "@/lib/talep/types";

// Best-effort heuristic extraction of comparable-listing fields from free-form
// text (OCR'd from an uploaded image, or scraped from a listing web page).
// Real estate ads have no consistent layout across sources, so this can only
// ever be a rough first pass — it fills what it can find with reasonable
// confidence and leaves the rest for the user to complete manually.
export type ParsedEmsalFields = Partial<
  Pick<
    EmsalKaydi,
    | "ilanTarihi"
    | "emlakTipi"
    | "kimden"
    | "telefonNo"
    | "m2Brut"
    | "m2Net"
    | "gercekAlan"
    | "odaSayisi"
    | "binaYasi"
    | "istenenFiyat"
    | "pazarlikliFiyat"
    | "il"
  >
>;

const NORMALIZED_IL_SEED = new Map(ilSeed.map((il) => [normalizeLabel(il), il]));

const EMLAK_TIPI_SEED = [
  "Daire",
  "Villa",
  "Müstakil Ev",
  "Rezidans",
  "Yazlık",
  "Arsa",
  "Tarla",
  "Bağ",
  "Bahçe",
  "Dükkan",
  "İşyeri",
  "Ofis",
  "Depo",
  "Fabrika",
  "Atölye",
  "Bina",
];
const NORMALIZED_EMLAK_TIPI = EMLAK_TIPI_SEED.map((label) => [normalizeLabel(label), label] as const);

function findFirst(text: string, pattern: RegExp): RegExpMatchArray | null {
  return text.match(pattern);
}

function findAll(text: string, pattern: RegExp): RegExpMatchArray[] {
  return Array.from(text.matchAll(pattern));
}

function parsePrices(text: string): { istenenFiyat?: string; pazarlikliFiyat?: string } {
  const matches = findAll(text, /(\d{1,3}(?:[.,]\d{3})+|\d{4,})\s?(?:tl|₺)/gi).map((m) => m[1]);
  const unique = Array.from(new Set(matches));
  if (unique.length === 0) return {};
  if (unique.length === 1) return { istenenFiyat: unique[0] };
  return { istenenFiyat: unique[0], pazarlikliFiyat: unique[1] };
}

const AREA_LABEL_MAX_DISTANCE = 20;

// "Brüt"/"Net" can sit either before or after the m² figure they describe
// ("Brüt: 120 m²" vs. "120 m² Brüt"), and a naive "look only behind the
// number" scan misattributes a label to the WRONG neighboring number when
// two labelled figures sit close together (the label that actually follows
// number A reads as if it precedes number B). Finding every label occurrence
// independently and pairing each number with whichever label is nearest to
// it — in either direction — avoids that cross-attribution.
function parseAlanlar(text: string): { m2Brut?: string; m2Net?: string } {
  const result: { m2Brut?: string; m2Net?: string } = {};
  const occurrences = findAll(text, /(\d{2,4}(?:[.,]\d+)?)\s?m ?[²2]/gi);
  const brutPositions = findAll(text, /br[uü]t/gi).map((m) => m.index ?? 0);
  const netPositions = findAll(text, /\bnet\b/gi).map((m) => m.index ?? 0);

  function nearestDistance(positions: number[], index: number): number {
    return positions.reduce((best, pos) => Math.min(best, Math.abs(pos - index)), Infinity);
  }

  for (const occ of occurrences) {
    const index = occ.index ?? 0;
    const brutDist = nearestDistance(brutPositions, index);
    const netDist = nearestDistance(netPositions, index);
    if (brutDist > AREA_LABEL_MAX_DISTANCE && netDist > AREA_LABEL_MAX_DISTANCE) continue;

    // Assign to whichever label is closer; if that slot is already taken by
    // an earlier, even-closer occurrence, fall back to the other slot rather
    // than dropping the value — both labels were found nearby, so either
    // field is a reasonable home for it.
    const preferBrut = brutDist <= netDist;
    if (preferBrut) {
      if (!result.m2Brut) result.m2Brut = occ[1];
      else if (!result.m2Net) result.m2Net = occ[1];
    } else {
      if (!result.m2Net) result.m2Net = occ[1];
      else if (!result.m2Brut) result.m2Brut = occ[1];
    }
  }
  // A single, unlabeled m² figure is most commonly the gross (brüt) area
  // advertisers lead with — a reasonable single-value fallback.
  if (!result.m2Brut && !result.m2Net && occurrences.length > 0) {
    result.m2Brut = occurrences[0][1];
  }
  return result;
}

function parseOdaSayisi(text: string): string | undefined {
  const match = findFirst(text, /\b(\d{1,2}\s?\+\s?\d{1,2})\b/);
  return match ? match[1].replace(/\s+/g, "") : undefined;
}

// Matched against the diacritic-folded text (via normalizeLabel) rather than
// the raw string — OCR output and pasted listing text frequently drop
// Turkish dotless-ı/ş in favor of plain ASCII "i"/"s", which a pattern
// hardcoded to "yaşı"/"yıllık" would silently fail to match.
function parseBinaYasi(text: string): string | undefined {
  const normalized = normalizeLabel(text);
  const labeled = findFirst(normalized, /bina yasi\D{0,10}(\d{1,3})/);
  if (labeled) return labeled[1];
  const yillik = findFirst(normalized, /\b(\d{1,3})\s?yillik\b/);
  if (yillik) return yillik[1];
  const yasinda = findFirst(normalized, /\b(\d{1,3})\s?yasinda\b/);
  if (yasinda) return yasinda[1];
  if (/\bsifir bina\b|\byeni bina\b/.test(normalized)) return "0";
  return undefined;
}

function parseKimden(text: string): string | undefined {
  const normalized = normalizeLabel(text);
  if (normalized.includes("sahibinden")) return "Sahibinden";
  if (normalized.includes("emlak ofisi") || normalized.includes("emlakci") || normalized.includes("danisman")) {
    return "Emlakçıdan";
  }
  return undefined;
}

function parseTelefon(text: string): string | undefined {
  const match = findFirst(text, /(?:\+?90[\s.-]?)?0?\s?5\d{2}[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}\b/);
  return match ? match[0].trim() : undefined;
}

function parseIlanTarihi(text: string): string | undefined {
  const match = findFirst(text, /\b(\d{1,2})[.\/](\d{1,2})[.\/](\d{2,4})\b/);
  if (!match) return undefined;
  const [, dd, mm, yyRaw] = match;
  const yyyy = yyRaw.length === 2 ? `20${yyRaw}` : yyRaw;
  const day = dd.padStart(2, "0");
  const month = mm.padStart(2, "0");
  if (Number(month) > 12 || Number(day) > 31) return undefined;
  return `${yyyy}-${month}-${day}`;
}

function parseEmlakTipi(text: string): string | undefined {
  const normalized = normalizeLabel(text);
  const found = NORMALIZED_EMLAK_TIPI.find(([needle]) => normalized.includes(needle));
  return found?.[1];
}

function parseIl(text: string): string | undefined {
  const words = normalizeLabel(text).split(/\s+/);
  for (const word of words) {
    const match = NORMALIZED_IL_SEED.get(word);
    if (match) return match;
  }
  return undefined;
}

export function parseEmsalListingText(rawText: string): ParsedEmsalFields {
  const text = rawText.replace(/\s+/g, " ").trim();
  if (!text) return {};

  const { m2Brut, m2Net } = parseAlanlar(text);
  const { istenenFiyat, pazarlikliFiyat } = parsePrices(text);

  const result: ParsedEmsalFields = {
    ilanTarihi: parseIlanTarihi(text),
    emlakTipi: parseEmlakTipi(text),
    kimden: parseKimden(text),
    telefonNo: parseTelefon(text),
    m2Brut,
    m2Net,
    gercekAlan: m2Net,
    odaSayisi: parseOdaSayisi(text),
    binaYasi: parseBinaYasi(text),
    istenenFiyat,
    pazarlikliFiyat,
    il: parseIl(text),
  };

  for (const key of Object.keys(result) as (keyof ParsedEmsalFields)[]) {
    if (result[key] === undefined) delete result[key];
  }
  return result;
}

const TR_MONTHS: Record<string, string> = {
  ocak: "01",
  subat: "02",
  mart: "03",
  nisan: "04",
  mayis: "05",
  haziran: "06",
  temmuz: "07",
  agustos: "08",
  eylul: "09",
  ekim: "10",
  kasim: "11",
  aralik: "12",
};

function parseLongDate(value: string): string | undefined {
  const numeric = parseIlanTarihi(value);
  if (numeric) return numeric;
  const match = normalizeLabel(value).match(/(\d{1,2})\s+([a-z]+)\s+(\d{4})/);
  const month = match ? TR_MONTHS[match[2]] : undefined;
  if (!match || !month) return undefined;
  return `${match[3]}-${month}-${match[1].padStart(2, "0")}`;
}

// Listing portals render their ad details as a label/value table, which
// innerText flattens into "Label" and "Value" on consecutive lines (or
// "Label: Value" on one). Pairing them by label is far more reliable than the
// free-text heuristics above, so we use it first and let the heuristics fill
// whatever the labelled pass could not find.
export function readLabeledValues(rawText: string): Map<string, string> {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const values = new Map<string, string>();
  const put = (label: string, value: string) => {
    if (!values.has(label) && value) values.set(label, value);
  };
  lines.forEach((line, index) => {
    const inline = line.match(/^([^:]{2,30}):\s*(.+)$/);
    if (inline) put(normalizeLabel(inline[1]), inline[2].trim());
    const next = lines[index + 1];
    if (next && line.length <= 30) put(normalizeLabel(line), next);
  });
  return values;
}

function digitsOf(value: string | undefined): string | undefined {
  const match = value?.match(/\d+(?:[.,]\d+)?/);
  return match?.[0];
}

export function parseEmsalBridgeText(rawText: string, title = ""): Partial<EmsalKaydi> {
  const fields: Partial<EmsalKaydi> = { ...parseEmsalListingText(`${title}\n${rawText}`) };
  const labeled = readLabeledValues(rawText);
  const set = <K extends keyof EmsalKaydi>(key: K, value: EmsalKaydi[K] | undefined) => {
    if (value) fields[key] = value;
  };

  const tarih = labeled.get("ilan tarihi");
  set("ilanTarihi", tarih ? parseLongDate(tarih) : undefined);

  const emlakTipi = labeled.get("emlak tipi") ?? labeled.get("konut tipi") ?? labeled.get("konut sekli");
  set("emlakTipi", emlakTipi ? (parseEmlakTipi(emlakTipi) ?? emlakTipi) : undefined);

  const kimden = labeled.get("kimden");
  set("kimden", kimden ? (parseKimden(kimden) ?? kimden) : undefined);

  const brut = digitsOf(labeled.get("m2 brut"));
  const net = digitsOf(labeled.get("m2 net"));
  const brutNet = labeled.get("brut / net m2")?.match(/(\d+(?:[.,]\d+)?)\s*\/\s*(\d+(?:[.,]\d+)?)/);
  set("m2Brut", brut ?? brutNet?.[1]);
  set("m2Net", net ?? brutNet?.[2]);
  if (net ?? brutNet?.[2]) fields.gercekAlan = net ?? brutNet?.[2];

  const oda = labeled.get("oda sayisi")?.match(/\d{1,2}\s?\+\s?\d{1,2}/);
  set("odaSayisi", oda?.[0].replace(/\s+/g, ""));

  const yas = labeled.get("bina yasi");
  if (yas) set("binaYasi", /sifir|yeni/.test(normalizeLabel(yas)) ? "0" : digitsOf(yas));

  set("bulunduguKat", labeled.get("bulundugu kat"));

  const fiyat = labeled.get("fiyat");
  const fiyatMatch = fiyat?.match(/(\d{1,3}(?:[.,]\d{3})+|\d{4,})/);
  set("istenenFiyat", fiyatMatch?.[1]);

  // "Ankara / Çankaya / Kızılırmak Mh." breadcrumb-style location line.
  for (const line of rawText.split(/\r?\n/)) {
    const parts = line.split("/").map((part) => part.trim());
    if (parts.length < 2 || parts.length > 4 || parts.some((part) => !part || part.length > 40)) continue;
    const il = NORMALIZED_IL_SEED.get(normalizeLabel(parts[0]));
    if (!il) continue;
    fields.il = il;
    fields.ilce = parts[1];
    if (parts[2]) fields.koyMahalle = parts[2];
    break;
  }

  for (const key of Object.keys(fields) as (keyof EmsalKaydi)[]) {
    if (!fields[key]) delete fields[key];
  }
  return fields;
}
