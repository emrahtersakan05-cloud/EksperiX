"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Copy,
  Download,
  FileArchive,
  FileText,
  GripVertical,
  ImagePlus,
  Images,
  Loader2,
  Plus,
  RefreshCw,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import {
  A4,
  DUZENLER,
  dosyaAdi,
  duzenBul,
  hucreSayisi,
  hucreler,
  sayfaAdi,
  sayfaJpeg,
  yeniId,
  type DuzenKey,
  type KolajResmi,
  type KolajSayfasi,
  type Sigdirma,
} from "@/lib/kolaj/duzen";
import { boyutYaz } from "@/lib/dosyalar/depo";

const AD_ONERILERI = ["Fotoğraf", "Dış Cephe", "İç Mekân", "Çevre", "Kroki", "Tapu Belgeleri"];
const SAYFA_TURU = "application/x-kolaj-sayfa";
const HUCRE_TURU = "application/x-kolaj-hucre";

function yeniSayfa(duzen: DuzenKey): KolajSayfasi {
  return { id: yeniId(), duzen, resimler: Array(hucreSayisi(duzen)).fill(null) };
}

function resimOlustur(dosya: File): Promise<KolajResmi> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(dosya);
    const img = new Image();
    img.onload = () => resolve({ id: yeniId(), url, ad: dosya.name, en: img.naturalWidth, boy: img.naturalHeight });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`${dosya.name} açılamadı`));
    };
    img.src = url;
  });
}

function indir(blob: Blob, ad: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = ad;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

function doluSayisi(s: KolajSayfasi): number {
  return s.resimler.slice(0, hucreSayisi(s.duzen)).filter(Boolean).length;
}

function tasanSayisi(s: KolajSayfasi): number {
  return s.resimler.slice(hucreSayisi(s.duzen)).filter(Boolean).length;
}

// Mini grid icon for a layout.
function DuzenSimgesi({ duzen, className = "" }: { duzen: DuzenKey; className?: string }) {
  const d = duzenBul(duzen);
  return (
    <span
      className={`grid aspect-[210/297] gap-[2px] rounded-[3px] border border-current p-[2px] ${className}`}
      style={{ gridTemplateColumns: `repeat(${d.sutun}, 1fr)`, gridTemplateRows: `repeat(${d.satir}, 1fr)` }}
    >
      {Array.from({ length: d.sutun * d.satir }, (_, i) => (
        <span key={i} className="rounded-[1px] bg-current opacity-40" />
      ))}
    </span>
  );
}

// An A4 page drawn from the same millimetre geometry as the export.
function SayfaGorunumu({
  sayfa,
  sigdirma,
  kucuk = false,
  onBosTikla,
  onDoluDegistir,
  onTemizle,
  onDosyaBirak,
  onHucreTasi,
}: {
  sayfa: KolajSayfasi;
  sigdirma: Sigdirma;
  kucuk?: boolean;
  onBosTikla?: (i: number) => void;
  onDoluDegistir?: (i: number) => void;
  onTemizle?: (i: number) => void;
  onDosyaBirak?: (i: number, dosyalar: File[]) => void;
  onHucreTasi?: (kaynak: number, hedef: number) => void;
}) {
  const [uzerinde, setUzerinde] = useState<number | null>(null);
  return (
    <div className="relative aspect-[210/297] w-full overflow-hidden bg-white">
      {hucreler(sayfa.duzen).map((k, i) => {
        const r = sayfa.resimler[i];
        const stil = {
          left: `${(k.x / A4.en) * 100}%`,
          top: `${(k.y / A4.boy) * 100}%`,
          width: `${(k.en / A4.en) * 100}%`,
          height: `${(k.boy / A4.boy) * 100}%`,
        };
        if (kucuk) {
          return (
            <div key={i} className="absolute overflow-hidden bg-slate-100" style={stil}>
              {r && (
                // eslint-disable-next-line @next/next/no-img-element -- local blob URL
                <img src={r.url} alt="" className={`h-full w-full ${sigdirma === "doldur" ? "object-cover" : "object-contain"}`} />
              )}
            </div>
          );
        }
        return (
          <div
            key={i}
            style={stil}
            onDragOver={(e) => {
              e.preventDefault();
              setUzerinde(i);
            }}
            onDragLeave={() => setUzerinde(null)}
            onDrop={(e) => {
              e.preventDefault();
              setUzerinde(null);
              const dosyalar = [...e.dataTransfer.files].filter((f) => f.type.startsWith("image/"));
              if (dosyalar.length) return onDosyaBirak?.(i, dosyalar);
              const kaynak = e.dataTransfer.getData(HUCRE_TURU);
              if (kaynak !== "") onHucreTasi?.(Number(kaynak), i);
            }}
            className={`group absolute overflow-hidden transition-shadow ${
              uzerinde === i ? "ring-4 ring-lime-400 ring-offset-1" : ""
            } ${r ? "bg-slate-100" : ""}`}
          >
            {r ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element -- local blob URL */}
                <img
                  src={r.url}
                  alt={r.ad}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData(HUCRE_TURU, String(i));
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  className={`h-full w-full cursor-grab ${sigdirma === "doldur" ? "object-cover" : "object-contain"}`}
                />
                <div className="pointer-events-none absolute inset-0 flex items-start justify-end gap-1 bg-gradient-to-b from-slate-950/40 to-transparent p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => onDoluDegistir?.(i)}
                    title="Resmi değiştir"
                    className="pointer-events-auto rounded-md bg-white/90 p-1 text-slate-700 hover:bg-white"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onTemizle?.(i)}
                    title="Resmi kaldır"
                    className="pointer-events-auto rounded-md bg-white/90 p-1 text-rose-600 hover:bg-white"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </>
            ) : (
              <button
                type="button"
                onClick={() => onBosTikla?.(i)}
                className="flex h-full w-full flex-col items-center justify-center gap-1 border-2 border-dashed border-slate-200 bg-slate-50/70 text-slate-400 transition-colors hover:border-lime-400 hover:bg-lime-50 hover:text-lime-700"
              >
                <ImagePlus className="h-5 w-5" />
                <span className="text-[11px] font-medium">Resim ekle</span>
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function KolajOlusturucu() {
  const [sayfalar, setSayfalar] = useState<KolajSayfasi[]>(() => [yeniSayfa("dortlu")]);
  const [seciliId, setSeciliId] = useState<string>(() => "");
  const [onEk, setOnEk] = useState("Fotoğraf");
  const [sigdirma, setSigdirma] = useState<Sigdirma>("doldur");
  const [suruklenen, setSuruklenen] = useState<number | null>(null);
  const [birakmaYeri, setBirakmaYeri] = useState<number | null>(null);
  const [silOnayi, setSilOnayi] = useState<string | null>(null);
  const [islem, setIslem] = useState<{ tur: string; adim: number; toplam: number } | null>(null);
  const [sonuc, setSonuc] = useState<{ ad: string; boyut: number; kalite: number }[] | null>(null);
  const [mesaj, setMesaj] = useState<{ tur: "hata" | "bilgi"; metin: string } | null>(null);
  const hedefRef = useRef<{ sayfaId: string; hucre: number; degistir: boolean } | null>(null);
  const hucreGirdiRef = useRef<HTMLInputElement>(null);
  const topluGirdiRef = useRef<HTMLInputElement>(null);
  const sayfalarRef = useRef(sayfalar);

  useEffect(() => {
    sayfalarRef.current = sayfalar;
  }, [sayfalar]);

  const secili = sayfalar.find((s) => s.id === seciliId) ?? sayfalar[0];
  const seciliSira = sayfalar.indexOf(secili);
  const toplamResim = sayfalar.reduce((t, s) => t + doluSayisi(s), 0);

  // Photos live only in memory: warn before leaving, free them on unmount.
  useEffect(() => {
    function uyar(e: BeforeUnloadEvent) {
      if (sayfalarRef.current.some((s) => s.resimler.some(Boolean))) e.preventDefault();
    }
    window.addEventListener("beforeunload", uyar);
    return () => window.removeEventListener("beforeunload", uyar);
  }, []);
  useEffect(
    () => () => sayfalarRef.current.forEach((s) => s.resimler.forEach((r) => r && URL.revokeObjectURL(r.url))),
    [],
  );

  function sayfaGuncelle(id: string, degistir: (s: KolajSayfasi) => KolajSayfasi) {
    setSayfalar((liste) => liste.map((s) => (s.id === id ? degistir(s) : s)));
  }

  // Places photos starting at a slot: the first one into that slot (replacing
  // when asked), the rest into the next empty slots of this and following
  // pages, then into new pages with this page's layout.
  async function yerlestir(dosyalar: File[], sayfaId: string, hucre: number, degistir: boolean) {
    setMesaj(null);
    const resimler: KolajResmi[] = [];
    const hatalar: string[] = [];
    for (const f of dosyalar.filter((f) => f.type.startsWith("image/"))) {
      try {
        resimler.push(await resimOlustur(f));
      } catch (err) {
        hatalar.push((err as Error).message);
      }
    }
    if (resimler.length === 0) {
      setMesaj({ tur: "hata", metin: hatalar.length ? hatalar.join(", ") : "Resim dosyası seçilmedi." });
      return;
    }
    // Built from the latest pages (decoding above awaited) rather than inside
    // a state updater, so the page to select is known right away.
    const liste = sayfalarRef.current.map((s) => ({ ...s, resimler: [...s.resimler] }));
    let si = Math.max(0, liste.findIndex((s) => s.id === sayfaId));
    const duzen = liste[si].duzen;
    const kalan = [...resimler];
    let sonSayfaId = liste[si].id;
    if (degistir) {
      const eski = liste[si].resimler[hucre];
      if (eski) URL.revokeObjectURL(eski.url);
      liste[si].resimler[hucre] = kalan.shift()!;
    }
    let h = hucre;
    while (kalan.length) {
      if (si >= liste.length) liste.push(yeniSayfa(duzen));
      const s = liste[si];
      const adet = hucreSayisi(s.duzen);
      for (; h < adet && kalan.length; h++) {
        if (!s.resimler[h]) s.resimler[h] = kalan.shift()!;
      }
      sonSayfaId = s.id;
      si++;
      h = 0;
    }
    sayfalarRef.current = liste;
    setSayfalar(liste);
    setSeciliId(sonSayfaId);
    setSonuc(null);
    if (hatalar.length) setMesaj({ tur: "hata", metin: `Açılamayan dosyalar: ${hatalar.join(", ")}` });
  }

  function hucreSec(sayfaId: string, hucre: number, degistir: boolean) {
    hedefRef.current = { sayfaId, hucre, degistir };
    hucreGirdiRef.current?.click();
  }

  function hucreTemizle(sayfaId: string, i: number) {
    sayfaGuncelle(sayfaId, (s) => {
      const r = [...s.resimler];
      if (r[i]) URL.revokeObjectURL(r[i]!.url);
      r[i] = null;
      return { ...s, resimler: r };
    });
  }

  function hucreTasi(sayfaId: string, a: number, b: number) {
    if (a === b) return;
    sayfaGuncelle(sayfaId, (s) => {
      const r = [...s.resimler];
      [r[a], r[b]] = [r[b] ?? null, r[a] ?? null];
      return { ...s, resimler: r };
    });
  }

  function duzenDegistir(sayfaId: string, duzen: DuzenKey) {
    sayfaGuncelle(sayfaId, (s) => {
      // Pack photos into the new layout in order; overflow is kept.
      const dolu = s.resimler.filter(Boolean) as KolajResmi[];
      const adet = hucreSayisi(duzen);
      const r: (KolajResmi | null)[] = [...dolu];
      while (r.length < adet) r.push(null);
      return { ...s, duzen, resimler: r };
    });
  }

  // Photos that no longer fit after a layout change go to new pages.
  function tasanlariTasi(sayfaId: string) {
    setSayfalar((onceki) => {
      const i = onceki.findIndex((s) => s.id === sayfaId);
      if (i === -1) return onceki;
      const s = onceki[i];
      const adet = hucreSayisi(s.duzen);
      const tasan = s.resimler.slice(adet).filter(Boolean) as KolajResmi[];
      const yeniler: KolajSayfasi[] = [];
      while (tasan.length) {
        const y = yeniSayfa(s.duzen);
        y.resimler = y.resimler.map(() => tasan.shift() ?? null);
        yeniler.push(y);
      }
      return [...onceki.slice(0, i), { ...s, resimler: s.resimler.slice(0, adet) }, ...yeniler, ...onceki.slice(i + 1)];
    });
  }

  function sayfaEkle(duzen: DuzenKey) {
    const y = yeniSayfa(duzen);
    setSayfalar((liste) => [...liste.slice(0, seciliSira + 1), y, ...liste.slice(seciliSira + 1)]);
    setSeciliId(y.id);
    setSonuc(null);
  }

  function sayfaKopyala(id: string) {
    // Same layout, empty slots: photos stay unique to one page.
    const kaynak = sayfalar.find((s) => s.id === id);
    if (kaynak) sayfaEkle(kaynak.duzen);
  }

  function sayfaSil(id: string) {
    const s = sayfalar.find((x) => x.id === id);
    if (!s) return;
    if (s.resimler.some(Boolean) && silOnayi !== id) {
      setSilOnayi(id);
      return;
    }
    s.resimler.forEach((r) => r && URL.revokeObjectURL(r.url));
    const kalan = sayfalar.filter((x) => x.id !== id);
    const liste = kalan.length ? kalan : [yeniSayfa(s.duzen)];
    setSayfalar(liste);
    setSeciliId(liste[Math.min(sayfalar.indexOf(s), liste.length - 1)].id);
    setSilOnayi(null);
    setSonuc(null);
  }

  function tasi(kaynak: number, hedef: number) {
    if (kaynak === hedef || hedef < 0 || hedef >= sayfalar.length) return;
    setSayfalar((liste) => {
      const yeni = [...liste];
      const [s] = yeni.splice(kaynak, 1);
      yeni.splice(hedef, 0, s);
      return yeni;
    });
    setSonuc(null);
  }

  const indirilecek = sayfalar
    .map((s, i) => ({ s, sira: i + 1 }))
    .filter(({ s }) => doluSayisi(s) > 0);

  async function sayfalariHazirla(tur: string) {
    const dosyalar: { ad: string; blob: Blob; kalite: number }[] = [];
    setIslem({ tur, adim: 0, toplam: indirilecek.length });
    for (const [n, { s, sira }] of indirilecek.entries()) {
      setIslem({ tur, adim: n + 1, toplam: indirilecek.length });
      const { blob, kalite } = await sayfaJpeg(s, sigdirma);
      dosyalar.push({ ad: dosyaAdi(onEk, sira, sayfalar.length), blob, kalite });
    }
    return dosyalar;
  }

  async function zipIndir() {
    if (indirilecek.length === 0) return;
    setMesaj(null);
    try {
      const dosyalar = await sayfalariHazirla("ZIP");
      const { zipSync } = await import("fflate");
      const icerik: Record<string, [Uint8Array, { level: 0 }]> = {};
      for (const d of dosyalar) icerik[d.ad] = [new Uint8Array(await d.blob.arrayBuffer()), { level: 0 }];
      const zip = zipSync(icerik);
      indir(new Blob([zip.slice().buffer], { type: "application/zip" }), `${(onEk.trim() || "Kolaj").replace(/\s+/g, "-")}-kolaj.zip`);
      setSonuc(dosyalar.map((d) => ({ ad: d.ad, boyut: d.blob.size, kalite: d.kalite })));
    } catch (err) {
      setMesaj({ tur: "hata", metin: (err as Error).message || "İndirme hazırlanamadı." });
    } finally {
      setIslem(null);
    }
  }

  async function pdfIndir() {
    if (indirilecek.length === 0) return;
    setMesaj(null);
    try {
      const dosyalar = await sayfalariHazirla("PDF");
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ format: "a4", unit: "mm", orientation: "portrait" });
      for (const [i, d] of dosyalar.entries()) {
        if (i > 0) pdf.addPage();
        pdf.addImage(new Uint8Array(await d.blob.arrayBuffer()), "JPEG", 0, 0, A4.en, A4.boy);
      }
      indir(pdf.output("blob"), `${(onEk.trim() || "Kolaj").replace(/\s+/g, "-")}-kolaj.pdf`);
      setSonuc(dosyalar.map((d) => ({ ad: d.ad, boyut: d.blob.size, kalite: d.kalite })));
    } catch (err) {
      setMesaj({ tur: "hata", metin: (err as Error).message || "PDF hazırlanamadı." });
    } finally {
      setIslem(null);
    }
  }

  async function tekIndir(s: KolajSayfasi, sira: number) {
    setIslem({ tur: "JPG", adim: 1, toplam: 1 });
    try {
      const { blob } = await sayfaJpeg(s, sigdirma);
      indir(blob, dosyaAdi(onEk, sira, sayfalar.length));
    } catch (err) {
      setMesaj({ tur: "hata", metin: (err as Error).message });
    } finally {
      setIslem(null);
    }
  }

  const dugme =
    "inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40";
  const tasan = tasanSayisi(secili);

  return (
    <div className="space-y-4">
      {/* Araç çubuğu */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => topluGirdiRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-sm font-semibold text-lime-300"
          >
            <Images className="h-4 w-4" />
            Resimleri Toplu Ekle
          </button>
          <div className="inline-flex rounded-xl bg-slate-100 p-0.5 text-xs font-medium" role="group" aria-label="Resim yerleşimi">
            {(
              [
                ["doldur", "Kutuyu doldur"],
                ["sigdir", "Resmin tamamı"],
              ] as const
            ).map(([k, ad]) => (
              <button
                key={k}
                type="button"
                aria-pressed={sigdirma === k}
                onClick={() => setSigdirma(k)}
                className={`rounded-lg px-2.5 py-1.5 ${sigdirma === k ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
              >
                {ad}
              </button>
            ))}
          </div>
          <span className="text-xs text-slate-500">
            {sayfalar.length} sayfa · {toplamResim} resim
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={zipIndir} disabled={!!islem || indirilecek.length === 0} className={dugme}>
            {islem?.tur === "ZIP" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileArchive className="h-4 w-4" />}
            Tümünü İndir (JPG · ZIP)
          </button>
          <button type="button" onClick={pdfIndir} disabled={!!islem || indirilecek.length === 0} className={dugme}>
            {islem?.tur === "PDF" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            PDF
          </button>
        </div>
      </div>

      {islem && (
        <p className="rounded-xl bg-lime-50 px-3 py-2 text-sm text-lime-900">
          {islem.tur} hazırlanıyor: sayfa {islem.adim} / {islem.toplam}…
        </p>
      )}
      {mesaj && (
        <p className={`rounded-xl px-3 py-2 text-sm ${mesaj.tur === "hata" ? "bg-rose-50 text-rose-700" : "bg-slate-50 text-slate-600"}`}>
          {mesaj.metin}
        </p>
      )}
      {sonuc && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-sm text-emerald-800">
          <p className="flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="h-4 w-4" />
            {sonuc.length} sayfa indirildi, hepsi 1 MB altında.
          </p>
          <p className="mt-1 text-xs text-emerald-700">
            {sonuc.map((s) => `${s.ad} (${boyutYaz(s.boyut)}, kalite %${Math.round(s.kalite * 100)})`).join(" · ")}
          </p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)_240px]">
        {/* Sayfa listesi */}
        <div className="rounded-2xl border border-slate-100 bg-white p-3">
          <p className="mb-1.5 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <Plus className="h-3.5 w-3.5" />
            Yeni Sayfa Ekle
          </p>
          <div className="grid grid-cols-5 gap-1.5">
            {DUZENLER.map((d) => (
              <button
                key={d.key}
                type="button"
                onClick={() => sayfaEkle(d.key)}
                title={`${d.ad} sayfa ekle (${d.aciklama})`}
                className="flex flex-col items-center gap-1 rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:border-lime-400 hover:bg-lime-50 hover:text-lime-800"
              >
                <DuzenSimgesi duzen={d.key} className="w-5" />
                <span className="text-[10px] font-semibold">{d.ad}</span>
              </button>
            ))}
          </div>
          <div className="my-3 border-t border-slate-100" />
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Sayfalar</p>
            <span className="text-[11px] text-slate-400">Sürükleyerek sıralayın</span>
          </div>
          <ol className="max-h-[70vh] space-y-2 overflow-y-auto pr-1">
            {sayfalar.map((s, i) => {
              const aktif = s.id === secili.id;
              const dolu = doluSayisi(s);
              return (
                <li
                  key={s.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData(SAYFA_TURU, String(i));
                    e.dataTransfer.effectAllowed = "move";
                    setSuruklenen(i);
                  }}
                  onDragOver={(e) => {
                    if (suruklenen === null) return;
                    e.preventDefault();
                    setBirakmaYeri(i);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (suruklenen !== null) tasi(suruklenen, i);
                    setSuruklenen(null);
                    setBirakmaYeri(null);
                  }}
                  onDragEnd={() => {
                    setSuruklenen(null);
                    setBirakmaYeri(null);
                  }}
                  onClick={() => setSeciliId(s.id)}
                  className={`flex cursor-pointer items-center gap-2 rounded-xl border p-2 transition-all ${
                    aktif ? "border-slate-900 bg-slate-50 ring-1 ring-slate-900" : "border-slate-100 hover:border-slate-200"
                  } ${suruklenen === i ? "opacity-40" : ""} ${
                    birakmaYeri === i && suruklenen !== i ? "border-lime-400 bg-lime-50" : ""
                  }`}
                >
                  <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-slate-300" />
                  <div className="w-11 shrink-0 overflow-hidden rounded-sm shadow ring-1 ring-slate-200">
                    <SayfaGorunumu sayfa={s} sigdirma={sigdirma} kucuk />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">{sayfaAdi(onEk, i + 1)}</p>
                    <p className="text-[11px] text-slate-500">
                      {duzenBul(s.duzen).ad} · {dolu}/{hucreSayisi(s.duzen)}
                      {dolu === 0 && <span className="text-amber-600"> · boş</span>}
                    </p>
                  </div>
                  <div className="flex flex-col" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => tasi(i, i - 1)}
                      disabled={i === 0}
                      aria-label={`${sayfaAdi(onEk, i + 1)} yukarı taşı`}
                      className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-20"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => tasi(i, i + 1)}
                      disabled={i === sayfalar.length - 1}
                      aria-label={`${sayfaAdi(onEk, i + 1)} aşağı taşı`}
                      className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-20"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Seçili sayfa */}
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-base font-semibold text-slate-900">{sayfaAdi(onEk, seciliSira + 1)}</p>
              <p className="text-xs text-slate-500">
                A4 dikey · {duzenBul(secili.duzen).aciklama} · dosya: {dosyaAdi(onEk, seciliSira + 1, sayfalar.length)}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => tekIndir(secili, seciliSira + 1)}
                disabled={!!islem || doluSayisi(secili) === 0}
                title="Bu sayfayı JPG indir"
                className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-slate-900 disabled:opacity-30"
              >
                <Download className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => sayfaKopyala(secili.id)}
                title="Aynı düzende boş sayfa ekle"
                className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-slate-900"
              >
                <Copy className="h-4 w-4" />
              </button>
              {silOnayi === secili.id ? (
                <span className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2 py-1 text-xs text-rose-700">
                  {doluSayisi(secili) + tasanSayisi(secili)} resimle silinsin mi?
                  <button type="button" onClick={() => sayfaSil(secili.id)} className="rounded bg-rose-600 px-1.5 py-0.5 font-semibold text-white">
                    Sil
                  </button>
                  <button type="button" onClick={() => setSilOnayi(null)} className="px-1 font-medium">
                    Vazgeç
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => sayfaSil(secili.id)}
                  title="Sayfayı sil"
                  className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div className="mb-4 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Kolaj düzeni">
            {DUZENLER.map((d) => {
              const aktif = secili.duzen === d.key;
              return (
                <button
                  key={d.key}
                  type="button"
                  role="radio"
                  aria-checked={aktif}
                  title={d.aciklama}
                  onClick={() => duzenDegistir(secili.id, d.key)}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left transition-colors ${
                    aktif ? "border-slate-900 bg-slate-900 text-lime-300" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <DuzenSimgesi duzen={d.key} className="w-4" />
                  <span className="text-xs font-semibold">{d.ad}</span>
                </button>
              );
            })}
          </div>

          {tasan > 0 && (
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <span>{tasan} resim bu düzene sığmıyor.</span>
              <button
                type="button"
                onClick={() => tasanlariTasi(secili.id)}
                className="rounded-lg bg-amber-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-amber-600"
              >
                Yeni sayfaya taşı
              </button>
            </div>
          )}

          <div className="mx-auto w-full max-w-[520px] shadow-[0_10px_40px_-12px_rgba(15,23,42,0.35)] ring-1 ring-slate-200">
            <SayfaGorunumu
              sayfa={secili}
              sigdirma={sigdirma}
              onBosTikla={(i) => hucreSec(secili.id, i, true)}
              onDoluDegistir={(i) => hucreSec(secili.id, i, true)}
              onTemizle={(i) => hucreTemizle(secili.id, i)}
              onDosyaBirak={(i, dosyalar) => yerlestir(dosyalar, secili.id, i, true)}
              onHucreTasi={(a, b) => hucreTasi(secili.id, a, b)}
            />
          </div>
          <p className="mt-3 text-center text-xs text-slate-400">
            Boş kutuya tıklayın ya da resimleri sürükleyip bırakın · Resimleri kutular arasında sürükleyerek yer değiştirin
          </p>
        </div>

        {/* İsimlendirme */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-100 bg-white p-3">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <Tag className="h-3.5 w-3.5" />
              Toplu İsimlendirme
            </p>
            <input
              value={onEk}
              onChange={(e) => setOnEk(e.target.value)}
              placeholder="Sayfa adı"
              aria-label="Sayfa adı"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-lime-300 focus:outline-none focus:ring-4 focus:ring-lime-200/50"
            />
            <div className="mt-2 flex flex-wrap gap-1">
              {AD_ONERILERI.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setOnEk(a)}
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    onEk === a ? "bg-slate-900 text-lime-300" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-slate-500">Sayfalar sıraya göre numaralanır:</p>
            <ul className="mt-1 space-y-0.5 text-xs text-slate-700">
              {sayfalar.slice(0, 4).map((s, i) => (
                <li key={s.id} className="truncate font-mono">
                  {dosyaAdi(onEk, i + 1, sayfalar.length)}
                </li>
              ))}
              {sayfalar.length > 4 && <li className="text-slate-400">… {dosyaAdi(onEk, sayfalar.length, sayfalar.length)}</li>}
            </ul>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-3 text-xs leading-relaxed text-slate-500">
            <p className="mb-1 font-semibold text-slate-700">İndirme</p>
            Her sayfa A4 (≈200 dpi) JPG olarak, sığan en yüksek kaliteyle 1 MB altına sıkıştırılır. Boş sayfalar indirilmez.
            Resimler yalnızca bu tarayıcıda işlenir; sayfayı kapatınca kaybolur.
          </div>
          <button
            type="button"
            onClick={() => sayfaEkle(secili.duzen)}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-600 hover:border-lime-400 hover:bg-lime-50 hover:text-lime-800"
          >
            <Plus className="h-4 w-4" />
            Aynı düzende sayfa ekle
          </button>
        </div>
      </div>

      <input
        ref={hucreGirdiRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const dosyalar = [...(e.target.files ?? [])];
          e.target.value = "";
          const h = hedefRef.current;
          if (h && dosyalar.length) yerlestir(dosyalar, h.sayfaId, h.hucre, h.degistir);
        }}
      />
      <input
        ref={topluGirdiRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const dosyalar = [...(e.target.files ?? [])];
          e.target.value = "";
          if (dosyalar.length) yerlestir(dosyalar, secili.id, 0, false);
        }}
      />
    </div>
  );
}
