"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Cloud,
  Copy,
  Crosshair,
  Download,
  FilePlus2,
  FileArchive,
  FileText,
  GripVertical,
  ImagePlus,
  Images,
  LayoutGrid,
  Loader2,
  Plus,
  RefreshCw,
  RotateCcw,
  RotateCw,
  Tag,
  Trash2,
  Undo2,
  X,
  ZoomIn,
} from "lucide-react";
import {
  A4,
  DUZENLER,
  VARSAYILAN_AYARLAR,
  YAZI_MM,
  altBilgiMetni,
  bantlar,
  dosyaAdi,
  duzenBul,
  hucreSayisi,
  hucreler,
  sayfaAdi,
  sayfaJpeg,
  yeniId,
  yerlesim,
  type Donme,
  type DuzenKey,
  type KolajAyarlari,
  type KolajResmi,
  type KolajSayfasi,
} from "@/lib/kolaj/duzen";
import { projeKaydet, projeSil, projeYukle } from "@/lib/kolaj/depo";
import { boyutYaz } from "@/lib/dosyalar/depo";

const AD_ONERILERI = ["Fotoğraf", "Dış Cephe", "İç Mekân", "Çevre", "Kroki", "Tapu Belgeleri"];
const SAYFA_TURU = "application/x-kolaj-sayfa";
const HUCRE_TURU = "application/x-kolaj-hucre";
const GECMIS_SINIRI = 40;

function yeniSayfa(duzen: DuzenKey): KolajSayfasi {
  return { id: yeniId(), duzen, resimler: Array(hucreSayisi(duzen)).fill(null) };
}

function resimOlustur(dosya: File): Promise<KolajResmi> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(dosya);
    const img = new Image();
    img.onload = () =>
      resolve({
        id: yeniId(),
        url,
        ad: dosya.name,
        en: img.naturalWidth,
        boy: img.naturalHeight,
        donme: 0,
        odakX: 0.5,
        odakY: 0.5,
        yakinlik: 1,
        aciklama: "",
      });
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

function yuzde(deger: number, toplam: number): string {
  return `${(deger / toplam) * 100}%`;
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

// The photo inside its slot, placed with the same maths as the export.
function ResimKatmani({ r, kutuEn, kutuBoy, ayar }: { r: KolajResmi; kutuEn: number; kutuBoy: number; ayar: KolajAyarlari }) {
  const y = yerlesim(r, kutuEn, kutuBoy, ayar.sigdirma);
  return (
    <div
      className="pointer-events-none absolute"
      style={{ left: yuzde(y.x, kutuEn), top: yuzde(y.y, kutuBoy), width: yuzde(y.en, kutuEn), height: yuzde(y.boy, kutuBoy) }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- local blob URL */}
      <img
        src={r.url}
        alt={r.aciklama || r.ad}
        draggable={false}
        className="absolute left-1/2 top-1/2 max-w-none select-none"
        style={{
          width: yuzde(y.hamEn, y.en),
          height: yuzde(y.hamBoy, y.boy),
          transform: `translate(-50%, -50%) rotate(${r.donme}deg)`,
        }}
      />
    </div>
  );
}

// An A4 page drawn from the same millimetre geometry as the export.
function SayfaGorunumu({
  sayfa,
  ayar,
  sira,
  toplam,
  kucuk = false,
  seciliHucre = null,
  onHucreSec,
  onBosTikla,
  onDosyaBirak,
  onHucreTasi,
  onKaydirBasla,
  onKaydir,
}: {
  sayfa: KolajSayfasi;
  ayar: KolajAyarlari;
  sira: number;
  toplam: number;
  kucuk?: boolean;
  seciliHucre?: number | null;
  onHucreSec?: (i: number | null) => void;
  onBosTikla?: (i: number) => void;
  onDosyaBirak?: (i: number, dosyalar: File[]) => void;
  onHucreTasi?: (kaynak: number, hedef: number) => void;
  onKaydirBasla?: (i: number) => void;
  onKaydir?: (i: number, odakX: number, odakY: number) => void;
}) {
  const [uzerinde, setUzerinde] = useState<number | null>(null);
  const kaydirma = useRef<{ i: number; x: number; y: number; odakX: number; odakY: number; olcek: number } | null>(null);
  // A pan ends with a click event; it must not toggle the selection.
  const kaydirildi = useRef(false);
  const b = bantlar(ayar);
  const kutular = hucreler(sayfa.duzen, ayar);

  return (
    <div className="relative aspect-[210/297] w-full overflow-hidden bg-white [container-type:inline-size]">
      {!kucuk && b.ust > 0 && (
        <p
          className="absolute inset-x-[4%] truncate text-center font-semibold text-slate-900"
          style={{ top: yuzde(b.baslikY, A4.boy), transform: "translateY(-50%)", fontSize: `${(YAZI_MM.baslik / A4.en) * 100}cqw` }}
        >
          {ayar.baslik}
        </p>
      )}
      {!kucuk && b.alt > 0 && (
        <p
          className="absolute inset-x-0 text-center text-slate-500"
          style={{ top: yuzde(b.altBilgiY, A4.boy), transform: "translateY(-50%)", fontSize: `${(YAZI_MM.altBilgi / A4.en) * 100}cqw` }}
        >
          {altBilgiMetni(sira, toplam)}
        </p>
      )}
      {kutular.map((k, i) => {
        const r = sayfa.resimler[i];
        const stil = { left: yuzde(k.x, A4.en), top: yuzde(k.y, A4.boy), width: yuzde(k.en, A4.en), height: yuzde(k.boy, A4.boy) };
        const aciklama = ayar.aciklamaGoster && r?.aciklama.trim() ? r.aciklama.trim() : "";
        const aciklamaBandi = aciklama && (
          <span
            className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center truncate bg-slate-900/70 px-[3%] font-medium text-white"
            style={{ height: `${((YAZI_MM.aciklama * 1.9) / k.boy) * 100}%`, fontSize: `${(YAZI_MM.aciklama / A4.en) * 100}cqw` }}
          >
            {aciklama}
          </span>
        );
        if (kucuk) {
          return (
            <div key={i} className="absolute overflow-hidden bg-slate-100" style={stil}>
              {r && <ResimKatmani r={r} kutuEn={k.en} kutuBoy={k.boy} ayar={ayar} />}
            </div>
          );
        }
        const secili = seciliHucre === i && !!r;
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
            className={`group absolute overflow-hidden ${ayar.sigdirma === "sigdir" && r ? "bg-slate-100" : ""} ${
              uzerinde === i ? "ring-4 ring-lime-400" : secili ? "ring-[3px] ring-lime-400" : ""
            }`}
          >
            {r ? (
              <div
                draggable={!secili}
                onDragStart={(e) => {
                  e.dataTransfer.setData(HUCRE_TURU, String(i));
                  e.dataTransfer.effectAllowed = "move";
                }}
                onClick={() => {
                  if (kaydirildi.current) {
                    kaydirildi.current = false;
                    return;
                  }
                  onHucreSec?.(secili ? null : i);
                }}
                onPointerDown={(e) => {
                  if (!secili) return;
                  try {
                    e.currentTarget.setPointerCapture(e.pointerId);
                  } catch {
                    // Not a live pointer (synthetic event); panning still works.
                  }
                  const kutuPx = e.currentTarget.getBoundingClientRect().width;
                  kaydirma.current = { i, x: e.clientX, y: e.clientY, odakX: r.odakX, odakY: r.odakY, olcek: k.en / kutuPx };
                  kaydirildi.current = false;
                }}
                onPointerMove={(e) => {
                  const d = kaydirma.current;
                  if (!d || d.i !== i) return;
                  if (!kaydirildi.current) {
                    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) < 3) return;
                    // First real movement: one undo step for the whole pan.
                    kaydirildi.current = true;
                    onKaydirBasla?.(i);
                  }
                  const y = yerlesim(r, k.en, k.boy, ayar.sigdirma);
                  const [tasmaX, tasmaY] = [k.en - y.en, k.boy - y.boy];
                  const dx = (e.clientX - d.x) * d.olcek;
                  const dy = (e.clientY - d.y) * d.olcek;
                  const sinirla = (v: number) => Math.min(1, Math.max(0, v));
                  onKaydir?.(
                    i,
                    tasmaX ? sinirla((tasmaX * d.odakX + dx) / tasmaX) : d.odakX,
                    tasmaY ? sinirla((tasmaY * d.odakY + dy) / tasmaY) : d.odakY,
                  );
                }}
                onPointerUp={() => {
                  kaydirma.current = null;
                }}
                className={`absolute inset-0 touch-none ${secili ? "cursor-move" : "cursor-pointer"}`}
              >
                <ResimKatmani r={r} kutuEn={k.en} kutuBoy={k.boy} ayar={ayar} />
                {aciklamaBandi}
                {!secili && (
                  <span className="pointer-events-none absolute right-1.5 top-1.5 rounded-md bg-white/90 px-1.5 py-0.5 text-[10px] font-medium text-slate-700 opacity-0 shadow transition-opacity group-hover:opacity-100">
                    Düzenle
                  </span>
                )}
                {secili && (
                  <span className="pointer-events-none absolute left-1.5 top-1.5 max-w-[calc(100%-12px)] truncate rounded-md bg-slate-900/80 px-1.5 py-0.5 text-[10px] font-medium text-lime-300">
                    Kadrajı sürükleyin
                  </span>
                )}
              </div>
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

export default function KolajOlusturucu({ aktif = true }: { aktif?: boolean }) {
  const [sayfalar, setSayfalarHam] = useState<KolajSayfasi[]>(() => [yeniSayfa("dortlu")]);
  const [ayar, setAyar] = useState<KolajAyarlari>(VARSAYILAN_AYARLAR);
  const [seciliId, setSeciliId] = useState("");
  const [seciliHucre, setSeciliHucre] = useState<number | null>(null);
  // Undo stack in a ref (read and popped synchronously); the count re-renders.
  const gecmisRef = useRef<KolajSayfasi[][]>([]);
  const [gecmisAdedi, setGecmisAdedi] = useState(0);
  const [yuklendi, setYuklendi] = useState(false);
  const [kayit, setKayit] = useState<"bekliyor" | "kaydedildi" | "hata">("kaydedildi");
  const [suruklenen, setSuruklenen] = useState<number | null>(null);
  const [birakmaYeri, setBirakmaYeri] = useState<number | null>(null);
  const [silOnayi, setSilOnayi] = useState<string | null>(null);
  const [yeniProjeOnayi, setYeniProjeOnayi] = useState(false);
  const [islem, setIslem] = useState<{ tur: string; adim: number; toplam: number } | null>(null);
  const [sonuc, setSonuc] = useState<{ ad: string; boyut: number; kalite: number }[] | null>(null);
  const [mesaj, setMesaj] = useState<{ tur: "hata" | "bilgi"; metin: string } | null>(null);
  const hedefRef = useRef<{ sayfaId: string; hucre: number; degistir: boolean } | null>(null);
  const hucreGirdiRef = useRef<HTMLInputElement>(null);
  const topluGirdiRef = useRef<HTMLInputElement>(null);
  const sayfalarRef = useRef(sayfalar);
  // Every photo file loaded this session, so undo can bring any back.
  const bloblarRef = useRef(new Map<string, Blob>());

  useEffect(() => {
    sayfalarRef.current = sayfalar;
  }, [sayfalar]);

  const secili = sayfalar.find((s) => s.id === seciliId) ?? sayfalar[0];
  const seciliSira = sayfalar.indexOf(secili);
  const toplamResim = sayfalar.reduce((t, s) => t + doluSayisi(s), 0);
  const seciliResim = seciliHucre !== null ? (secili.resimler[seciliHucre] ?? null) : null;

  const gecmiseKaydet = useCallback(() => {
    gecmisRef.current = [...gecmisRef.current.slice(-(GECMIS_SINIRI - 1)), sayfalarRef.current];
    setGecmisAdedi(gecmisRef.current.length);
  }, []);

  // Every structural change goes through here so it can be undone.
  const setSayfalar = useCallback(
    (yeni: KolajSayfasi[], gecmiseEkle = true) => {
      if (gecmiseEkle) gecmiseKaydet();
      sayfalarRef.current = yeni;
      setSayfalarHam(yeni);
      setSonuc(null);
    },
    [gecmiseKaydet],
  );

  const geriAl = useCallback(() => {
    const onceki = gecmisRef.current.at(-1);
    if (!onceki) return;
    gecmisRef.current = gecmisRef.current.slice(0, -1);
    setGecmisAdedi(gecmisRef.current.length);
    sayfalarRef.current = onceki;
    setSayfalarHam(onceki);
    setSeciliHucre(null);
    setSonuc(null);
  }, []);

  // Restore the saved project once.
  useEffect(() => {
    let iptal = false;
    projeYukle()
      .then((p) => {
        if (iptal || !p || p.sayfalar.length === 0) return;
        p.bloblar.forEach((b, id) => bloblarRef.current.set(id, b));
        sayfalarRef.current = p.sayfalar;
        setSayfalarHam(p.sayfalar);
        setAyar({ ...VARSAYILAN_AYARLAR, ...p.ayarlar });
        setSeciliId(p.sayfalar[0].id);
        const adet = p.sayfalar.reduce((t, s) => t + s.resimler.filter(Boolean).length, 0);
        if (adet) setMesaj({ tur: "bilgi", metin: `Kaydedilmiş kolaj açıldı: ${p.sayfalar.length} sayfa, ${adet} resim.` });
      })
      .catch(() => setMesaj({ tur: "hata", metin: "Kaydedilmiş kolaj okunamadı; yeni bir kolaj başlatıldı." }))
      .finally(() => {
        if (!iptal) setYuklendi(true);
      });
    return () => {
      iptal = true;
    };
  }, []);

  // Autosave shortly after each change.
  useEffect(() => {
    if (!yuklendi) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- status indicator for the pending save
    setKayit("bekliyor");
    const t = setTimeout(() => {
      projeKaydet(sayfalar, ayar, bloblarRef.current)
        .then(() => setKayit("kaydedildi"))
        .catch(() => setKayit("hata"));
    }, 700);
    return () => clearTimeout(t);
  }, [sayfalar, ayar, yuklendi]);

  // Places photos starting at a slot: the first one into that slot (replacing
  // when asked), the rest into the next empty slots of this and following
  // pages, then into new pages with this page's layout.
  const yerlestir = useCallback(
    async (dosyalar: File[], sayfaId: string, hucre: number, degistir: boolean) => {
      setMesaj(null);
      const resimler: KolajResmi[] = [];
      const hatalar: string[] = [];
      for (const f of dosyalar.filter((f) => f.type.startsWith("image/"))) {
        try {
          const r = await resimOlustur(f);
          bloblarRef.current.set(r.id, f);
          resimler.push(r);
        } catch (err) {
          hatalar.push((err as Error).message);
        }
      }
      if (resimler.length === 0) {
        setMesaj({ tur: "hata", metin: hatalar.length ? hatalar.join(", ") : "Resim dosyası seçilmedi." });
        return;
      }
      const liste = sayfalarRef.current.map((s) => ({ ...s, resimler: [...s.resimler] }));
      let si = Math.max(0, liste.findIndex((s) => s.id === sayfaId));
      const duzen = liste[si].duzen;
      const kalan = [...resimler];
      let sonSayfaId = liste[si].id;
      if (degistir) liste[si].resimler[hucre] = kalan.shift()!;
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
      setSayfalar(liste);
      setSeciliId(sonSayfaId);
      setSeciliHucre(null);
      if (hatalar.length) setMesaj({ tur: "hata", metin: `Açılamayan dosyalar: ${hatalar.join(", ")}` });
    },
    [setSayfalar],
  );

  function sayfaGuncelle(id: string, degistir: (s: KolajSayfasi) => KolajSayfasi, gecmiseEkle = true) {
    setSayfalar(
      sayfalarRef.current.map((s) => (s.id === id ? degistir(s) : s)),
      gecmiseEkle,
    );
  }

  function resimGuncelle(i: number, degisiklik: Partial<KolajResmi>, gecmiseEkle = true) {
    sayfaGuncelle(
      secili.id,
      (s) => {
        const r = [...s.resimler];
        if (r[i]) r[i] = { ...r[i]!, ...degisiklik };
        return { ...s, resimler: r };
      },
      gecmiseEkle,
    );
  }

  const hucreTemizle = useCallback(
    (i: number) => {
      const s = sayfalarRef.current.find((x) => x.id === secili.id);
      if (!s) return;
      const r = [...s.resimler];
      r[i] = null;
      setSayfalar(sayfalarRef.current.map((x) => (x.id === s.id ? { ...s, resimler: r } : x)));
      setSeciliHucre(null);
    },
    [secili.id, setSayfalar],
  );

  // Keyboard: Ctrl+Z undo, Delete removes the selected photo, Esc deselects;
  // Ctrl+V pastes screenshots/photos into the current page.
  useEffect(() => {
    if (!aktif) return;
    function tus(e: KeyboardEvent) {
      const hedef = e.target as HTMLElement;
      if (hedef.closest?.("input, textarea, select, [contenteditable=true]")) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        geriAl();
      } else if ((e.key === "Delete" || e.key === "Backspace") && seciliHucre !== null) {
        e.preventDefault();
        hucreTemizle(seciliHucre);
      } else if (e.key === "Escape") {
        setSeciliHucre(null);
      }
    }
    function yapistir(e: ClipboardEvent) {
      const hedef = e.target as HTMLElement;
      if (hedef.closest?.("input, textarea")) return;
      const dosyalar = [...(e.clipboardData?.files ?? [])].filter((f) => f.type.startsWith("image/"));
      if (dosyalar.length) yerlestir(dosyalar, secili.id, 0, false);
    }
    window.addEventListener("keydown", tus);
    window.addEventListener("paste", yapistir);
    return () => {
      window.removeEventListener("keydown", tus);
      window.removeEventListener("paste", yapistir);
    };
  }, [aktif, geriAl, hucreTemizle, seciliHucre, secili.id, yerlestir]);

  function hucreSec(sayfaId: string, hucre: number, degistir: boolean) {
    hedefRef.current = { sayfaId, hucre, degistir };
    hucreGirdiRef.current?.click();
  }

  function hucreTasi(a: number, b: number) {
    if (a === b) return;
    sayfaGuncelle(secili.id, (s) => {
      const r = [...s.resimler];
      [r[a], r[b]] = [r[b] ?? null, r[a] ?? null];
      return { ...s, resimler: r };
    });
    setSeciliHucre(null);
  }

  function duzenDegistir(duzen: DuzenKey) {
    sayfaGuncelle(secili.id, (s) => {
      // Pack photos into the new layout in order; overflow is kept.
      const dolu = s.resimler.filter(Boolean) as KolajResmi[];
      const r: (KolajResmi | null)[] = [...dolu];
      while (r.length < hucreSayisi(duzen)) r.push(null);
      return { ...s, duzen, resimler: r };
    });
    setSeciliHucre(null);
  }

  // Photos that no longer fit after a layout change go to new pages.
  function tasanlariTasi() {
    const liste = sayfalarRef.current;
    const i = liste.findIndex((s) => s.id === secili.id);
    const s = liste[i];
    const adet = hucreSayisi(s.duzen);
    const tasan = s.resimler.slice(adet).filter(Boolean) as KolajResmi[];
    const yeniler: KolajSayfasi[] = [];
    while (tasan.length) {
      const y = yeniSayfa(s.duzen);
      y.resimler = y.resimler.map(() => tasan.shift() ?? null);
      yeniler.push(y);
    }
    setSayfalar([...liste.slice(0, i), { ...s, resimler: s.resimler.slice(0, adet) }, ...yeniler, ...liste.slice(i + 1)]);
  }

  // Every photo, in page order, re-flowed into pages of one layout.
  function yenidenDiz(duzen: DuzenKey) {
    const hepsi = sayfalarRef.current.flatMap((s) => s.resimler.filter(Boolean) as KolajResmi[]);
    if (hepsi.length === 0) return;
    const adet = hucreSayisi(duzen);
    const yeni: KolajSayfasi[] = [];
    for (let i = 0; i < hepsi.length; i += adet) {
      const s = yeniSayfa(duzen);
      s.resimler = s.resimler.map((_, j) => hepsi[i + j] ?? null);
      yeni.push(s);
    }
    setSayfalar(yeni);
    setSeciliId(yeni[0].id);
    setSeciliHucre(null);
    setMesaj({
      tur: "bilgi",
      metin: `${hepsi.length} resim ${yeni.length} sayfaya (${duzenBul(duzen).ad}) yeniden dizildi. Geri almak için Ctrl+Z.`,
    });
  }

  function sayfaEkle(duzen: DuzenKey) {
    const y = yeniSayfa(duzen);
    const liste = sayfalarRef.current;
    setSayfalar([...liste.slice(0, seciliSira + 1), y, ...liste.slice(seciliSira + 1)]);
    setSeciliId(y.id);
    setSeciliHucre(null);
  }

  function sayfaSil(id: string) {
    const liste = sayfalarRef.current;
    const s = liste.find((x) => x.id === id);
    if (!s) return;
    if (s.resimler.some(Boolean) && silOnayi !== id) {
      setSilOnayi(id);
      return;
    }
    const kalan = liste.filter((x) => x.id !== id);
    const yeni = kalan.length ? kalan : [yeniSayfa(s.duzen)];
    setSayfalar(yeni);
    setSeciliId(yeni[Math.min(liste.indexOf(s), yeni.length - 1)].id);
    setSeciliHucre(null);
    setSilOnayi(null);
  }

  function tasi(kaynak: number, hedef: number) {
    if (kaynak === hedef || hedef < 0 || hedef >= sayfalar.length) return;
    const yeni = [...sayfalarRef.current];
    const [s] = yeni.splice(kaynak, 1);
    yeni.splice(hedef, 0, s);
    setSayfalar(yeni);
  }

  async function yeniProje() {
    await projeSil().catch(() => {});
    sayfalarRef.current.forEach((s) => s.resimler.forEach((r) => r && URL.revokeObjectURL(r.url)));
    bloblarRef.current.clear();
    const s = yeniSayfa("dortlu");
    sayfalarRef.current = [s];
    setSayfalarHam([s]);
    gecmisRef.current = [];
    setGecmisAdedi(0);
    setSeciliId(s.id);
    setSeciliHucre(null);
    setSonuc(null);
    // The title belongs to the old collage; naming and display options stay.
    setAyar((a) => ({ ...a, baslik: "" }));
    setYeniProjeOnayi(false);
    setMesaj({ tur: "bilgi", metin: "Yeni kolaj başlatıldı." });
  }

  const indirilecek = sayfalar.map((s, i) => ({ s, sira: i + 1 })).filter(({ s }) => doluSayisi(s) > 0);

  async function sayfalariHazirla(tur: string) {
    const dosyalar: { ad: string; blob: Blob; kalite: number }[] = [];
    for (const [n, { s, sira }] of indirilecek.entries()) {
      setIslem({ tur, adim: n + 1, toplam: indirilecek.length });
      const { blob, kalite } = await sayfaJpeg(s, ayar, sira, sayfalar.length);
      dosyalar.push({ ad: dosyaAdi(ayar.onEk, sira, sayfalar.length), blob, kalite });
    }
    return dosyalar;
  }

  const paketAdi = (uzanti: string) => `${(ayar.onEk.trim() || "Kolaj").replace(/\s+/g, "-")}-kolaj.${uzanti}`;

  async function zipIndir() {
    if (indirilecek.length === 0) return;
    setMesaj(null);
    try {
      const dosyalar = await sayfalariHazirla("ZIP");
      const { zipSync } = await import("fflate");
      const icerik: Record<string, [Uint8Array, { level: 0 }]> = {};
      for (const d of dosyalar) icerik[d.ad] = [new Uint8Array(await d.blob.arrayBuffer()), { level: 0 }];
      indir(new Blob([zipSync(icerik).slice().buffer], { type: "application/zip" }), paketAdi("zip"));
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
      indir(pdf.output("blob"), paketAdi("pdf"));
      setSonuc(dosyalar.map((d) => ({ ad: d.ad, boyut: d.blob.size, kalite: d.kalite })));
    } catch (err) {
      setMesaj({ tur: "hata", metin: (err as Error).message || "PDF hazırlanamadı." });
    } finally {
      setIslem(null);
    }
  }

  async function tekIndir() {
    setIslem({ tur: "JPG", adim: 1, toplam: 1 });
    try {
      const { blob } = await sayfaJpeg(secili, ayar, seciliSira + 1, sayfalar.length);
      indir(blob, dosyaAdi(ayar.onEk, seciliSira + 1, sayfalar.length));
    } catch (err) {
      setMesaj({ tur: "hata", metin: (err as Error).message });
    } finally {
      setIslem(null);
    }
  }

  const dugme =
    "inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40";
  const kucukDugme =
    "inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40";
  const girdi =
    "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-lime-300 focus:outline-none focus:ring-4 focus:ring-lime-200/50";
  const tasan = tasanSayisi(secili);

  return (
    <div className="space-y-4">
      {/* Araç çubuğu */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => topluGirdiRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-sm font-semibold text-lime-300"
          >
            <Images className="h-4 w-4" />
            Resimleri Toplu Ekle
          </button>
          <button type="button" onClick={geriAl} disabled={gecmisAdedi === 0} className={dugme} title="Geri al (Ctrl+Z)">
            <Undo2 className="h-4 w-4" />
            Geri Al
          </button>
          <label className="relative inline-flex items-center">
            <LayoutGrid className="pointer-events-none absolute left-3 h-4 w-4 text-slate-400" />
            <select
              value=""
              onChange={(e) => e.target.value && yenidenDiz(e.target.value as DuzenKey)}
              disabled={toplamResim === 0}
              className="cursor-pointer rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-8 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              aria-label="Tüm resimleri tek düzende yeniden diz"
            >
              <option value="">Tümünü yeniden diz…</option>
              {DUZENLER.map((d) => (
                <option key={d.key} value={d.key}>
                  {d.ad} sayfalara
                </option>
              ))}
            </select>
          </label>
          <span className="inline-flex items-center gap-1 text-xs text-slate-500">
            {sayfalar.length} sayfa · {toplamResim} resim ·
            {kayit === "bekliyor" ? (
              <span className="inline-flex items-center gap-1 text-slate-400">
                <Loader2 className="h-3 w-3 animate-spin" />
                kaydediliyor
              </span>
            ) : kayit === "hata" ? (
              <span className="text-rose-600">kaydedilemedi</span>
            ) : (
              <span className="inline-flex items-center gap-1 text-emerald-600">
                <Cloud className="h-3 w-3" />
                kaydedildi
              </span>
            )}
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
          {yeniProjeOnayi ? (
            <span className="inline-flex items-center gap-1 rounded-xl bg-rose-50 px-2 py-1.5 text-xs text-rose-700">
              Tüm sayfalar silinsin mi?
              <button type="button" onClick={yeniProje} className="rounded bg-rose-600 px-1.5 py-0.5 font-semibold text-white">
                Evet
              </button>
              <button type="button" onClick={() => setYeniProjeOnayi(false)} className="px-1 font-medium">
                Vazgeç
              </button>
            </span>
          ) : (
            <button type="button" onClick={() => setYeniProjeOnayi(true)} className={dugme} title="Tüm sayfaları temizleyip yeni kolaj başlat">
              <FilePlus2 className="h-4 w-4" />
              Yeni Kolaj
            </button>
          )}
        </div>
      </div>

      {islem && (
        <p className="rounded-xl bg-lime-50 px-3 py-2 text-sm text-lime-900">
          {islem.tur} hazırlanıyor: sayfa {islem.adim} / {islem.toplam}…
        </p>
      )}
      {mesaj && (
        <p
          className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm ${
            mesaj.tur === "hata" ? "bg-rose-50 text-rose-700" : "bg-sky-50 text-sky-800"
          }`}
        >
          {mesaj.metin}
          <button type="button" onClick={() => setMesaj(null)} aria-label="Kapat" className="rounded p-0.5 opacity-60 hover:opacity-100">
            <X className="h-3.5 w-3.5" />
          </button>
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

      <div className="grid gap-4 lg:grid-cols-[250px_minmax(0,1fr)] 2xl:grid-cols-[250px_minmax(0,1fr)_270px]">
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
              const aktifSayfa = s.id === secili.id;
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
                  onClick={() => {
                    setSeciliId(s.id);
                    setSeciliHucre(null);
                  }}
                  className={`flex cursor-pointer items-center gap-2 rounded-xl border p-2 transition-all ${
                    aktifSayfa ? "border-slate-900 bg-slate-50 ring-1 ring-slate-900" : "border-slate-100 hover:border-slate-200"
                  } ${suruklenen === i ? "opacity-40" : ""} ${birakmaYeri === i && suruklenen !== i ? "border-lime-400 bg-lime-50" : ""}`}
                >
                  <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-slate-300" />
                  <div className="w-11 shrink-0 overflow-hidden rounded-sm shadow ring-1 ring-slate-200">
                    <SayfaGorunumu sayfa={s} ayar={ayar} sira={i + 1} toplam={sayfalar.length} kucuk />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">{sayfaAdi(ayar.onEk, i + 1)}</p>
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
                      aria-label={`${sayfaAdi(ayar.onEk, i + 1)} yukarı taşı`}
                      className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-20"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => tasi(i, i + 1)}
                      disabled={i === sayfalar.length - 1}
                      aria-label={`${sayfaAdi(ayar.onEk, i + 1)} aşağı taşı`}
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
        <div className="min-w-0 rounded-2xl border border-slate-100 bg-slate-50 p-3 sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-base font-semibold text-slate-900">{sayfaAdi(ayar.onEk, seciliSira + 1)}</p>
              <p className="text-xs text-slate-500">
                A4 dikey · {duzenBul(secili.duzen).aciklama} · {dosyaAdi(ayar.onEk, seciliSira + 1, sayfalar.length)}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={tekIndir}
                disabled={!!islem || doluSayisi(secili) === 0}
                title="Bu sayfayı JPG indir"
                className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-slate-900 disabled:opacity-30"
              >
                <Download className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => sayfaEkle(secili.duzen)}
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
              const secilen = secili.duzen === d.key;
              return (
                <button
                  key={d.key}
                  type="button"
                  role="radio"
                  aria-checked={secilen}
                  title={d.aciklama}
                  onClick={() => duzenDegistir(d.key)}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left transition-colors ${
                    secilen ? "border-slate-900 bg-slate-900 text-lime-300" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
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
                onClick={tasanlariTasi}
                className="rounded-lg bg-amber-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-amber-600"
              >
                Yeni sayfaya taşı
              </button>
            </div>
          )}

          <div className="mx-auto w-full max-w-[540px] shadow-[0_10px_40px_-12px_rgba(15,23,42,0.35)] ring-1 ring-slate-200">
            <SayfaGorunumu
              sayfa={secili}
              ayar={ayar}
              sira={seciliSira + 1}
              toplam={sayfalar.length}
              seciliHucre={seciliHucre}
              onHucreSec={setSeciliHucre}
              onBosTikla={(i) => hucreSec(secili.id, i, true)}
              onDosyaBirak={(i, dosyalar) => yerlestir(dosyalar, secili.id, i, true)}
              onHucreTasi={hucreTasi}
              onKaydirBasla={gecmiseKaydet}
              onKaydir={(i, odakX, odakY) => resimGuncelle(i, { odakX, odakY }, false)}
            />
          </div>
          <p className="mt-3 text-center text-xs text-slate-400">
            Resme tıklayarak düzenleyin · Resimleri kutular arasında sürükleyerek yer değiştirin · Ctrl+V ile yapıştırın
          </p>
        </div>

        {/* Sağ panel: seçili resim + sayfa ayarları */}
        <div className="grid gap-4 lg:col-span-2 lg:grid-cols-2 2xl:col-span-1 2xl:grid-cols-1 2xl:content-start">
          <div className={`rounded-2xl border p-3 ${seciliResim ? "border-lime-300 bg-lime-50/40" : "border-slate-100 bg-white"}`}>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <Crosshair className="h-3.5 w-3.5" />
              Seçili Resim
            </p>
            {seciliResim && seciliHucre !== null ? (
              <div className="space-y-3">
                <p className="truncate text-xs text-slate-500" title={seciliResim.ad}>
                  {seciliResim.ad} · {seciliResim.en}×{seciliResim.boy}
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    className={kucukDugme}
                    onClick={() => resimGuncelle(seciliHucre, { donme: ((seciliResim.donme + 270) % 360) as Donme, odakX: 0.5, odakY: 0.5 })}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Sola döndür
                  </button>
                  <button
                    type="button"
                    className={kucukDugme}
                    onClick={() => resimGuncelle(seciliHucre, { donme: ((seciliResim.donme + 90) % 360) as Donme, odakX: 0.5, odakY: 0.5 })}
                  >
                    <RotateCw className="h-3.5 w-3.5" />
                    Sağa döndür
                  </button>
                </div>
                <label className="block">
                  <span className="flex items-center justify-between text-xs text-slate-600">
                    <span className="inline-flex items-center gap-1">
                      <ZoomIn className="h-3.5 w-3.5" />
                      Yakınlaştırma
                    </span>
                    <span className="tabular-nums text-slate-400">%{Math.round(seciliResim.yakinlik * 100)}</span>
                  </span>
                  <input
                    type="range"
                    min={100}
                    max={300}
                    step={5}
                    value={Math.round(seciliResim.yakinlik * 100)}
                    onPointerDown={gecmiseKaydet}
                    onChange={(e) => resimGuncelle(seciliHucre, { yakinlik: Number(e.target.value) / 100 }, false)}
                    className="mt-1 w-full accent-slate-900"
                  />
                </label>
                <button type="button" className={`${kucukDugme} w-full`} onClick={() => resimGuncelle(seciliHucre, { odakX: 0.5, odakY: 0.5, yakinlik: 1 })}>
                  Kadrajı sıfırla
                </button>
                <label className="block text-xs text-slate-600">
                  Açıklama
                  <input
                    value={seciliResim.aciklama}
                    onFocus={gecmiseKaydet}
                    onChange={(e) => resimGuncelle(seciliHucre, { aciklama: e.target.value }, false)}
                    placeholder="Örn. Salon, Mutfak, Dış cephe"
                    maxLength={60}
                    className={`${girdi} mt-1`}
                  />
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button type="button" className={kucukDugme} onClick={() => hucreSec(secili.id, seciliHucre, true)}>
                    <RefreshCw className="h-3.5 w-3.5" />
                    Değiştir
                  </button>
                  <button type="button" className={`${kucukDugme} text-rose-600 hover:bg-rose-50`} onClick={() => hucreTemizle(seciliHucre)}>
                    <X className="h-3.5 w-3.5" />
                    Kaldır
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs leading-relaxed text-slate-500">
                Önizlemede bir resme tıklayın: döndürün, yakınlaştırın, sürükleyerek kadrajı ayarlayın ve açıklama yazın.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-3">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <Tag className="h-3.5 w-3.5" />
              Sayfa Ayarları
            </p>
            <div className="space-y-3">
              <label className="block text-xs text-slate-600">
                Sayfa adı (toplu isimlendirme)
                <input value={ayar.onEk} onChange={(e) => setAyar({ ...ayar, onEk: e.target.value })} placeholder="Sayfa adı" className={`${girdi} mt-1`} />
              </label>
              <div className="flex flex-wrap gap-1">
                {AD_ONERILERI.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAyar({ ...ayar, onEk: a })}
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      ayar.onEk === a ? "bg-slate-900 text-lime-300" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
              <p className="font-mono text-[11px] text-slate-500">
                {dosyaAdi(ayar.onEk, 1, sayfalar.length)}
                {sayfalar.length > 1 && ` … ${dosyaAdi(ayar.onEk, sayfalar.length, sayfalar.length)}`}
              </p>
              <label className="block text-xs text-slate-600">
                Sayfa başlığı (her sayfanın üstünde)
                <input
                  value={ayar.baslik}
                  onChange={(e) => setAyar({ ...ayar, baslik: e.target.value })}
                  placeholder="Örn. AKBNK-2026-0001 · Fotoğraf Ekleri"
                  maxLength={90}
                  className={`${girdi} mt-1`}
                />
              </label>
              <div className="inline-flex w-full rounded-xl bg-slate-100 p-0.5 text-xs font-medium" role="group" aria-label="Resim yerleşimi">
                {(
                  [
                    ["doldur", "Kutuyu doldur"],
                    ["sigdir", "Resmin tamamı"],
                  ] as const
                ).map(([k, ad]) => (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={ayar.sigdirma === k}
                    onClick={() => setAyar({ ...ayar, sigdirma: k })}
                    className={`flex-1 rounded-lg px-2 py-1.5 ${ayar.sigdirma === k ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
                  >
                    {ad}
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={ayar.sayfaNo} onChange={(e) => setAyar({ ...ayar, sayfaNo: e.target.checked })} className="accent-slate-900" />
                Sayfa numarası (Sayfa 1 / {sayfalar.length})
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={ayar.aciklamaGoster}
                  onChange={(e) => setAyar({ ...ayar, aciklamaGoster: e.target.checked })}
                  className="accent-slate-900"
                />
                Resim açıklamalarını göster
              </label>
              <p className="border-t border-slate-100 pt-2 text-[11px] leading-relaxed text-slate-500">
                Her sayfa A4 (≈200 dpi) JPG olarak, sığan en yüksek kaliteyle 1 MB altına sıkıştırılır. Boş sayfalar indirilmez. Kolaj
                bu tarayıcıda otomatik kaydedilir.
              </p>
            </div>
          </div>
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
