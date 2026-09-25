"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser, requireAdmin } from "./dal";
import { createSession, deleteSession } from "./session";
import {
  createUser,
  deleteUser,
  girisDenemeleriniSifirla,
  girisKilitSuresi,
  hataliGirisKaydet,
  resetPassword,
  teshisEt,
  updateUser,
  verifyCredentials,
} from "./store";
import type { Role } from "./types";

export interface LoginState {
  error?: string;
}

export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!username || !password) {
    return { error: "Kullanıcı adı ve şifre gereklidir." };
  }

  let user: Awaited<ReturnType<typeof verifyCredentials>>;
  try {
    const kilit = await girisKilitSuresi(username);
    if (kilit > 0) {
      return {
        error: `Çok fazla hatalı deneme. ${Math.ceil(kilit / 60)} dakika sonra tekrar deneyin ya da yöneticinizden şifre sıfırlaması isteyin.`,
      };
    }
    user = await verifyCredentials(username, password);
    if (user) await girisDenemeleriniSifirla(username);
    else await hataliGirisKaydet(username);
  } catch (err) {
    console.error("[giris] Kullanıcı veritabanına erişilemedi:", err);
    return {
      error: `Kullanıcı veritabanına ulaşılamadı. Sunucu ayarları (Redis / ortam değişkenleri) kontrol edilmeli. Teşhis: ${teshisEt(err)}.`,
    };
  }
  if (!user) {
    return { error: "Kullanıcı adı veya şifre hatalı." };
  }

  await createSession({ id: user.id, username: user.username, role: user.role, oturumSurumu: user.oturumSurumu });
  redirect("/panel");
}

export async function logoutAction(): Promise<void> {
  await deleteSession();
  redirect("/giris");
}

export interface UserFormState {
  error?: string;
  success?: boolean;
}

export async function createUserAction(
  _prevState: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  await requireAdmin();

  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const role = (String(formData.get("role") ?? "eksper") === "admin" ? "admin" : "eksper") as Role;

  if (!username || !password || !fullName) {
    return { error: "Kullanıcı adı, ad soyad ve şifre zorunludur." };
  }
  if (password.length < 6) {
    return { error: "Şifre en az 6 karakter olmalıdır." };
  }

  try {
    await createUser({ username, password, fullName, email, role });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Kullanıcı oluşturulamadı." };
  }

  revalidatePath("/admin/kullanicilar");
  return { success: true };
}

export async function updateUserAction(
  _prevState: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const role = (String(formData.get("role") ?? "eksper") === "admin" ? "admin" : "eksper") as Role;

  if (!id || !fullName) {
    return { error: "Geçersiz istek." };
  }

  try {
    await updateUser(id, { fullName, email, role });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Kullanıcı güncellenemedi." };
  }
  revalidatePath("/admin/kullanicilar");
  return { success: true };
}

export async function resetPasswordAction(
  _prevState: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!id || password.length < 6) {
    return { error: "Şifre en az 6 karakter olmalıdır." };
  }

  await resetPassword(id, password);
  revalidatePath("/admin/kullanicilar");
  return { success: true };
}

export async function deleteUserAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (id && id !== admin.id) {
    // deleteUser refuses to remove the last admin; nothing else to report here.
    await deleteUser(id).catch(() => {});
  }
  revalidatePath("/admin/kullanicilar");
}

// ---- Own account (Hesabım) ----------------------------------------------------

export async function updateProfileAction(_prevState: UserFormState, formData: FormData): Promise<UserFormState> {
  const hesap = await getCurrentUser();
  if (!hesap) return { error: "Oturumunuz sona erdi; lütfen tekrar giriş yapın." };
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  if (!fullName) return { error: "Ad soyad boş bırakılamaz." };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Geçerli bir e-posta adresi girin." };

  try {
    // Only name and e-mail: a user can't change their own role.
    await updateUser(hesap.id, { fullName, email });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Bilgiler güncellenemedi." };
  }
  revalidatePath("/", "layout");
  return { success: true };
}

export async function changePasswordAction(_prevState: UserFormState, formData: FormData): Promise<UserFormState> {
  const hesap = await getCurrentUser();
  if (!hesap) return { error: "Oturumunuz sona erdi; lütfen tekrar giriş yapın." };
  const mevcut = String(formData.get("currentPassword") ?? "");
  const yeni = String(formData.get("newPassword") ?? "");
  const tekrar = String(formData.get("confirmPassword") ?? "");

  if (!mevcut || !yeni) return { error: "Mevcut ve yeni şifre gereklidir." };
  if (yeni.length < 8) return { error: "Yeni şifre en az 8 karakter olmalıdır." };
  if (yeni !== tekrar) return { error: "Yeni şifreler eşleşmiyor." };
  if (yeni === mevcut) return { error: "Yeni şifre mevcut şifreden farklı olmalıdır." };

  // Guessing the current password counts against the same lock as the login
  // form, so a left-open session can't be used to brute-force it.
  const kilit = await girisKilitSuresi(hesap.username);
  if (kilit > 0) return { error: `Çok fazla hatalı deneme. ${Math.ceil(kilit / 60)} dakika sonra tekrar deneyin.` };
  const user = await verifyCredentials(hesap.username, mevcut);
  if (!user || user.id !== hesap.id) {
    await hataliGirisKaydet(hesap.username);
    return { error: "Mevcut şifre hatalı." };
  }
  await girisDenemeleriniSifirla(hesap.username);
  const oturumSurumu = await resetPassword(user.id, yeni);
  // Other devices are now logged out; keep this one signed in.
  await createSession({ ...user, oturumSurumu });
  return { success: true };
}
