"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/dal";
import { createEmsalKaydi, deleteEmsalKaydi, teshisEt } from "./store";
import type { EmsalDurum, EmsalKaynak } from "./types";

const PAGE_PATH = "/deger-haritasi/emsal-haritasi";

export interface EmsalFormState {
  error?: string;
  success?: boolean;
}

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export async function createEmsalKaydiAction(
  _prevState: EmsalFormState,
  formData: FormData,
): Promise<EmsalFormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Oturum bulunamadı." };

  const lat = Number(str(formData, "lat").replace(",", "."));
  const lng = Number(str(formData, "lng").replace(",", "."));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { error: "Haritada bir konum seçmelisiniz." };
  }

  const il = str(formData, "il");
  const emlakTipi = str(formData, "emlakTipi");
  if (!il || !emlakTipi) {
    return { error: "İl ve emlak tipi zorunludur." };
  }

  const durumRaw = str(formData, "durum");
  const durum: EmsalDurum = durumRaw === "kiralik" ? "kiralik" : "satilik";
  const kaynakRaw = str(formData, "kaynak");
  const kaynak: EmsalKaynak = kaynakRaw === "url-bridge" ? "url-bridge" : "manuel";

  try {
    await createEmsalKaydi({
      kaynak,
      webAdresi: str(formData, "webAdresi") || undefined,
      gorselUrl: str(formData, "gorselUrl") || undefined,
      durum,
      emlakTipi,
      il,
      ilce: str(formData, "ilce"),
      mahalle: str(formData, "mahalle"),
      lat,
      lng,
      m2Brut: str(formData, "m2Brut"),
      m2Net: str(formData, "m2Net"),
      odaSayisi: str(formData, "odaSayisi"),
      binaYasi: str(formData, "binaYasi"),
      kat: str(formData, "kat"),
      ilanTarihi: str(formData, "ilanTarihi"),
      istenenFiyat: str(formData, "istenenFiyat"),
      pazarlikliFiyat: str(formData, "pazarlikliFiyat"),
      ekleyenKullaniciId: user.id,
      ekleyenAdSoyad: user.fullName,
    });
  } catch (err) {
    return { error: `Kayıt eklenemedi. Teşhis: ${teshisEt(err)}.` };
  }

  revalidatePath(PAGE_PATH);
  return { success: true };
}

export async function deleteEmsalKaydiAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  const id = str(formData, "id");
  const ekleyenKullaniciId = str(formData, "ekleyenKullaniciId");
  if (!id) return;
  if (user.role !== "admin" && user.id !== ekleyenKullaniciId) return;

  await deleteEmsalKaydi(id);
  revalidatePath(PAGE_PATH);
}
