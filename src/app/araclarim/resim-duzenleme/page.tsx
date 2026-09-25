"use client";

import { useState } from "react";
import { ImageIcon, LayoutGrid, Wand2 } from "lucide-react";
import KolajOlusturucu from "@/components/resim/KolajOlusturucu";
import TekResimDuzenleyici from "@/components/resim/TekResimDuzenleyici";

type Sekme = "kolaj" | "tek";

export default function ResimDuzenlemePage() {
  const [sekme, setSekme] = useState<Sekme>("kolaj");

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)] sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-lime-200/40 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-lime-300 shadow-[0_0_32px_-8px] shadow-lime-400/40">
              <ImageIcon className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Resim Düzenleme</h1>
              <p className="mt-0.5 text-sm text-slate-500">
                Rapor fotoğraflarını A4 kolaj sayfalarına yerleştirin, sıralayın, isimlendirin ve toplu indirin.
              </p>
            </div>
          </div>
          <div className="inline-flex shrink-0 rounded-xl bg-slate-100 p-1" role="tablist">
            {(
              [
                ["kolaj", "Kolaj Sayfaları", LayoutGrid],
                ["tek", "Tek Resim Düzenle", Wand2],
              ] as const
            ).map(([k, ad, Icon]) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={sekme === k}
                onClick={() => setSekme(k)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  sekme === k ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <Icon className="h-4 w-4" />
                {ad}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Both stay mounted so switching tabs doesn't lose the collage. */}
      <div hidden={sekme !== "kolaj"}>
        <KolajOlusturucu />
      </div>
      <div hidden={sekme !== "tek"}>
        <TekResimDuzenleyici aktif={sekme === "tek"} />
      </div>
    </div>
  );
}
