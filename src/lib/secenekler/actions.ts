"use server";

import { getCurrentUser } from "@/lib/auth/dal";
import { listeKaydet, tumListeleriGetir } from "./store";
import { SECENEK_LISTELERI } from "./varsayilan";

const AZAMI_SECENEK = 100;
const AZAMI_UZUNLUK = 500;

export interface SecenekListeleriSonucu {
  listeler: Record<string, string[]>;
  duzenleyebilir: boolean;
  error?: string;
}

// Every list with its current options (stored or default).
export async function secenekListeleriniOkuAction(): Promise<SecenekListeleriSonucu> {
  const user = await getCurrentUser();
  const varsayilan = Object.fromEntries(SECENEK_LISTELERI.map((l) => [l.key, l.varsayilan]));
  if (!user) return { listeler: varsayilan, duzenleyebilir: false, error: "Oturum bulunamadı." };
  try {
    const kayitli = await tumListeleriGetir();
    return { listeler: { ...varsayilan, ...kayitli }, duzenleyebilir: user.role === "admin" };
  } catch {
    return { listeler: varsayilan, duzenleyebilir: user.role === "admin", error: "Listeler yüklenemedi; varsayılanlar gösteriliyor." };
  }
}

// Only the Sistem Yöneticisi edits the lists. null restores the defaults.
export async function secenekListesiKaydetAction(key: string, secenekler: string[] | null): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return { error: "Listeleri yalnızca Sistem Yöneticisi düzenleyebilir." };
  if (!SECENEK_LISTELERI.some((l) => l.key === key)) return { error: "Geçersiz liste." };
  if (secenekler !== null) {
    const temiz = secenekler.map((s) => (typeof s === "string" ? s.trim() : "")).filter(Boolean);
    if (temiz.length === 0 || temiz.length > AZAMI_SECENEK) return { error: `Listede 1 ile ${AZAMI_SECENEK} arasında seçenek olmalı.` };
    if (temiz.some((s) => s.length > AZAMI_UZUNLUK)) return { error: `Bir seçenek en fazla ${AZAMI_UZUNLUK} karakter olabilir.` };
    secenekler = temiz;
  }
  try {
    await listeKaydet(key, secenekler);
    return {};
  } catch {
    return { error: "Liste kaydedilemedi." };
  }
}
