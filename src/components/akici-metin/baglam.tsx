"use client";

import { createContext, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import type { FormAlani } from "@/lib/akici-metin/sablonlar";

// ---- Field registry: each form card collects its own fields ----------------

interface AlanKaydi {
  ayarla: (id: string, etiket: string, deger: string, bolum: string) => void;
  sil: (id: string) => void;
}

const AlanKaydiBaglami = createContext<AlanKaydi | null>(null);

export function useAlanKaydi() {
  const kayitRef = useRef(new Map<string, FormAlani & { bolum: string }>());
  const [adet, setAdet] = useState(0);
  const kayit = useMemo<AlanKaydi>(
    () => ({
      ayarla(id, etiket, deger, bolum) {
        kayitRef.current.set(id, { etiket, deger, bolum });
        setAdet(kayitRef.current.size);
      },
      sil(id) {
        kayitRef.current.delete(id);
        setAdet(kayitRef.current.size);
      },
    }),
    [],
  );
  // Read at the moment it is needed (the popup opens), in render order. When
  // several forms share one button, a label used by more than one form gets
  // the form's name so each {token} stays unambiguous.
  const alanlar = (): FormAlani[] => {
    const liste = [...kayitRef.current.values()].filter((a) => a.etiket.trim());
    const bolumler = new Map<string, Set<string>>();
    for (const a of liste) bolumler.set(a.etiket, (bolumler.get(a.etiket) ?? new Set()).add(a.bolum));
    return liste.map((a) => ({
      etiket: (bolumler.get(a.etiket)?.size ?? 0) > 1 && a.bolum ? `${a.etiket} (${a.bolum})` : a.etiket,
      deger: a.deger,
    }));
  };
  return { kayit, adet, alanlar };
}

// Name of the form a field sits in, for disambiguating grouped forms.
const BolumBaglami = createContext("");

export function BolumSaglayici({ ad, children }: { ad: string; children: ReactNode }) {
  return <BolumBaglami.Provider value={ad}>{children}</BolumBaglami.Provider>;
}

export function AlanKaydiSaglayici({ kayit, children }: { kayit: AlanKaydi; children: ReactNode }) {
  return <AlanKaydiBaglami.Provider value={kayit}>{children}</AlanKaydiBaglami.Provider>;
}

function degerMetni(deger: unknown): string {
  if (typeof deger === "boolean") return deger ? "Var" : "Yok";
  if (Array.isArray(deger)) return deger.filter(Boolean).join(", ");
  if (deger === null || deger === undefined) return "";
  return String(deger);
}

// Called by every form field so its card's Akıcı Metin templates can use it.
export function useAkiciAlan(etiket: string, deger: unknown) {
  const kayit = useContext(AlanKaydiBaglami);
  const bolum = useContext(BolumBaglami);
  const id = useId();
  const metin = degerMetni(deger);
  useEffect(() => {
    kayit?.ayarla(id, etiket, metin, bolum);
  }, [kayit, id, etiket, metin, bolum]);
  useEffect(() => () => kayit?.sil(id), [kayit, id]);
}

// For values not shown through a standard field (chips, lists): render
// inside the form card to make them available to its templates.
export function AkiciAlan({ etiket, deger }: { etiket: string; deger: unknown }) {
  useAkiciAlan(etiket, deger);
  return null;
}

// ---- Where generated text is kept (per tapu, per form title) ---------------

export interface AkiciMetinDeposu {
  getir: (baslik: string) => string;
  kaydet: (baslik: string, metin: string) => void;
}

const DepoBaglami = createContext<AkiciMetinDeposu | null>(null);

export function AkiciMetinDeposuSaglayici({ depo, children }: { depo: AkiciMetinDeposu; children: ReactNode }) {
  return <DepoBaglami.Provider value={depo}>{children}</DepoBaglami.Provider>;
}

export function useAkiciMetinDeposu() {
  return useContext(DepoBaglami);
}
