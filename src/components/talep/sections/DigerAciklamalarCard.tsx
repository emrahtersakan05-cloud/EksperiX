"use client";

import { useEffect, useState } from "react";
import { FilePlus2, Pencil, Plus, Trash2 } from "lucide-react";
import {
  Field,
  helperTextClass,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
  SectionCard,
  TextAreaField,
  TextField,
} from "@/components/talep/form-fields";
import { listTaslaklar, removeTaslak, saveTaslak, type AciklamaTaslak } from "@/lib/emsal/aciklama-taslak";

type TabKey = "aciklama" | "taslaklar";

const TABS: { key: TabKey; label: string }[] = [
  { key: "aciklama", label: "Açıklama" },
  { key: "taslaklar", label: "Emsal Açıklama Taslakları" },
];

// null = form closed, "yeni" = adding, otherwise the id of the draft being edited.
type EditorState = null | "yeni" | string;

function appendParagraph(current: string, addition: string): string {
  const base = current.replace(/\s+$/, "");
  return base ? `${base}\n\n${addition}` : addition;
}

export default function DigerAciklamalarCard({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [tab, setTab] = useState<TabKey>("aciklama");
  const [taslaklar, setTaslaklar] = useState<AciklamaTaslak[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [editor, setEditor] = useState<EditorState>(null);
  const [baslik, setBaslik] = useState("");
  const [metin, setMetin] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useEffect(() => {
    listTaslaklar().then(setTaslaklar);
  }, []);

  const selected = taslaklar.find((t) => t.id === selectedId);

  function insertTaslak(taslak: AciklamaTaslak) {
    onChange(appendParagraph(value, taslak.metin));
  }

  function openEditor(state: Exclude<EditorState, null>) {
    const existing = taslaklar.find((t) => t.id === state);
    setBaslik(existing?.baslik ?? "");
    setMetin(existing?.metin ?? "");
    setEditor(state);
  }

  function closeEditor() {
    setEditor(null);
    setBaslik("");
    setMetin("");
  }

  async function handleSave() {
    if (!baslik.trim() || !metin.trim()) return;
    setTaslaklar(await saveTaslak({ id: editor && editor !== "yeni" ? editor : undefined, baslik, metin }));
    closeEditor();
  }

  async function handleDelete(id: string) {
    setTaslaklar(await removeTaslak(id));
    setConfirmId(null);
    if (selectedId === id) setSelectedId("");
    if (editor === id) closeEditor();
  }

  return (
    <SectionCard title="Emsaller ile İlgili Diğer Açıklamalar">
      <div role="tablist" className="mb-4 inline-flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.key)}
              className={`whitespace-nowrap rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${
                active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {t.label}
              {t.key === "taslaklar" && taslaklar.length > 0 && (
                <span className="ml-1.5 rounded-full bg-slate-200 px-1.5 py-0.5 text-[11px] tabular-nums text-slate-600">
                  {taslaklar.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {tab === "aciklama" && (
        <div className="space-y-3">
          <TextAreaField label="Açıklamalar" value={value} onChange={onChange} rows={6} />

          <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
            {taslaklar.length === 0 ? (
              <p className="text-sm text-slate-500">
                Henüz taslak yok.{" "}
                <button
                  type="button"
                  onClick={() => {
                    setTab("taslaklar");
                    openEditor("yeni");
                  }}
                  className="font-medium text-slate-800 underline underline-offset-2 hover:text-slate-950"
                >
                  İlk taslağı ekleyin
                </button>
                ; kayıtlı taslakları buradan tek tıkla açıklamaya ekleyebilirsiniz.
              </p>
            ) : (
              <>
                <div className="flex flex-wrap items-end gap-2">
                  <Field label="Taslak seçin" className="min-w-[220px] flex-1">
                    <select
                      value={selectedId}
                      onChange={(e) => setSelectedId(e.target.value)}
                      className={`${inputClass} appearance-none`}
                    >
                      <option value="">Taslak seçiniz</option>
                      {taslaklar.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.baslik}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <button
                    type="button"
                    disabled={!selected}
                    onClick={() => selected && insertTaslak(selected)}
                    className={`${primaryButtonClass} inline-flex items-center gap-1.5 whitespace-nowrap`}
                  >
                    <FilePlus2 className="h-4 w-4" />
                    Açıklamaya Ekle
                  </button>
                </div>
                {selected ? (
                  <p className="mt-2 whitespace-pre-wrap rounded-md bg-white p-2.5 text-sm leading-relaxed text-slate-600 ring-1 ring-slate-100">
                    {selected.metin}
                  </p>
                ) : (
                  <span className={helperTextClass}>
                    Seçilen taslak metni, mevcut açıklamanın altına yeni paragraf olarak eklenir.
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {tab === "taslaklar" && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm text-slate-500">
              Sık kullandığınız akıcı metinleri burada saklayın; yaptığınız tüm değişiklikler kalıcıdır.
            </span>
            {editor === null && (
              <button
                type="button"
                onClick={() => openEditor("yeni")}
                className={`${primaryButtonClass} inline-flex items-center gap-1.5 whitespace-nowrap`}
              >
                <Plus className="h-4 w-4" />
                Yeni Taslak
              </button>
            )}
          </div>

          {editor !== null && (
            <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
              <p className="text-xs font-semibold text-slate-600">
                {editor === "yeni" ? "Yeni taslak" : "Taslağı düzenle"}
              </p>
              <TextField label="Taslak başlığı" value={baslik} onChange={setBaslik} placeholder="Örn. Bölge emsal notu" />
              <TextAreaField label="Taslak metni" value={metin} onChange={setMetin} rows={6} />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={closeEditor} className={secondaryButtonClass}>
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!baslik.trim() || !metin.trim()}
                  className={primaryButtonClass}
                >
                  Kaydet
                </button>
              </div>
            </div>
          )}

          {taslaklar.length === 0 && editor === null ? (
            <p className="rounded-lg border border-dashed border-slate-200 py-8 text-center text-sm text-slate-400">
              Henüz taslak eklenmedi. &quot;Yeni Taslak&quot; ile ilk taslağınızı oluşturun.
            </p>
          ) : (
            <ul className="space-y-2">
              {taslaklar.map((t) => (
                <li
                  key={t.id}
                  className={`rounded-lg border p-3 ${editor === t.id ? "border-slate-300 bg-slate-50" : "border-slate-100"}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-800">{t.baslik}</p>
                    <div className="flex items-center gap-1">
                      {confirmId === t.id ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleDelete(t.id)}
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
                            onClick={() => {
                              insertTaslak(t);
                              setSelectedId(t.id);
                              setTab("aciklama");
                            }}
                            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                          >
                            <FilePlus2 className="h-3.5 w-3.5" />
                            Açıklamaya Ekle
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditor(t.id)}
                            aria-label={`${t.baslik} taslağını düzenle`}
                            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmId(t.id)}
                            aria-label={`${t.baslik} taslağını sil`}
                            className="rounded-full p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{t.metin}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </SectionCard>
  );
}
