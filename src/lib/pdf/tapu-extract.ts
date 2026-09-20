import type { PDFPageProxy } from "pdfjs-dist";
import { normalizeLabel } from "@/lib/text/normalize-tr";
import { newRowId } from "@/lib/talep/types";
import type { MulkiyetKaydi, RehinKaydi, SerhBeyanIrtifak, TapuKaydiData } from "@/lib/talep/types";

interface PdfTextItem {
  str: string;
  transform: number[];
  hasEOL: boolean;
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(",")[1] ?? "";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// Reconstructs visual text lines in the PDF's own natural content-stream
// order, using pdfjs's own `hasEOL` flag to mark line breaks — confirmed
// against real "Web Tapu" (webtapu.tkgm.gov.tr) TAKBİS exports by reading
// the raw text items directly. This is deliberately NOT geometric
// (Y-position) row reconstruction: this document renders its two-column
// "Tapu Kayıt Bilgisi" table as two independent column blocks that share Y
// positions row-for-row (the right column's first row sits at the same
// height as the left column's first row), so clustering by Y — the
// technique the UAVT *image* OCR genuinely needs, because Tesseract's word
// order isn't reliable — would interleave unrelated cells here. The
// content-stream order this template already emits (left column top-to-
// bottom, then right column top-to-bottom) is exactly the reading order
// this parser wants, and hasEOL reliably marks where each line ends.
async function pageToLines(page: PDFPageProxy): Promise<string[]> {
  const content = await page.getTextContent();
  const lines: string[] = [];
  let current = "";
  for (const raw of content.items) {
    if (!("str" in raw)) continue;
    const item = raw as PdfTextItem;
    if (item.str) current += (current ? " " : "") + item.str;
    if (item.hasEOL) {
      if (current.trim()) lines.push(current.trim());
      current = "";
    }
  }
  if (current.trim()) lines.push(current.trim());
  return lines.map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);
}

export async function extractPdfText(dataUrl: string): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");
  // Served from /public (copied by scripts/copy-pdf-worker.mjs on install)
  // rather than resolved as a bundler asset URL — Turbopack doesn't reliably
  // resolve a bare package specifier passed to `new URL(x, import.meta.url)`
  // the way webpack's asset-module heuristic does, so a plain static path is
  // the robust cross-bundler choice here.
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const doc = await pdfjsLib.getDocument({ data: dataUrlToBytes(dataUrl) }).promise;
  const lines: string[] = [];
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    lines.push(...(await pageToLines(page)));
  }
  return lines.filter(Boolean).join("\n");
}

export type ParsedTapuFields = Partial<
  Omit<TapuKaydiData, "tapuBelgesiUrl" | "mulkiyetKayitlari" | "serhBeyanIrtifaklar" | "rehinler">
>;

type TapuField = keyof ParsedTapuFields;

export interface ParsedTapuDocument {
  fields: ParsedTapuFields;
  mulkiyetKayitlari: MulkiyetKaydi[];
  serhBeyanIrtifaklar: SerhBeyanIrtifak[];
  rehinler: RehinKaydi[];
}

// ---------------------------------------------------------------------
// Single-record "Tapu Kayıt Bilgileri Formu" — 23 fields
// ---------------------------------------------------------------------

const FIELD_LABELS: Record<TapuField, string[]> = {
  tarih: ["tarih"],
  saat: ["saat"],
  zeminTipi: ["zemin tipi"],
  tasinmazKimlikNo: ["tasinmaz kimlik no"],
  il: ["il"],
  ilce: ["ilce"],
  kurumAdi: ["kurum adi"],
  mahalleKoyAdi: ["mahalle koy adi", "mahalle/koy adi"],
  mevkii: ["mevkii"],
  cilt: ["cilt"],
  sayfaNo: ["sayfa no"],
  ada: ["ada"],
  parsel: ["parsel"],
  atYuzolcum: ["at yuzolcumm2", "at yuzolcum m2", "at yuzolcum"],
  bagimsizBolumNitelik: ["bagimsiz bolum nitelik"],
  bagimsizBolumBrutYuzolcum: ["bagimsiz bolum brut yuzolcumu", "bagimsiz bolum brut yuzolcum"],
  bagimsizBolumNetYuzolcum: ["bagimsiz bolum net yuzolcumu", "bagimsiz bolum net yuzolcum"],
  blok: ["blok"],
  kat: ["kat"],
  giris: ["giris"],
  bbNo: ["bb no", "bbno"],
  arsaPay: ["arsa pay"],
  arsaPayda: ["arsa payda"],
  anaTasinmazNitelik: ["ana tasinmaz nitelik"],
};

const NORMALIZED_FIELD_LABELS: Record<TapuField, string[]> = Object.fromEntries(
  Object.entries(FIELD_LABELS).map(([field, labels]) => [field, labels.map(normalizeLabel)]),
) as Record<TapuField, string[]>;

function endsWithLabel(normalized: string, known: string): boolean {
  return normalized === known || normalized.endsWith(` ${known}`);
}

function matchLabel(normalized: string): TapuField | null {
  let best: { field: TapuField; length: number } | null = null;
  for (const [field, labels] of Object.entries(NORMALIZED_FIELD_LABELS) as [TapuField, string[]][]) {
    for (const l of labels) {
      if (endsWithLabel(normalized, l) && (!best || l.length > best.length)) {
        best = { field, length: l.length };
      }
    }
  }
  return best?.field ?? null;
}

// The real document renders several fields as ONE label holding a
// "/"-joined compound value ("İl/İlçe: AMASYA/MERKEZ", "Ada/Parsel: 2034/1",
// "Blok/Kat/Giriş/BBNo: /3//10" — note empty parts stay empty, e.g. no Blok
// or Giriş here), confirmed against real TAKBİS exports. These need an
// exact label match plus a positional "/"-split, not the generic
// single-field matcher above.
const COMBINED_FIELD_RULES: { label: string; fields: TapuField[] }[] = [
  { label: normalizeLabel("İl/İlçe"), fields: ["il", "ilce"] },
  { label: normalizeLabel("Cilt/Sayfa No"), fields: ["cilt", "sayfaNo"] },
  { label: normalizeLabel("Ada/Parsel"), fields: ["ada", "parsel"] },
  { label: normalizeLabel("Blok/Kat/Giriş/BBNo"), fields: ["blok", "kat", "giris", "bbNo"] },
  { label: normalizeLabel("Arsa Pay/Payda"), fields: ["arsaPay", "arsaPayda"] },
];

// Section headers act as hard stops for label-continuation and
// value-continuation guessing, and as the boundaries the table parsers
// below scan between.
const SECTION_HEADERS = new Set(
  [
    "TAPU KAYIT BİLGİSİ",
    "TAŞINMAZA AİT ŞERH BEYAN İRTİFAK BİLGİLERİ",
    "MÜLKİYET BİLGİLERİ",
    "MÜLKİYETE AİT ŞERH BEYAN İRTİFAK BİLGİLERİ",
    "MÜLKİYETE AİT REHİN BİLGİLERİ",
  ].map(normalizeLabel),
);

function isSectionHeader(line: string): boolean {
  return SECTION_HEADERS.has(normalizeLabel(line));
}

function isPlaceholder(value: string): boolean {
  return value.trim() === "-";
}

// A genuine single-field value here is a short date/number/word run —
// capping the word count means a mis-scoped match discards itself instead
// of writing a long garbage string into the field. Table free-text cells
// (Malik names, Açıklama) use the much more generous capTableText instead.
const MAX_VALUE_WORDS = 10;

function capValue(value: string): string | null {
  const words = value.trim().split(/\s+/).filter(Boolean);
  return words.length > 0 && words.length <= MAX_VALUE_WORDS ? words.join(" ") : null;
}

function dmyToIso(day: string, month: string, year: string): string {
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

// Tapu belgeleri render dates as DD.MM.YYYY (or with "-"/"/" separators),
// but the Tarih field is an <input type="date">, which only renders a
// value in ISO YYYY-MM-DD — anything else is silently dropped by the
// browser. Only reformats a recognizable DD.MM.YYYY-shaped value; anything
// else is left as-is rather than guessed at.
function normalizeDateValue(value: string): string {
  const m = value.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  return m ? dmyToIso(m[1], m[2], m[3]) : value;
}

// The document's own top-of-page timestamp ("Tarih: 10-8-2026-08:48") is a
// single combined date+time value — it maps to BOTH of this form's Tarih
// and Saat fields.
function splitDateTimeValue(value: string): { date: string; time: string } | null {
  const m = value.match(/^(\d{1,2})-(\d{1,2})-(\d{4})-(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const [, d, mo, y, h, mi] = m;
  return { date: dmyToIso(d, mo, y), time: `${h.padStart(2, "0")}:${mi}` };
}

function setIfEmpty(result: ParsedTapuFields, field: TapuField, value: string | undefined) {
  const trimmed = value?.trim().replace(/[.,;]+$/, "");
  if (trimmed && !result[field]) result[field] = trimmed;
}

function applyCombinedValue(result: ParsedTapuFields, rule: { fields: TapuField[] }, rawValue: string) {
  if (!rawValue || isPlaceholder(rawValue)) return;
  const parts = rawValue.split("/").map((p) => p.trim());
  rule.fields.forEach((field, idx) => {
    const part = parts[idx];
    if (part && !isPlaceholder(part)) setIfEmpty(result, field, part);
  });
}

// "Label: Value" (colon) or "Label   Value" (2+ space gap, for text sources
// that preserve real inter-cell spacing) on a single line. A bare "-" is
// deliberately NOT a separator: it's a common date character
// ("12-01-2026"), so using it here would routinely cut a real value in half.
function splitLabelValue(line: string): [string, string] | null {
  const colonIdx = line.indexOf(":");
  if (colonIdx !== -1) return [line.slice(0, colonIdx), line.slice(colonIdx + 1)];

  const gapMatch = line.match(/\s{2,}/);
  if (gapMatch && gapMatch.index !== undefined) {
    return [line.slice(0, gapMatch.index), line.slice(gapMatch.index + gapMatch[0].length)];
  }
  return null;
}

// Merges up to `maxExtra` following lines onto an already-nonempty value
// when they look like plain wrapped continuation text (used for long
// free-text fields like Ana Taşınmaz Nitelik, e.g. "5 KATLI KARGİR
// APARTMAN VE" / "ARSASI"). Never invoked for an EMPTY same-line value —
// in this document format a wrapped LABEL legitimately has nothing after
// its own colon (e.g. "Bağımsız Bölüm Brüt" / "YüzÖlçümü:"), so guessing
// that the following line is that field's value would instead swallow the
// next field's (possibly also wrapped) label.
function isKnownLabel(normalized: string): boolean {
  return matchLabel(normalized) !== null || COMBINED_FIELD_RULES.some((r) => r.label === normalized);
}

function collectContinuation(lines: string[], startIdx: number, maxExtra: number): { text: string; consumed: number } {
  let text = "";
  let consumed = 0;
  for (let j = startIdx; j < lines.length && consumed < maxExtra; j++) {
    const l = lines[j];
    if (!l) break;
    if (isSectionHeader(l)) break;
    if (splitLabelValue(l)) break;
    if (isKnownLabel(normalizeLabel(l))) break;
    // `l` alone doesn't match a label, but could it be the FIRST half of a
    // label that wraps onto the next line (e.g. "Bağımsız Bölüm Brüt" /
    // "YüzÖlçümü:")? If so this is the start of the NEXT field, not
    // continuation text for the current one.
    if (j + 1 < lines.length) {
      const mergedSplit = splitLabelValue(`${l} ${lines[j + 1]}`);
      if (mergedSplit && isKnownLabel(normalizeLabel(mergedSplit[0]))) break;
    }
    text += (text ? " " : "") + l;
    consumed++;
  }
  return { text, consumed };
}

// Resolves one label (possibly spanning `labelLineCount` physical lines) to
// a field and applies its value. Returns how many lines were consumed
// (label line(s) + any value continuation), or 0 if this label doesn't
// correspond to anything tracked — callers fall back to advancing by 1 in
// that case so the next line still gets its own fresh attempt.
function tryApplyLabeledLine(
  result: ParsedTapuFields,
  lines: string[],
  labelLineCount: number,
  labelText: string,
  sameLineValue: string,
  nextLineIdx: number,
): number {
  const normalizedLabel = normalizeLabel(labelText);

  const combinedRule = COMBINED_FIELD_RULES.find((r) => r.label === normalizedLabel);
  if (combinedRule) {
    applyCombinedValue(result, combinedRule, sameLineValue.trim());
    return labelLineCount;
  }

  const field = matchLabel(normalizedLabel);
  if (!field) return 0;

  const trimmedSameLine = sameLineValue.trim();
  if (!trimmedSameLine || isPlaceholder(trimmedSameLine)) return labelLineCount;

  const { text: contText, consumed } = collectContinuation(lines, nextLineIdx, 2);
  const raw = contText ? `${trimmedSameLine} ${contText}` : trimmedSameLine;

  if (field === "tarih") {
    const dt = splitDateTimeValue(raw);
    if (dt) {
      setIfEmpty(result, "tarih", dt.date);
      setIfEmpty(result, "saat", dt.time);
    } else {
      setIfEmpty(result, "tarih", normalizeDateValue(raw));
    }
  } else {
    const capped = capValue(raw);
    if (capped) setIfEmpty(result, field, capped);
  }
  return labelLineCount + consumed;
}

function parseSingleFields(lines: string[]): ParsedTapuFields {
  const result: ParsedTapuFields = {};
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (isSectionHeader(line)) {
      i++;
      continue;
    }

    const sameLineSplit = splitLabelValue(line);
    if (sameLineSplit) {
      const consumed = tryApplyLabeledLine(result, lines, 1, sameLineSplit[0], sameLineSplit[1], i + 1);
      i += consumed || 1;
      continue;
    }

    // No colon/gap on this line at all — maybe its label wraps onto the
    // next line (e.g. "Bağımsız Bölüm Brüt" / "YüzÖlçümü:").
    if (i + 1 < lines.length) {
      const merged = `${line} ${lines[i + 1]}`;
      const mergedSplit = splitLabelValue(merged);
      if (mergedSplit) {
        const consumed = tryApplyLabeledLine(result, lines, 2, mergedSplit[0], mergedSplit[1], i + 2);
        if (consumed > 0) {
          i += consumed;
          continue;
        }
      }
    }

    i++;
  }
  return result;
}

// ---------------------------------------------------------------------
// Shared table-parsing helpers
// ---------------------------------------------------------------------

// Table free-text cells (Malik names, Açıklama) are genuinely long —
// company names alone can run well past MAX_VALUE_WORDS — so they get a
// much more generous character-length cap instead of a word-count one.
const MAX_TABLE_TEXT_CHARS = 220;

function capTableText(value: string): string {
  const trimmed = value.trim().replace(/\s+/g, " ");
  return trimmed.length > MAX_TABLE_TEXT_CHARS ? trimmed.slice(0, MAX_TABLE_TEXT_CHARS).trim() : trimmed;
}

// Malik/Alacaklı/Lehtar cells are prefixed with a TAKBİS internal registry
// id, e.g. "(SN:85726331) AYTEN ASLI : HİLMİ Kızı" — stripped for
// readability since it isn't part of this form's schema. Some callers pass
// text with a leftover neighboring-column fragment glued on BEFORE the
// "(SN:" marker (e.g. a nested hisse row's own Hisse Pay/Payda "1/1"), so
// this searches for the marker rather than assuming it's a fixed prefix.
function stripSnPrefix(value: string): string {
  const idx = value.indexOf("(SN:");
  if (idx === -1) return value.trim();
  const closeParen = value.indexOf(")", idx);
  return (closeParen === -1 ? value.slice(idx) : value.slice(closeParen + 1)).trim();
}

function findSectionBounds(lines: string[], headerNormalized: string): { start: number; end: number } | null {
  const startIdx = lines.findIndex((l) => normalizeLabel(l) === headerNormalized);
  if (startIdx === -1) return null;
  let endIdx = lines.length;
  for (let j = startIdx + 1; j < lines.length; j++) {
    const n = normalizeLabel(lines[j]);
    if (SECTION_HEADERS.has(n) && n !== headerNormalized) {
      endIdx = j;
      break;
    }
  }
  return { start: startIdx + 1, end: endIdx };
}

const DATE_YEVMIYE_RE = /(\d{1,2})[./-](\d{1,2})[./-](\d{4})\s+(\d+)/;
const KURUM_DATE_YEVMIYE_RE = /\S+\s*-\s*(\d{1,2})[./-](\d{1,2})[./-](\d{4})\s+\d{1,2}:\d{2}\s*-\s*(\d+)/;

// ---------------------------------------------------------------------
// Tapu Mülkiyet Bilgileri Formu (repeatable rows)
// ---------------------------------------------------------------------

// Every real row starts with a "(Hisse) Sistem No" — a 6+ digit id — which
// anchors each record; everything from there up to the next such anchor
// (or the section end) is that record's cell content, still in column
// order (Malik, El Birliği No, Hisse Pay/Payda, Metrekare, Toplam
// Metrekare, Edinme Sebebi-Tarih-Yevmiye, Terkin Sebebi-Tarih-Yevmiye),
// confirmed against real exports. The Sistem No is NOT reliably alone on
// its own line — natural text order glues it straight onto the Malik cell
// that follows ("546941262 (SN:85726331) AYTEN ASLI..."), so the anchor is
// matched as a line PREFIX, and the rest of that same line is kept as the
// start of the row's content rather than discarded. The Hisse Pay/Payda
// "N/M" fraction and the trailing "DD-MM-YYYY YEVMIYE" pair are then
// unambiguous anchors within that blob, so this reads reliably without
// needing per-column x/y geometry — which real samples show is unreliable
// here anyway (header labels render center-aligned within columns whose
// data is left-aligned, so a column's header x-position doesn't line up
// with its own data).
const SISTEM_NO_ROW_RE = /^(?:\d+\s+)?(\d{6,})\b\s*(.*)$/;

function isMulkiyetRowStart(line: string): boolean {
  // Some exports prepend a short ordinal before the real 6+ digit Sistem No,
  // while others lose that number and leave the Malik cell's "(SN:...)" as
  // the only stable row anchor on the first line. Accept both forms.
  return SISTEM_NO_ROW_RE.test(line) || line.includes("(SN:");
}

function getMulkiyetRowFirstLine(line: string): string {
  const match = line.match(SISTEM_NO_ROW_RE);
  return match ? match[2] : line;
}

function parseMulkiyetTable(lines: string[]): MulkiyetKaydi[] {
  const bounds = findSectionBounds(lines, "mulkiyet bilgileri");
  if (!bounds) return [];

  const rowStarts: number[] = [];
  for (let i = bounds.start; i < bounds.end; i++) {
    if (isMulkiyetRowStart(lines[i])) rowStarts.push(i);
  }

  const records: MulkiyetKaydi[] = [];
  for (let r = 0; r < rowStarts.length; r++) {
    const start = rowStarts[r];
    const end = r + 1 < rowStarts.length ? rowStarts[r + 1] : bounds.end;
    const firstLineRest = getMulkiyetRowFirstLine(lines[start]);
    const blob = [firstLineRest, ...lines.slice(start + 1, end)]
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    const record = parseMulkiyetRow(blob);
    if (record) records.push(record);
  }
  return records;
}

function parseMulkiyetRow(blob: string): MulkiyetKaydi | null {
  const fracMatch = blob.match(/(\d+)\s*\/\s*(\d+)/);
  if (!fracMatch || fracMatch.index === undefined) return null;

  const before = blob.slice(0, fracMatch.index).trim();
  // El Birliği No (usually the "-" placeholder) sits right before the
  // fraction; stripping one trailing "-" leaves just the Malik name.
  const malik = stripSnPrefix(before.replace(/-\s*$/, "").trim());
  if (!malik) return null;

  const after = blob.slice(fracMatch.index + fracMatch[0].length).trim();
  const afterTokens = after.split(/\s+/);
  const metrekare = afterTokens[0] && afterTokens[0] !== "-" ? afterTokens[0] : "";
  const toplamMetrekare = afterTokens[1] && afterTokens[1] !== "-" ? afterTokens[1] : "";

  const dateMatch = after.match(DATE_YEVMIYE_RE);
  const tarih = dateMatch ? dmyToIso(dateMatch[1], dateMatch[2], dateMatch[3]) : "";
  const yevmiyeNo = dateMatch ? dateMatch[4] : "";

  return {
    id: newRowId(),
    malik: capTableText(malik),
    hissePay: fracMatch[1],
    hissePayda: fracMatch[2],
    metrekare,
    toplamMetrekare,
    tarih,
    yevmiyeNo,
  };
}

// ---------------------------------------------------------------------
// Taşınmaza Ait Şerh/Beyan/İrtifak Bilgileri Formu (repeatable rows)
// ---------------------------------------------------------------------

// Each row starts with its Ş/B/İ value — "Beyan", "Şerh", or "İrtifak" are
// the only real values that column takes — but natural text order glues it
// straight onto the Açıklama text that follows ("Beyan Bu gayrimenkulun
// mülkiyeti..."), so the anchor is matched as a line PREFIX and the rest of
// that line is kept as the start of Açıklama, not discarded. Real exports
// sometimes render "Şerh" without its cedilla ("Serh") — confirmed against
// a real TAKBİS PDF whose text layer drops the diacritic on that glyph — so
// both spellings are accepted and normalized to the canonical "Şerh" below.
// The "Tesis Kurum Tarih-Yevmiye" cell renders as "KURUM - DD-MM-YYYY
// HH:MM - YEVMIYE" (one unambiguous anchor), and whatever precedes that
// match is Açıklama; a populated Malik/Lehtar cell (not part of this form's
// schema) sometimes trails Açıklama with no separator when the tesis cell
// is empty, so a trailing "(SN:...)" marker or bare ALL-CAPS "Ad Soyad"
// name (the "Mülkiyete Ait" section's "Kısıtlı Malik" column has no "(SN:"
// prefix, unlike Malik/Lehtar cells elsewhere) is cut off too.
const ROW_TYPE_RE = /^(Beyan|Şerh|Serh|İrtifak)\b\s*(.*)$/;
const ROW_TYPE_CANONICAL: Record<string, string> = { Serh: "Şerh" };
const TRAILING_CAPS_NAME_RE = /\s+[A-ZÇĞİIÖŞÜ]{2,}(?:\s+[A-ZÇĞİIÖŞÜ]{2,}){0,2}$/;

// TAKBİS renders şerh/beyan/irtifak rows scattered across two independent
// tables — "Taşınmaza Ait" (tied to the parcel itself) and "Mülkiyete Ait"
// (tied to an individual hisse/malik) — both using the same Ş/B/İ row
// shape. This form's schema keeps a single flat list, so both sections are
// scanned and their rows concatenated in document order.
const SERH_SECTION_HEADERS = [
  "tasinmaza ait serh beyan irtifak bilgileri",
  "mulkiyete ait serh beyan irtifak bilgileri",
];

function parseSerhTable(lines: string[]): SerhBeyanIrtifak[] {
  const records: SerhBeyanIrtifak[] = [];
  for (const header of SERH_SECTION_HEADERS) {
    const bounds = findSectionBounds(lines, header);
    if (!bounds) continue;

    const rowStarts: number[] = [];
    for (let i = bounds.start; i < bounds.end; i++) {
      if (ROW_TYPE_RE.test(lines[i])) rowStarts.push(i);
    }

    for (let r = 0; r < rowStarts.length; r++) {
      const start = rowStarts[r];
      const end = r + 1 < rowStarts.length ? rowStarts[r + 1] : bounds.end;
      const match = lines[start].match(ROW_TYPE_RE)!;
      const turu = ROW_TYPE_CANONICAL[match[1]] ?? match[1];
      const blob = [match[2], ...lines.slice(start + 1, end)]
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      const record = parseSerhRow(turu, blob);
      if (record) records.push(record);
    }
  }
  return records;
}

function parseSerhRow(turu: string, blob: string): SerhBeyanIrtifak | null {
  let aciklama = blob;
  let tarih = "";
  let yevmiyeNo = "";

  const match = blob.match(KURUM_DATE_YEVMIYE_RE);
  if (match && match.index !== undefined) {
    aciklama = blob.slice(0, match.index).trim();
    tarih = dmyToIso(match[1], match[2], match[3]);
    yevmiyeNo = match[4];
  }

  const snIdx = aciklama.indexOf("(SN:");
  if (snIdx !== -1) {
    aciklama = aciklama.slice(0, snIdx).trim();
  } else {
    aciklama = aciklama.replace(TRAILING_CAPS_NAME_RE, "").trim();
  }
  if (!aciklama) return null;

  return { id: newRowId(), turu, aciklama: capTableText(aciklama), tarih, yevmiyeNo };
}

// ---------------------------------------------------------------------
// Taşınmaza Ait Rehin Bilgileri Formu (repeatable rows)
// ---------------------------------------------------------------------

// Each İpotek/rehin record is its own two-table block: an outer "Ipotek"
// table (Alacaklı, Müşterek Mi?, Borç, Faiz, Derece Sıra, Süre, Tesis
// Tarih-Yev) followed immediately by a nested "İpoteğin Konulduğu Hisse
// Bilgisi" table whose only field this form needs is Borçlu Malik. A
// standalone "Ipotek" line anchors each record (repeats once per loan,
// often one per page); within that span:
//  - Alacaklı is the first "(SN:...)"-prefixed line, running until the
//    "Evet"/"Hayır" (Müşterek Mi?) marker.
//  - Borç/Faiz/Derece Sıra are pulled from the text between that marker
//    and the Tesis Tarih-Yev match with small anchored regexes (a leading
//    "1234.00 TL"-shaped number for Borç, an "N/M" fraction for Derece
//    Sıra, whatever sits between them for Faiz) rather than by line,
//    since real exports show Borç/Faiz/Derece Sıra often landing on the
//    SAME reconstructed line with no separator between them.
//  - Borçlu Malik is the first "(SN:...)"-prefixed line found AFTER the
//    nested table's own header, capped at the next currency amount
//    ("30000000.00 TL", i.e. Malik Borç) so it doesn't run on.
const IPOTEK_ANCHOR = normalizeLabel("Ipotek");
const HISSE_BILGISI_HEADER = normalizeLabel("İpoteğin Konulduğu Hisse Bilgisi");
const MUSTEREK_MI_VALUES = new Set(["Evet", "Hayır"].map(normalizeLabel));
const BORC_RE = /^([\d.,]+)\s*(TL|USD|EUR)?/i;
const FRACTION_RE = /\d+\s*\/\s*\d+/;
const AMOUNT_TL_RE = /[\d.,]+\s*TL/i;

function parseRehinTable(lines: string[]): RehinKaydi[] {
  const anchors: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (normalizeLabel(lines[i]) === IPOTEK_ANCHOR) anchors.push(i);
  }
  if (anchors.length === 0) return [];

  const records: RehinKaydi[] = [];
  for (let r = 0; r < anchors.length; r++) {
    const start = anchors[r];
    const end = r + 1 < anchors.length ? anchors[r + 1] : lines.length;
    const record = parseRehinBlock(lines.slice(start + 1, end));
    if (record) records.push(record);
  }
  return records;
}

function parseRehinBlock(blockLines: string[]): RehinKaydi | null {
  const hisseHeaderIdx = blockLines.findIndex((l) => normalizeLabel(l) === HISSE_BILGISI_HEADER);
  const outerLines = hisseHeaderIdx === -1 ? blockLines : blockLines.slice(0, hisseHeaderIdx);
  const innerLines = hisseHeaderIdx === -1 ? [] : blockLines.slice(hisseHeaderIdx + 1);

  // --- Alacaklı: from the first "(SN:" line up to the Müşterek Mi? marker ---
  const snStart = outerLines.findIndex((l) => l.includes("(SN:"));
  if (snStart === -1) return null;
  let mustIdx = -1;
  const alacakliParts: string[] = [];
  for (let i = snStart; i < outerLines.length; i++) {
    const tokens = outerLines[i].split(/\s+/);
    const stopAt = tokens.findIndex((t) => MUSTEREK_MI_VALUES.has(normalizeLabel(t)));
    if (stopAt !== -1) {
      if (stopAt > 0) alacakliParts.push(tokens.slice(0, stopAt).join(" "));
      mustIdx = i;
      break;
    }
    alacakliParts.push(outerLines[i]);
  }
  const alacakli = capTableText(stripSnPrefix(alacakliParts.join(" ")));
  if (!alacakli || mustIdx === -1) return null;

  // --- Borç / Faiz / Derece Sıra / Tesis Tarih-Yev from the remaining blob ---
  const restBlob = outerLines
    .slice(mustIdx)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  const afterMustMatch = restBlob.match(/(Evet|Hayır)\s+(.*)$/i);
  const afterMust = afterMustMatch ? afterMustMatch[2] : "";

  const tesisMatch = afterMust.match(KURUM_DATE_YEVMIYE_RE);
  const middle = tesisMatch && tesisMatch.index !== undefined ? afterMust.slice(0, tesisMatch.index).trim() : afterMust;
  const tarih = tesisMatch ? dmyToIso(tesisMatch[1], tesisMatch[2], tesisMatch[3]) : "";
  const yevmiyeNo = tesisMatch ? tesisMatch[4] : "";

  const borcMatch = middle.match(BORC_RE);
  const borc = borcMatch ? borcMatch[1] : "";
  const afterBorc = borcMatch ? middle.slice(borcMatch[0].length).trim() : middle;

  const fracMatch = afterBorc.match(FRACTION_RE);
  const dereceSira = fracMatch ? fracMatch[0].replace(/\s+/g, "") : "";
  const faiz = fracMatch && fracMatch.index !== undefined ? afterBorc.slice(0, fracMatch.index).trim() : "";

  // --- Borçlu Malik: first "(SN:" line inside the nested hisse table,
  // capped at the next currency amount (Malik Borç) ---
  let borcluMalik = "";
  const innerSnStart = innerLines.findIndex((l) => l.includes("(SN:"));
  if (innerSnStart !== -1) {
    const innerBlob = innerLines
      .slice(innerSnStart)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    const amountMatch = innerBlob.match(AMOUNT_TL_RE);
    const malikText = amountMatch && amountMatch.index !== undefined ? innerBlob.slice(0, amountMatch.index) : innerBlob;
    borcluMalik = capTableText(stripSnPrefix(malikText));
  }

  return {
    id: newRowId(),
    alacakli,
    borc,
    faiz: capTableText(faiz),
    dereceSira,
    borcluMalik,
    tarih,
    yevmiyeNo,
  };
}

// ---------------------------------------------------------------------

export function parseTapuKaydiDocument(text: string): ParsedTapuDocument {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  return {
    fields: parseSingleFields(lines),
    mulkiyetKayitlari: parseMulkiyetTable(lines),
    serhBeyanIrtifaklar: parseSerhTable(lines),
    rehinler: parseRehinTable(lines),
  };
}
