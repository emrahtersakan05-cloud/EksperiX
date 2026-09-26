"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AkiciMetinGrubu } from "@/components/akici-metin/kart";
import { acknowledgeBridge, readBridgeDetail } from "@/lib/bridge/event-detail";
import { surumEnAz, useBridgeIstegi } from "@/lib/bridge/useBridgeIstegi";
import { ClipboardPaste, Download, ExternalLink, Home, Loader2, MapPinned, Trees, X } from "lucide-react";
import {
  ComboboxField,
  SectionCard,
  inputClass,
  modalCardClass,
  primaryButtonClass,
  secondaryButtonClass,
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
import { parseUavtText, type ParsedUavtFields } from "@/lib/ocr/uavt-extract";
import { normalYazimNesne } from "@/lib/text/buyuk-harf";
import type { AdresKonumData } from "@/lib/talep/types";
import KmlMapPanel from "@/components/talep/sections/KmlMapPanel";
import { Doluluk, Ozet, OzetBasligi, OzetIzgarasi } from "@/components/talep/sections/tasarim";

const UAVT_SORGU_URL = "https://adres.nvi.gov.tr/VatandasIslemleri/AdresSorgu";
const UAVT_BRIDGE_EVENT = "eksperix:uavt-import";
// The in-page request for UAVT arrived in this extension version.
const UAVT_ISTEGI_SURUMU = "0.8.0";
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

const FormGroup = SectionCard;
const ADRES_KONUM_TABS = [
  { key: "adres", label: "Adres", icon: Home },
  { key: "konum", label: "Konum", icon: MapPinned },
  { key: "bolge", label: "Bölge Özellikleri", icon: Trees },
] as const;

// The address fields a UAVT result fills (for the fill count).
const ADRES_ALANLARI = IMPORTABLE_UAVT_FIELDS.filter((k) => k !== "koy");

type AdresKonumTabKey = (typeof ADRES_KONUM_TABS)[number]["key"];

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
              className={inputClass}
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

  const [uavtModalOpen, setUavtModalOpen] = useState(false);
  const [uavtPasteText, setUavtPasteText] = useState("");
  const [uavtImporting, setUavtImporting] = useState(false);
  const [uavtMessage, setUavtMessage] = useState<{
    tone: "success" | "warning" | "error";
    text: string;
  } | null>(null);
  const [bridgeMessage, setBridgeMessage] = useState<BridgeMessageState>(null);
  const [activeTab, setActiveTab] = useState<AdresKonumTabKey>("adres");
  const bridge = useBridgeIstegi("uavt", (text) => setBridgeMessage({ tone: "error", text }));
  const bridgeGuncel = bridge.durum === "hazir" && surumEnAz(bridge.surum, UAVT_ISTEGI_SURUMU);

  function uavtGetir() {
    setBridgeMessage(null);
    bridge.getir();
  }

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
          onChange({ ...buildEmptyUavtPatch(), ...normalYazimNesne(parsed) });
          setBridgeMessage({
            tone: "success",
            text: `${filledCount} alan UAVT sonucundan dolduruldu${detail?.title ? ` (${detail.title})` : ""}. Lütfen doğruluğunu kontrol edin.`,
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
        onChange({ ...buildEmptyUavtPatch(), ...normalYazimNesne(parsed) });
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

  const adresSatiri = [
    data.mahalle && `${data.mahalle} Mah.`,
    data.koy && `${data.koy} Köyü`,
    data.semtMevki,
    data.caddeBulvar,
    data.sokak,
    [data.disKapi && `No: ${data.disKapi}`, data.icKapi && `İç Kapı: ${data.icKapi}`].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");
  const adresDolu = ADRES_ALANLARI.filter((k) => data[k].trim()).length;
  const ilkKonum = data.kmlKonumlari[0];
  const enlem = ilkKonum ? String(ilkKonum.latitude.toFixed(6)) : data.enlem;
  const boylam = ilkKonum ? String(ilkKonum.longitude.toFixed(6)) : data.boylam;
  const haritaUrl = enlem && boylam ? `https://www.google.com/maps?q=${enlem},${boylam}` : "";

  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="Adres / Konum" className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
        {ADRES_KONUM_TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${
                isActive ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "adres" && (
        <>
          <OzetBasligi
            etiket="Adres Özeti"
            ikon={<Home className="h-3.5 w-3.5" />}
            baslik={adresSatiri || "Adres girilmedi"}
            bos={!adresSatiri}
            altBaslik={[data.ilce, data.il].filter(Boolean).join(" / ") + (data.postaKodu ? ` · ${data.postaKodu}` : "") || "İl ve ilçe seçilmedi"}
            sag={
              <>
                <button
                  type="button"
                  onClick={openUavtSite}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 ring-1 ring-white/15 hover:bg-white/5 hover:text-white"
                >
                  <ExternalLink className="h-4 w-4" />
                  UAVT&apos;yi Aç
                </button>
                <button
                  type="button"
                  onClick={handleOpenUavtModal}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 ring-1 ring-white/15 hover:bg-white/5 hover:text-white"
                >
                  <ClipboardPaste className="h-4 w-4" />
                  Sonucu Yapıştır
                </button>
                <button
                  type="button"
                  onClick={uavtGetir}
                  disabled={!bridgeGuncel || bridge.yukleniyor}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-lime-300 px-3.5 py-2 text-sm font-semibold text-slate-900 hover:bg-lime-200 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {bridge.yukleniyor ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  UAVT sekmesinden getir
                </button>
              </>
            }
            alt={
              <>
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      bridge.durum === "hazir" && bridgeGuncel ? "bg-emerald-400" : bridge.durum === "kontrol" ? "bg-slate-500" : "bg-amber-400"
                    }`}
                  />
                  {bridge.durum === "kontrol"
                    ? "Eklenti kontrol ediliyor"
                    : bridge.durum === "yok"
                      ? "Eksperix Bridge algılanmadı"
                      : `Eksperix Bridge${bridge.surum ? ` v${bridge.surum}` : ""}${bridgeGuncel ? " bağlı" : " güncel değil"}`}
                </span>
                <Doluluk dolu={adresDolu} toplam={ADRES_ALANLARI.length} />
              </>
            }
          >
            <OzetIzgarasi>
              <Ozet etiket="Ada / Parsel" deger={data.ada || data.parsel ? `${data.ada || "—"} / ${data.parsel || "—"}` : ""} />
              <Ozet etiket="Adres Kodu (Numaraj)" deger={data.numarajKimlikNo} />
              <Ozet etiket="BB Adres Kodu" deger={data.bagimsizBolumKimlikNo} />
              <Ozet etiket="Kullanım Amacı" deger={data.kullanimAmaci} />
              <Ozet etiket="Site / Blok" deger={[data.siteAdi, data.apartmanBlokAdi].filter(Boolean).join(" · ")} />
            </OzetIzgarasi>
          </OzetBasligi>

          {bridgeMessage && (
            <p
              className={`rounded-lg px-3 py-2 text-xs ${
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

          {(bridge.durum === "yok" || (bridge.durum === "hazir" && !bridgeGuncel)) && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {bridge.durum === "yok"
                ? "Eksperix Bridge algılanmadı. "
                : `UAVT sekmesinden getirmek için eklentinin v${UAVT_ISTEGI_SURUMU} veya üstü gerekir. `}
              Sonucu yapıştırarak da aktarabilirsiniz.{" "}
              <Link href="/araclarim/uygulama-eklentileri" className="font-semibold text-lime-700 hover:text-lime-800">
                Eklentiyi kur / güncelle →
              </Link>
            </p>
          )}

          <AkiciMetinGrubu
            baslik="Adres Bilgileri"
            aciklama="Adres, Numaraj ve Bağımsız Bölüm formları için tek akıcı metin"
          >
            <FormGroup title="Adres Bilgileri Formu" akiciMetin={false}>
              <div className="grid grid-cols-1 gap-x-3 gap-y-3 sm:grid-cols-2 xl:grid-cols-4">
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
                />
                <TextField
                  label="Cadde / Bulvar"
                  value={data.caddeBulvar}
                  onChange={(v) => onChange({ caddeBulvar: v })}
                  className="xl:col-span-2"
                />
                <TextField
                  label="Semt / Mevki"
                  value={data.semtMevki}
                  onChange={(v) => onChange({ semtMevki: v })}
                />
                <TextField
                  label="Sokak"
                  value={data.sokak}
                  onChange={(v) => onChange({ sokak: v })}
                />
              </div>
            </FormGroup>

            <FormGroup title="Numaraj Bilgileri Formu" akiciMetin={false}>
              <div className="grid grid-cols-1 gap-x-3 gap-y-3 sm:grid-cols-2 xl:grid-cols-12">
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
                />
                <TextField
                  label="Parsel"
                  value={data.parsel}
                  onChange={(v) => onChange({ parsel: v })}
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
                />
                <TextField
                  label="Dış Kapı"
                  value={data.disKapi}
                  onChange={(v) => onChange({ disKapi: v })}
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

            <FormGroup title="Bağımsız Bölüm Bilgileri Formu" akiciMetin={false}>
              <div className="grid grid-cols-1 gap-x-3 gap-y-3 sm:grid-cols-3 xl:grid-cols-6">
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
          </AkiciMetinGrubu>
        </>
      )}

      {activeTab === "konum" && (
        <div className="space-y-4">
          <OzetBasligi
            etiket="Konum Özeti"
            ikon={<MapPinned className="h-3.5 w-3.5" />}
            baslik={ilkKonum?.name || data.kmlDosyaAdi || "KML yüklenmedi"}
            bos={!ilkKonum && !data.kmlDosyaAdi}
            altBaslik={
              data.kmlDosyaAdi
                ? `${data.kmlDosyaAdi} · ${data.kmlKonumlari.length} taşınmaz`
                : "Taşınmazın KML dosyasını yükleyerek konumunu haritada gösterin"
            }
            sag={
              haritaUrl && (
                <a
                  href={haritaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-lime-300 px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-lime-200"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Google Haritalar&apos;da aç
                </a>
              )
            }
          >
            <OzetIzgarasi>
              <Ozet etiket="Taşınmaz" deger={data.kmlKonumlari.length ? String(data.kmlKonumlari.length) : ""} />
              <Ozet etiket="Polygon" deger={data.kmlKonumlari.length ? String(data.kmlKonumlari.filter((k) => k.hasPolygon).length) : ""} />
              <Ozet etiket="Enlem" deger={enlem} />
              <Ozet etiket="Boylam" deger={boylam} />
              <Ozet etiket="İl / İlçe" deger={[data.il, data.ilce].filter(Boolean).join(" / ")} />
            </OzetIzgarasi>
          </OzetBasligi>
          <KmlMapPanel properties={data.kmlKonumlari} fileName={data.kmlDosyaAdi} onChange={onChange} />
        </div>
      )}

      {activeTab === "bolge" && (
        <FormGroup title="Bölge Özellikleri Sekmesi">
          <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 px-4 py-10 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-slate-400 shadow-sm">
              <Trees className="h-5 w-5" />
            </span>
            <p className="text-sm font-semibold text-slate-700">Bölge özellikleri formu henüz tanımlanmadı</p>
            <p className="max-w-sm text-xs text-slate-500">
              Bölgenin gelişmişliği, ulaşım, sosyal donatılar gibi bilgiler için ayrılan alan. Bağımsız bölüm bilgileri Adres
              sekmesinde.
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
