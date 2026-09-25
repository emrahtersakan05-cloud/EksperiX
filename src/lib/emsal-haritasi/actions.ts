"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import type { PublicUser } from "@/lib/auth/types";
import {
  createEmsalKaydi,
  deleteEmsalKaydi,
  getEmsalKaydi,
  listEmsalKayitlari,
  teshisEt,
  updateEmsalKaydi,
  type EmsalKaydiGuncelleme,
} from "./store";
import { KATEGORILER, kategoriMi } from "./kategoriler";
import type { EmsalDurum, EmsalHaritaKaydi, EmsalKaynak } from "./types";

const PAGE_PATH = "/deger-haritasi/emsal-haritasi";

export interface EmsalFormState {
  error?: string;
}

// Every free-text value is capped so a crafted request can't bloat the shared store.
function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim().slice(0, 500);
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
    return { error: "Konum seçin: haritaya tıklayın ya da enlem/boylam girin." };
  }
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return { error: "Geçersiz koordinat." };
  }

  const kategoriRaw = str(formData, "kategori");
  if (!kategoriMi(kategoriRaw)) return { error: "Geçerli bir kategori seçin." };
  const kategori = kategoriRaw;
  const tanim = KATEGORILER[kategori];

  const il = str(formData, "il");
  const emlakTipi = str(formData, "emlakTipi");
  if (!il || !emlakTipi) {
    return { error: `İl ve ${tanim.tipEtiketi.toLocaleLowerCase("tr-TR")} zorunludur.` };
  }

  // Only the selected category's own fields are kept; anything else posted is ignored.
  const detaylar: Record<string, string> = {};
  for (const alan of tanim.alanlar) {
    if (alan.ust) continue;
    const value = str(formData, `d_${alan.key}`).slice(0, 200);
    if (value) detaylar[alan.key] = value;
  }
  const ustAlanlar = new Set(tanim.alanlar.map((a) => a.ust).filter(Boolean));
  const ust = (key: "m2Brut" | "m2Net" | "odaSayisi" | "binaYasi" | "kat") =>
    ustAlanlar.has(key) ? str(formData, key) : "";

  const durum: EmsalDurum = str(formData, "durum") === "kiralik" ? "kiralik" : "satilik";

  return {
    fields: {
      kategori,
      ilanNo: str(formData, "ilanNo") || undefined,
      ilanTelNo: str(formData, "ilanTelNo") || undefined,
      detaylar,
      webAdresi: str(formData, "webAdresi") || undefined,
      gorselUrl: str(formData, "gorselUrl") || undefined,
      durum,
      emlakTipi,
      il,
      ilce: str(formData, "ilce"),
      mahalle: str(formData, "mahalle"),
      lat,
      lng,
      m2Brut: ust("m2Brut"),
      m2Net: ust("m2Net"),
      odaSayisi: ust("odaSayisi"),
      binaYasi: ust("binaYasi"),
      kat: ust("kat"),
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

  const kaynakRaw = str(formData, "kaynak");
  const kaynak: EmsalKaynak =
    kaynakRaw === "url-bridge" || kaynakRaw === "eklenti-bridge" ? kaynakRaw : "manuel";

  let id: string;
  try {
    const record = await createEmsalKaydi({
      ...parsed.fields,
      kaynak,
      ekleyenKullaniciId: user.id,
      ekleyenAdSoyad: user.fullName,
    });
    id = record.id;
  } catch (err) {
    return { error: `Kayıt eklenemedi. Teşhis: ${teshisEt(err)}.` };
  }

  revalidatePath(PAGE_PATH);
  // redirect() throws to navigate, so it must stay outside the try/catch.
  // "Kaydet ve yeni ekle" returns to an empty form for the next listing.
  if (str(formData, "sonraki") === "yeni") redirect(`${PAGE_PATH}/yeni?eklendi=${encodeURIComponent(id)}`);
  redirect(`${PAGE_PATH}?odak=${encodeURIComponent(id)}`);
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
  redirect(`${PAGE_PATH}?odak=${encodeURIComponent(id)}`);
}

// The shared Emsal Haritası records, for client screens that pick from them
// (the talep's "Yakın Emsal Listesi").
export async function listEmsalKayitlariAction(): Promise<{ records?: EmsalHaritaKaydi[]; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Oturum bulunamadı." };
  try {
    return { records: await listEmsalKayitlari() };
  } catch (err) {
    return { error: `Emsal Haritası kayıtları yüklenemedi. Teşhis: ${teshisEt(err)}.` };
  }
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
