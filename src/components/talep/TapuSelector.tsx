"use client";

import { useState } from "react";
import { Check, Pencil, Plus, Trash2 } from "lucide-react";
import type { Tapu } from "@/lib/talep/types";

function getTapuDisplayName(tapu: Tapu): string {
  const ada = tapu.tapuKaydi.ada.trim();
  const parsel = tapu.tapuKaydi.parsel.trim();

  if (ada && parsel) return `${ada} Ada ${parsel} Parsel`;
  if (ada) return `${ada} Ada`;
  if (parsel) return `${parsel} Parsel`;
  return tapu.ad;
}

export default function TapuSelector({
  tapular,
  activeTapuId,
  onSelect,
  onAdd,
  onRemove,
  onRename,
}: {
  tapular: Tapu[];
  activeTapuId: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onRename: (id: string, ad: string) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-100 bg-white/90 p-2 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)]">
      {tapular.map((tapu) => {
        const active = tapu.id === activeTapuId;
        const editing = editingId === tapu.id;
        const displayName = getTapuDisplayName(tapu);
        return (
          <div
            key={tapu.id}
            className={`group flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
              active ? "bg-slate-900 text-lime-300" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
            }`}
          >
            {editing ? (
              <input
                autoFocus
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    onRename(tapu.id, draftName || displayName);
                    setEditingId(null);
                  }
                  if (e.key === "Escape") setEditingId(null);
                }}
                className="w-24 rounded-md bg-white/10 px-1.5 py-0.5 text-sm text-inherit outline-none"
              />
            ) : (
              <button type="button" onClick={() => onSelect(tapu.id)}>
                {displayName}
              </button>
            )}

            {editing ? (
              <button
                type="button"
                onClick={() => {
                  onRename(tapu.id, draftName || displayName);
                  setEditingId(null);
                }}
                aria-label="Adı kaydet"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setEditingId(tapu.id);
                  setDraftName(displayName);
                }}
                className="opacity-0 transition-opacity group-hover:opacity-100"
                aria-label="Adı düzenle"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}

            {tapular.length > 1 && (
              <button
                type="button"
                onClick={() => onRemove(tapu.id)}
                className="opacity-0 transition-opacity hover:text-rose-500 group-hover:opacity-100"
                aria-label="Tapuyu sil"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        );
      })}

      <button
        type="button"
        onClick={onAdd}
        className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-slate-300 px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:border-lime-300 hover:text-slate-900"
      >
        <Plus className="h-4 w-4" />
        Tapu Ekle
      </button>
    </div>
  );
}
