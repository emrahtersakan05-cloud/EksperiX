"use client";

import { useState } from "react";
import { Check, Sparkles } from "lucide-react";
import AkiciMetinPenceresi from "@/components/akici-metin/AkiciMetinPenceresi";
import { useAkiciMetinDeposu, useAlanKaydi } from "@/components/akici-metin/baglam";
import type { FormAlani } from "@/lib/akici-metin/sablonlar";

// Everything a form card needs for "Akıcı Metin Şablonları": a provider its
// fields register into, the header button (null while the card has no
// fields) and the popup. `anahtar` separates the saved text of repeated
// forms (e.g. each emsal slot); templates are shared by `baslik`.
export function useAkiciMetinKarti(baslik: string, { anahtar, etkin = true }: { anahtar?: string; etkin?: boolean } = {}) {
  const { kayit, adet, alanlar } = useAlanKaydi();
  const depo = useAkiciMetinDeposu();
  const [acikAlanlar, setAcikAlanlar] = useState<FormAlani[] | null>(null);
  const k = anahtar ?? baslik;
  const kayitliMetin = depo?.getir(k) ?? "";

  const dugme =
    etkin && adet > 0 ? (
      <button
        type="button"
        onClick={() => setAcikAlanlar(alanlar())}
        title={kayitliMetin ? "Bu form için kaydedilmiş akıcı metin var" : "Form verilerinden akıcı metin oluştur"}
        className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
          kayitliMetin
            ? "border-lime-300 bg-lime-50 text-lime-800 hover:bg-lime-100"
            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
        }`}
      >
        <Sparkles className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Akıcı Metin Şablonları</span>
        <span className="sm:hidden">Akıcı Metin</span>
        {kayitliMetin && <Check className="h-3 w-3" />}
      </button>
    ) : null;

  const pencere = acikAlanlar ? (
    <AkiciMetinPenceresi baslik={baslik} anahtar={k} alanlar={acikAlanlar} onKapat={() => setAcikAlanlar(null)} />
  ) : null;

  // Wrap the card body in <AlanKaydiSaglayici kayit={kayit}>.
  return { kayit, dugme, pencere };
}
