"use client";

import { useState } from "react";
import { Pencil, Plus, StickyNote, Trash2 } from "lucide-react";
import {
  primaryButtonClass,
  secondaryButtonClass,
  TextAreaField,
  TextField,
} from "@/components/talep/form-fields";
import { newRowId, type NotKaydi } from "@/lib/talep/types";

// null = form closed, "yeni" = adding, otherwise the id of the note being edited.
type EditorState = null | "yeni" | string;

export default function NotTaslaklari({
  items,
  onChange,
  baslikPlaceholder,
  detayLabel = "Not girişi detayı",
  emptyText,
}: {
  items: NotKaydi[];
  onChange: (items: NotKaydi[]) => void;
  baslikPlaceholder?: string;
  detayLabel?: string;
  emptyText: string;
}) {
  const [editor, setEditor] = useState<EditorState>(null);
  const [baslik, setBaslik] = useState("");
  const [detay, setDetay] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);

  function openEditor(state: Exclude<EditorState, null>) {
    const existing = items.find((n) => n.id === state);
    setBaslik(existing?.baslik ?? "");
    setDetay(existing?.detay ?? "");
    setConfirmId(null);
    setEditor(state);
  }

  function closeEditor() {
    setEditor(null);
    setBaslik("");
    setDetay("");
  }

  function handleSave() {
    const b = baslik.trim();
    const d = detay.trim();
    if (!b || !d) return;
    if (editor === "yeni") {
      onChange([...items, { id: newRowId(), baslik: b, detay: d }]);
    } else {
      onChange(items.map((n) => (n.id === editor ? { ...n, baslik: b, detay: d } : n)));
    }
    closeEditor();
  }

  function handleDelete(id: string) {
    onChange(items.filter((n) => n.id !== id));
    setConfirmId(null);
    if (editor === id) closeEditor();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm text-slate-500">
          {items.length > 0 ? `${items.length} not kayıtlı` : "Henüz not eklenmedi"}
        </span>
        {editor === null && (
          <button
            type="button"
            onClick={() => openEditor("yeni")}
            className={`${primaryButtonClass} inline-flex items-center gap-1.5 whitespace-nowrap`}
          >
            <Plus className="h-4 w-4" />
            Yeni Not Ekle
          </button>
        )}
      </div>

      {editor !== null && (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <p className="text-xs font-semibold text-slate-600">{editor === "yeni" ? "Yeni not" : "Notu düzenle"}</p>
          <TextField label="Başlık" value={baslik} onChange={setBaslik} placeholder={baslikPlaceholder} />
          <TextAreaField label={detayLabel} value={detay} onChange={setDetay} rows={6} />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={closeEditor} className={secondaryButtonClass}>
              Vazgeç
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!baslik.trim() || !detay.trim()}
              className={primaryButtonClass}
            >
              Kaydet
            </button>
          </div>
        </div>
      )}

      {items.length === 0 && editor === null ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-200 py-10 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
            <StickyNote className="h-5 w-5" />
          </span>
          <p className="max-w-sm text-sm text-slate-500">{emptyText}</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((n) => (
            <li
              key={n.id}
              className={`rounded-xl border p-4 ${editor === n.id ? "border-slate-300 bg-slate-50" : "border-slate-100 bg-white"}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="text-sm font-semibold text-slate-800">{n.baslik}</p>
                <div className="flex items-center gap-1">
                  {confirmId === n.id ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleDelete(n.id)}
                        className="rounded-full bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-rose-700"
                      >
                        Sil
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmId(null)}
                        className="rounded-full px-2.5 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100"
                      >
                        Vazgeç
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => openEditor(n.id)}
                        aria-label={`${n.baslik} notunu düzenle`}
                        className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmId(n.id)}
                        aria-label={`${n.baslik} notunu sil`}
                        className="rounded-full p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
              <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{n.detay}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
