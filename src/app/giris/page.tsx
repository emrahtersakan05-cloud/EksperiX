"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "@/lib/auth/actions";

const initialState: LoginState = {};

export default function GirisPage() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="pointer-events-none fixed -top-40 right-0 h-80 w-80 rounded-full bg-lime-400/10 blur-3xl" />
      <div className="pointer-events-none fixed bottom-0 -left-24 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />

      <div className="relative w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl">
        <div className="mb-6 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-lime-300 text-sm font-bold text-slate-900 shadow-[0_0_24px_-4px] shadow-lime-400/70">
            EX
          </div>
          <div className="leading-tight">
            <span className="block text-base font-semibold tracking-tight text-slate-900">Eksperix</span>
            <span className="block text-[11px] text-slate-500">Değerleme Platformu</span>
          </div>
        </div>

        <h1 className="mb-1 text-xl font-semibold text-slate-900">Giriş Yap</h1>
        <p className="mb-6 text-sm text-slate-500">Hesabınıza erişmek için bilgilerinizi girin.</p>

        <form action={formAction} className="space-y-4">
          <div>
            <label htmlFor="username" className="mb-1 block text-sm font-medium text-slate-700">
              Kullanıcı Adı
            </label>
            <input
              id="username"
              name="username"
              autoComplete="username"
              required
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:border-lime-300 focus:outline-none focus:ring-4 focus:ring-lime-200/50"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
              Şifre
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:border-lime-300 focus:outline-none focus:ring-4 focus:ring-lime-200/50"
            />
          </div>

          {state?.error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{state.error}</p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl bg-lime-300 py-2.5 text-sm font-semibold text-slate-900 shadow-[0_0_24px_-4px] shadow-lime-400/60 transition hover:bg-lime-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>
        </form>
      </div>
    </div>
  );
}
