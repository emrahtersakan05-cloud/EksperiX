import { createWorker } from "tesseract.js";
import { ilSeed } from "@/lib/talep/adres-referans";
import { normalizeLabel } from "@/lib/text/normalize-tr";
import type { AdresKonumData } from "@/lib/talep/types";

export interface OcrProgress {
  status: string;
  progress: number;
}

export interface OcrWord {
  text: string;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

export interface OcrResult {
  text: string;
  words: OcrWord[];
}

export async function recognizeText(imageDataUrl: string, onProgress?: (p: OcrProgress) => void): Promise<OcrResult> {
  const worker = await createWorker("tur", 1, {
    logger: (m) => onProgress?.({ status: m.status, progress: m.progress }),
  });
  try {
    const { data } = await worker.recognize(imageDataUrl, {}, { blocks: true });
    const words: OcrWord[] = [];
    for (const block of data.blocks ?? []) {
      for (const paragraph of block.paragraphs) {
        for (const line of paragraph.lines) {
          for (const word of line.words) {
            words.push({
              text: word.text,
              x0: word.bbox.x0,
              x1: word.bbox.x1,
              y0: word.bbox.y0,
              y1: word.bbox.y1,
            });
          }
        }
      }
    }
    return { text: data.text, words };
  } finally {
    await worker.terminate();
  }
}

// Tesseract's own line/paragraph/block segmentation can split one visually
// contiguous row into several fragments when it misreads wide gaps between
// table cells as column/block boundaries. Reconstructing rows here — cluster
// all words purely by vertical position, independent of how Tesseract grouped
// them — gives a reliable single row for the header and one for the data,
// which is what the column-alignment logic below depends on.
function clusterIntoRows(words: OcrWord[]): OcrWord[][] {
  const sorted = [...words].sort((a, b) => a.y0 - b.y0);
  const rows: { centerY: number; words: OcrWord[] }[] = [];

  for (const word of sorted) {
    const centerY = (word.y0 + word.y1) / 2;
    const tolerance = Math.max((word.y1 - word.y0) * 0.6, 8);
    const row = rows.find((r) => Math.abs(r.centerY - centerY) <= tolerance);
    if (row) {
      row.words.push(word);
      row.centerY = row.words.reduce((sum, w) => sum + (w.y0 + w.y1) / 2, 0) / row.words.length;
    } else {
      rows.push({ centerY, words: [word] });
    }
  }

  return rows.map((r) => r.words.sort((a, b) => a.x0 - b.x0));
}

export type ParsedUavtFields = Partial<Omit<AdresKonumData, "uavtGorselUrl" | "kmlDosyaAdi" | "kmlKonumlari">>;

type TargetField = keyof ParsedUavtFields;
type PastedSection = "adres" | "numaraj" | "bagimsiz";

// OCR very commonly misreads İ/I as "l" or "1" (e.g. "İç Kapı" -> "lc Kapi").
function foldOcrConfusables(s: string): string {
  return s.replace(/[l1]/g, "i");
}

function isNoiseToken(s: string): boolean {
  return /^[—–|"“”'’.,;:]+$/.test(s);
}

const NORMALIZED_IL_SEED = new Map(ilSeed.map((il) => [normalizeLabel(il), il]));

// The breadcrumb's İl segment is frequently preceded by OCR garbage (a
// misread location-pin icon, or stray page-chrome text that ended up on the
// same visual line). Since every real value here is one of Turkey's 81
// provinces, matching the trailing word against that known list — the same
// "longest known match wins the suffix" approach used for field labels below
// — recovers the real province and discards whatever junk sits in front of
// it, instead of trusting a naive "strip a leading symbol" cleanup.
function matchKnownIl(text: string): string | null {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;
  const lastWord = normalizeLabel(words[words.length - 1]);
  return NORMALIZED_IL_SEED.get(lastWord) ?? null;
}

// Generic "Label: değer" / "Label\ndeğer" fallback for isolated labelled
// values that sit OUTSIDE the two-table grid — currently just the footer
// confirmation line ("Bağımsız Bölüm Kimlik No : X"). The other 14 table
// columns must NOT be listed here: their header/value text also appears as
// plain lines in the linearized OCR text (e.g. a lone "Kimlik No" header
// cell), and matching against that text — rather than the actual table
// geometry in parseNumarajTable — has no way to tell which physically
// adjacent line is really its value, so it previously grabbed unrelated
// table fragments as garbage.
const FIELD_LABELS: Partial<Record<TargetField, string[]>> = {
  bagimsizBolumKimlikNo: ["bagimsiz bolum kimlik no"],
};

const PASTED_SECTION_LABELS: Record<PastedSection, string[]> = {
  adres: ["adres", "adres bilgileri", "adres bilgileri formu"],
  numaraj: ["numaraj", "numaraj bilgileri", "numaraj bilgileri formu"],
  bagimsiz: ["bagimsiz bolum", "bagimsiz bolum bilgileri", "bagimsiz bolum bilgileri formu"],
};

const PASTED_FIELD_LABELS: Record<PastedSection, Partial<Record<TargetField, string[]>>> = {
  adres: {
    il: ["il", "il adi", "il adı"],
    ilce: ["ilce", "ilce adi", "ilçe adı"],
    mahalle: ["mahalle", "mahalle koy", "mahalle adi", "mahalle adı"],
    koy: ["koy"],
    semtMevki: ["semt", "mevki", "semt mevki", "semt / mevki"],
    caddeBulvar: ["cadde bulvar", "cadde / bulvar", "yol", "yol adi", "yol adı"],
    sokak: ["sokak", "sokak adi", "sokak adı"],
  },
  numaraj: {
    numarajKimlikNo: ["kimlik no", "numaraj kimlik no"],
    ada: ["ada"],
    parsel: ["parsel"],
    pafta: ["pafta"],
    postaKodu: ["posta kod", "posta kodu", "posta kodu ptt"],
    numarajTipi: ["numaraj tipi", "numarataj tipi"],
    siteAdi: ["site adi"],
    apartmanBlokAdi: ["apartman blok adi", "apartman / blok adi", "blok adi", "blok adı", "bina blok adi"],
    disKapi: ["dis kapi", "dis kapi no", "dis kapi numarasi", "dis kapi numarası"],
  },
  bagimsiz: {
    bagimsizBolumKimlikNo: ["kimlik no", "bagimsiz bolum kimlik no"],
    icKapi: ["ic kapi", "ic kapi no", "ic kapi numarasi", "iç kapı numarası"],
    kullanimAmaci: ["kullanim amaci", "kullanim sekli"],
    tip: ["tip"],
    durum: ["durum"],
    tapuNo: ["tapu no"],
  },
};

type LabelTable = Partial<Record<TargetField, string[]>>;
type NormalizedSectionFieldPattern = { field: TargetField; label: string; wordCount: number };

const NORMALIZED_FIELD_LABELS: LabelTable = Object.fromEntries(
  Object.entries(FIELD_LABELS).map(([field, labels]) => [field, labels!.map(normalizeLabel)]),
);

const FUZZY_FIELD_LABELS: LabelTable = Object.fromEntries(
  Object.entries(NORMALIZED_FIELD_LABELS).map(([field, labels]) => [field, labels!.map(foldOcrConfusables)]),
);

// Accepts an exact match or the known label as a trailing phrase, so stray
// OCR junk glued to the front (list bullets like "2* ", stray symbols) doesn't
// block the match — the label itself still has to be the very end of the line.
function endsWithLabel(normalized: string, known: string): boolean {
  return normalized === known || normalized.endsWith(` ${known}`);
}

// Picks the longest (most specific) matching label so a short label like
// "kimlik no" doesn't shadow a longer one it happens to be a suffix of, like
// "bağımsız bölüm kimlik no".
function bestLabelMatch(normalized: string, table: LabelTable): TargetField | null {
  let best: { field: TargetField; length: number } | null = null;
  for (const [field, labels] of Object.entries(table) as [TargetField, string[]][]) {
    for (const l of labels) {
      if (endsWithLabel(normalized, l) && (!best || l.length > best.length)) {
        best = { field, length: l.length };
      }
    }
  }
  return best?.field ?? null;
}

function matchLabel(normalized: string): TargetField | null {
  const exact = bestLabelMatch(normalized, NORMALIZED_FIELD_LABELS);
  if (exact) return exact;
  return bestLabelMatch(foldOcrConfusables(normalized), FUZZY_FIELD_LABELS);
}

function matchPastedSection(normalized: string): PastedSection | null {
  for (const [section, labels] of Object.entries(PASTED_SECTION_LABELS) as [PastedSection, string[]][]) {
    if (labels.some((label) => endsWithLabel(normalized, label))) return section;
  }
  return null;
}

function matchPastedField(section: PastedSection, normalized: string): TargetField | null {
  return bestLabelMatch(normalized, PASTED_FIELD_LABELS[section] as LabelTable);
}

const NORMALIZED_PASTED_FIELD_PATTERNS: Record<PastedSection, NormalizedSectionFieldPattern[]> = Object.fromEntries(
  (Object.entries(PASTED_FIELD_LABELS) as [PastedSection, Partial<Record<TargetField, string[]>>][]).map(
    ([section, table]) => [
      section,
      (Object.entries(table) as [TargetField, string[]][]).flatMap(([field, labels]) =>
        labels.map((label) => {
          const normalized = normalizeLabel(label);
          return {
            field,
            label: normalized,
            wordCount: normalized.split(/\s+/).filter(Boolean).length,
          };
        }),
      ),
    ],
  ),
) as Record<PastedSection, NormalizedSectionFieldPattern[]>;

function setIfEmpty(result: ParsedUavtFields, field: TargetField, value: string | undefined) {
  const trimmed = sanitizeParsedValue(value);
  if (trimmed && !result[field]) result[field] = trimmed;
}

function sanitizeParsedValue(value: string | undefined): string | null {
  const trimmed = value
    ?.trim()
    .replace(/^[|:;/,\-–—\s]+/, "")
    .replace(/[|:;/,\-–—\s]+$/, "");
  if (!trimmed) return null;

  const normalized = normalizeLabel(trimmed);
  if (!normalized) return null;
  if (["-", "--", "yok", "bulunamadi", "bulunamiyor", "bilinmiyor"].includes(normalized)) return null;

  return trimmed;
}

// The UAVT lookup page renders one summary line at the top, shaped like:
// "İL / İLÇE / MAHALLE / YOL ADI (Tip) / DIŞ KAPI - KULLANIM AMACI - NUMARAJ TİPİ - DURUM / İç Kapı No : X - Kullanım Amacı : Y - Tip : Z - Durum : W"
// It's the single most reliable source since it's plain text, not a table.
function parseBreadcrumb(lines: string[], result: ParsedUavtFields) {
  // Start accumulating from the first line that actually looks like part of
  // the breadcrumb (contains a " / " separator), not from line 0 — otherwise
  // unrelated page-chrome text above the breadcrumb gets glued onto segment 0.
  let startIdx = lines.findIndex((l) => /\s\/\s/.test(l));
  if (startIdx === -1) startIdx = 0;

  let acc = "";
  for (let i = startIdx; i < Math.min(lines.length, startIdx + 6); i++) {
    acc = acc ? `${acc} ${lines[i]}` : lines[i];
    if ((acc.match(/\s\/\s/g) ?? []).length >= 4) break;
  }

  const segments = acc.split(/\s\/\s/).map((s) => s.trim());
  if (segments.length < 4) return;

  // The location-pin icon before "İl" is frequently misread as a stray
  // symbol (©, °, etc.) glued to the front of the first segment.
  const seg0 = (segments[0] ?? "").replace(/^[^\p{L}]+/u, "").trim();
  setIfEmpty(result, "il", matchKnownIl(seg0) ?? seg0);
  setIfEmpty(result, "ilce", segments[1]);

  // Turkish İ/I don't case-fold reliably under a plain regex /i flag, so the
  // mahalle/köy suffix is detected on the normalized (locale-lowercased) word
  // and then stripped from the original text by word count, not by regex.
  const seg2 = segments[2] ?? "";
  const seg2Words = seg2.split(/\s+/).filter(Boolean);
  const seg2LastNorm = normalizeLabel(seg2Words[seg2Words.length - 1] ?? "");
  if (/^k[öo]y[üu]?$/.test(seg2LastNorm)) {
    setIfEmpty(result, "koy", seg2Words.slice(0, -1).join(" ") || seg2);
  } else if (seg2LastNorm === "mahallesi") {
    setIfEmpty(result, "mahalle", seg2Words.slice(0, -1).join(" ") || seg2);
  } else if (seg2) {
    setIfEmpty(result, "mahalle", seg2);
  }

  const seg3 = segments[3] ?? "";
  const roadMatch = seg3.match(/^(.+?)\s*\(([^)]+)\)$/);
  if (roadMatch) {
    const roadName = roadMatch[1].trim();
    const roadType = roadMatch[2].trim();
    if (normalizeLabel(roadType).includes("sokak")) {
      setIfEmpty(result, "sokak", `${roadName} ${roadType}`);
    } else {
      setIfEmpty(result, "caddeBulvar", `${roadName} ${roadType}`);
    }
  } else if (seg3) {
    setIfEmpty(result, "caddeBulvar", seg3);
  }

  const seg4 = (segments[4] ?? "").split(/\s-\s/).map((s) => s.trim());
  if (seg4[0]) setIfEmpty(result, "disKapi", seg4[0]);
  if (seg4[1]) setIfEmpty(result, "kullanimAmaci", seg4[1]);
  if (seg4[2]) setIfEmpty(result, "numarajTipi", seg4[2]);
  if (seg4[3]) setIfEmpty(result, "durum", seg4[3]);

  const seg5 = (segments[5] ?? "").split(/\s-\s/).map((s) => s.trim());
  for (const part of seg5) {
    const kv = part.match(/^(.+?)\s*:\s*(.+)$/);
    if (!kv) continue;
    const field = matchLabel(normalizeLabel(kv[1]));
    if (field) setIfEmpty(result, field, kv[2]);
  }
}

// A genuine footer value here is a short id/word, never a run-on of several
// more field fragments. Capping the word count (mirroring the same guard in
// assignDataRowToColumns) means a mis-scoped match discards itself instead of
// writing a long garbage string into the field.
const MAX_LABELED_VALUE_WORDS = 4;

function capLabeledValue(value: string): string | null {
  const words = value.trim().split(/\s+/).filter(Boolean);
  return words.length > 0 && words.length <= MAX_LABELED_VALUE_WORDS ? words.join(" ") : null;
}

// Isolated "Label: değer" / "Label\ndeğer" pairs anywhere else in the text
// (currently used for the "Bağımsız Bölüm Kimlik No : X" footer line). Only
// ":" is accepted as a separator — a bare "-" is also the table's own
// placeholder for an empty cell, so treating it as a label/value separator
// too easily misfires on unrelated table text.
function parseLabeledLines(lines: string[], result: ParsedUavtFields) {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const inline = line.match(/^(.+?)\s*:\s*(.+)$/);
    if (inline) {
      const field = matchLabel(normalizeLabel(inline[1]));
      const value = field ? capLabeledValue(inline[2]) : null;
      if (field && value) setIfEmpty(result, field, value);
      continue;
    }

    const field = matchLabel(normalizeLabel(line));
    if (field) {
      const next = lines[i + 1];
      const value = next && !matchLabel(normalizeLabel(next)) ? capLabeledValue(next) : null;
      if (value) setIfEmpty(result, field, value);
    }
  }
}

function splitTextLabelValue(line: string): [string, string] | null {
  const colonIdx = line.indexOf(":");
  if (colonIdx !== -1) return [line.slice(0, colonIdx), line.slice(colonIdx + 1)];

  const tabMatch = line.match(/\t+/);
  if (tabMatch && tabMatch.index !== undefined) {
    return [line.slice(0, tabMatch.index), line.slice(tabMatch.index + tabMatch[0].length)];
  }

  const gapMatch = line.match(/\s{2,}/);
  if (gapMatch && gapMatch.index !== undefined) {
    return [line.slice(0, gapMatch.index), line.slice(gapMatch.index + gapMatch[0].length)];
  }
  return null;
}

const PASTED_TABLE_COLUMNS: { field: TargetField; headers: string[] }[] = [
  { field: "numarajKimlikNo", headers: ["kimlik no"] },
  { field: "ada", headers: ["ada"] },
  { field: "parsel", headers: ["parsel"] },
  { field: "pafta", headers: ["pafta"] },
  { field: "postaKodu", headers: ["posta kod", "posta kodu"] },
  { field: "numarajTipi", headers: ["numaraj tipi", "numarataj tipi"] },
  { field: "siteAdi", headers: ["site adi"] },
  { field: "apartmanBlokAdi", headers: ["apartmanblok adi", "apartman/blok adi", "apartman blok adi"] },
  { field: "disKapi", headers: ["dis kapi", "dis kapi no"] },
  { field: "bagimsizBolumKimlikNo", headers: ["kimlik no"] },
  { field: "icKapi", headers: ["ic kapi", "ic kapi no"] },
  { field: "kullanimAmaci", headers: ["kullanim amaci", "kullanim sekli"] },
  { field: "tip", headers: ["tip"] },
  { field: "durum", headers: ["durum"] },
  { field: "tapuNo", headers: ["tapu no"] },
];

function splitTabCells(line: string): string[] {
  const cells = line.split(/\t/).map((cell) => cell.trim());
  while (cells.length > 0 && cells[cells.length - 1] === "") cells.pop();
  return cells;
}

function pastedHeaderMatches(cell: string, knownHeaders: string[]): boolean {
  const normalized = normalizeLabel(cell);
  return knownHeaders.some((header) => normalized === normalizeLabel(header));
}

function looksLikePastedTableHeader(cells: string[]): boolean {
  if (cells.length < 10) return false;

  let matchCount = 0;
  const max = Math.min(cells.length, PASTED_TABLE_COLUMNS.length);

  for (let i = 0; i < max; i++) {
    if (pastedHeaderMatches(cells[i], PASTED_TABLE_COLUMNS[i].headers)) {
      matchCount += 1;
    }
  }

  return matchCount >= 8;
}

function looksLikePastedTableDataRow(cells: string[]): boolean {
  if (cells.length < 10) return false;
  return cells.filter((cell) => looksLikeId(cell)).length >= 2;
}

function parsePastedTable(lines: string[], result: ParsedUavtFields) {
  for (let i = 0; i < lines.length - 1; i++) {
    const headerCells = splitTabCells(lines[i]);
    if (!looksLikePastedTableHeader(headerCells)) continue;

    const dataCells = splitTabCells(lines[i + 1]);
    if (!looksLikePastedTableDataRow(dataCells)) continue;

    const max = Math.min(PASTED_TABLE_COLUMNS.length, headerCells.length, dataCells.length);
    for (let cellIdx = 0; cellIdx < max; cellIdx++) {
      const column = PASTED_TABLE_COLUMNS[cellIdx];
      if (!pastedHeaderMatches(headerCells[cellIdx], column.headers)) continue;
      setIfEmpty(result, column.field, dataCells[cellIdx]);
    }

    i += 1;
  }
}

function findSectionPrefixMatch(section: PastedSection, line: string): { field: TargetField; value: string } | null {
  const words = line.split(/\s+/).filter(Boolean);
  if (words.length < 2) return null;

  const patterns = NORMALIZED_PASTED_FIELD_PATTERNS[section];
  let i = 0;

  while (i < words.length) {
    let best: NormalizedSectionFieldPattern | null = null;

    for (const pattern of patterns) {
      const candidate = normalizeLabel(words.slice(i, i + pattern.wordCount).join(" "));
      if (candidate === pattern.label && (!best || pattern.wordCount > best.wordCount)) {
        best = pattern;
      }
    }

    if (!best) {
      i += 1;
      continue;
    }

    let nextLabelIndex = words.length;
    for (let j = i + best.wordCount; j < words.length; j++) {
      const nextPattern = patterns.find((pattern) => {
        const candidate = normalizeLabel(words.slice(j, j + pattern.wordCount).join(" "));
        return candidate === pattern.label;
      });
      if (nextPattern) {
        nextLabelIndex = j;
        break;
      }
    }

    const value = sanitizeParsedValue(words.slice(i + best.wordCount, nextLabelIndex).join(" "));
    if (value) return { field: best.field, value };

    i += best.wordCount;
  }

  return null;
}

function parseLineByWordScan(section: PastedSection, line: string, result: ParsedUavtFields) {
  const words = line.split(/\s+/).filter(Boolean);
  if (words.length < 2) return;

  const patterns = NORMALIZED_PASTED_FIELD_PATTERNS[section];
  let i = 0;

  while (i < words.length) {
    let best: NormalizedSectionFieldPattern | null = null;

    for (const pattern of patterns) {
      const candidate = normalizeLabel(words.slice(i, i + pattern.wordCount).join(" "));
      if (candidate === pattern.label && (!best || pattern.wordCount > best.wordCount)) {
        best = pattern;
      }
    }

    if (!best) {
      i += 1;
      continue;
    }

    let nextLabelIndex = words.length;
    for (let j = i + best.wordCount; j < words.length; j++) {
      const nextPattern = patterns.find((pattern) => {
        const candidate = normalizeLabel(words.slice(j, j + pattern.wordCount).join(" "));
        return candidate === pattern.label;
      });
      if (nextPattern) {
        nextLabelIndex = j;
        break;
      }
    }

    setIfEmpty(result, best.field, words.slice(i + best.wordCount, nextLabelIndex).join(" "));
    i = nextLabelIndex === words.length ? words.length : nextLabelIndex;
  }
}

function parsePastedLines(lines: string[], result: ParsedUavtFields) {
  let currentSection: PastedSection | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const normalized = normalizeLabel(line);
    const matchedSection = matchPastedSection(normalized);
    if (matchedSection) {
      currentSection = matchedSection;
      const sameLineField = findSectionPrefixMatch(matchedSection, line);
      if (sameLineField) setIfEmpty(result, sameLineField.field, sameLineField.value);
      continue;
    }
    if (!currentSection) continue;

    const inline = splitTextLabelValue(line);
    if (inline) {
      const field = matchPastedField(currentSection, normalizeLabel(inline[0]));
      if (field) {
        setIfEmpty(result, field, inline[1]);
        continue;
      }
    }

    parseLineByWordScan(currentSection, line, result);

    const field = matchPastedField(currentSection, normalized);
    if (!field) continue;

    const next = lines[i + 1];
    if (!next) continue;
    const nextNormalized = normalizeLabel(next);
    if (matchPastedSection(nextNormalized)) continue;
    if (splitTextLabelValue(next)) continue;
    if (matchPastedField(currentSection, nextNormalized)) continue;
    setIfEmpty(result, field, next);
  }
}

// --- Geometric table parsing -------------------------------------------
//
// The Numaraj Bilgileri (9 cols) and Bağımsız Bölüm Bilgileri (6 cols) tables
// render side by side as one 15-column header row followed by one data row.
// Rather than guess cell boundaries from token counts, this reads each
// word's actual pixel position from Tesseract: the header row's word
// x-positions become column boundaries (left-aligned — a column's cell runs
// from its own header label up to wherever the next column starts), and
// each data-row word is walked forward into the last column boundary at or
// before its own left edge. That correctly groups multi-word values (e.g.
// "Bina Ana Giriş") and tolerates missing or extra stray tokens without the
// column alignment shifting for everything after.

const TABLE_COLUMNS: { field: TargetField; words: string[] }[] = [
  { field: "numarajKimlikNo", words: ["kimlik", "no"] },
  { field: "ada", words: ["ada"] },
  { field: "parsel", words: ["parsel"] },
  { field: "pafta", words: ["pafta"] },
  { field: "postaKodu", words: ["posta", "kod"] },
  { field: "numarajTipi", words: ["numarataj", "tipi"] },
  { field: "siteAdi", words: ["site", "adi"] },
  { field: "apartmanBlokAdi", words: ["apartman", "blok", "adi"] },
  { field: "disKapi", words: ["dis", "kapi"] },
  { field: "bagimsizBolumKimlikNo", words: ["kimlik", "no"] },
  { field: "icKapi", words: ["ic", "kapi"] },
  { field: "kullanimAmaci", words: ["kullanim", "amaci"] },
  { field: "tip", words: ["tip"] },
  { field: "durum", words: ["durum"] },
  { field: "tapuNo", words: ["tapu", "no"] },
];

const TABLE_COLUMN_VOCAB = new Set(TABLE_COLUMNS.flatMap((c) => c.words));

function findHeaderRow(rows: OcrWord[][]): OcrWord[] | null {
  let best: OcrWord[] | null = null;
  let bestScore = 0;
  for (const row of rows) {
    const score = row.filter((w) => TABLE_COLUMN_VOCAB.has(normalizeLabel(w.text))).length;
    if (score > bestScore) {
      bestScore = score;
      best = row;
    }
  }
  // Require a solid majority of the 15 columns' worth of label words before
  // trusting this row as the header — avoids misfiring on unrelated text.
  return bestScore >= 8 ? best : null;
}

function concatNormalized(words: OcrWord[]): string {
  return words.map((w) => normalizeLabel(w.text)).join("");
}

// Matches by concatenating a run of upcoming header words (ignoring spaces)
// and comparing against the column's expected label joined the same way, so
// "Posta Kod" as two tokens and "PostaKod" OCR'd as one both hit "postakod".
// It also tolerates a couple of stray leading tokens (noise the earlier
// filter missed) before giving up on a column — a single bad word can't
// desync every column that follows, which a rigid position-locked matcher
// would suffer from.
function matchColumnBounds(headerWords: OcrWord[]): Partial<Record<TargetField, { x0: number; x1: number }>> {
  const bounds: Partial<Record<TargetField, { x0: number; x1: number }>> = {};
  let wi = 0;
  const MAX_SKIP = 2;
  const MAX_WINDOW = 4;

  for (const col of TABLE_COLUMNS) {
    const expected = col.words.join("");
    const expectedFuzzy = foldOcrConfusables(expected);
    let found = false;

    for (let skip = 0; skip <= MAX_SKIP && !found; skip++) {
      const start = wi + skip;
      for (let win = 1; win <= MAX_WINDOW && !found; win++) {
        const slice = headerWords.slice(start, start + win);
        if (slice.length < win) break;
        const concat = concatNormalized(slice);
        if (concat === expected || foldOcrConfusables(concat) === expectedFuzzy) {
          bounds[col.field] = { x0: slice[0].x0, x1: slice[slice.length - 1].x1 };
          wi = start + win;
          found = true;
        }
      }
    }
    // If no window/skip combination matched, leave this column without
    // bounds and keep wi where it is — the next column still gets a fair
    // shot at matching from the current position.
  }
  return bounds;
}

// Table columns are left-aligned: a column's real cell extends from its
// header label's left edge up to the NEXT column's left edge, which is
// usually much wider than the header text itself. Comparing a data word's
// center against the header label's own (narrow) width — as an earlier
// version of this function did — misattributes anything sitting past a
// short label's right edge to the next column over. Sorting columns by
// their left edge and walking forward while `column.x0 <= word.x0` mirrors
// how the table actually lays out and is the standard approach for
// reconstructing columns from OCR word geometry.
function assignDataRowToColumns(
  dataWords: OcrWord[],
  bounds: Partial<Record<TargetField, { x0: number; x1: number }>>,
  result: ParsedUavtFields,
) {
  const columns = (Object.entries(bounds) as [TargetField, { x0: number; x1: number }][]).sort(
    (a, b) => a[1].x0 - b[1].x0,
  );
  if (columns.length === 0) return;

  const buckets = new Map<TargetField, string[]>();
  for (const word of dataWords) {
    let assigned: TargetField = columns[0][0];
    for (const [field, range] of columns) {
      if (range.x0 <= word.x0 + 4) {
        assigned = field;
      } else {
        break;
      }
    }
    const bucket = buckets.get(assigned) ?? [];
    bucket.push(word.text);
    buckets.set(assigned, bucket);
  }

  // Real cell values here are never more than a few words (the longest is
  // "Apartman Blok Adı" content or "Bina Ana Giriş"). A bucket ballooning
  // past that means a header column downstream failed to bind — most likely
  // the trailing column, which otherwise silently absorbs everything after
  // it — so it's discarded instead of writing garbage into that field.
  const MAX_CELL_WORDS = 6;
  for (const [field, words] of buckets) {
    if (words.length <= MAX_CELL_WORDS) {
      setIfEmpty(result, field, words.join(" "));
    }
  }
}

// Kimlik No values in this table are database primary keys (8+ digits in
// every real sample seen); Posta Kodu is only 5, so requiring 6+ digits
// keeps the two from being confused when scanning for the data row below.
function looksLikeId(token: string): boolean {
  return /^\d{6,}$/.test(token);
}

function rowY(row: OcrWord[]): number {
  return row.reduce((sum, w) => sum + (w.y0 + w.y1) / 2, 0) / row.length;
}

function parseNumarajTable(words: OcrWord[], result: ParsedUavtFields) {
  const rows = clusterIntoRows(words)
    .map((row) => row.filter((w) => w.text.length > 0 && !isNoiseToken(w.text)))
    .filter((row) => row.length > 0);

  const headerRow = findHeaderRow(rows);
  if (!headerRow) return;

  const bounds = matchColumnBounds(headerRow);
  if (Object.keys(bounds).length === 0) return;

  // The real data row carries two Kimlik No values (one per sub-table), so
  // requiring at least two id-shaped tokens — not just one — keeps a stray
  // row with a single incidental long number (e.g. a coordinate) from being
  // picked over the actual data row.
  const headerY = rowY(headerRow);
  const dataRow = rows
    .filter((row) => rowY(row) > headerY)
    .sort((a, b) => rowY(a) - rowY(b))
    .find((row) => row.filter((w) => looksLikeId(w.text)).length >= 2);
  if (!dataRow) return;

  assignDataRowToColumns(dataRow, bounds, result);
}

export function parseUavtResult(ocr: OcrResult): ParsedUavtFields {
  const result: ParsedUavtFields = {};
  const lines = ocr.text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  // The geometric table parser must run before the generic labelled-line
  // fallback: both can produce a value for the same field (e.g.
  // bagimsizBolumKimlikNo), and setIfEmpty is first-write-wins, so the more
  // reliable geometric read has to claim the field first.
  parseBreadcrumb(lines, result);
  parseNumarajTable(ocr.words, result);
  parseLabeledLines(lines, result);

  return result;
}

export function parseUavtText(text: string): ParsedUavtFields {
  const result: ParsedUavtFields = {};
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  parseBreadcrumb(lines, result);
  parsePastedTable(lines, result);
  parsePastedLines(lines, result);
  parseLabeledLines(lines, result);

  return result;
}
