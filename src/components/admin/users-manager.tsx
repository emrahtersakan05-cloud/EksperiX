"use client";

import { useActionState, useEffect, useState } from "react";
import { Pencil, KeyRound, Trash2, UserPlus, X } from "lucide-react";
import Card from "@/components/card";
import { inputClass } from "@/components/talep/form-fields";
import {
  createUserAction,
  deleteUserAction,
  resetPasswordAction,
  updateUserAction,
  type UserFormState,
} from "@/lib/auth/actions";
import type { PublicUser, Role } from "@/lib/auth/types";
import { getInitials } from "@/lib/text/initials";

const initialFormState: UserFormState = {};

const labelClass = "mb-1 block text-[11px] font-medium text-slate-500";

type Panel = { type: "create" } | { type: "edit"; user: PublicUser } | { type: "reset"; user: PublicUser };

function RoleBadge({ role }: { role: Role }) {
  const isAdmin = role === "admin";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
        isAdmin ? "bg-slate-900 text-lime-300" : "bg-blue-50 text-blue-700"
      }`}
    >
      {isAdmin ? "Yönetici" : "Eksper"}
    </span>
  );
}

function CreateUserForm({ onDone }: { onDone: () => void }) {
  const [state, formAction, pending] = useActionState(createUserAction, initialFormState);

  useEffect(() => {
    if (state.success) onDone();
  }, [state.success, onDone]);

  return (
    <form action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <label htmlFor="fullName" className={labelClass}>
          Ad Soyad
        </label>
        <input id="fullName" name="fullName" required className={inputClass} />
      </div>
      <div>
        <label htmlFor="username" className={labelClass}>
          Kullanıcı Adı
        </label>
        <input id="username" name="username" required autoComplete="off" className={inputClass} />
      </div>
      <div>
        <label htmlFor="email" className={labelClass}>
          E-posta
        </label>
        <input id="email" name="email" type="email" className={inputClass} />
      </div>
      <div>
        <label htmlFor="role" className={labelClass}>
          Rol
        </label>
        <select id="role" name="role" defaultValue="eksper" className={inputClass}>
          <option value="eksper">Eksper</option>
          <option value="admin">Yönetici</option>
        </select>
      </div>
      <div>
        <label htmlFor="password" className={labelClass}>
          Şifre
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          className={inputClass}
        />
      </div>

      {state.error && (
        <p className="sm:col-span-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{state.error}</p>
      )}

      <div className="flex items-center gap-2 sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-lime-300 px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-lime-200 disabled:opacity-60"
        >
          {pending ? "Oluşturuluyor..." : "Kullanıcı Oluştur"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-100"
        >
          Vazgeç
        </button>
      </div>
    </form>
  );
}

function EditUserForm({ user, onDone }: { user: PublicUser; onDone: () => void }) {
  const [state, formAction, pending] = useActionState(updateUserAction, initialFormState);

  useEffect(() => {
    if (state.success) onDone();
  }, [state.success, onDone]);

  return (
    <form action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <input type="hidden" name="id" value={user.id} />
      <div>
        <label htmlFor="edit-fullName" className={labelClass}>
          Ad Soyad
        </label>
        <input id="edit-fullName" name="fullName" defaultValue={user.fullName} required className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Kullanıcı Adı</label>
        <input value={user.username} disabled className={`${inputClass} bg-slate-50 text-slate-400`} />
      </div>
      <div>
        <label htmlFor="edit-email" className={labelClass}>
          E-posta
        </label>
        <input id="edit-email" name="email" type="email" defaultValue={user.email} className={inputClass} />
      </div>
      <div>
        <label htmlFor="edit-role" className={labelClass}>
          Rol
        </label>
        <select id="edit-role" name="role" defaultValue={user.role} className={inputClass}>
          <option value="eksper">Eksper</option>
          <option value="admin">Yönetici</option>
        </select>
      </div>

      {state.error && (
        <p className="sm:col-span-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{state.error}</p>
      )}

      <div className="flex items-center gap-2 sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-lime-300 px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-lime-200 disabled:opacity-60"
        >
          {pending ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-100"
        >
          Vazgeç
        </button>
      </div>
    </form>
  );
}

function ResetPasswordForm({ user, onDone }: { user: PublicUser; onDone: () => void }) {
  const [state, formAction, pending] = useActionState(resetPasswordAction, initialFormState);

  useEffect(() => {
    if (state.success) onDone();
  }, [state.success, onDone]);

  return (
    <form action={formAction} className="flex flex-col gap-4 sm:flex-row sm:items-end">
      <input type="hidden" name="id" value={user.id} />
      <div className="flex-1">
        <label htmlFor="reset-password" className={labelClass}>
          {user.fullName} için yeni şifre
        </label>
        <input
          id="reset-password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          className={inputClass}
        />
        {state.error && <p className="mt-2 text-sm text-rose-600">{state.error}</p>}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-lime-300 px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-lime-200 disabled:opacity-60"
        >
          {pending ? "Kaydediliyor..." : "Şifreyi Sıfırla"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-100"
        >
          Vazgeç
        </button>
      </div>
    </form>
  );
}

function DeleteUserButton({ user }: { user: PublicUser }) {
  return (
    <form
      action={deleteUserAction}
      onSubmit={(e) => {
        if (!window.confirm(`${user.fullName} kullanıcısını silmek istediğinize emin misiniz?`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={user.id} />
      <button
        type="submit"
        aria-label="Kullanıcıyı sil"
        className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </form>
  );
}

export default function UsersManager({
  users,
  currentUserId,
}: {
  users: PublicUser[];
  currentUserId: string;
}) {
  const [panel, setPanel] = useState<Panel | null>(null);
  const closePanel = () => setPanel(null);

  return (
    <div className="space-y-4">
      {panel && (
        <Card
          title={
            panel.type === "create"
              ? "Yeni Kullanıcı"
              : panel.type === "edit"
                ? "Kullanıcıyı Düzenle"
                : "Şifre Sıfırla"
          }
          action={
            <button
              type="button"
              onClick={closePanel}
              aria-label="Kapat"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          }
        >
          {panel.type === "create" && <CreateUserForm onDone={closePanel} />}
          {panel.type === "edit" && <EditUserForm user={panel.user} onDone={closePanel} />}
          {panel.type === "reset" && <ResetPasswordForm user={panel.user} onDone={closePanel} />}
        </Card>
      )}

      <Card
        title={`Kullanıcılar (${users.length})`}
        action={
          !panel && (
            <button
              type="button"
              onClick={() => setPanel({ type: "create" })}
              className="flex items-center gap-1.5 rounded-xl bg-lime-300 px-3.5 py-2 text-sm font-semibold text-slate-900 transition hover:bg-lime-200"
            >
              <UserPlus className="h-4 w-4" />
              Yeni Kullanıcı
            </button>
          )
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <th className="py-2.5 pr-3">Kullanıcı</th>
                <th className="py-2.5 pr-3">Kullanıcı Adı</th>
                <th className="py-2.5 pr-3">E-posta</th>
                <th className="py-2.5 pr-3">Rol</th>
                <th className="py-2.5 pr-3 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-slate-50 last:border-0">
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-lime-300">
                        {getInitials(user.fullName)}
                      </div>
                      <span className="font-medium text-slate-900">{user.fullName}</span>
                      {user.id === currentUserId && (
                        <span className="text-xs text-slate-400">(siz)</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 pr-3 text-slate-600">{user.username}</td>
                  <td className="py-3 pr-3 text-slate-600">{user.email || "—"}</td>
                  <td className="py-3 pr-3">
                    <RoleBadge role={user.role} />
                  </td>
                  <td className="py-3 pr-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setPanel({ type: "edit", user })}
                        aria-label="Düzenle"
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPanel({ type: "reset", user })}
                        aria-label="Şifre sıfırla"
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      >
                        <KeyRound className="h-4 w-4" />
                      </button>
                      {user.id !== currentUserId && <DeleteUserButton user={user} />}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
