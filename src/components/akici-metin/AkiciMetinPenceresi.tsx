"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Check,
  ClipboardCopy,
  FileText,
  Loader2,
  Lock,
  PencilRuler,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useAkiciMetinDeposu } from "@/components/akici-metin/baglam";
import { inputClass } from "@/lib/ui/girdi";
import { akiciSablonlariKaydetAction, akiciSablonlariOkuAction } from "@/lib/akici-metin/actions";
import {
  BOS_DEGER,
  jeton,
  sablonAdi,
  sablonuDoldur,
  varsayilanSablonlar,
  type FormAlani,
} from "@/lib/akici-metin/sablonlar";

type Sekme = "olustur" | "duzenle";
type KayitDurumu = "kayitli" | "bekliyor" | "kaydediliyor" | "hata";

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
  const [sablonlar, setSablonlar] = useState<string[] | null>(null);
  const [ozel, setOzel] = useState(false);
  const [duzenleyebilir, setDuzenleyebilir] = useState(false);
  const [uyari, setUyari] = useState<string | null>(null);
  const [kayitDurumu, setKayitDurumu] = useState<KayitDurumu>("kayitli");
  const kayitliMetin = depo?.getir(anahtar) ?? "";
  const [secili, setSecili] = useState<number | null>(null);
  const [metin, setMetin] = useState(kayitliMetin);
  const [rapordaMi, setRapordaMi] = useState(!!kayitliMetin.trim());
  const [kopyalandi, setKopyalandi] = useState(false);
  const [duzenlenen, setDuzenlenen] = useState(0);
  const [silOnayi, setSilOnayi] = useState(false);
  const govdeRef = useRef<HTMLTextAreaElement>(null);
  const kayitZamanlayici = useRef<ReturnType<typeof setTimeout> | null>(null);
  const metinZamanlayici = useRef<ReturnType<typeof setTimeout> | null>(null);
  const etiketler = useMemo(() => [...new Set(alanlar.map((a) => a.etiket))], [alanlar]);

  // Templates come from the server; a form nobody customised gets defaults.
  useEffect(() => {
    let iptal = false;
    akiciSablonlariOkuAction(baslik).then((s) => {
      if (iptal) return;
      setDuzenleyebilir(s.duzenleyebilir);
      setOzel(!!s.metinler);
      setSablonlar(s.metinler?.length ? s.metinler : varsayilanSablonlar(baslik, alanlar));
      if (s.error) setUyari(s.error);
    });
    return () => {
      iptal = true;
    };
  }, [baslik, alanlar]);

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

  // Save shortly after the admin stops typing.
  function sunucuyaKaydet(liste: string[] | null, hemen = false) {
    if (kayitZamanlayici.current) clearTimeout(kayitZamanlayici.current);
    setKayitDurumu("bekliyor");
    const calis = () => {
      setKayitDurumu("kaydediliyor");
      akiciSablonlariKaydetAction(baslik, liste).then((r) => {
        if (r.error) {
          setKayitDurumu("hata");
          setUyari(r.error);
        } else {
          setKayitDurumu("kayitli");
        }
      });
    };
    if (hemen) calis();
    else kayitZamanlayici.current = setTimeout(calis, 700);
  }

  function listeyiDegistir(yeni: string[], hemen = false) {
    setSablonlar(yeni);
    setOzel(true);
    sunucuyaKaydet(yeni, hemen);
  }

  // The chosen template's text goes straight into the tapu, and from there
  // into the Rapor Sonucu section; edits follow shortly after typing stops.
  function rapora(yeni: string, hemen: boolean) {
    if (!depo) return;
    if (metinZamanlayici.current) clearTimeout(metinZamanlayici.current);
    const yaz = () => {
      depo.kaydet(anahtar, yeni);
      setRapordaMi(!!yeni.trim());
    };
    if (hemen) yaz();
    else metinZamanlayici.current = setTimeout(yaz, 600);
  }

  function sablonSec(i: number) {
    if (!sablonlar) return;
    const yeni = sablonuDoldur(sablonlar[i], alanlar);
    setSecili(i);
    setMetin(yeni);
    rapora(yeni, true);
  }

  function raporaKaldir() {
    setMetin("");
    setSecili(null);
    rapora("", true);
  }

  function govdeDegistir(i: number, govde: string) {
    if (!sablonlar) return;
    listeyiDegistir(sablonlar.map((s, j) => (j === i ? govde : s)));
  }

  function sablonEkle() {
    if (!sablonlar) return;
    listeyiDegistir([...sablonlar, ""], true);
    setDuzenlenen(sablonlar.length);
    setSilOnayi(false);
    requestAnimationFrame(() => govdeRef.current?.focus());
  }

  function sablonSil() {
    if (!sablonlar || sablonlar.length <= 1) return;
    const yeni = sablonlar.filter((_, j) => j !== duzenlenen);
    listeyiDegistir(yeni, true);
    setDuzenlenen(Math.max(0, duzenlenen - 1));
    setSecili(null);
    setSilOnayi(false);
  }

  function varsayilanlaraDon() {
    const v = varsayilanSablonlar(baslik, alanlar);
    setSablonlar(v);
    setOzel(false);
    setDuzenlenen(0);
    setSecili(null);
    sunucuyaKaydet(null, true);
  }

  // Puts {Alan} at the cursor in the template being edited.
  function jetonEkle(etiket: string) {
    if (!sablonlar) return;
    const ta = govdeRef.current;
    const t = jeton(etiket);
    const govde = sablonlar[duzenlenen];
    const bas = ta?.selectionStart ?? govde.length;
    const son = ta?.selectionEnd ?? govde.length;
    govdeDegistir(duzenlenen, govde.slice(0, bas) + t + govde.slice(son));
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


  const bosAlanSayisi = (metin.match(new RegExp(BOS_DEGER, "g")) ?? []).length;
  const aktifSekme: Sekme = duzenleyebilir ? sekme : "olustur";

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

        {duzenleyebilir && (
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
                aria-selected={aktifSekme === k}
                onClick={() => setSekme(k)}
                className={`-mb-px inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-2.5 py-2 text-sm font-medium sm:px-3 ${
                  aktifSekme === k ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Icon className="h-4 w-4" />
                {ad}
              </button>
            ))}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {uyari && <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">{uyari}</p>}

          {!sablonlar ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Şablonlar yükleniyor…
            </div>
          ) : aktifSekme === "olustur" ? (
            <div className="space-y-4">
              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Akıcı Metin Şablon Listesi</p>
                  {!duzenleyebilir && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-400" title="Şablonları Sistem Yöneticisi düzenler">
                      <Lock className="h-3 w-3" />
                      Yönetici şablonları
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {sablonlar.map((s, i) => {
                    const aktif = secili === i;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => sablonSec(i)}
                        disabled={!s.trim()}
                        className={`flex items-start gap-2.5 rounded-xl border p-3 text-left transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                          aktif ? "border-slate-900 bg-slate-50 ring-1 ring-slate-900" : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <span
                          className={`flex h-7 min-w-7 shrink-0 items-center justify-center rounded-lg px-1 text-sm font-bold ${
                            aktif ? "bg-slate-900 text-lime-300" : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {i + 1}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-slate-900">{sablonAdi(i)}</span>
                          <span className="line-clamp-2 text-xs text-slate-500">
                            {s.trim()
                              ? sablonuDoldur(s, alanlar)
                              : duzenleyebilir
                                ? "Boş — Şablonları Düzenle sekmesinden doldurun"
                                : "Boş şablon"}
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
                    rapora(e.target.value, false);
                  }}
                  rows={8}
                  placeholder="Yukarıdan bir şablon seçin; metin burada oluşur ve dilediğiniz gibi düzenleyebilirsiniz."
                  className={`${inputClass} resize-y leading-relaxed`}
                />
                <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
                  {depo && (
                    <span
                      className={`mr-auto inline-flex items-center gap-1 text-xs font-medium ${
                        rapordaMi ? "text-emerald-700" : "text-slate-400"
                      }`}
                    >
                      {rapordaMi ? <Check className="h-3.5 w-3.5" /> : null}
                      {rapordaMi ? "Rapor Sonucu sekmesine eklendi" : "Şablon seçince Rapor Sonucu sekmesine eklenir"}
                    </span>
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
                  {depo && rapordaMi && (
                    <button
                      type="button"
                      onClick={raporaKaldir}
                      className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 px-3.5 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      Rapordan Kaldır
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label="Düzenlenecek şablon">
                {sablonlar.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    role="radio"
                    aria-checked={duzenlenen === i}
                    onClick={() => {
                      setDuzenlenen(i);
                      setSilOnayi(false);
                    }}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                      duzenlenen === i ? "border-slate-900 bg-slate-900 text-lime-300" : "border-slate-200 text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    {sablonAdi(i)}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={sablonEkle}
                  className="inline-flex items-center gap-1 rounded-full border border-dashed border-lime-400 bg-lime-50 px-3 py-1.5 text-xs font-semibold text-lime-800 hover:bg-lime-100"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Yeni Şablon
                </button>
              </div>

              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">{sablonAdi(duzenlenen)}</p>
                {sablonlar.length > 1 &&
                  (silOnayi ? (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2 py-1 text-xs text-rose-700">
                      {sablonAdi(duzenlenen)} silinsin mi?
                      <button type="button" onClick={sablonSil} className="rounded bg-rose-600 px-1.5 py-0.5 font-semibold text-white">
                        Sil
                      </button>
                      <button type="button" onClick={() => setSilOnayi(false)} className="px-1 font-medium">
                        Vazgeç
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setSilOnayi(true)}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Şablonu sil
                    </button>
                  ))}
              </div>

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
                  value={sablonlar[duzenlenen] ?? ""}
                  onChange={(e) => govdeDegistir(duzenlenen, e.target.value)}
                  rows={7}
                  placeholder="Metni yazın, verinin geleceği yere yukarıdaki alanlardan ekleyin. Örn: Taşınmaz {İl} ili {İlçe} ilçesinde yer almaktadır."
                  className={`${inputClass} mt-1 resize-y font-mono leading-relaxed`}
                />
              </label>

              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Önizleme (bu formun verileriyle)</p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                  {sablonlar[duzenlenen]?.trim() ? sablonuDoldur(sablonlar[duzenlenen], alanlar) : "—"}
                </p>
                <p className="mt-2 border-t border-slate-200 pt-2 text-[11px] leading-relaxed text-slate-500">
                  <JetonluMetin metin={sablonlar[duzenlenen] || " "} />
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="inline-flex items-center gap-1.5 text-[11px] text-slate-500">
                  {kayitDurumu === "kaydediliyor" || kayitDurumu === "bekliyor" ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Kaydediliyor…
                    </>
                  ) : kayitDurumu === "hata" ? (
                    <span className="text-rose-600">Kaydedilemedi</span>
                  ) : (
                    <>
                      <Check className="h-3 w-3 text-emerald-600" />
                      Kaydedildi · tüm kullanıcılar bu şablonları görür
                    </>
                  )}
                </p>
                <button
                  type="button"
                  onClick={varsayilanlaraDon}
                  disabled={!ozel}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Varsayılanlara dön
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
