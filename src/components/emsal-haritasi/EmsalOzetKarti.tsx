"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { AlertTriangle, Check, CircleDashed, ImageOff, Keyboard, Loader2, MapPin, Plus, Save } from "lucide-react";
import { formatTrNumber } from "@/lib/emsal/hesaplama";
import { formatMesafe, type MukerrerAday } from "@/lib/emsal-haritasi/analiz";

export type BolumDurumu = "tamam" | "eksik" | "bos";

export interface BolumOzeti {
  id: string;
  label: string;
  durum: BolumDurumu;
  // Optional progress hint, e.g. "7/19" for the category fields.
  not?: string;
}

export interface BolgeKarsilastirmasi {
  yaricap: number;
  adet: number;
  medyan: number | null;
  // This emsal's ₺/m² against the median, as a fraction (+0.08 = %8 above).
  fark: number | null;
}

const tamSayi = (v: number) => v.toLocaleString("tr-TR", { maximumFractionDigits: 0 });

function Rakam({ label, value, vurgu = false }: { label: string; value: ReactNode; vurgu?: boolean }) {
  return (
    <div className={`rounded-xl px-3 py-2 ${vurgu ? "bg-slate-900 text-white" : "bg-slate-50"}`}>
      <p className={`text-[10px] font-medium uppercase tracking-wide ${vurgu ? "text-slate-400" : "text-slate-400"}`}>
        {label}
      </p>
      <p className={`mt-0.5 truncate text-sm font-semibold tabular-nums ${vurgu ? "text-lime-300" : "text-slate-900"}`}>
        {value}
      </p>
    </div>
  );
}

function BolumIsareti({ durum }: { durum: BolumDurumu }) {
  if (durum === "tamam")
    return (
      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white">
        <Check className="h-3 w-3" strokeWidth={3} />
      </span>
    );
  if (durum === "eksik")
    return (
      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
        !
      </span>
    );
  return <CircleDashed className="h-4 w-4 text-slate-300" />;
}

// The sticky right-hand card on the Yeni / Düzenle Emsal page: a live preview
// of the listing, how it compares with its surroundings, how complete it is,
// and the save actions.
export default function EmsalOzetKarti({
  baslik,
  durumEtiketi,
  kategoriEtiketi,
  konumMetni,
  gorselUrl,
  alanM2,
  fiyat,
  birim,
  birimEtiketi,
  bolge,
  doluluk,
  bolumler,
  mukerrer,
  hata,
  pending,
  duzenleme,
  iptalHref,
  onKaydet,
  onKaydetVeYeni,
}: {
  baslik: string;
  durumEtiketi: string;
  kategoriEtiketi: string;
  konumMetni: string;
  gorselUrl: string;
  alanM2: number | null;
  fiyat: number | null;
  birim: number | null;
  birimEtiketi: string;
  bolge: BolgeKarsilastirmasi | null;
  doluluk: number;
  bolumler: BolumOzeti[];
  mukerrer: MukerrerAday[];
  hata?: string;
  pending: boolean;
  duzenleme: boolean;
  iptalHref: string;
  onKaydet: () => void;
  onKaydetVeYeni: () => void;
}) {
  // Remembers which URL failed so a new URL gets a fresh attempt.
  const [bozukGorsel, setBozukGorsel] = useState<string | null>(null);
  const gorselGoster = /^https?:\/\//i.test(gorselUrl) && bozukGorsel !== gorselUrl;
  const farkYuzde = bolge?.fark != null ? Math.round(bolge.fark * 100) : null;

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="relative aspect-[16/9] bg-gradient-to-br from-slate-100 to-slate-200">
          {gorselGoster ? (
            // eslint-disable-next-line @next/next/no-img-element -- arbitrary listing hosts, not optimisable
            <img
              src={gorselUrl}
              alt=""
              className="h-full w-full object-cover"
              onError={() => setBozukGorsel(gorselUrl)}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-1 text-slate-400">
              <ImageOff className="h-6 w-6" />
              <span className="text-[11px]">{gorselUrl ? "Görsel yüklenemedi" : "Görsel yok"}</span>
            </div>
          )}
          <div className="absolute left-3 top-3 flex gap-1.5">
            <span className="rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-semibold text-slate-800 shadow-sm">
              {kategoriEtiketi}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold shadow-sm ${
                durumEtiketi === "Kiralık" ? "bg-sky-600 text-white" : "bg-lime-300 text-slate-900"
              }`}
            >
              {durumEtiketi}
            </span>
          </div>
        </div>

        <div className="space-y-3 p-4">
          <div>
            <p className="truncate text-base font-semibold text-slate-900">{baslik}</p>
            <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-500">
              <MapPin className="h-3 w-3 shrink-0" />
              {konumMetni || "Konum girilmedi"}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Rakam label="Alan" value={alanM2 === null ? "—" : `${tamSayi(alanM2)} m²`} />
            <Rakam label="Fiyat" value={fiyat === null ? "—" : `${tamSayi(fiyat)} ₺`} />
            <Rakam label={birimEtiketi} value={birim === null ? "—" : formatTrNumber(birim)} vurgu />
          </div>

          {bolge && (
            <div className="rounded-xl border border-slate-100 px-3 py-2 text-xs">
              <p className="font-medium text-slate-700">Bölge karşılaştırması</p>
              {bolge.adet === 0 || bolge.medyan === null ? (
                <p className="mt-0.5 text-slate-400">
                  {formatMesafe(bolge.yaricap)} içinde karşılaştırılacak benzer emsal yok.
                </p>
              ) : (
                <>
                  <p className="mt-0.5 text-slate-500">
                    {formatMesafe(bolge.yaricap)} içinde {bolge.adet} benzer emsal · medyan{" "}
                    <strong className="text-slate-800">{formatTrNumber(bolge.medyan)}</strong>
                  </p>
                  {farkYuzde !== null && (
                    <p
                      className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        Math.abs(farkYuzde) <= 10
                          ? "bg-emerald-50 text-emerald-700"
                          : Math.abs(farkYuzde) <= 25
                            ? "bg-amber-50 text-amber-700"
                            : "bg-rose-50 text-rose-700"
                      }`}
                    >
                      Bu emsal medyanın {farkYuzde > 0 ? `%${farkYuzde} üstünde` : farkYuzde < 0 ? `%${-farkYuzde} altında` : "tam üzerinde"}
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          <div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-medium text-slate-600">Bilgi doluluğu</span>
              <span className="font-semibold tabular-nums text-slate-900">%{doluluk}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all ${doluluk >= 70 ? "bg-emerald-500" : doluluk >= 40 ? "bg-amber-400" : "bg-rose-400"}`}
                style={{ width: `${doluluk}%` }}
              />
            </div>
          </div>

          <nav aria-label="Form bölümleri" className="space-y-0.5">
            {bolumler.map((b, i) => (
              <a
                key={b.id}
                href={`#${b.id}`}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              >
                <BolumIsareti durum={b.durum} />
                <span className="flex-1">
                  {i + 1}. {b.label}
                </span>
                {b.not && <span className="text-[10px] tabular-nums text-slate-400">{b.not}</span>}
              </a>
            ))}
          </nav>
        </div>
      </div>

      {mukerrer.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          <p className="flex items-center gap-1.5 font-semibold">
            <AlertTriangle className="h-3.5 w-3.5" />
            Daha önce eklenmiş olabilir
          </p>
          <ul className="mt-1 space-y-0.5">
            {mukerrer.slice(0, 3).map(({ kaydi: k, neden }) => (
              <li key={k.id}>
                {neden} · {k.emlakTipi || "Emsal"}, {[k.mahalle, k.ilce].filter(Boolean).join(", ") || k.il} ·{" "}
                {k.ekleyenAdSoyad}
              </li>
            ))}
          </ul>
          <p className="mt-1 text-[11px] text-amber-700">Farklı bir ilansa yine de kaydedebilirsiniz.</p>
        </div>
      )}

      {/* Save actions live here on wide screens; phones use the bottom bar. */}
      <div className="hidden space-y-2 lg:block">
        {hata && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{hata}</p>}
        <button
          type="button"
          onClick={onKaydet}
          disabled={pending}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-lime-300 hover:bg-slate-800 disabled:opacity-50"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {pending ? "Kaydediliyor..." : duzenleme ? "Güncelle" : "Kaydet"}
        </button>
        {!duzenleme && (
          <button
            type="button"
            onClick={onKaydetVeYeni}
            disabled={pending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Kaydet ve yeni ekle
          </button>
        )}
        <div className="flex items-center justify-between px-1 text-[11px] text-slate-400">
          <Link href={iptalHref} className="hover:text-slate-700">
            Vazgeç
          </Link>
          <span className="inline-flex items-center gap-1">
            <Keyboard className="h-3 w-3" />
            Ctrl + S ile kaydet
          </span>
        </div>
      </div>
    </div>
  );
}
