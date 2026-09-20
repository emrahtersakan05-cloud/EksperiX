"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "./dal";
import { createSession, deleteSession } from "./session";
import {
  createUser,
  deleteUser,
  resetPassword,
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

  const user = await verifyCredentials(username, password);
  if (!user) {
    return { error: "Kullanıcı adı veya şifre hatalı." };
  }

  await createSession({ id: user.id, username: user.username, role: user.role });
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

  await updateUser(id, { fullName, email, role });
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
    await deleteUser(id);
  }
  revalidatePath("/admin/kullanicilar");
}
