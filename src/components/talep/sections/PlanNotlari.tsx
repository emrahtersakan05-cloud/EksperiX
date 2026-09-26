"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, ClipboardPaste, FileText, ListOrdered, Plus, Trash2 } from "lucide-react";
import { AkiciAlan } from "@/components/akici-metin/baglam";
import { SectionCard } from "@/components/talep/form-fields";
import { alan } from "@/components/talep/sections/sade";
import { planNotlariMetni, planNotlariniAyir } from "@/lib/talep/imar";
import { normalYazim } from "@/lib/text/buyuk-harf";
import { newRowId, type PlanNotu } from "@/lib/talep/types";

const kucukDugme =
  "flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent";

export default function PlanNotlari({ notlar, onChange }: { notlar: PlanNotu[]; onChange: (notlar: PlanNotu[]) => void }) {
  const [yapistirAcik, setYapistirAcik] = useState(false);
  const [yapistirilan, setYapistirilan] = useState("");
  const bulunan = planNotlariniAyir(yapistirilan).map(normalYazim);
  const metin = planNotlariMetni(notlar);

  function guncelle(id: string, metin: string) {
    onChange(notlar.map((n) => (n.id === id ? { ...n, metin } : n)));
  }

  function tasi(i: number, yon: -1 | 1) {
    const yeni = [...notlar];
    [yeni[i], yeni[i + yon]] = [yeni[i + yon], yeni[i]];
    onChange(yeni);
  }

  function yapistirilanlariEkle() {
    // An untouched empty row is replaced rather than kept above the pasted notes.
    const mevcut = notlar.filter((n) => n.metin.trim());
    onChange([...mevcut, ...bulunan.map((metin) => ({ id: newRowId(), metin }))]);
    setYapistirilan("");
    setYapistirAcik(false);
  }

  return (
    <div className="space-y-4">
      <SectionCard title="Plan Not Bilgileri">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium tabular-nums text-slate-600">
              <ListOrdered className="h-3 w-3" />
              {notlar.length} not
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setYapistirAcik((v) => !v)}
                aria-expanded={yapistirAcik}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-slate-400"
              >
                <ClipboardPaste className="h-3.5 w-3.5" />
                Toplu yapıştır
              </button>
              <button
                type="button"
                onClick={() => onChange([...notlar, { id: newRowId(), metin: "" }])}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-semibold text-lime-300 hover:bg-slate-800"
              >
                <Plus className="h-3.5 w-3.5" />
                Not ekle
              </button>
            </div>
          </div>

          {yapistirAcik && (
            <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
              <p className="text-xs text-slate-600">
                Plan notlarını (plan hükümlerini) e-imar sonucundan ya da plan paftasından kopyalayıp yapıştırın. Numaralı maddeler
                (1. 2- 3) a)…) ayrı notlara bölünür; numara yoksa boş satırlardan bölünür.
              </p>
              <textarea
                value={yapistirilan}
                onChange={(e) => setYapistirilan(e.target.value)}
                rows={6}
                placeholder={"1. Bu plan, … onanlı 1/1000 ölçekli uygulama imar planıdır.\n2. Parsellerde bodrum katlar …"}
                aria-label="Yapıştırılan plan notları"
                className={`${alan} resize-y`}
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] text-slate-500">
                  {yapistirilan.trim() ? `${bulunan.length} madde bulundu` : "Henüz metin yok"}
                </span>
                <button
                  type="button"
                  onClick={yapistirilanlariEkle}
                  disabled={bulunan.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-semibold text-lime-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Maddeleri ekle
                </button>
              </div>
            </div>
          )}

          {notlar.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/60 px-4 py-8 text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-400 shadow-sm">
                <ListOrdered className="h-5 w-5" />
              </span>
              <p className="text-sm font-semibold text-slate-700">Henüz plan notu yok</p>
              <p className="max-w-sm text-xs text-slate-500">Notları tek tek ekleyin ya da plan notlarının tamamını toplu yapıştırın.</p>
            </div>
          ) : (
            <ol className="space-y-2">
              {notlar.map((n, i) => (
                <li key={n.id} className="flex items-start gap-2 rounded-xl border border-slate-200 bg-white p-2">
                  <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-900 text-[11px] font-semibold tabular-nums text-lime-300">
                    {i + 1}
                  </span>
                  <textarea
                    value={n.metin}
                    onChange={(e) => guncelle(n.id, e.target.value)}
                    rows={Math.min(6, Math.max(2, Math.ceil(n.metin.length / 90)))}
                    placeholder="Plan notu"
                    aria-label={`${i + 1}. plan notu`}
                    className={`${alan} min-w-0 flex-1 resize-y`}
                  />
                  <div className="flex shrink-0 flex-col">
                    <button type="button" onClick={() => tasi(i, -1)} disabled={i === 0} className={kucukDugme} aria-label="Yukarı taşı">
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => tasi(i, 1)}
                      disabled={i === notlar.length - 1}
                      className={kucukDugme}
                      aria-label="Aşağı taşı"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onChange(notlar.filter((x) => x.id !== n.id))}
                      className={`${kucukDugme} hover:text-rose-600`}
                      aria-label={`${i + 1}. notu sil`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          )}
          <AkiciAlan etiket="Plan Notları" deger={metin} />
        </div>
      </SectionCard>

      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4">
        <p className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
          <FileText className="h-3.5 w-3.5" />
          Rapora yansıyacak metin
        </p>
        <p className={`text-sm leading-relaxed ${metin ? "text-slate-700" : "text-slate-400"}`}>
          {metin || "Plan notu ekledikçe rapor metni burada oluşur."}
        </p>
      </div>
    </div>
  );
}
