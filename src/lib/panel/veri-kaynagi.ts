"use client";

import { listEmsalKayitlariAction } from "@/lib/emsal-haritasi/actions";
import type { EmsalHaritaKaydi } from "@/lib/emsal-haritasi/types";

// Emsal Haritası records for the topbar (search + notifications). Both open
// often, so the server call is shared and reused for a minute.
const TAZELIK_MS = 60_000;
let onbellek: { zaman: number; kayitlar: EmsalHaritaKaydi[] } | null = null;
let bekleyen: Promise<EmsalHaritaKaydi[]> | null = null;

export function emsalleriGetir(): Promise<EmsalHaritaKaydi[]> {
  if (onbellek && Date.now() - onbellek.zaman < TAZELIK_MS) return Promise.resolve(onbellek.kayitlar);
  if (bekleyen) return bekleyen;
  bekleyen = listEmsalKayitlariAction()
    .then((sonuc) => {
      const kayitlar = sonuc.records ?? [];
      // A failed read isn't cached, so the next open retries.
      if (!sonuc.error) onbellek = { zaman: Date.now(), kayitlar };
      return kayitlar;
    })
    .catch(() => [])
    .finally(() => {
      bekleyen = null;
    });
  return bekleyen;
}
