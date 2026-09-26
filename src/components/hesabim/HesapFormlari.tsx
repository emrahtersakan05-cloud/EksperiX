"use client";

import { useActionState, useEffect, useRef } from "react";
import { CheckCircle2, KeyRound, Loader2, UserRound } from "lucide-react";
import Card from "@/components/card";
import { inputClass as standartGirdi } from "@/components/talep/form-fields";
import { changePasswordAction, updateProfileAction, type UserFormState } from "@/lib/auth/actions";
import type { PublicUser } from "@/lib/auth/types";

const inputClass = `${standartGirdi} disabled:bg-slate-50 disabled:text-slate-500`;
const labelClass = "mb-1 block text-[11px] font-medium text-slate-500";

function Durum({ state, basari }: { state: UserFormState; basari: string }) {
  if (state.error) return <p className="text-sm font-medium text-rose-600">{state.error}</p>;
  if (state.success)
    return (
      <p className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700">
        <CheckCircle2 className="h-4 w-4" />
        {basari}
      </p>
    );
  return null;
}

function Gonder({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-lime-300 disabled:opacity-50"
    >
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

export default function HesapFormlari({ user }: { user: PublicUser }) {
  const [profil, profilAction, profilPending] = useActionState(updateProfileAction, {});
  const [sifre, sifreAction, sifrePending] = useActionState(changePasswordAction, {});
  const sifreFormRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (sifre.success) sifreFormRef.current?.reset();
  }, [sifre]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <div className="mb-4 flex items-center gap-2">
          <UserRound className="h-5 w-5 text-slate-500" />
          <h2 className="text-base font-semibold text-slate-900">Profil Bilgileri</h2>
        </div>
        <form action={profilAction} className="space-y-4">
          <div>
            <label htmlFor="fullName" className={labelClass}>
              Ad Soyad
            </label>
            <input id="fullName" name="fullName" required defaultValue={user.fullName} className={inputClass} autoComplete="name" />
          </div>
          <div>
            <label htmlFor="email" className={labelClass}>
              E-posta
            </label>
            <input id="email" name="email" type="email" defaultValue={user.email} className={inputClass} autoComplete="email" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="username" className={labelClass}>
                Kullanıcı Adı
              </label>
              <input id="username" value={user.username} disabled className={inputClass} />
            </div>
            <div>
              <label htmlFor="rol" className={labelClass}>
                Rol
              </label>
              <input id="rol" value={user.role === "admin" ? "Yönetici" : "Eksper"} disabled className={inputClass} />
            </div>
          </div>
          <p className="text-xs text-slate-400">Kullanıcı adı ve rol yalnızca yönetici tarafından değiştirilebilir.</p>
          <div className="flex flex-wrap items-center gap-3">
            <Gonder pending={profilPending}>Kaydet</Gonder>
            <Durum state={profil} basari="Bilgileriniz güncellendi." />
          </div>
        </form>
      </Card>

      <Card>
        <div className="mb-4 flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-slate-500" />
          <h2 className="text-base font-semibold text-slate-900">Şifre Değiştir</h2>
        </div>
        <form ref={sifreFormRef} action={sifreAction} className="space-y-4">
          {/* Lets password managers attach the new password to the right account. */}
          <input type="text" name="username" value={user.username} autoComplete="username" readOnly hidden />
          <div>
            <label htmlFor="currentPassword" className={labelClass}>
              Mevcut Şifre
            </label>
            <input id="currentPassword" name="currentPassword" type="password" required autoComplete="current-password" className={inputClass} />
          </div>
          <div>
            <label htmlFor="newPassword" className={labelClass}>
              Yeni Şifre
            </label>
            <input id="newPassword" name="newPassword" type="password" required minLength={8} autoComplete="new-password" className={inputClass} />
          </div>
          <div>
            <label htmlFor="confirmPassword" className={labelClass}>
              Yeni Şifre (tekrar)
            </label>
            <input id="confirmPassword" name="confirmPassword" type="password" required minLength={8} autoComplete="new-password" className={inputClass} />
          </div>
          <p className="text-xs text-slate-400">En az 8 karakter. Harf, rakam ve sembol karıştırmanız önerilir.</p>
          <div className="flex flex-wrap items-center gap-3">
            <Gonder pending={sifrePending}>Şifreyi Değiştir</Gonder>
            <Durum state={sifre} basari="Şifreniz değiştirildi." />
          </div>
        </form>
      </Card>
    </div>
  );
}
