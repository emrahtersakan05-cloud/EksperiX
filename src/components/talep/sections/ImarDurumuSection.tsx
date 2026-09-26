"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { acknowledgeBridge, readBridgeDetail } from "@/lib/bridge/event-detail";
import { surumEnAz, useBridgeIstegi } from "@/lib/bridge/useBridgeIstegi";
import { ClipboardPaste, Download, FileText, Loader2, MapPin, TriangleAlert, X } from "lucide-react";
import {
  SectionCard,
  SectionGrid,
  TextField,
  inputClass,
  modalCardClass,
  primaryButtonClass,
  secondaryButtonClass,
  sectionBodyClass,
} from "@/components/talep/form-fields";
import { parseImarDurumuText } from "@/lib/talep/imar-extract";
import { haritaLinki, imarMetni, tapuFarklari, tapudanDoldurulacaklar, yapilasmaHakki } from "@/lib/talep/imar";
import type { ImarDurumuData, TapuKaydiData } from "@/lib/talep/types";

const IMAR_BRIDGE_EVENT = "eksperix:imar-import";
// The in-page request for e-imar arrived in this extension version.
const IMAR_ISTEGI_SURUMU = "0.7.0";

type BridgeMessageState = { tone: "success" | "warning" | "error"; text: string } | null;
type ImarBridgePayload = { text?: string; title?: string; url?: string; capturedAt?: number };

// The e-imar fields (the kadastro coordinates aside).
const KADASTRO_ALANLARI: (keyof ImarDurumuData)[] = ["projeksiyon", "kartezyenKoordinat", "cografiKoordinat"];
const ALAN_SAYISI = 20;

const TAPUDAN_ETIKET: Record<string, string> = {
  ada: "Ada",
  parsel: "Parsel",
  ilce: "İlçe",
  mahalle: "Mahalle",
  hesapAlani: "Hesap Alanı",
};

function AltGrup({ baslik, children }: { baslik: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{baslik}</p>
      <SectionGrid>{children}</SectionGrid>
    </div>
  );
}

function HakKutusu({ baslik, aciklama, deger }: { baslik: string; aciklama: string; deger: number | null }) {
  return (
    <div className="rounded-lg border border-lime-200 bg-lime-50/60 px-3 py-2">
      <p className="text-[11px] font-medium text-slate-500">
        {baslik} <span className="text-slate-400">· {aciklama}</span>
      </p>
      <p className={`text-sm font-semibold tabular-nums ${deger === null ? "text-slate-300" : "text-slate-900"}`}>
        {deger === null ? "—" : `${deger.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} m²`}
      </p>
    </div>
  );
}

function countFilledFields(patch: Partial<ImarDurumuData>): number {
  return Object.values(patch).filter((v) => typeof v === "string" && v.trim().length > 0).length;
}

function ImarPasteModal({
  value,
  onChange,
  onClose,
  onImport,
  importing,
  message,
}: {
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onImport: () => void;
  importing: boolean;
  message: BridgeMessageState;
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
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-500">İmar Durumu Aktarımı</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">E-imar sonucunu forma aktar</h2>
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
              <li>1. Belediyenin e-imar durumu sorgu sonucunu açın.</li>
              <li>2. Sonuç sayfasının tamamını (Ctrl+A) kopyalayın.</li>
              <li>3. Aşağıya yapıştırıp `Bilgileri Getir` ile forma aktarın.</li>
            </ol>
          </div>

          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-slate-500">Kopyalanan e-imar sonucu</span>
            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              rows={10}
              placeholder="E-imar sonuç ekranındaki metni buraya yapıştırın..."
              className={inputClass}
            />
          </label>

          {message && <p className={`rounded-xl px-3 py-2 text-xs ${messageTone[message.tone]}`}>{message.text}</p>}
        </div>

        <div className="mt-6 flex justify-end gap-2">
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

export default function ImarDurumuSection({
  data,
  tapuKaydi,
  onChange,
}: {
  data: ImarDurumuData;
  tapuKaydi: TapuKaydiData;
  onChange: (patch: Partial<ImarDurumuData>) => void;
}) {
  const doluAlan = (Object.keys(data) as (keyof ImarDurumuData)[]).filter(
    (k) => !KADASTRO_ALANLARI.includes(k) && data[k].trim(),
  ).length;
  const farklar = tapuFarklari(data, tapuKaydi);
  const tapudan = tapudanDoldurulacaklar(data, tapuKaydi);
  const tapudanAlanlar = Object.keys(tapudan);
  const hak = yapilasmaHakki(data);
  const harita = haritaLinki(data.cografiKoordinat);
  const metin = imarMetni(data);
  const [bridgeMessage, setBridgeMessage] = useState<BridgeMessageState>(null);
  const [pasteModalOpen, setPasteModalOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasteImporting, setPasteImporting] = useState(false);
  const [pasteMessage, setPasteMessage] = useState<BridgeMessageState>(null);
  const onChangeRef = useRef(onChange);
  const bridge = useBridgeIstegi("imar", (text) => setBridgeMessage({ tone: "error", text }));
  const bridgeGuncel = bridge.durum === "hazir" && surumEnAz(bridge.surum, IMAR_ISTEGI_SURUMU);

  function eimarGetir() {
    setBridgeMessage(null);
    bridge.getir();
  }

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    function handleBridgeImport(event: Event) {
      const detail = readBridgeDetail<ImarBridgePayload>(event);
      const incomingText = detail?.text?.trim();
      if (!incomingText) return;
      acknowledgeBridge(IMAR_BRIDGE_EVENT);

      const patch = parseImarDurumuText(incomingText);
      const filledCount = countFilledFields(patch);

      if (filledCount > 0) {
        onChangeRef.current(patch);
        setBridgeMessage({
          tone: "success",
          text: `${filledCount} alan e-imar sonucundan dolduruldu${detail?.title ? ` (${detail.title})` : ""}. Lütfen doğruluğunu kontrol edin.`,
        });
      } else {
        setBridgeMessage({
          tone: "warning",
          text: "Eklenti sayfayı okudu ancak eşleşen alan bulunamadı.",
        });
      }
    }

    window.addEventListener(IMAR_BRIDGE_EVENT, handleBridgeImport as EventListener);
    return () => window.removeEventListener(IMAR_BRIDGE_EVENT, handleBridgeImport as EventListener);
  }, []);

  function handleOpenPasteModal() {
    setPasteMessage(null);
    setPasteModalOpen(true);
  }

  async function handleImportPasted() {
    if (pasteImporting) return;
    setPasteImporting(true);
    setPasteMessage(null);
    try {
      const patch = parseImarDurumuText(pasteText);
      const filledCount = countFilledFields(patch);
      if (filledCount > 0) {
        onChange(patch);
        setPasteMessage({
          tone: "success",
          text: `${filledCount} alan e-imar sonucundan güncellendi. Lütfen doğruluğunu kontrol edin.`,
        });
      } else {
        setPasteMessage({
          tone: "warning",
          text: "Yapıştırılan metinde eşleşen alan bulunamadı. Sonuç sayfasının tamamını kopyaladığınızdan emin olun.",
        });
      }
    } catch {
      setPasteMessage({ tone: "error", text: "Metin işlenemedi. Tekrar deneyin." });
    } finally {
      setPasteImporting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-slate-900">E-imar sonucunu aktar</p>
              {bridge.durum === "hazir" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Eksperix Bridge bağlı{bridge.surum ? ` · v${bridge.surum}` : ""}
                </span>
              )}
              {bridge.durum === "kontrol" && <Loader2 className="h-3 w-3 animate-spin text-slate-400" />}
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              Belediyenin e-imar sorgusunu başka bir sekmede açıp parseli sorgulayın, sonra sekmeden getirin.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleOpenPasteModal}
              className={`inline-flex items-center gap-1.5 ${secondaryButtonClass}`}
            >
              <ClipboardPaste className="h-3.5 w-3.5" />
              Sonucu Yapıştır
            </button>
            <button
              type="button"
              onClick={eimarGetir}
              disabled={!bridgeGuncel || bridge.yukleniyor}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-semibold text-lime-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {bridge.yukleniyor ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              E-imar sekmesinden getir
            </button>
          </div>
        </div>

        {(bridge.durum === "yok" || (bridge.durum === "hazir" && !bridgeGuncel)) && (
          <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {bridge.durum === "yok"
              ? "Eksperix Bridge algılanmadı. "
              : `Bu düğme için eklentinin v${IMAR_ISTEGI_SURUMU} veya üstü gerekir. `}
            Sonucu yapıştırarak da aktarabilirsiniz.{" "}
            <Link href="/araclarim/uygulama-eklentileri" className="font-semibold text-lime-700 hover:text-lime-800">
              Eklentiyi kur / güncelle →
            </Link>
          </p>
        )}

        {bridgeMessage && (
          <p
            className={`mt-2 rounded-lg px-3 py-2 text-xs ${
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

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium tabular-nums text-slate-600">
            {doluAlan}/{ALAN_SAYISI} alan dolu
          </span>
          {farklar.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 ring-1 ring-amber-200">
              <TriangleAlert className="h-3 w-3" />
              Tapu ile {farklar.length} farklılık
            </span>
          )}
        </div>
        {tapudanAlanlar.length > 0 && (
          <button
            type="button"
            onClick={() => onChange(tapudan)}
            title={`Boş alanlar Tapu Kaydı sekmesinden doldurulur: ${tapudanAlanlar.map((k) => TAPUDAN_ETIKET[k]).join(", ")}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-slate-400"
          >
            <FileText className="h-3.5 w-3.5" />
            Tapu Kaydından doldur ({tapudanAlanlar.length})
          </button>
        )}
      </div>

      <SectionCard title="Meri İmar Planı">
        <div className="space-y-4">
          <AltGrup baslik="Plan Bilgileri">
            <TextField
              label="Mer'i İmar Planı"
              value={data.meriImarPlani}
              onChange={(v) => onChange({ meriImarPlani: v })}
              placeholder="örn. 1/1000 ölçekli Uygulama İmar Planı"
              className="sm:col-span-2 lg:col-span-3"
            />
            <TextField label="Fonksiyon" value={data.fonksiyon} onChange={(v) => onChange({ fonksiyon: v })} placeholder="örn. Konut Alanı" />
            <TextField label="Tasdik Tarihi" type="date" value={data.tasdikTarihi} onChange={(v) => onChange({ tasdikTarihi: v })} />
            <TextField label="Ölçek" value={data.olcek} onChange={(v) => onChange({ olcek: v })} placeholder="1/1000" />
          </AltGrup>

          <AltGrup baslik="Parsel Bilgileri">
            <TextField label="Pafta" value={data.pafta} onChange={(v) => onChange({ pafta: v })} />
            <TextField label="Ada" value={data.ada} onChange={(v) => onChange({ ada: v })} />
            <TextField label="Parsel" value={data.parsel} onChange={(v) => onChange({ parsel: v })} />
            <TextField label="İlçe" value={data.ilce} onChange={(v) => onChange({ ilce: v })} />
            <TextField label="Mahalle" value={data.mahalle} onChange={(v) => onChange({ mahalle: v })} />
            <TextField label="Hesap Alanı (m²)" value={data.hesapAlani} onChange={(v) => onChange({ hesapAlani: v })} />
          </AltGrup>
          {farklar.length > 0 && (
            <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <p className="font-medium">Tapu Kaydı ile farklı:</p>
              <ul className="mt-1 space-y-0.5">
                {farklar.map((f) => (
                  <li key={f.etiket}>
                    {f.etiket}: imarda <strong>{f.imar}</strong>, tapuda <strong>{f.tapu}</strong>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <AltGrup baslik="Yapılaşma Koşulları">
            <TextField label="İnşaat Nizamı" value={data.insaatNizami} onChange={(v) => onChange({ insaatNizami: v })} placeholder="örn. Ayrık" />
            <TextField label="Kat Adedi" value={data.katAdedi} onChange={(v) => onChange({ katAdedi: v })} />
            <TextField
              label="Bina Yüksekliği"
              value={data.binaYuksekligi}
              onChange={(v) => onChange({ binaYuksekligi: v })}
              placeholder="örn. 15.50 m"
            />
            <TextField label="TAKS" value={data.taks} onChange={(v) => onChange({ taks: v })} placeholder="örn. 0.30" />
            <TextField label="KAKS (Emsal)" value={data.kaks} onChange={(v) => onChange({ kaks: v })} placeholder="örn. 1.50" />
            <TextField
              label="Kot Alınacak Nokta"
              value={data.kotAlinacakNokta}
              onChange={(v) => onChange({ kotAlinacakNokta: v })}
            />
          </AltGrup>
          {(hak.taban !== null || hak.toplam !== null) && (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <HakKutusu baslik="Taban Alanı" aciklama="Hesap Alanı × TAKS" deger={hak.taban} />
              <HakKutusu baslik="Toplam İnşaat Alanı" aciklama="Hesap Alanı × KAKS" deger={hak.toplam} />
            </div>
          )}

          <AltGrup baslik="Bahçe Mesafeleri">
            <TextField label="Ön Bahçe" value={data.onBahce} onChange={(v) => onChange({ onBahce: v })} placeholder="örn. 5 m" />
            <TextField label="Yan Bahçe" value={data.yanBahce} onChange={(v) => onChange({ yanBahce: v })} placeholder="örn. 3 m" />
            <TextField label="Arka Bahçe" value={data.arkaBahce} onChange={(v) => onChange({ arkaBahce: v })} placeholder="örn. 3 m" />
          </AltGrup>
        </div>
      </SectionCard>

      <SectionCard title="Kadastro Parsel Konum Bilgisi">
        <div className={sectionBodyClass}>
          <SectionGrid>
            <TextField label="Projeksiyon" value={data.projeksiyon} onChange={(v) => onChange({ projeksiyon: v })} />
            <TextField
              label="Kartezyen Koordinat"
              value={data.kartezyenKoordinat}
              onChange={(v) => onChange({ kartezyenKoordinat: v })}
            />
            <TextField
              label="Coğrafi Koordinat"
              value={data.cografiKoordinat}
              onChange={(v) => onChange({ cografiKoordinat: v })}
            />
          </SectionGrid>
          {harita && (
            <a
              href={harita}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-lime-700 hover:text-lime-800"
            >
              <MapPin className="h-3.5 w-3.5" />
              Coğrafi koordinatı haritada aç
            </a>
          )}
        </div>
      </SectionCard>

      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-4">
        <p className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
          <FileText className="h-3.5 w-3.5" />
          Rapora yansıyacak metin
        </p>
        <p className={`text-sm leading-relaxed ${metin ? "text-slate-700" : "text-slate-400"}`}>
          {metin || "Alanları doldurdukça rapor metni burada oluşur."}
        </p>
      </div>

      {pasteModalOpen && (
        <ImarPasteModal
          value={pasteText}
          onChange={(v) => {
            setPasteText(v);
            if (pasteMessage) setPasteMessage(null);
          }}
          onClose={() => {
            if (pasteImporting) return;
            setPasteModalOpen(false);
          }}
          onImport={handleImportPasted}
          importing={pasteImporting}
          message={pasteMessage}
        />
      )}
    </div>
  );
}
