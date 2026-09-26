"use server";

import { getCurrentUser } from "@/lib/auth/dal";
import { sablonlariGetir, sablonlariKaydet } from "./store";

const AZAMI_SABLON = 50;
const AZAMI_UZUNLUK = 5000;

export interface SablonOkumaSonucu {
  metinler: string[] | null;
  duzenleyebilir: boolean;
  error?: string;
}

export async function akiciSablonlariOkuAction(baslik: string): Promise<SablonOkumaSonucu> {
  const user = await getCurrentUser();
  if (!user) return { metinler: null, duzenleyebilir: false, error: "Oturum bulunamadı." };
  try {
    return { metinler: await sablonlariGetir(String(baslik).slice(0, 200)), duzenleyebilir: user.role === "admin" };
  } catch {
    return { metinler: null, duzenleyebilir: user.role === "admin", error: "Şablonlar yüklenemedi; varsayılanlar gösteriliyor." };
  }
}

// Only the Sistem Yöneticisi changes templates; everyone else just uses them.
export async function akiciSablonlariKaydetAction(baslik: string, metinler: string[] | null): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return { error: "Şablonları yalnızca Sistem Yöneticisi düzenleyebilir." };
  if (typeof baslik !== "string" || !baslik.trim() || baslik.length > 200) return { error: "Geçersiz form." };
  if (metinler !== null) {
    if (!Array.isArray(metinler) || metinler.length === 0 || metinler.length > AZAMI_SABLON) {
      return { error: `Bir formda 1 ile ${AZAMI_SABLON} arasında şablon olabilir.` };
    }
    if (metinler.some((m) => typeof m !== "string" || m.length > AZAMI_UZUNLUK)) {
      return { error: `Bir şablon en fazla ${AZAMI_UZUNLUK} karakter olabilir.` };
    }
  }
  try {
    await sablonlariKaydet(baslik, metinler);
    return {};
  } catch {
    return { error: "Şablonlar kaydedilemedi." };
  }
}
