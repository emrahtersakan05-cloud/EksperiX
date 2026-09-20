"use client";

import { useEffect, useRef, useState } from "react";
import { acknowledgeBridge, readBridgeDetail } from "@/lib/bridge/event-detail";
import { ChevronDown, ExternalLink, ImageUp, Search, Sparkles, X } from "lucide-react";
import {
  ComboboxField,
  SectionCard,
  modalCardClass,
  primaryButtonClass,
  secondaryButtonClass,
  sectionBodyClass,
  TextField,
} from "@/components/talep/form-fields";
import {
  addIl,
  addIlce,
  addKoy,
  addMahalle,
  getIlceler,
  getIller,
  getKoyler,
  getMahalleler,
  removeIl,
  removeIlce,
  removeKoy,
  removeMahalle,
} from "@/lib/talep/adres-referans";
import { parseUavtResult, parseUavtText, recognizeText, type ParsedUavtFields } from "@/lib/ocr/uavt-extract";
import type { AdresKonumData } from "@/lib/talep/types";
import KmlMapPanel from "@/components/talep/sections/KmlMapPanel";

const UAVT_SORGU_URL = "https://adres.nvi.gov.tr/VatandasIslemleri/AdresSorgu";
const UAVT_BRIDGE_EVENT = "eksperix:uavt-import";
const UAVT_SAMPLE_TEXT = `Adres Bilgileri
İl: Ankara
İlçe: Çankaya
Mahalle: Kızılırmak
Cadde / Bulvar: 1443. Cadde
Sokak: -

Numaraj Bilgileri
Kimlik No: 1234567890
Ada: 27403
Parsel: 1
Dış Kapı: 12

Bağımsız Bölüm Bilgileri
Kimlik No: 99887766
İç Kapı: 4
Kullanım Amacı: Mesken
Tip: Daire
Durum: Aktif
Tapu No: 556677`;

type BridgeMessageState = { tone: "success" | "warning" | "error"; text: string } | null;

type UavtBridgePayload = {
  text?: string;
  title?: string;
  url?: string;
  capturedAt?: number;
};

const IMPORTABLE_UAVT_FIELDS: (keyof ParsedUavtFields)[] = [
  "il",
  "ilce",
  "mahalle",
  "koy",
  "semtMevki",
  "caddeBulvar",
  "sokak",
  "numarajKimlikNo",
  "ada",
  "parsel",
  "pafta",
  "postaKodu",
  "numarajTipi",
  "siteAdi",
  "apartmanBlokAdi",
  "disKapi",
  "bagimsizBolumKimlikNo",
  "icKapi",
  "kullanimAmaci",
  "tip",
  "durum",
  "tapuNo",
];

function countParsedFields(parsed: ParsedUavtFields): number {
  return (Object.keys(parsed) as (keyof ParsedUavtFields)[]).reduce((count, key) => count + (parsed[key] ? 1 : 0), 0);
}

function buildEmptyUavtPatch(): ParsedUavtFields {
  return Object.fromEntries(IMPORTABLE_UAVT_FIELDS.map((field) => [field, ""])) as ParsedUavtFields;
}

const OCR_STATUS_LABELS: Record<string, string> = {
  "loading tesseract core": "Motor yükleniyor",
  "initializing tesseract": "Başlatılıyor",
  "loading language traineddata": "Dil verisi indiriliyor",
  "initializing api": "Hazırlanıyor",
  "recognizing text": "Metin tanınıyor",
};

const FormGroup = SectionCard;
const ADRES_KONUM_TABS = [
  { key: "adres", label: "Adres" },
  { key: "konum", label: "Konum" },
  { key: "bolge", label: "Bölge Özellikleri" },
] as const;

type AdresKonumTabKey = (typeof ADRES_KONUM_TABS)[number]["key"];

function ImageUploadZone({
  value,
  onImageChange,
  onExtract,
  extracting,
  extractStatus,
  extractMessage,
  rawText,
}: {
  value: string;
  onImageChange: (dataUrl: string) => void;
  onExtract: () => void;
  extracting: boolean;
  extractStatus: string;
  extractMessage: { tone: "success" | "warning" | "error"; text: string } | null;
  rawText: string | null;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showRawText, setShowRawText] = useState(false);

  function handleFile(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onImageChange(String(reader.result));
    reader.readAsDataURL(file);
  }

  const messageTone = {
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
    error: "bg-rose-50 text-rose-700",
  };

  return (
    <FormGroup
      title="Görsel Ekleme Formu"
      className="flex h-full flex-col overflow-hidden border-fuchsia-400/80 bg-gradient-to-br from-fuchsia-200 via-rose-100 to-amber-200 shadow-[0_16px_36px_-24px_rgba(168,85,247,0.75)]"
    >
      {value ? (
        <div className={`${sectionBodyClass} flex-1 border-fuchsia-300/80 bg-white/85 p-2.5`}>
          <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-fuchsia-700 px-2 py-1 text-[10px] font-semibold tracking-[0.08em] text-white uppercase">
            <ImageUp className="h-3 w-3" />
            Gorsel Tarama
          </div>
          <div className="min-w-0 flex flex-col gap-2 sm:flex-row sm:items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="Uavt adres görseli" className="h-16 w-full rounded-md object-cover sm:w-24" />
            <div className="min-w-0 flex flex-1 flex-col gap-1.5">
              <p className="break-words text-[11px] text-slate-500">Gorselden alan bilgilerini otomatik doldur.</p>
              <div className="flex w-full flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={onExtract}
                  disabled={extracting}
                  className="inline-flex max-w-full items-center gap-1 rounded-md bg-gradient-to-r from-fuchsia-800 to-rose-700 px-2.5 py-1.5 text-center text-[10px] font-semibold leading-tight text-white shadow-sm disabled:opacity-60"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {extracting ? extractStatus || "Ayıklanıyor..." : "Bilgileri Görselden Ayıkla"}
                </button>
                <button
                  type="button"
                  onClick={() => onImageChange("")}
                  className="inline-flex max-w-full items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-center text-[10px] font-medium leading-tight text-slate-600 hover:bg-slate-50"
                >
                  <X className="h-3.5 w-3.5" />
                  Kaldır
                </button>
              </div>
              {extractMessage && (
                <p className={`rounded-lg px-2.5 py-1.5 text-[11px] ${messageTone[extractMessage.tone]}`}>
                  {extractMessage.text}
                </p>
              )}
              {rawText && (
                <button
                  type="button"
                  onClick={() => setShowRawText((s) => !s)}
                  className="inline-flex items-center gap-1 self-start text-xs font-medium text-slate-500 hover:text-slate-800"
                >
                  <ChevronDown className={`h-3 w-3 transition-transform ${showRawText ? "rotate-180" : ""}`} />
                  Ham OCR metnini {showRawText ? "gizle" : "gör"}
                </button>
              )}
            </div>
          </div>
          {rawText && showRawText && (
            <pre className="mt-2 max-h-32 overflow-auto rounded-lg border border-slate-200 bg-white p-2.5 text-[11px] leading-relaxed whitespace-pre-wrap text-slate-600">
              {rawText}
            </pre>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex min-h-[108px] w-full flex-1 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-fuchsia-500 bg-gradient-to-br from-fuchsia-200 via-rose-100 to-amber-200 py-2 text-center transition-colors hover:border-fuchsia-700"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-fuchsia-800 text-white shadow-sm">
            <ImageUp className="h-4 w-4" />
          </span>
          <span className="text-xs font-medium text-slate-800">Gorsel Sec</span>
          <span className="text-[11px] text-fuchsia-900/75">PNG, JPG</span>
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </FormGroup>
  );
}

function UavtPasteModal({
  value,
  onChange,
  onClose,
  onOpenSite,
  onImport,
  onClear,
  onRetry,
  importing,
  message,
}: {
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onOpenSite: () => void;
  onImport: () => void;
  onClear: () => void;
  onRetry: () => void;
  importing: boolean;
  message: { tone: "success" | "warning" | "error"; text: string } | null;
}) {
  const messageTone = {
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
    error: "bg-rose-50 text-rose-700",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-8"
      onClick={() => !importing && onClose()}
    >
      <div className={`${modalCardClass} max-w-2xl`} onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-500">UAVT Aktarimi</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">UAVT sonucunu forma aktar</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={importing}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Kapat"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-800">Adımlar</p>
            <ol className="mt-2 space-y-1 text-sm leading-6 text-slate-600">
              <li>1. `Sorgu Sayfasını Aç` ile UAVT ekranını aç.</li>
              <li>2. Adres bilgilerini sorgula.</li>
              <li>3. Sonuç metnini kopyalayıp aşağıya yapıştır.</li>
              <li>4. `Bilgileri Getir` ile form alanlarını doldur.</li>
            </ol>
            <button
              type="button"
              onClick={onOpenSite}
              className={`mt-3 inline-flex items-center gap-1.5 ${secondaryButtonClass}`}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Sorgu Sayfasını Aç
            </button>
          </div>

          <details className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <summary className="cursor-pointer text-sm font-medium text-slate-800">Örnek yapıştırma formatı</summary>
            <pre className="mt-3 overflow-auto rounded-xl border border-slate-200 bg-white p-3 text-[11px] leading-relaxed whitespace-pre-wrap text-slate-600">
              {UAVT_SAMPLE_TEXT}
            </pre>
          </details>

          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-slate-500">Kopyalanan UAVT sonucu</span>
            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              rows={10}
              placeholder="UAVT sonuç ekranındaki metni buraya yapıştırın..."
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm outline-none placeholder:text-slate-400 focus:border-lime-300 focus:ring-4 focus:ring-lime-200/50"
            />
          </label>

          {message && <p className={`rounded-xl px-3 py-2 text-xs ${messageTone[message.tone]}`}>{message.text}</p>}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onRetry} disabled={importing} className={secondaryButtonClass}>
            Tekrar Dene
          </button>
          <button
            type="button"
            onClick={onClear}
            disabled={importing || value.trim().length === 0}
            className={secondaryButtonClass}
          >
            Temizle
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={importing}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Vazgeç
          </button>
          <button
            type="button"
            onClick={onImport}
            disabled={importing || value.trim().length === 0}
            className={primaryButtonClass}
          >
            {importing ? "Getiriliyor..." : "Bilgileri Getir"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdresKonumSection({
  data,
  onChange,
}: {
  data: AdresKonumData;
  onChange: (patch: Partial<AdresKonumData>) => void;
}) {
  const [ilOptions, setIlOptions] = useState<string[]>([]);
  const [ilceOptions, setIlceOptions] = useState<string[]>([]);
  const [mahalleOptions, setMahalleOptions] = useState<string[]>([]);
  const [koyOptions, setKoyOptions] = useState<string[]>([]);

  const [extracting, setExtracting] = useState(false);
  const [extractStatus, setExtractStatus] = useState("");
  const [extractMessage, setExtractMessage] = useState<{
    tone: "success" | "warning" | "error";
    text: string;
  } | null>(null);
  const [rawText, setRawText] = useState<string | null>(null);
  const [uavtModalOpen, setUavtModalOpen] = useState(false);
  const [uavtPasteText, setUavtPasteText] = useState("");
  const [uavtImporting, setUavtImporting] = useState(false);
  const [uavtMessage, setUavtMessage] = useState<{
    tone: "success" | "warning" | "error";
    text: string;
  } | null>(null);
  const [bridgeMessage, setBridgeMessage] = useState<BridgeMessageState>(null);
  const [activeTab, setActiveTab] = useState<AdresKonumTabKey>("adres");

  useEffect(() => {
    getIller().then(setIlOptions);
  }, []);

  useEffect(() => {
    if (!data.il) {
      queueMicrotask(() => setIlceOptions([]));
      return;
    }
    getIlceler(data.il).then(setIlceOptions);
  }, [data.il]);

  useEffect(() => {
    if (!data.il || !data.ilce) {
      queueMicrotask(() => {
        setMahalleOptions([]);
        setKoyOptions([]);
      });
      return;
    }
    getMahalleler(data.il, data.ilce).then(setMahalleOptions);
    getKoyler(data.il, data.ilce).then(setKoyOptions);
  }, [data.il, data.ilce]);

  useEffect(() => {
    function handleBridgeImport(event: Event) {
      const detail = readBridgeDetail<UavtBridgePayload>(event);
      const incomingText = detail?.text?.trim();
      if (!incomingText) return;
      acknowledgeBridge(UAVT_BRIDGE_EVENT);

      setBridgeMessage(null);
      setUavtPasteText(incomingText);

      try {
        const parsed = parseUavtText(incomingText);
        const filledCount = countParsedFields(parsed);

        if (filledCount > 0) {
          onChange({ ...buildEmptyUavtPatch(), ...parsed });
          setBridgeMessage({
            tone: "success",
            text: `${filledCount} alan eklenti üzerinden UAVT sonucundan dolduruldu. Lütfen doğruluğunu kontrol edin.`,
          });
        } else {
          setBridgeMessage({
            tone: "warning",
            text: "Eklenti sayfayı okudu ancak eşleşen alan bulunamadı. Yapıştırma yedeği ile metni kontrol edebilirsiniz.",
          });
        }
      } catch {
        setBridgeMessage({
          tone: "error",
          text: "Eklentiden gelen UAVT sonucu işlenemedi. Yapıştırma yedeği ile tekrar deneyin.",
        });
      }
    }

    window.addEventListener(UAVT_BRIDGE_EVENT, handleBridgeImport as EventListener);
    return () => window.removeEventListener(UAVT_BRIDGE_EVENT, handleBridgeImport as EventListener);
  }, [onChange]);

  async function handleExtract() {
    if (!data.uavtGorselUrl || extracting) return;
    setExtracting(true);
    setExtractMessage(null);
    setExtractStatus("Başlatılıyor...");
    try {
      const ocr = await recognizeText(data.uavtGorselUrl, (p) => {
        const label = OCR_STATUS_LABELS[p.status] ?? p.status;
        setExtractStatus(`${label} %${Math.round(p.progress * 100)}`);
      });
      setRawText(ocr.text);

      const parsed: ParsedUavtFields = parseUavtResult(ocr);
      const patch: Partial<AdresKonumData> = {};
      let filledCount = 0;
      (Object.keys(parsed) as (keyof ParsedUavtFields)[]).forEach((key) => {
        const value = parsed[key];
        if (value) {
          patch[key] = value;
          filledCount += 1;
        }
      });

      if (filledCount > 0) {
        onChange({ ...buildEmptyUavtPatch(), ...patch });
        setExtractMessage({
          tone: "success",
          text: `${filledCount} alan bu görselden güncellendi. Lütfen doğruluğunu kontrol edin.`,
        });
      } else {
        setExtractMessage({
          tone: "warning",
          text: "Görselde eşleşen alan bulunamadı. Ham OCR metnini inceleyip alanları manuel doldurabilirsiniz.",
        });
      }
    } catch {
      setExtractMessage({
        tone: "error",
        text: "Görsel işlenemedi — internet bağlantınızı kontrol edip tekrar deneyin.",
      });
    } finally {
      setExtracting(false);
      setExtractStatus("");
    }
  }

  function openUavtSite() {
    window.open(UAVT_SORGU_URL, "_blank", "noopener,noreferrer");
  }

  function handleOpenUavtModal() {
    setUavtMessage(null);
    setUavtModalOpen(true);
  }

  function handleRetryUavtFlow() {
    setUavtMessage(null);
    openUavtSite();
  }

  function handleClearUavtPaste() {
    setUavtPasteText("");
    setUavtMessage(null);
  }

  async function handleImportPastedUavt() {
    if (uavtImporting) return;
    setUavtImporting(true);
    setUavtMessage(null);
    try {
      const parsed = parseUavtText(uavtPasteText);
      const filledCount = countParsedFields(parsed);
      if (filledCount > 0) {
        onChange({ ...buildEmptyUavtPatch(), ...parsed });
        setUavtMessage({
          tone: "success",
          text: `${filledCount} alan UAVT sonucundan güncellendi. Lütfen doğruluğunu kontrol edin.`,
        });
      } else {
        setUavtMessage({
          tone: "warning",
          text: "Yapıştırılan metinde eşleşen alan bulunamadı. Sonuç ekranındaki metni başlıklarıyla birlikte tekrar kopyalayın.",
        });
      }
    } catch {
      setUavtMessage({
        tone: "error",
        text: "UAVT sonucu işlenemedi. Metni tekrar kopyalayıp deneyin.",
      });
    } finally {
      setUavtImporting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-sky-300/80 bg-gradient-to-r from-sky-100 via-cyan-50 to-emerald-100 p-1 shadow-[0_12px_30px_-24px_rgba(2,132,199,0.45)]">
        <div className="flex flex-wrap gap-1">
          {ADRES_KONUM_TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-gradient-to-r from-sky-800 to-emerald-700 text-white shadow-sm"
                    : "bg-white/70 text-sky-800 hover:bg-white hover:text-sky-900"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === "adres" && (
        <>
          <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-2">
            <ImageUploadZone
              value={data.uavtGorselUrl}
              onImageChange={(v) => {
                onChange({ uavtGorselUrl: v });
                setExtractMessage(null);
                setRawText(null);
              }}
              onExtract={handleExtract}
              extracting={extracting}
              extractStatus={extractStatus}
              extractMessage={extractMessage}
              rawText={rawText}
            />

            <FormGroup
              title="UAVT Adres Sorgula"
              className="flex h-full flex-col overflow-hidden border-sky-400/80 bg-gradient-to-br from-sky-200 via-cyan-100 to-emerald-200 shadow-[0_16px_36px_-24px_rgba(2,132,199,0.75)]"
            >
              <div
                className={`${sectionBodyClass} flex min-h-[108px] min-w-0 flex-1 flex-col border-sky-300/80 bg-white/85 p-2.5`}
              >
                <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-sky-700 px-2 py-1 text-[10px] font-semibold tracking-[0.08em] text-white uppercase">
                  <Search className="h-3 w-3" />
                  Resmi Sorgu
                </div>
                <p className="mb-2 break-words text-[11px] leading-5 text-slate-600">
                  Sonucu yeni pencereden forma aktar.
                </p>
                <div className="flex min-w-0 flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={openUavtSite}
                    className="inline-flex w-full min-w-0 items-center justify-center gap-1 rounded-md bg-gradient-to-r from-sky-800 to-emerald-700 px-3 py-1.5 text-center text-[10px] font-semibold leading-tight text-white shadow-sm"
                  >
                    <Search className="h-3 w-3" />
                    UAVT Sorgu Ekranini Ac
                  </button>

                  <div className="flex min-w-0 flex-wrap gap-1">
                    <button
                      type="button"
                      onClick={handleOpenUavtModal}
                      className="inline-flex min-w-0 flex-1 items-center justify-center gap-1 rounded-md border border-sky-300 bg-white px-3 py-1.5 text-center text-[10px] font-medium leading-tight text-sky-800 hover:bg-sky-50"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Yapistirma Yedegi
                    </button>
                    <div className="flex shrink-0 items-center justify-center rounded-md border border-dashed border-emerald-400 bg-emerald-100 px-2 py-1.5 text-[8px] font-semibold text-emerald-900">
                      Eklenti
                    </div>
                  </div>
                </div>
                {bridgeMessage && (
                  <p
                    className={`mt-2 rounded-lg px-2.5 py-1.5 text-[11px] ${
                      bridgeMessage.tone === "success"
                        ? "bg-emerald-50 text-emerald-700"
                        : bridgeMessage.tone === "warning"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-rose-50 text-rose-700"
                    }`}
                  >
                    {bridgeMessage.text}
                  </p>
                )}
              </div>
            </FormGroup>
          </div>

          <FormGroup title="Adres Bilgileri Formu">
            <div className={`${sectionBodyClass} grid grid-cols-1 gap-x-3 gap-y-3 md:grid-cols-2 xl:grid-cols-7`}>
              <ComboboxField
                label="İl"
                value={data.il}
                options={ilOptions}
                onChange={(v) => onChange({ il: v, ilce: "", mahalle: "", koy: "" })}
                onAddNew={async (v) => setIlOptions(await addIl(v))}
                onRemoveOption={async (v) => {
                  setIlOptions(await removeIl(v));
                  if (data.il === v) onChange({ il: "", ilce: "", mahalle: "", koy: "" });
                }}
                className="xl:col-span-1"
              />
              <ComboboxField
                label="İlçe"
                value={data.ilce}
                options={ilceOptions}
                placeholder={data.il ? "Ara veya seçin..." : "Önce il seçin"}
                onChange={(v) => onChange({ ilce: v, mahalle: "", koy: "" })}
                onAddNew={data.il ? async (v) => setIlceOptions(await addIlce(data.il, v)) : undefined}
                onRemoveOption={
                  data.il
                    ? async (v) => {
                        setIlceOptions(await removeIlce(data.il, v));
                        if (data.ilce === v) onChange({ ilce: "", mahalle: "", koy: "" });
                      }
                    : undefined
                }
                className="xl:col-span-1"
              />
              <ComboboxField
                label="Mahalle"
                value={data.mahalle}
                options={mahalleOptions}
                placeholder={data.ilce ? "Ara veya seçin..." : "Önce ilçe seçin"}
                onChange={(v) => onChange({ mahalle: v })}
                onAddNew={
                  data.il && data.ilce
                    ? async (v) => setMahalleOptions(await addMahalle(data.il, data.ilce, v))
                    : undefined
                }
                onRemoveOption={
                  data.il && data.ilce
                    ? async (v) => {
                        setMahalleOptions(await removeMahalle(data.il, data.ilce, v));
                        if (data.mahalle === v) onChange({ mahalle: "" });
                      }
                    : undefined
                }
                className="xl:col-span-1"
              />
              <ComboboxField
                label="Köy"
                value={data.koy}
                options={koyOptions}
                placeholder={data.ilce ? "Ara veya seçin..." : "Önce ilçe seçin"}
                onChange={(v) => onChange({ koy: v })}
                onAddNew={
                  data.il && data.ilce ? async (v) => setKoyOptions(await addKoy(data.il, data.ilce, v)) : undefined
                }
                onRemoveOption={
                  data.il && data.ilce
                    ? async (v) => {
                        setKoyOptions(await removeKoy(data.il, data.ilce, v));
                        if (data.koy === v) onChange({ koy: "" });
                      }
                    : undefined
                }
                className="xl:col-span-1"
              />
              <TextField
                label="Cadde / Bulvar"
                value={data.caddeBulvar}
                onChange={(v) => onChange({ caddeBulvar: v })}
                className="xl:col-span-1"
              />
              <TextField
                label="Semt / Mevki"
                value={data.semtMevki}
                onChange={(v) => onChange({ semtMevki: v })}
                className="xl:col-span-1"
              />
              <TextField
                label="Sokak"
                value={data.sokak}
                onChange={(v) => onChange({ sokak: v })}
                className="xl:col-span-1"
              />
            </div>
          </FormGroup>

          <FormGroup title="Numaraj Bilgileri Formu">
            <div className={`${sectionBodyClass} grid grid-cols-1 gap-x-3 gap-y-3 md:grid-cols-2 xl:grid-cols-12`}>
              <TextField
                label="Kimlik No"
                value={data.numarajKimlikNo}
                onChange={(v) => onChange({ numarajKimlikNo: v })}
                className="xl:col-span-3"
              />
              <TextField
                label="Ada"
                value={data.ada}
                onChange={(v) => onChange({ ada: v })}
                className="xl:col-span-1"
              />
              <TextField
                label="Parsel"
                value={data.parsel}
                onChange={(v) => onChange({ parsel: v })}
                className="xl:col-span-1"
              />
              <TextField
                label="Pafta"
                value={data.pafta}
                onChange={(v) => onChange({ pafta: v })}
                className="xl:col-span-2"
              />
              <TextField
                label="Posta Kod"
                value={data.postaKodu}
                onChange={(v) => onChange({ postaKodu: v })}
                className="xl:col-span-1"
              />
              <TextField
                label="Dış Kapı"
                value={data.disKapi}
                onChange={(v) => onChange({ disKapi: v })}
                className="xl:col-span-1"
              />
              <TextField
                label="Numaraj Tipi"
                value={data.numarajTipi}
                onChange={(v) => onChange({ numarajTipi: v })}
                className="xl:col-span-3"
              />
              <TextField
                label="Site Adı"
                value={data.siteAdi}
                onChange={(v) => onChange({ siteAdi: v })}
                className="xl:col-span-6"
              />
              <TextField
                label="Apartman / Blok Adı"
                value={data.apartmanBlokAdi}
                onChange={(v) => onChange({ apartmanBlokAdi: v })}
                className="xl:col-span-6"
              />
            </div>
          </FormGroup>

          <FormGroup title="Bağımsız Bölüm Bilgileri Formu">
            <div className={`${sectionBodyClass} grid grid-cols-1 gap-x-3 gap-y-3 xl:grid-cols-6`}>
              <TextField
                label="Kimlik No"
                value={data.bagimsizBolumKimlikNo}
                onChange={(v) => onChange({ bagimsizBolumKimlikNo: v })}
              />
              <TextField label="İç Kapı" value={data.icKapi} onChange={(v) => onChange({ icKapi: v })} />
              <TextField
                label="Kullanım Amacı"
                value={data.kullanimAmaci}
                onChange={(v) => onChange({ kullanimAmaci: v })}
              />
              <TextField label="Tip" value={data.tip} onChange={(v) => onChange({ tip: v })} />
              <TextField label="Durum" value={data.durum} onChange={(v) => onChange({ durum: v })} />
              <TextField label="Tapu No" value={data.tapuNo} onChange={(v) => onChange({ tapuNo: v })} />
            </div>
          </FormGroup>
        </>
      )}

      {activeTab === "konum" && (
        <div className="space-y-4">
          <KmlMapPanel properties={data.kmlKonumlari} fileName={data.kmlDosyaAdi} onChange={onChange} />
        </div>
      )}

      {activeTab === "bolge" && (
        <FormGroup title="Bölge Özellikleri Sekmesi">
          <div className={`${sectionBodyClass} p-4`}>
            <p className="text-sm text-slate-500">
              Bu sekme yeni bolge ozellikleri alanlari icin ayrildi. Mevcut bagimsiz bolum bilgileri Adres sekmesine
              tasindi.
            </p>
          </div>
        </FormGroup>
      )}

      {uavtModalOpen && (
        <UavtPasteModal
          value={uavtPasteText}
          onChange={(nextValue) => {
            setUavtPasteText(nextValue);
            if (uavtMessage) setUavtMessage(null);
          }}
          onClose={() => {
            if (uavtImporting) return;
            setUavtModalOpen(false);
          }}
          onOpenSite={openUavtSite}
          onImport={handleImportPastedUavt}
          onClear={handleClearUavtPaste}
          onRetry={handleRetryUavtFlow}
          importing={uavtImporting}
          message={uavtMessage}
        />
      )}
    </div>
  );
}
