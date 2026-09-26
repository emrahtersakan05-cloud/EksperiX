"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { acknowledgeBridge, readBridgeDetail } from "@/lib/bridge/event-detail";
import { surumEnAz, useBridgeIstegi } from "@/lib/bridge/useBridgeIstegi";
import {
  Building2,
  CircleCheck,
  ClipboardPaste,
  Download,
  FileText,
  Landmark,
  Loader2,
  MapPin,
  MapPinned,
  ScrollText,
  Trees,
  TriangleAlert,
  X,
} from "lucide-react";
import {
  SectionCard,
  TextField,
  inputClass,
  modalCardClass,
  primaryButtonClass,
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

function Panel({
  baslik,
  icon,
  sag,
  children,
}: {
  baslik: string;
  icon: ReactNode;
  sag?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50/40 p-3.5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white text-slate-500 shadow-sm ring-1 ring-slate-200">
            {icon}
          </span>
          {baslik}
        </p>
        {sag}
      </div>
      {children}
    </div>
  );
}

const ikiSutun = "grid grid-cols-1 gap-x-3 gap-y-3 sm:grid-cols-2";

// One figure in the dark summary header.
function Ozet({ etiket, deger, birim }: { etiket: string; deger: string; birim?: string }) {
  return (
    <div className="min-w-0 rounded-lg bg-white/5 px-3 py-2 ring-1 ring-white/10">
      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{etiket}</p>
      <p className={`truncate text-base font-semibold tabular-nums ${deger ? "text-white" : "text-slate-600"}`} title={deger}>
        {deger || "—"}
        {deger && birim ? <span className="ml-0.5 text-xs font-medium text-slate-400">{birim}</span> : null}
      </p>
    </div>
  );
}

const m2Yaz = (n: number | null) => (n === null ? "" : n.toLocaleString("tr-TR", { maximumFractionDigits: 2 }));

// Parcel sketch: the building inside its lot, road at the front.
function BahceSemasi({ on, yan, arka }: { on: string; yan: string; arka: string }) {
  const etiket = (v: string) => v.trim() || "—";
  return (
    <svg viewBox="0 0 240 178" className="h-auto w-full max-w-[300px] text-slate-400" role="img" aria-label="Bahçe mesafeleri şeması">
      <defs>
        <marker id="bahce-ok" viewBox="0 0 6 6" refX="3" refY="3" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0,0 L6,3 L0,6 z" fill="currentColor" />
        </marker>
      </defs>
      <rect x="20" y="8" width="200" height="132" rx="5" className="fill-white" stroke="currentColor" strokeDasharray="5 4" />
      <rect x="72" y="42" width="96" height="58" rx="4" className="fill-lime-100 stroke-lime-500" strokeWidth="1.5" />
      <text x="120" y="75" textAnchor="middle" className="fill-lime-800 text-[11px] font-semibold">
        Bina
      </text>
      <rect x="4" y="150" width="232" height="22" rx="4" className="fill-slate-200" />
      <text x="120" y="165" textAnchor="middle" className="fill-slate-500 text-[10px] font-medium">
        Yol
      </text>
      <line x1="120" y1="100" x2="120" y2="140" stroke="currentColor" markerStart="url(#bahce-ok)" markerEnd="url(#bahce-ok)" />
      <text x="126" y="124" className="fill-slate-700 text-[10px] font-semibold">
        Ön {etiket(on)}
      </text>
      <line x1="120" y1="8" x2="120" y2="42" stroke="currentColor" markerStart="url(#bahce-ok)" markerEnd="url(#bahce-ok)" />
      <text x="126" y="29" className="fill-slate-700 text-[10px] font-semibold">
        Arka {etiket(arka)}
      </text>
      <line x1="20" y1="71" x2="72" y2="71" stroke="currentColor" markerStart="url(#bahce-ok)" markerEnd="url(#bahce-ok)" />
      <line x1="168" y1="71" x2="220" y2="71" stroke="currentColor" markerStart="url(#bahce-ok)" markerEnd="url(#bahce-ok)" />
      <text x="194" y="64" textAnchor="middle" className="fill-slate-700 text-[10px] font-semibold">
        Yan {etiket(yan)}
      </text>
      <text x="46" y="64" textAnchor="middle" className="fill-slate-700 text-[10px] font-semibold">
        Yan {etiket(yan)}
      </text>
    </svg>
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

  const katBilgisi = [data.katAdedi && `${data.katAdedi} kat`, data.binaYuksekligi].filter(Boolean).join(" · ");

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-2xl bg-slate-900 text-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 p-4">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-lime-300">
              <Landmark className="h-3.5 w-3.5" />
              İmar Özeti
            </p>
            <h3 className={`mt-1 truncate text-lg font-semibold ${data.fonksiyon ? "text-white" : "text-slate-500"}`}>
              {data.fonksiyon || "Fonksiyon girilmedi"}
            </h3>
            <p className="truncate text-xs text-slate-400">
              {[data.meriImarPlani, data.tasdikTarihi && `Tasdik ${data.tasdikTarihi.split("-").reverse().join(".")}`]
                .filter(Boolean)
                .join(" · ") || "Mer'i imar planı bilgisi yok"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleOpenPasteModal}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 ring-1 ring-white/15 hover:bg-white/5 hover:text-white"
            >
              <ClipboardPaste className="h-4 w-4" />
              Sonucu Yapıştır
            </button>
            <button
              type="button"
              onClick={eimarGetir}
              disabled={!bridgeGuncel || bridge.yukleniyor}
              className="inline-flex items-center gap-1.5 rounded-lg bg-lime-300 px-3.5 py-2 text-sm font-semibold text-slate-900 hover:bg-lime-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {bridge.yukleniyor ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              E-imar sekmesinden getir
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 px-4 sm:grid-cols-3 lg:grid-cols-5">
          <Ozet etiket="TAKS" deger={data.taks} />
          <Ozet etiket="KAKS (Emsal)" deger={data.kaks} />
          <Ozet etiket="Kat / Yükseklik" deger={katBilgisi} />
          <Ozet etiket="İnşaat Nizamı" deger={data.insaatNizami} />
          <Ozet etiket="Hesap Alanı" deger={data.hesapAlani} birim="m²" />
        </div>

        <div className="mt-2 grid grid-cols-1 gap-2 px-4 sm:grid-cols-2">
          <div className="rounded-lg bg-lime-300/10 px-3 py-2 ring-1 ring-lime-300/25">
            <p className="text-[10px] font-medium uppercase tracking-wide text-lime-200/80">Taban Alanı · Hesap Alanı × TAKS</p>
            <p className={`text-lg font-semibold tabular-nums ${hak.taban === null ? "text-slate-600" : "text-lime-300"}`}>
              {hak.taban === null ? "—" : `${m2Yaz(hak.taban)} m²`}
            </p>
          </div>
          <div className="rounded-lg bg-lime-300/10 px-3 py-2 ring-1 ring-lime-300/25">
            <p className="text-[10px] font-medium uppercase tracking-wide text-lime-200/80">
              Toplam İnşaat Alanı · Hesap Alanı × KAKS
            </p>
            <p className={`text-lg font-semibold tabular-nums ${hak.toplam === null ? "text-slate-600" : "text-lime-300"}`}>
              {hak.toplam === null ? "—" : `${m2Yaz(hak.toplam)} m²`}
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-white/10 bg-white/[0.03] px-4 py-2.5 text-[11px] text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                bridge.durum === "hazir" ? (bridgeGuncel ? "bg-emerald-400" : "bg-amber-400") : bridge.durum === "yok" ? "bg-amber-400" : "bg-slate-500"
              }`}
            />
            {bridge.durum === "kontrol"
              ? "Eklenti kontrol ediliyor"
              : bridge.durum === "yok"
                ? "Eksperix Bridge algılanmadı"
                : `Eksperix Bridge${bridge.surum ? ` v${bridge.surum}` : ""}${bridgeGuncel ? " bağlı" : " güncel değil"}`}
          </span>
          <span className="tabular-nums">
            {doluAlan}/{ALAN_SAYISI} alan dolu
          </span>
          <span className="h-1 w-24 overflow-hidden rounded-full bg-white/10">
            <span className="block h-full rounded-full bg-lime-300" style={{ width: `${(doluAlan / ALAN_SAYISI) * 100}%` }} />
          </span>
          {farklar.length > 0 && (
            <span className="inline-flex items-center gap-1 text-amber-300">
              <TriangleAlert className="h-3 w-3" />
              Tapu ile {farklar.length} farklılık
            </span>
          )}
        </div>
      </section>

      {(bridge.durum === "yok" || (bridge.durum === "hazir" && !bridgeGuncel)) && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {bridge.durum === "yok"
            ? "Eksperix Bridge algılanmadı. "
            : `E-imar sekmesinden getirmek için eklentinin v${IMAR_ISTEGI_SURUMU} veya üstü gerekir. `}
          Sonucu yapıştırarak da aktarabilirsiniz.{" "}
          <Link href="/araclarim/uygulama-eklentileri" className="font-semibold text-lime-700 hover:text-lime-800">
            Eklentiyi kur / güncelle →
          </Link>
        </p>
      )}

      {bridgeMessage && (
        <p
          className={`flex items-start gap-1.5 rounded-lg px-3 py-2 text-xs ${
            bridgeMessage.tone === "success"
              ? "bg-emerald-50 text-emerald-700"
              : bridgeMessage.tone === "warning"
                ? "bg-amber-50 text-amber-700"
                : "bg-rose-50 text-rose-700"
          }`}
        >
          {bridgeMessage.tone === "success" ? (
            <CircleCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          ) : (
            <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          )}
          {bridgeMessage.text}
        </p>
      )}

      <SectionCard title="Meri İmar Planı">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <Panel baslik="Plan Bilgileri" icon={<ScrollText className="h-3.5 w-3.5" />}>
            <div className={ikiSutun}>
              <TextField
                label="Mer'i İmar Planı"
                value={data.meriImarPlani}
                onChange={(v) => onChange({ meriImarPlani: v })}
                placeholder="örn. 1/1000 ölçekli Uygulama İmar Planı"
                className="sm:col-span-2"
              />
              <TextField
                label="Fonksiyon"
                value={data.fonksiyon}
                onChange={(v) => onChange({ fonksiyon: v })}
                placeholder="örn. Konut Alanı"
                className="sm:col-span-2"
              />
              <TextField label="Tasdik Tarihi" type="date" value={data.tasdikTarihi} onChange={(v) => onChange({ tasdikTarihi: v })} />
              <TextField label="Ölçek" value={data.olcek} onChange={(v) => onChange({ olcek: v })} placeholder="1/1000" />
            </div>
          </Panel>

          <Panel
            baslik="Parsel Bilgileri"
            icon={<MapPinned className="h-3.5 w-3.5" />}
            sag={
              tapudanAlanlar.length > 0 && (
                <button
                  type="button"
                  onClick={() => onChange(tapudan)}
                  title={`Boş alanlar Tapu Kaydı sekmesinden doldurulur: ${tapudanAlanlar.map((k) => TAPUDAN_ETIKET[k]).join(", ")}`}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:border-slate-400"
                >
                  <FileText className="h-3 w-3" />
                  Tapu Kaydından doldur ({tapudanAlanlar.length})
                </button>
              )
            }
          >
            <div className="grid grid-cols-1 gap-x-3 gap-y-3 sm:grid-cols-3">
              <TextField label="Pafta" value={data.pafta} onChange={(v) => onChange({ pafta: v })} />
              <TextField label="Ada" value={data.ada} onChange={(v) => onChange({ ada: v })} />
              <TextField label="Parsel" value={data.parsel} onChange={(v) => onChange({ parsel: v })} />
              <TextField label="İlçe" value={data.ilce} onChange={(v) => onChange({ ilce: v })} />
              <TextField label="Mahalle" value={data.mahalle} onChange={(v) => onChange({ mahalle: v })} />
              <TextField label="Hesap Alanı (m²)" value={data.hesapAlani} onChange={(v) => onChange({ hesapAlani: v })} />
            </div>
            {farklar.length > 0 && (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <p className="inline-flex items-center gap-1 font-medium">
                  <TriangleAlert className="h-3 w-3" />
                  Tapu Kaydı ile farklı
                </p>
                <ul className="mt-1 space-y-0.5">
                  {farklar.map((f) => (
                    <li key={f.etiket}>
                      {f.etiket}: imarda <strong>{f.imar}</strong>, tapuda <strong>{f.tapu}</strong>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Panel>

          <Panel baslik="Yapılaşma Koşulları" icon={<Building2 className="h-3.5 w-3.5" />}>
            <div className="grid grid-cols-1 gap-x-3 gap-y-3 sm:grid-cols-3">
              <TextField label="TAKS" value={data.taks} onChange={(v) => onChange({ taks: v })} placeholder="0.30" />
              <TextField label="KAKS (Emsal)" value={data.kaks} onChange={(v) => onChange({ kaks: v })} placeholder="1.50" />
              <TextField label="Kat Adedi" value={data.katAdedi} onChange={(v) => onChange({ katAdedi: v })} placeholder="5" />
              <TextField
                label="Bina Yüksekliği"
                value={data.binaYuksekligi}
                onChange={(v) => onChange({ binaYuksekligi: v })}
                placeholder="15.50 m"
              />
              <TextField
                label="İnşaat Nizamı"
                value={data.insaatNizami}
                onChange={(v) => onChange({ insaatNizami: v })}
                placeholder="Ayrık"
                className="sm:col-span-2"
              />
              <TextField
                label="Kot Alınacak Nokta"
                value={data.kotAlinacakNokta}
                onChange={(v) => onChange({ kotAlinacakNokta: v })}
                className="sm:col-span-3"
              />
            </div>
          </Panel>

          <Panel baslik="Bahçe Mesafeleri" icon={<Trees className="h-3.5 w-3.5" />}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="grid flex-1 grid-cols-3 gap-x-3 gap-y-3 sm:grid-cols-1">
                <TextField label="Ön Bahçe" value={data.onBahce} onChange={(v) => onChange({ onBahce: v })} placeholder="5 m" />
                <TextField label="Yan Bahçe" value={data.yanBahce} onChange={(v) => onChange({ yanBahce: v })} placeholder="3 m" />
                <TextField label="Arka Bahçe" value={data.arkaBahce} onChange={(v) => onChange({ arkaBahce: v })} placeholder="3 m" />
              </div>
              <div className="flex justify-center sm:w-1/2">
                <BahceSemasi on={data.onBahce} yan={data.yanBahce} arka={data.arkaBahce} />
              </div>
            </div>
          </Panel>
        </div>
      </SectionCard>

      <SectionCard title="Kadastro Parsel Konum Bilgisi">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
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
        </div>
        {harita && (
          <a
            href={harita}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-400"
          >
            <MapPin className="h-3.5 w-3.5 text-lime-600" />
            Coğrafi koordinatı haritada aç
          </a>
        )}
      </SectionCard>

      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4">
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
