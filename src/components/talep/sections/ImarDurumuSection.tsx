"use client";

import { useEffect, useRef, useState } from "react";
import { acknowledgeBridge, readBridgeDetail } from "@/lib/bridge/event-detail";
import { ClipboardPaste, X } from "lucide-react";
import {
  SectionCard,
  SectionGrid,
  TextField,
  modalCardClass,
  primaryButtonClass,
  secondaryButtonClass,
  sectionBodyClass,
} from "@/components/talep/form-fields";
import { parseImarDurumuText } from "@/lib/talep/imar-extract";
import type { ImarDurumuData } from "@/lib/talep/types";

const IMAR_BRIDGE_EVENT = "eksperix:imar-import";

type BridgeMessageState = { tone: "success" | "warning" | "error"; text: string } | null;
type ImarBridgePayload = { text?: string; title?: string; url?: string; capturedAt?: number };

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
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm outline-none placeholder:text-slate-400 focus:border-lime-300 focus:ring-4 focus:ring-lime-200/50"
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
  onChange,
}: {
  data: ImarDurumuData;
  onChange: (patch: Partial<ImarDurumuData>) => void;
}) {
  const [bridgeMessage, setBridgeMessage] = useState<BridgeMessageState>(null);
  const [pasteModalOpen, setPasteModalOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasteImporting, setPasteImporting] = useState(false);
  const [pasteMessage, setPasteMessage] = useState<BridgeMessageState>(null);
  const onChangeRef = useRef(onChange);

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
          text: `${filledCount} alan eklenti üzerinden e-imar sonucundan dolduruldu. Lütfen doğruluğunu kontrol edin.`,
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
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={handleOpenPasteModal}
          className={`inline-flex items-center gap-1.5 ${secondaryButtonClass}`}
        >
          <ClipboardPaste className="h-3.5 w-3.5" />
          E-imar Sonucu Yapıştır
        </button>
      </div>

      <SectionCard title="Meri İmar Planı">
        <div className={sectionBodyClass}>
          {bridgeMessage && (
            <p
              className={`mb-3 rounded-lg px-3 py-2 text-xs ${
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
          <SectionGrid>
            <TextField
              label="Mer'i İmar Planı"
              value={data.meriImarPlani}
              onChange={(v) => onChange({ meriImarPlani: v })}
              className="sm:col-span-2 lg:col-span-3"
            />
            <TextField label="Fonksiyon" value={data.fonksiyon} onChange={(v) => onChange({ fonksiyon: v })} />
            <TextField
              label="Tasdik Tarihi"
              type="date"
              value={data.tasdikTarihi}
              onChange={(v) => onChange({ tasdikTarihi: v })}
            />
            <TextField label="Pafta" value={data.pafta} onChange={(v) => onChange({ pafta: v })} />
            <TextField label="Ölçek" value={data.olcek} onChange={(v) => onChange({ olcek: v })} />
            <TextField label="Ada" value={data.ada} onChange={(v) => onChange({ ada: v })} />
            <TextField label="Parsel" value={data.parsel} onChange={(v) => onChange({ parsel: v })} />
            <TextField label="İlçe" value={data.ilce} onChange={(v) => onChange({ ilce: v })} />
            <TextField label="Mahalle" value={data.mahalle} onChange={(v) => onChange({ mahalle: v })} />
            <TextField label="Hesap Alanı (m²)" value={data.hesapAlani} onChange={(v) => onChange({ hesapAlani: v })} />
            <TextField label="Kat Adedi" value={data.katAdedi} onChange={(v) => onChange({ katAdedi: v })} />
            <TextField
              label="Bina Yüksekliği"
              value={data.binaYuksekligi}
              onChange={(v) => onChange({ binaYuksekligi: v })}
            />
            <TextField label="Ön Bahçe" value={data.onBahce} onChange={(v) => onChange({ onBahce: v })} />
            <TextField label="Yan Bahçe" value={data.yanBahce} onChange={(v) => onChange({ yanBahce: v })} />
            <TextField label="Arka Bahçe" value={data.arkaBahce} onChange={(v) => onChange({ arkaBahce: v })} />
            <TextField
              label="İnşaat Nizamı"
              value={data.insaatNizami}
              onChange={(v) => onChange({ insaatNizami: v })}
            />
            <TextField label="TAKS" value={data.taks} onChange={(v) => onChange({ taks: v })} />
            <TextField label="KAKS (Emsal)" value={data.kaks} onChange={(v) => onChange({ kaks: v })} />
            <TextField
              label="Kot Alınacak Nokta"
              value={data.kotAlinacakNokta}
              onChange={(v) => onChange({ kotAlinacakNokta: v })}
            />
          </SectionGrid>
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
        </div>
      </SectionCard>

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
