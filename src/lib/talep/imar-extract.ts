import { normalizeLabel } from "@/lib/text/normalize-tr";
import type { ImarDurumuData } from "./types";

export type ParsedImarFields = Partial<ImarDurumuData>;
type ImarField = keyof ImarDurumuData;

// Field labels as they render on Netcad-based "e-imar" result pages (the
// platform behind keos.<il>.bel.tr/imardurumu/... and similar municipal
// portals) — each label sits in its own cell, immediately followed by its
// value in the next cell/line once the page text is copied or read.
const FIELD_LABELS: Record<ImarField, string[]> = {
  meriImarPlani: ["meri imar plani"],
  fonksiyon: ["fonksiyon"],
  tasdikTarihi: ["tasdik tarihi"],
  pafta: ["pafta"],
  olcek: ["olcek", "olcegi"],
  ada: ["ada"],
  parsel: ["parsel"],
  ilce: ["ilce"],
  mahalle: ["mahalle"],
  hesapAlani: ["hesap alani"],
  katAdedi: ["kat adedi"],
  binaYuksekligi: ["bina yuksekligi"],
  onBahce: ["on bahce"],
  yanBahce: ["yan bahce"],
  arkaBahce: ["arka bahce"],
  insaatNizami: ["insaat nizami"],
  taks: ["taks"],
  kaks: ["kaks emsal", "kaks"],
  kotAlinacakNokta: ["kot alinacak nokta"],
  projeksiyon: ["projeksiyon"],
  kartezyenKoordinat: ["kartezyen koordinat"],
  cografiKoordinat: ["cografi koordinat"],
};

const NORMALIZED_FIELD_LABELS: Record<ImarField, string[]> = Object.fromEntries(
  (Object.entries(FIELD_LABELS) as [ImarField, string[]][]).map(([field, labels]) => [
    field,
    labels.map(normalizeLabel),
  ]),
) as Record<ImarField, string[]>;

// Map/route button captions ("Harita", "Google Maps"...) that ride along
// inside the Projeksiyon / Koordinat cells right after the real value —
// stripped wherever they trail it, whether glued to the same line or read
// out as their own following line.
const TRAILING_LINK_PATTERNS = [
  /\s*harita\s*$/i,
  /\s*google maps\s*$/i,
  /\s*yandex maps\s*$/i,
  /\s*openstreet maps\s*$/i,
  /\s*tkgm\s*\|?\s*parsel\s*sorgu\s*$/i,
];

function endsWithLabel(normalized: string, known: string): boolean {
  return normalized === known || normalized.endsWith(` ${known}`);
}

function bestLabelMatch(normalized: string): ImarField | null {
  let best: { field: ImarField; length: number } | null = null;
  for (const [field, labels] of Object.entries(NORMALIZED_FIELD_LABELS) as [ImarField, string[]][]) {
    for (const label of labels) {
      if (endsWithLabel(normalized, label) && (!best || label.length > best.length)) {
        best = { field, length: label.length };
      }
    }
  }
  return best?.field ?? null;
}

function stripTrailingLinkCaptions(value: string): string {
  let v = value.trim();
  let changed = true;
  while (changed) {
    changed = false;
    for (const pattern of TRAILING_LINK_PATTERNS) {
      const next = v.replace(pattern, "").trim();
      if (next !== v) {
        v = next;
        changed = true;
      }
    }
  }
  return v;
}

// TAKS/KAKS cells often render as "- (1,75)" (raw ratio dash, Emsal in
// parens) — the parenthesized number is the value actually worth keeping.
function extractParenOrRaw(value: string): string {
  const match = value.match(/\(([^)]+)\)/);
  return match ? match[1].trim() : value;
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

// The "Tasdik Tarihi" input is a native date field, which only accepts yyyy-mm-dd —
// the e-imar pages print "12.03.2015" or "12 Mart 2015".
function toIsoDate(value: string): string | null {
  const iso = value.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (iso) return iso[0];
  const numeric = value.match(/\b(\d{1,2})[./-](\d{1,2})[./-](\d{4})\b/);
  if (numeric) {
    const [, dd, mm, yyyy] = numeric;
    return Number(mm) >= 1 && Number(mm) <= 12 && Number(dd) >= 1 && Number(dd) <= 31
      ? `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`
      : null;
  }
  const named = normalizeLabel(value).match(/\b(\d{1,2}) ([a-z]+) (\d{4})\b/);
  const month = named ? TR_MONTHS[named[2]] : undefined;
  return named && month ? `${named[3]}-${month}-${named[1].padStart(2, "0")}` : null;
}

function sanitizeValue(value: string): string | null {
  const trimmed = value
    .trim()
    .replace(/^[|:;\-–—\s]+/, "")
    .replace(/[|:;\-–—\s]+$/, "");
  if (!trimmed || trimmed === "-" || trimmed === "--") return null;
  return trimmed;
}

// Parses the plain text of a Netcad e-imar result page (copy-pasted, or read
// from the DOM by the browser extension) into İmar Durumu form fields. Only
// fields with a genuine (non-"-") value on the source page are returned —
// callers should patch just those keys rather than clearing the rest, since
// a dash on the government site doesn't mean the user's own entry is wrong.
export function parseImarDurumuText(text: string): ParsedImarFields {
  // Table rows come out of `innerText` as tab-separated cells on ONE line
  // ("Ada\t27403\tParsel\t1"), so every tab is treated as a cell/line break.
  const lines = text
    .split(/\r?\n|\t+/)
    .map((l) => l.trim())
    .filter(Boolean);

  const result: ParsedImarFields = {};

  function store(field: ImarField, rawValue: string) {
    let value = stripTrailingLinkCaptions(rawValue);
    if (field === "taks" || field === "kaks") value = extractParenOrRaw(value);
    if (field === "hesapAlani") value = value.replace(/\s*m[²2]\s*$/i, "").trim();
    if (field === "tasdikTarihi") {
      const iso = toIsoDate(value);
      if (iso) result[field] = iso;
      return;
    }
    const sanitized = sanitizeValue(value);
    if (sanitized) result[field] = sanitized;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // "Fonksiyon : Konut Alanı" — label and value on the same line.
    const inline = line.match(/^([^:]{2,40}):\s*(.+)$/);
    if (inline) {
      const inlineField = bestLabelMatch(normalizeLabel(inline[1]));
      if (inlineField && !result[inlineField] && !bestLabelMatch(normalizeLabel(inline[2]))) {
        store(inlineField, inline[2]);
        continue;
      }
    }

    const field = bestLabelMatch(normalizeLabel(line));
    if (!field || result[field]) continue;

    const nextLine = lines[i + 1];
    if (!nextLine || bestLabelMatch(normalizeLabel(nextLine))) continue;
    store(field, nextLine);
  }

  return result;
}
