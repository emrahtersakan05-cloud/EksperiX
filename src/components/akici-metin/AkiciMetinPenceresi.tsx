"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ClipboardCopy, FileText, PencilRuler, RotateCcw, Save, Sparkles, X } from "lucide-react";
import { useAkiciMetinDeposu } from "@/components/akici-metin/baglam";
import {
  BOS_DEGER,
  jeton,
  sablonKaydet,
  sablonlariGetir,
  sablonuDoldur,
  varsayilanSablonlar,
  type FormAlani,
  type Sablon,
} from "@/lib/akici-metin/sablonlar";

type Sekme = "olustur" | "duzenle";

// Highlights {tokens} in the template preview.
function JetonluMetin({ metin }: { metin: string }) {
  const parcalar = metin.split(/(\{[^{}\n]+\})/g);
  return (
    <>
      {parcalar.map((p, i) =>
        /^\{[^{}\n]+\}$/.test(p) ? (
          <span key={i} className="rounded bg-lime-100 px-1 font-medium text-lime-800">
            {p.slice(1, -1)}
          </span>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

export default function AkiciMetinPenceresi({
  baslik,
  anahtar = baslik,
  alanlar,
  onKapat,
}: {
  // Templates are per form title; the written text is saved under `anahtar`.
  baslik: string;
  anahtar?: string;
  alanlar: FormAlani[];
  onKapat: () => void;
}) {
  const depo = useAkiciMetinDeposu();
  const [sekme, setSekme] = useState<Sekme>("olustur");
  const [{ sablonlar, ozel }, setDurum] = useState(() => sablonlariGetir(baslik, alanlar));
  const kayitliMetin = depo?.getir(anahtar) ?? "";
  const [secili, setSecili] = useState<number | null>(null);
  const [metin, setMetin] = useState(kayitliMetin);
  const [kaydedildi, setKaydedildi] = useState(false);
  const [kopyalandi, setKopyalandi] = useState(false);
  const [duzenlenen, setDuzenlenen] = useState(0);
  const govdeRef = useRef<HTMLTextAreaElement>(null);
  const etiketler = useMemo(() => [...new Set(alanlar.map((a) => a.etiket))], [alanlar]);

  useEffect(() => {
    function tus(e: KeyboardEvent) {
      if (e.key === "Escape") onKapat();
    }
    window.addEventListener("keydown", tus);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", tus);
      document.body.style.overflow = "";
    };
  }, [onKapat]);

  function sablonSec(i: number) {
    setSecili(i);
    setMetin(sablonuDoldur(sablonlar[i].metin, alanlar));
    setKaydedildi(false);
  }

  function sablonGuncelle(i: number, degisiklik: Partial<Sablon>) {
    const yeni = { ...sablonlar[i], ...degisiklik };
    sablonKaydet(baslik, i, yeni);
    setDurum({ sablonlar: sablonlar.map((s, j) => (j === i ? yeni : s)), ozel: ozel.map((o, j) => (j === i ? true : o)) });
  }

  function varsayilanaDon(i: number) {
    sablonKaydet(baslik, i, null);
    const v = varsayilanSablonlar(baslik, alanlar)[i];
    setDurum({ sablonlar: sablonlar.map((s, j) => (j === i ? v : s)), ozel: ozel.map((o, j) => (j === i ? false : o)) });
  }

  // Puts {Alan} at the cursor in the template being edited.
  function jetonEkle(etiket: string) {
    const ta = govdeRef.current;
    const t = jeton(etiket);
    const govde = sablonlar[duzenlenen].metin;
    const bas = ta?.selectionStart ?? govde.length;
    const son = ta?.selectionEnd ?? govde.length;
    sablonGuncelle(duzenlenen, { metin: govde.slice(0, bas) + t + govde.slice(son) });
    requestAnimationFrame(() => {
      ta?.focus();
      ta?.setSelectionRange(bas + t.length, bas + t.length);
    });
  }

  async function kopyala() {
    try {
      await navigator.clipboard.writeText(metin);
      setKopyalandi(true);
      setTimeout(() => setKopyalandi(false), 1500);
    } catch {
      // Clipboard blocked: the text is still selectable in the box.
    }
  }

  function kaydet() {
    depo?.kaydet(anahtar, metin);
    setKaydedildi(true);
  }

  const bosAlanSayisi = (metin.match(new RegExp(BOS_DEGER, "g")) ?? []).length;

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
        aria-labelledby="akici-metin-baslik"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-lime-300">
              <Sparkles className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 id="akici-metin-baslik" className="text-base font-semibold text-slate-900">
                Akıcı Metin Şablonları
              </h2>
              <p className="truncate text-xs text-slate-500">{baslik}</p>
            </div>
          </div>
          <button type="button" onClick={onKapat} aria-label="Kapat" className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-900">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex gap-1 border-b border-slate-100 px-5 pt-2" role="tablist">
          {(
            [
              ["olustur", "Metin Oluştur", FileText],
              ["duzenle", "Şablonları Düzenle", PencilRuler],
            ] as const
          ).map(([k, ad, Icon]) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={sekme === k}
              onClick={() => setSekme(k)}
              className={`-mb-px inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-2.5 py-2 text-sm font-medium sm:px-3 ${
                sekme === k ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Icon className="h-4 w-4" />
              {ad}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {sekme === "olustur" ? (
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Akıcı Metin Şablon Listesi</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {sablonlar.map((s, i) => {
                    const aktif = secili === i;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => sablonSec(i)}
                        disabled={!s.metin.trim()}
                        className={`flex items-start gap-2.5 rounded-xl border p-3 text-left transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                          aktif ? "border-slate-900 bg-slate-50 ring-1 ring-slate-900" : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                            aktif ? "bg-slate-900 text-lime-300" : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {i + 1}
                        </span>
                        <span className="min-w-0">
                          <span className="flex items-center gap-1 text-sm font-semibold text-slate-900">
                            <span className="truncate">{s.ad}</span>
                            {ozel[i] && <span className="rounded bg-sky-50 px-1 text-[10px] font-medium text-sky-700">düzenlendi</span>}
                          </span>
                          <span className="line-clamp-2 text-xs text-slate-500">
                            {s.metin.trim() ? sablonuDoldur(s.metin, alanlar) : "Boş — Şablonları Düzenle sekmesinden oluşturun"}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Akıcı Metin</p>
                  {bosAlanSayisi > 0 && (
                    <p className="text-[11px] text-amber-700">
                      {bosAlanSayisi} alan boş (“{BOS_DEGER}” ile gösterildi)
                    </p>
                  )}
                </div>
                <textarea
                  value={metin}
                  onChange={(e) => {
                    setMetin(e.target.value);
                    setKaydedildi(false);
                  }}
                  rows={8}
                  placeholder="Yukarıdan bir şablon seçin; metin burada oluşur ve dilediğiniz gibi düzenleyebilirsiniz."
                  className="w-full resize-y rounded-xl border border-slate-200 px-3.5 py-3 text-sm leading-relaxed text-slate-800 focus:border-lime-300 focus:outline-none focus:ring-4 focus:ring-lime-200/50"
                />
                <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
                  {kayitliMetin && !kaydedildi && metin !== kayitliMetin && (
                    <span className="mr-auto text-[11px] text-slate-400">Kaydedilmemiş değişiklik var</span>
                  )}
                  <button
                    type="button"
                    onClick={kopyala}
                    disabled={!metin.trim()}
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                  >
                    {kopyalandi ? <Check className="h-4 w-4 text-emerald-600" /> : <ClipboardCopy className="h-4 w-4" />}
                    {kopyalandi ? "Kopyalandı" : "Kopyala"}
                  </button>
                  {depo && (
                    <button
                      type="button"
                      onClick={kaydet}
                      className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-lime-300"
                    >
                      {kaydedildi ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                      {kaydedildi ? "Kaydedildi" : "Metni Kaydet"}
                    </button>
                  )}
                </div>
                {depo && (
                  <p className="mt-1 text-right text-[11px] text-slate-400">Kaydedilen metin bu tapuda bu forma ait olarak saklanır.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Düzenlenecek şablon">
                {sablonlar.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    role="radio"
                    aria-checked={duzenlenen === i}
                    onClick={() => setDuzenlenen(i)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                      duzenlenen === i ? "border-slate-900 bg-slate-900 text-lime-300" : "border-slate-200 text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    {i + 1}. {s.ad}
                  </button>
                ))}
              </div>

              <label className="block text-xs font-medium text-slate-500">
                Şablon adı
                <input
                  value={sablonlar[duzenlenen].ad}
                  onChange={(e) => sablonGuncelle(duzenlenen, { ad: e.target.value })}
                  maxLength={40}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-lime-300 focus:outline-none focus:ring-4 focus:ring-lime-200/50"
                />
              </label>

              <div>
                <p className="mb-1 text-xs font-medium text-slate-500">Form alanları — tıklayarak imlecin olduğu yere ekleyin</p>
                <div className="flex flex-wrap gap-1.5">
                  {etiketler.length === 0 && <span className="text-xs text-slate-400">Bu formda alan bulunamadı.</span>}
                  {etiketler.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => jetonEkle(e)}
                      className="rounded-lg border border-lime-200 bg-lime-50 px-2 py-1 text-xs font-medium text-lime-800 hover:border-lime-300 hover:bg-lime-100"
                    >
                      + {e}
                    </button>
                  ))}
                </div>
              </div>

              <label className="block text-xs font-medium text-slate-500">
                Şablon metni
                <textarea
                  ref={govdeRef}
                  value={sablonlar[duzenlenen].metin}
                  onChange={(e) => sablonGuncelle(duzenlenen, { metin: e.target.value })}
                  rows={7}
                  placeholder="Metni yazın, verinin geleceği yere yukarıdaki alanlardan ekleyin. Örn: Taşınmaz {İl} ili {İlçe} ilçesinde yer almaktadır."
                  className="mt-1 w-full resize-y rounded-xl border border-slate-200 px-3.5 py-3 font-mono text-[13px] leading-relaxed text-slate-800 focus:border-lime-300 focus:outline-none focus:ring-4 focus:ring-lime-200/50"
                />
              </label>

              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Önizleme (bu formun verileriyle)</p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                  {sablonlar[duzenlenen].metin.trim() ? sablonuDoldur(sablonlar[duzenlenen].metin, alanlar) : "—"}
                </p>
                <p className="mt-2 border-t border-slate-200 pt-2 text-[11px] leading-relaxed text-slate-500">
                  <JetonluMetin metin={sablonlar[duzenlenen].metin || " "} />
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] text-slate-400">Değişiklikler otomatik kaydedilir ve tüm taleplerde bu form için kullanılır.</p>
                <button
                  type="button"
                  onClick={() => varsayilanaDon(duzenlenen)}
                  disabled={!ozel[duzenlenen]}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Varsayılana dön
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
