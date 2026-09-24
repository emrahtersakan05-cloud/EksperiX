"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/dal";
import type { PublicUser } from "@/lib/auth/types";
import {
  createEmsalKaydi,
  deleteEmsalKaydi,
  getEmsalKaydi,
  teshisEt,
  updateEmsalKaydi,
  type EmsalKaydiGuncelleme,
} from "./store";
import type { EmsalDurum, EmsalHaritaKaydi, EmsalKaynak } from "./types";

const PAGE_PATH = "/deger-haritasi/emsal-haritasi";

export interface EmsalFormState {
  error?: string;
  success?: boolean;
}

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

// Ownership is checked against the stored record — never against an id the
// client sent along, which any signed-in user could set to their own.
function canModify(user: PublicUser, kaydi: EmsalHaritaKaydi): boolean {
  return user.role === "admin" || user.id === kaydi.ekleyenKullaniciId;
}

// Parses and validates the editable fields shared by create and update.
function parseFields(formData: FormData): { error: string } | { fields: EmsalKaydiGuncelleme } {
  // Number("") is 0, not NaN — an unpicked coordinate must be rejected by the
  // empty-string check, not by Number.isFinite, or it silently saves as (0,0).
  const latRaw = str(formData, "lat");
  const lngRaw = str(formData, "lng");
  const lat = Number(latRaw.replace(",", "."));
  const lng = Number(lngRaw.replace(",", "."));
  if (!latRaw || !lngRaw || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { error: "Haritada bir konum seçmelisiniz." };
  }
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return { error: "Geçersiz koordinat." };
  }

  const il = str(formData, "il");
  const emlakTipi = str(formData, "emlakTipi");
  if (!il || !emlakTipi) {
    return { error: "İl ve emlak tipi zorunludur." };
  }

  const durum: EmsalDurum = str(formData, "durum") === "kiralik" ? "kiralik" : "satilik";

  return {
    fields: {
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
    },
  };
}

export async function createEmsalKaydiAction(
  _prevState: EmsalFormState,
  formData: FormData,
): Promise<EmsalFormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Oturum bulunamadı." };

  const parsed = parseFields(formData);
  if ("error" in parsed) return parsed;

  const kaynak: EmsalKaynak = str(formData, "kaynak") === "url-bridge" ? "url-bridge" : "manuel";

  try {
    await createEmsalKaydi({
      ...parsed.fields,
      kaynak,
      ekleyenKullaniciId: user.id,
      ekleyenAdSoyad: user.fullName,
    });
  } catch (err) {
    return { error: `Kayıt eklenemedi. Teşhis: ${teshisEt(err)}.` };
  }

  revalidatePath(PAGE_PATH);
  return { success: true };
}

export async function updateEmsalKaydiAction(
  _prevState: EmsalFormState,
  formData: FormData,
): Promise<EmsalFormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Oturum bulunamadı." };

  const id = str(formData, "id");
  if (!id) return { error: "Kayıt bulunamadı." };

  const parsed = parseFields(formData);
  if ("error" in parsed) return parsed;

  try {
    const existing = await getEmsalKaydi(id);
    if (!existing) return { error: "Kayıt bulunamadı; silinmiş olabilir." };
    if (!canModify(user, existing)) return { error: "Bu kaydı düzenleme yetkiniz yok." };
    await updateEmsalKaydi(id, parsed.fields);
  } catch (err) {
    return { error: `Kayıt güncellenemedi. Teşhis: ${teshisEt(err)}.` };
  }

  revalidatePath(PAGE_PATH);
  return { success: true };
}

export async function deleteEmsalKaydiAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  const id = str(formData, "id");
  if (!id) return;

  const existing = await getEmsalKaydi(id);
  if (!existing || !canModify(user, existing)) return;

  await deleteEmsalKaydi(id);
  revalidatePath(PAGE_PATH);
}
