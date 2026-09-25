"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Copy,
  Crop,
  Download,
  FlipHorizontal2,
  FlipVertical2,
  ImageIcon,
  RotateCcw,
  RotateCw,
  Undo2,
  Upload,
  X,
} from "lucide-react";
import Card from "@/components/card";
import { boyutYaz } from "@/lib/dosyalar/depo";

// Everything happens on a canvas in the browser; the photo never leaves it.

interface Ayarlar {
  donme: 0 | 90 | 180 | 270;
  yatayCevir: boolean;
  dikeyCevir: boolean;
  parlaklik: number;
  kontrast: number;
  doygunluk: number;
  griTon: boolean;
  // Crop in source-image pixels after rotation; null keeps the whole image.
  kirp: { x: number; y: number; w: number; h: number } | null;
  enGenislik: number | null;
  bicim: "image/jpeg" | "image/png" | "image/webp";
  kalite: number;
}

const VARSAYILAN: Ayarlar = {
  donme: 0,
  yatayCevir: false,
  dikeyCevir: false,
  parlaklik: 100,
  kontrast: 100,
  doygunluk: 100,
  griTon: false,
  kirp: null,
  enGenislik: null,
  bicim: "image/jpeg",
  kalite: 85,
};

const ORANLAR: { ad: string; oran: number | null }[] = [
  { ad: "Serbest", oran: null },
  { ad: "4:3", oran: 4 / 3 },
  { ad: "3:2", oran: 3 / 2 },
  { ad: "16:9", oran: 16 / 9 },
  { ad: "1:1", oran: 1 },
];

const GENISLIKLER = [null, 2400, 1600, 1200, 800] as const;

// Rotation/flip/filters applied to the full source image.
function donmusCiz(img: HTMLImageElement, a: Ayarlar): HTMLCanvasElement {
  const dik = a.donme === 90 || a.donme === 270;
  const c = document.createElement("canvas");
  c.width = dik ? img.naturalHeight : img.naturalWidth;
  c.height = dik ? img.naturalWidth : img.naturalHeight;
  const ctx = c.getContext("2d")!;
  ctx.filter = `brightness(${a.parlaklik}%) contrast(${a.kontrast}%) saturate(${a.doygunluk}%)${a.griTon ? " grayscale(1)" : ""}`;
  ctx.translate(c.width / 2, c.height / 2);
  ctx.rotate((a.donme * Math.PI) / 180);
  ctx.scale(a.yatayCevir ? -1 : 1, a.dikeyCevir ? -1 : 1);
  ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
  return c;
}

// Crop + resize on top of the rotated image: the final output canvas.
function sonucCiz(img: HTMLImageElement, a: Ayarlar): HTMLCanvasElement {
  const kaynak = donmusCiz(img, a);
  const k = a.kirp ?? { x: 0, y: 0, w: kaynak.width, h: kaynak.height };
  const olcek = a.enGenislik && k.w > a.enGenislik ? a.enGenislik / k.w : 1;
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(k.w * olcek));
  c.height = Math.max(1, Math.round(k.h * olcek));
  const ctx = c.getContext("2d")!;
  if (a.bicim === "image/jpeg") {
    // JPEG has no transparency; flatten onto white instead of black.
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
  }
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(kaynak, k.x, k.y, k.w, k.h, 0, 0, c.width, c.height);
  return c;
}

function blobAl(c: HTMLCanvasElement, a: Ayarlar): Promise<Blob | null> {
  return new Promise((r) => c.toBlob(r, a.bicim, a.bicim === "image/png" ? undefined : a.kalite / 100));
}

function Kaydirici({ ad, deger, onChange, min = 0, max = 200 }: { ad: string; deger: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <label className="block">
      <span className="flex justify-between text-xs text-slate-600">
        {ad}
        <span className="tabular-nums text-slate-400">%{deger}</span>
      </span>
      <input type="range" min={min} max={max} value={deger} onChange={(e) => onChange(Number(e.target.value))} className="mt-1 w-full accent-slate-900" />
    </label>
  );
}

// `aktif`: only the visible tab listens for pasted images.
export default function TekResimDuzenleyici({ aktif = true }: { aktif?: boolean }) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [dosyaAdi, setDosyaAdi] = useState("");
  const [asilBoyut, setAsilBoyut] = useState(0);
  const [a, setA] = useState<Ayarlar>(VARSAYILAN);
  const [gecmis, setGecmis] = useState<Ayarlar[]>([]);
  const [kirpModu, setKirpModu] = useState(false);
  const [oran, setOran] = useState<number | null>(null);
  const [secim, setSecim] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [cikti, setCikti] = useState<{ boyut: number; w: number; h: number } | null>(null);
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [surukle, setSurukle] = useState(false);
  const [tuval, setTuval] = useState({ w: 1, h: 1 });
  const girdiRef = useRef<HTMLInputElement>(null);
  const onizlemeRef = useRef<HTMLCanvasElement>(null);
  const baslangicRef = useRef<{ x: number; y: number } | null>(null);

  // Discrete edits go through here so Geri Al can step back; slider drags
  // set state directly and are undone together with the next edit.
  function guncelle(degisiklik: Partial<Ayarlar>) {
    setGecmis([...gecmis.slice(-19), a]);
    setA({ ...a, ...degisiklik });
  }

  function geriAl() {
    if (gecmis.length === 0) return;
    setA(gecmis[gecmis.length - 1]);
    setGecmis(gecmis.slice(0, -1));
  }

  const resmiYukle = useCallback((f: File) => {
    if (!f.type.startsWith("image/")) {
      setMesaj("Lütfen bir görsel dosyası seçin.");
      return;
    }
    const url = URL.createObjectURL(f);
    const yeni = new Image();
    yeni.onload = () => {
      URL.revokeObjectURL(url);
      setImg(yeni);
      setDosyaAdi(f.name.replace(/\.[^.]+$/, ""));
      setAsilBoyut(f.size);
      setA(VARSAYILAN);
      setGecmis([]);
      setKirpModu(false);
      setSecim(null);
      setMesaj(null);
    };
    yeni.onerror = () => setMesaj("Görsel açılamadı.");
    yeni.src = url;
  }, []);

  // Paste a screenshot straight into the editor.
  useEffect(() => {
    if (!aktif) return;
    function yapistir(e: ClipboardEvent) {
      const f = [...(e.clipboardData?.files ?? [])].find((x) => x.type.startsWith("image/"));
      if (f) resmiYukle(f);
    }
    window.addEventListener("paste", yapistir);
    return () => window.removeEventListener("paste", yapistir);
  }, [resmiYukle, aktif]);

  // Preview: in crop mode the uncropped rotated image (to draw a selection
  // on), otherwise the final result. Output size is computed alongside.
  const onizlemeAyari = useMemo(() => (kirpModu ? { ...a, kirp: null, enGenislik: null } : a), [a, kirpModu]);
  useEffect(() => {
    const hedef = onizlemeRef.current;
    if (!img || !hedef) return;
    const c = kirpModu ? donmusCiz(img, onizlemeAyari) : sonucCiz(img, onizlemeAyari);
    hedef.width = c.width;
    hedef.height = c.height;
    hedef.getContext("2d")!.drawImage(c, 0, 0);
    setTuval({ w: c.width, h: c.height });
    if (kirpModu) return;
    let iptal = false;
    blobAl(c, a).then((b) => {
      if (!iptal && b) setCikti({ boyut: b.size, w: c.width, h: c.height });
    });
    return () => {
      iptal = true;
    };
  }, [img, onizlemeAyari, kirpModu, a]);

  // Pointer position in canvas pixels.
  function tuvalNoktasi(e: React.PointerEvent<HTMLDivElement>) {
    const c = onizlemeRef.current!;
    const r = c.getBoundingClientRect();
    return {
      x: Math.min(c.width, Math.max(0, ((e.clientX - r.left) / r.width) * c.width)),
      y: Math.min(c.height, Math.max(0, ((e.clientY - r.top) / r.height) * c.height)),
    };
  }

  function secimHesapla(b: { x: number; y: number }, s: { x: number; y: number }) {
    const c = onizlemeRef.current!;
    let w = Math.abs(s.x - b.x);
    let h = Math.abs(s.y - b.y);
    if (oran) {
      if (w / oran > h) h = w / oran;
      else w = h * oran;
    }
    const x = s.x < b.x ? b.x - w : b.x;
    const y = s.y < b.y ? b.y - h : b.y;
    const cx = Math.max(0, x);
    const cy = Math.max(0, y);
    return { x: cx, y: cy, w: Math.min(w, c.width - cx), h: Math.min(h, c.height - cy) };
  }

  function kirpUygula() {
    if (secim && secim.w > 4 && secim.h > 4) {
      guncelle({ kirp: { x: Math.round(secim.x), y: Math.round(secim.y), w: Math.round(secim.w), h: Math.round(secim.h) } });
    }
    setKirpModu(false);
    setSecim(null);
  }

  // Rotating or flipping invalidates a crop drawn in the old orientation.
  function donustur(degisiklik: Partial<Ayarlar>) {
    guncelle({ ...degisiklik, kirp: null });
  }

  async function indir() {
    if (!img) return;
    const b = await blobAl(sonucCiz(img, a), a);
    if (!b) return;
    const uzanti = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[a.bicim];
    const url = URL.createObjectURL(b);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${dosyaAdi || "gorsel"}-duzenlenmis.${uzanti}`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  async function kopyala() {
    if (!img) return;
    try {
      // The clipboard accepts PNG everywhere; other formats are not portable.
      const b = await blobAl(sonucCiz(img, a), { ...a, bicim: "image/png" });
      if (!b) throw new Error();
      await navigator.clipboard.write([new ClipboardItem({ "image/png": b })]);
      setMesaj("Görsel panoya kopyalandı; rapora yapıştırabilirsiniz.");
    } catch {
      setMesaj("Tarayıcı panoya görsel kopyalamaya izin vermedi; İndir'i kullanın.");
    }
  }

  const dugme =
    "inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40";

  if (!img) {
    return (
      <div className="space-y-6">
        <p className="text-sm text-slate-500">
          Tek bir fotoğrafı kırpın, döndürün, iyileştirin ve küçültün. İşlem tarayıcınızda yapılır, görsel hiçbir yere yüklenmez.
        </p>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setSurukle(true);
          }}
          onDragLeave={() => setSurukle(false)}
          onDrop={(e) => {
            e.preventDefault();
            setSurukle(false);
            const f = e.dataTransfer.files[0];
            if (f) resmiYukle(f);
          }}
          className={`flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed px-6 py-20 text-center transition-colors ${
            surukle ? "border-lime-400 bg-lime-50" : "border-slate-200 bg-white/70"
          }`}
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 text-lime-300">
            <ImageIcon className="h-7 w-7" />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-800">Görseli buraya sürükleyin, yapıştırın (Ctrl+V) ya da seçin</p>
            <p className="mt-1 text-xs text-slate-500">JPEG, PNG, WebP</p>
          </div>
          <button
            type="button"
            onClick={() => girdiRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-lime-300"
          >
            <Upload className="h-4 w-4" />
            Görsel Seç
          </button>
          {mesaj && <p className="text-xs font-medium text-rose-600">{mesaj}</p>}
        </div>
        <input
          ref={girdiRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) resmiYukle(f);
            e.target.value = "";
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{dosyaAdi}</p>
          <p className="truncate text-xs text-slate-500">
            {img.naturalWidth}×{img.naturalHeight} · {boyutYaz(asilBoyut)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={geriAl} disabled={gecmis.length === 0} className={dugme}>
            <Undo2 className="h-4 w-4" />
            Geri Al
          </button>
          <button
            type="button"
            onClick={() => {
              setImg(null);
              setMesaj(null);
            }}
            className={dugme}
          >
            <X className="h-4 w-4" />
            Kapat
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Card>
          <div
            className={`relative mx-auto w-fit max-w-full touch-none select-none ${kirpModu ? "cursor-crosshair" : ""}`}
            onPointerDown={(e) => {
              if (!kirpModu) return;
              e.currentTarget.setPointerCapture(e.pointerId);
              baslangicRef.current = tuvalNoktasi(e);
              setSecim(null);
            }}
            onPointerMove={(e) => {
              if (!kirpModu || !baslangicRef.current) return;
              setSecim(secimHesapla(baslangicRef.current, tuvalNoktasi(e)));
            }}
            onPointerUp={() => {
              baslangicRef.current = null;
            }}
          >
            <canvas ref={onizlemeRef} className="block max-h-[65vh] max-w-full rounded-lg bg-[repeating-conic-gradient(#f1f5f9_0_25%,#fff_0_50%)] bg-[length:16px_16px]" />
            {kirpModu && secim && (
              <div
                className="pointer-events-none absolute border-2 border-lime-400 shadow-[0_0_0_9999px_rgba(15,23,42,0.5)]"
                style={{
                  left: `${(secim.x / tuval.w) * 100}%`,
                  top: `${(secim.y / tuval.h) * 100}%`,
                  width: `${(secim.w / tuval.w) * 100}%`,
                  height: `${(secim.h / tuval.h) * 100}%`,
                }}
              >
                <span className="absolute -top-6 left-0 rounded bg-slate-900 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-lime-300">
                  {Math.round(secim.w)}×{Math.round(secim.h)}
                </span>
              </div>
            )}
          </div>
          {kirpModu && <p className="mt-3 text-center text-xs text-slate-500">Kırpılacak alanı sürükleyerek seçin.</p>}
        </Card>

        <div className="space-y-4">
          <Card>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Döndür ve Kırp</p>
            <div className="grid grid-cols-4 gap-1.5">
              <button type="button" title="Sola döndür" onClick={() => donustur({ donme: (((a.donme + 270) % 360) as Ayarlar["donme"]) })} className={dugme}>
                <RotateCcw className="h-4 w-4" />
              </button>
              <button type="button" title="Sağa döndür" onClick={() => donustur({ donme: (((a.donme + 90) % 360) as Ayarlar["donme"]) })} className={dugme}>
                <RotateCw className="h-4 w-4" />
              </button>
              <button type="button" title="Yatay çevir" onClick={() => donustur({ yatayCevir: !a.yatayCevir })} className={dugme}>
                <FlipHorizontal2 className="h-4 w-4" />
              </button>
              <button type="button" title="Dikey çevir" onClick={() => donustur({ dikeyCevir: !a.dikeyCevir })} className={dugme}>
                <FlipVertical2 className="h-4 w-4" />
              </button>
            </div>
            {kirpModu ? (
              <div className="mt-3 space-y-2">
                <div className="flex flex-wrap gap-1">
                  {ORANLAR.map((o) => (
                    <button
                      key={o.ad}
                      type="button"
                      onClick={() => {
                        setOran(o.oran);
                        setSecim(null);
                      }}
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${oran === o.oran ? "bg-slate-900 text-lime-300" : "bg-slate-100 text-slate-600"}`}
                    >
                      {o.ad}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setKirpModu(false);
                      setSecim(null);
                    }}
                    className={dugme}
                  >
                    Vazgeç
                  </button>
                  <button type="button" onClick={kirpUygula} disabled={!secim} className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-lime-300 disabled:opacity-40">
                    Kırp
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                <button type="button" onClick={() => setKirpModu(true)} className={dugme}>
                  <Crop className="h-4 w-4" />
                  Kırp
                </button>
                <button type="button" onClick={() => guncelle({ kirp: null })} disabled={!a.kirp} className={dugme}>
                  Kırpmayı kaldır
                </button>
              </div>
            )}
          </Card>

          <Card>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Işık ve Renk</p>
              <button
                type="button"
                onClick={() => guncelle({ parlaklik: 100, kontrast: 100, doygunluk: 100, griTon: false })}
                className="text-xs font-medium text-slate-500 hover:text-slate-900"
              >
                Sıfırla
              </button>
            </div>
            <div className="space-y-3">
              <Kaydirici ad="Parlaklık" deger={a.parlaklik} min={40} max={180} onChange={(v) => setA({ ...a, parlaklik: v })} />
              <Kaydirici ad="Kontrast" deger={a.kontrast} min={40} max={180} onChange={(v) => setA({ ...a, kontrast: v })} />
              <Kaydirici ad="Doygunluk" deger={a.doygunluk} onChange={(v) => setA({ ...a, doygunluk: v })} />
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={a.griTon} onChange={(e) => guncelle({ griTon: e.target.checked })} className="accent-slate-900" />
                Siyah-beyaz
              </label>
              <button
                type="button"
                onClick={() => guncelle({ parlaklik: 108, kontrast: 112, doygunluk: 112 })}
                className="w-full rounded-xl bg-lime-100 px-3 py-2 text-sm font-medium text-lime-900 hover:bg-lime-200"
              >
                Otomatik iyileştir
              </button>
            </div>
          </Card>

          <Card>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Çıktı</p>
            <div className="space-y-3">
              <label className="block text-xs text-slate-600">
                En fazla genişlik
                <select
                  value={a.enGenislik ?? ""}
                  onChange={(e) => guncelle({ enGenislik: e.target.value ? Number(e.target.value) : null })}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                >
                  {GENISLIKLER.map((g) => (
                    <option key={g ?? "asil"} value={g ?? ""}>
                      {g ? `${g} px` : "Asıl boyut"}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-3 gap-1">
                {(["image/jpeg", "image/webp", "image/png"] as const).map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => guncelle({ bicim: b })}
                    className={`rounded-lg px-2 py-1.5 text-xs font-medium ${a.bicim === b ? "bg-slate-900 text-lime-300" : "bg-slate-100 text-slate-600"}`}
                  >
                    {b.split("/")[1].toUpperCase().replace("JPEG", "JPG")}
                  </button>
                ))}
              </div>
              {a.bicim !== "image/png" && (
                <Kaydirici ad="Kalite" deger={a.kalite} min={40} max={100} onChange={(v) => setA({ ...a, kalite: v })} />
              )}
              {cikti && !kirpModu && (
                <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  {cikti.w}×{cikti.h} px · <strong className="text-slate-900">{boyutYaz(cikti.boyut)}</strong>
                  {asilBoyut > 0 && cikti.boyut < asilBoyut && (
                    <span className="text-emerald-700"> (%{Math.round((1 - cikti.boyut / asilBoyut) * 100)} daha küçük)</span>
                  )}
                </p>
              )}
              <div className="grid grid-cols-2 gap-1.5">
                <button type="button" onClick={kopyala} disabled={kirpModu} className={dugme}>
                  <Copy className="h-4 w-4" />
                  Kopyala
                </button>
                <button
                  type="button"
                  onClick={indir}
                  disabled={kirpModu}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-lime-300 disabled:opacity-40"
                >
                  <Download className="h-4 w-4" />
                  İndir
                </button>
              </div>
              {mesaj && <p className="text-xs text-slate-500">{mesaj}</p>}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
