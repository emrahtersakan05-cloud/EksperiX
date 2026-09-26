"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowDown, ArrowUp, Check, ListChecks, Loader2, PencilLine, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { useAkiciAlan } from "@/components/akici-metin/baglam";
import { inputClass } from "@/components/talep/form-fields";
import { secenekListeleriniOkuAction, secenekListesiKaydetAction, type SecenekListeleriSonucu } from "@/lib/secenekler/actions";
import { secenekListesiTanimi, type SecenekListesiKey } from "@/lib/secenekler/varsayilan";

// All lists are fetched once per page and shared by every field; an admin's
// save updates every open field at once.
let onbellek: Promise<SecenekListeleriSonucu> | null = null;
const dinleyiciler = new Set<(s: SecenekListeleriSonucu) => void>();

function listeleriYukle(): Promise<SecenekListeleriSonucu> {
  onbellek ??= secenekListeleriniOkuAction().catch(() => {
    onbellek = null;
    return { listeler: {}, duzenleyebilir: false, error: "Listeler yüklenemedi." };
  });
  return onbellek;
}

function yayinla(s: SecenekListeleriSonucu) {
  onbellek = Promise.resolve(s);
  dinleyiciler.forEach((f) => f(s));
}

function useSecenekListeleri(): SecenekListeleriSonucu | null {
  const [durum, setDurum] = useState<SecenekListeleriSonucu | null>(null);
  useEffect(() => {
    let etkin = true;
    listeleriYukle().then((s) => etkin && setDurum(s));
    const dinle = (s: SecenekListeleriSonucu) => setDurum(s);
    dinleyiciler.add(dinle);
    return () => {
      etkin = false;
      dinleyiciler.delete(dinle);
    };
  }, []);
  return durum;
}

function ListeDuzenleyici({
  listeKey,
  mevcut,
  durum,
  onKapat,
}: {
  listeKey: SecenekListesiKey;
  mevcut: string[];
  durum: SecenekListeleriSonucu;
  onKapat: () => void;
}) {
  const tanim = secenekListesiTanimi(listeKey);
  const [satirlar, setSatirlar] = useState<string[]>(mevcut.length ? mevcut : [""]);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  useEffect(() => {
    const tus = (e: KeyboardEvent) => e.key === "Escape" && onKapat();
    window.addEventListener("keydown", tus);
    return () => window.removeEventListener("keydown", tus);
  }, [onKapat]);

  function tasi(i: number, j: number) {
    if (j < 0 || j >= satirlar.length) return;
    const yeni = [...satirlar];
    [yeni[i], yeni[j]] = [yeni[j], yeni[i]];
    setSatirlar(yeni);
  }

  async function kaydet(liste: string[] | null) {
    setKaydediliyor(true);
    setHata(null);
    const r = await secenekListesiKaydetAction(listeKey, liste);
    setKaydediliyor(false);
    if (r.error) {
      setHata(r.error);
      return;
    }
    const temiz = liste ? liste.map((s) => s.trim()).filter(Boolean) : tanim.varsayilan;
    yayinla({ ...durum, listeler: { ...durum.listeler, [listeKey]: temiz } });
    onKapat();
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-end justify-center bg-slate-950/50 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(e) => {
        e.stopPropagation();
        onKapat();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${tanim.ad} listesini düzenle`}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-lime-300">
              <ListChecks className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-slate-900">{tanim.ad}</h2>
              <p className="text-xs text-slate-500">Liste tüm kullanıcılar için değişir</p>
            </div>
          </div>
          <button type="button" onClick={onKapat} aria-label="Kapat" className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-900">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-5">
          {satirlar.map((s, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <span className="w-6 shrink-0 text-center text-xs font-semibold text-slate-400">{i + 1}</span>
              <input
                value={s}
                onChange={(e) => setSatirlar(satirlar.map((x, j) => (j === i ? e.target.value : x)))}
                placeholder="Seçenek metni"
                aria-label={`${i + 1}. seçenek`}
                className={`${inputClass} flex-1`}
              />
              <button type="button" onClick={() => tasi(i, i - 1)} disabled={i === 0} aria-label="Yukarı taşı" className="rounded p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-20">
                <ArrowUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => tasi(i, i + 1)}
                disabled={i === satirlar.length - 1}
                aria-label="Aşağı taşı"
                className="rounded p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-20"
              >
                <ArrowDown className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setSatirlar(satirlar.filter((_, j) => j !== i))}
                disabled={satirlar.length === 1}
                aria-label={`${i + 1}. seçeneği sil`}
                className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-20"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setSatirlar([...satirlar, ""])}
            className="ml-7 inline-flex items-center gap-1 rounded-full border border-dashed border-lime-400 bg-lime-50 px-3 py-1.5 text-xs font-semibold text-lime-800 hover:bg-lime-100"
          >
            <Plus className="h-3.5 w-3.5" />
            Seçenek Ekle
          </button>
          {hata && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{hata}</p>}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-5 py-3">
          <button
            type="button"
            onClick={() => kaydet(null)}
            disabled={kaydediliyor}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Varsayılana dön
          </button>
          <div className="flex gap-2">
            <button type="button" onClick={onKapat} className="rounded-full px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
              Vazgeç
            </button>
            <button
              type="button"
              onClick={() => kaydet(satirlar)}
              disabled={kaydediliyor || satirlar.every((s) => !s.trim())}
              className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-lime-300 disabled:opacity-40"
            >
              {kaydediliyor ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Kaydet
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// A select filled from an admin-maintained list; the admin also gets a
// button to edit the list itself.
export default function SecenekListesiAlani({
  listeKey,
  value,
  onChange,
  className = "",
  kompakt = false,
  akiciEtiket,
  ariaLabel,
  bosMetin = "Seçiniz",
}: {
  listeKey: SecenekListesiKey;
  value: string;
  onChange: (v: string) => void;
  className?: string;
  // Inline use (no label above; a small edit icon for the admin).
  kompakt?: boolean;
  // Akıcı metin label; "" keeps this field out of the templates.
  akiciEtiket?: string;
  ariaLabel?: string;
  bosMetin?: string;
}) {
  const tanim = secenekListesiTanimi(listeKey);
  useAkiciAlan(akiciEtiket ?? tanim.ad, value);
  const durum = useSecenekListeleri();
  const [duzenleniyor, setDuzenleniyor] = useState(false);
  const secenekler = durum?.listeler[listeKey] ?? tanim.varsayilan;
  // A saved choice that was since removed from the list stays visible.
  const liste = value && !secenekler.includes(value) ? [value, ...secenekler] : secenekler;
  const id = `secenek-${listeKey}`;
  const duzenleyici =
    duzenleniyor && durum ? (
      <ListeDuzenleyici listeKey={listeKey} mevcut={secenekler} durum={durum} onKapat={() => setDuzenleniyor(false)} />
    ) : null;

  if (kompakt) {
    return (
      <div className={`flex min-w-0 items-center gap-1 ${className}`}>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={ariaLabel ?? tanim.ad}
          className="h-9 w-full min-w-0 appearance-none rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-800 focus:border-slate-400 focus:outline-none"
        >
          <option value="">{bosMetin}</option>
          {liste.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        {durum?.duzenleyebilir && (
          <button
            type="button"
            onClick={() => setDuzenleniyor(true)}
            className="flex h-9 w-7 shrink-0 items-center justify-center rounded text-slate-300 hover:bg-slate-100 hover:text-slate-700"
            title={`${tanim.ad} listesini düzenle (yalnızca Sistem Yöneticisi)`}
            aria-label={`${tanim.ad} listesini düzenle`}
          >
            <PencilLine className="h-3.5 w-3.5" />
          </button>
        )}
        {duzenleyici}
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="mb-1 flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-[11px] font-medium text-slate-500">
          {tanim.ad}
        </label>
        {durum?.duzenleyebilir && (
          <button
            type="button"
            onClick={() => setDuzenleniyor(true)}
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-slate-400 hover:bg-slate-100 hover:text-slate-900"
            title="Listeyi düzenle (yalnızca Sistem Yöneticisi)"
          >
            <PencilLine className="h-3 w-3" />
            Listeyi düzenle
          </button>
        )}
      </div>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={`${inputClass} appearance-none`}>
        <option value="">Seçiniz</option>
        {liste.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      {duzenleyici}
    </div>
  );
}
