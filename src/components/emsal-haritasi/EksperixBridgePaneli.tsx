"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CircleCheck, Download, Loader2, PlugZap, TriangleAlert } from "lucide-react";
import { acknowledgeBridge, readBridgeDetail } from "@/lib/bridge/event-detail";
import { useBridgeIstegi } from "@/lib/bridge/useBridgeIstegi";
import type { BridgePayload } from "@/lib/emsal-haritasi/bridge-ayristir";

// Event name shared with extension/uavt-bridge/app-bridge.js.
const IMPORT_EVENT = "eksperix:emsal-import";

interface Mesaj {
  tone: "success" | "error" | "warning";
  text: string;
  alanlar?: string[];
  kaynak?: { url?: string; title?: string };
}

export default function EksperixBridgePaneli({
  onVeri,
}: {
  // Applies an imported listing to the form; returns the labels it filled.
  onVeri: (payload: BridgePayload) => string[];
}) {
  const [mesaj, setMesaj] = useState<Mesaj | null>(null);
  const { durum, surum, yukleniyor, getir } = useBridgeIstegi("emsal", (text) => setMesaj({ tone: "error", text }));
  const onVeriRef = useRef(onVeri);

  useEffect(() => {
    onVeriRef.current = onVeri;
  }, [onVeri]);

  useEffect(() => {
    // Listings arrive this way both from the popup's "Bilgileri Getir" and from
    // the in-page button below.
    function veriGeldi(event: Event) {
      const payload = readBridgeDetail<BridgePayload>(event);
      if (!payload?.text?.trim()) return;
      acknowledgeBridge(IMPORT_EVENT);
      const alanlar = onVeriRef.current(payload);
      setMesaj(
        alanlar.length > 0
          ? {
              tone: "success",
              text: `${alanlar.length} alan ilandan dolduruldu. Lütfen kontrol edin; eksik alanları elle tamamlayın.`,
              alanlar,
              kaynak: { url: payload.url, title: payload.title },
            }
          : {
              tone: "warning",
              text: "İlan sayfası okundu ancak eşleşen alan bulunamadı. İlanın detay sayfasında olduğunuzdan emin olun.",
              kaynak: { url: payload.url, title: payload.title },
            },
      );
    }

    window.addEventListener(IMPORT_EVENT, veriGeldi);
    return () => window.removeEventListener(IMPORT_EVENT, veriGeldi);
  }, []);

  function ilanGetir() {
    setMesaj(null);
    getir();
  }

  return (
    <section className="rounded-2xl border border-lime-200 bg-gradient-to-br from-lime-50 to-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-lime-300">
            <PlugZap className="h-4.5 w-4.5" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-900">Eksperix Bridge</h2>
              {durum === "hazir" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Bağlı{surum ? ` · v${surum}` : ""}
                </span>
              )}
              {durum === "yok" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  Eklenti algılanmadı
                </span>
              )}
              {durum === "kontrol" && (
                <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Kontrol ediliyor
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-slate-600">
              İlanı başka bir sekmede açın, sonra aşağıdaki düğmeye basın. Kategori, satılık/kiralık, konum ve ilandaki
              tüm özellikler forma aktarılır.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={ilanGetir}
          disabled={durum !== "hazir" || yukleniyor}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-semibold text-lime-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {yukleniyor ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          İlan sekmesinden getir
        </button>
      </div>

      {durum === "yok" && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs text-slate-600">
          Eksperix Bridge kurulu değil ya da güncel değil. Bu sayfayla çalışması için <strong>v0.6.0</strong> veya üstü
          gerekir; eski sürümler Eksperix&apos;in canlı adresini tanımaz.{" "}
          <Link href="/araclarim/uygulama-eklentileri" className="font-semibold text-lime-700 hover:text-lime-800">
            Eklentiyi kur / güncelle →
          </Link>
        </div>
      )}

      {durum === "hazir" && !mesaj && (
        <p className="mt-3 text-[11px] text-slate-500">
          Desteklenen siteler: sahibinden, hepsiemlak, emlakjet, zingat, remax, turyap. Başka bir sitedeyseniz ilan
          sayfasındayken eklenti simgesinden <strong>Bilgileri Getir</strong>i kullanın.
        </p>
      )}

      {mesaj && (
        <div
          className={`mt-3 rounded-lg px-3 py-2 text-xs ${
            mesaj.tone === "success"
              ? "bg-emerald-50 text-emerald-800"
              : mesaj.tone === "warning"
                ? "bg-amber-50 text-amber-800"
                : "bg-rose-50 text-rose-700"
          }`}
        >
          <p className="flex items-start gap-1.5 font-medium">
            {mesaj.tone === "success" ? (
              <CircleCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            ) : (
              <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            )}
            {mesaj.text}
          </p>
          {mesaj.kaynak?.title && <p className="mt-1 truncate text-[11px] opacity-80">Kaynak: {mesaj.kaynak.title}</p>}
          {mesaj.alanlar && mesaj.alanlar.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {mesaj.alanlar.map((a) => (
                <span key={a} className="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-emerald-200">
                  {a}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
