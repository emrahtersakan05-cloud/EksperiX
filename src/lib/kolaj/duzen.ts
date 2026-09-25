"use client";

// Kolaj sayfaları: A4 portrait pages split into photo slots. The same
// geometry drives the on-screen preview (percentages) and the exported JPEG
// (pixels), so what you see is what you download.

export type DuzenKey = "tekli" | "ikili" | "dortlu" | "altili" | "sekizli";

export interface Duzen {
  key: DuzenKey;
  ad: string;
  aciklama: string;
  sutun: number;
  satir: number;
}

export const DUZENLER: Duzen[] = [
  { key: "tekli", ad: "Tekli", aciklama: "Sayfada tek resim", sutun: 1, satir: 1 },
  { key: "ikili", ad: "2'li", aciklama: "2 yatay, alt alta", sutun: 1, satir: 2 },
  { key: "dortlu", ad: "4'lü", aciklama: "2 yan yana × 2 alt alta", sutun: 2, satir: 2 },
  { key: "altili", ad: "6'lı", aciklama: "2 yan yana × 3 alt alta", sutun: 2, satir: 3 },
  { key: "sekizli", ad: "8'li", aciklama: "2 yan yana × 4 alt alta", sutun: 2, satir: 4 },
];

export function duzenBul(key: DuzenKey): Duzen {
  return DUZENLER.find((d) => d.key === key) ?? DUZENLER[0];
}

export function hucreSayisi(key: DuzenKey): number {
  const d = duzenBul(key);
  return d.sutun * d.satir;
}

// A4 in millimetres, with the page margin and the gap between photos.
export const A4 = { en: 210, boy: 297 };
const KENAR_MM = 8;
const ARALIK_MM = 4;

export interface Kutu {
  x: number;
  y: number;
  en: number;
  boy: number;
}

// Slot rectangles in millimetres, row by row (left→right, top→bottom).
export function hucreler(key: DuzenKey): Kutu[] {
  const d = duzenBul(key);
  const en = (A4.en - 2 * KENAR_MM - (d.sutun - 1) * ARALIK_MM) / d.sutun;
  const boy = (A4.boy - 2 * KENAR_MM - (d.satir - 1) * ARALIK_MM) / d.satir;
  const kutular: Kutu[] = [];
  for (let r = 0; r < d.satir; r++) {
    for (let c = 0; c < d.sutun; c++) {
      kutular.push({ x: KENAR_MM + c * (en + ARALIK_MM), y: KENAR_MM + r * (boy + ARALIK_MM), en, boy });
    }
  }
  return kutular;
}

export type Sigdirma = "doldur" | "sigdir";

export interface KolajResmi {
  id: string;
  url: string;
  ad: string;
  en: number;
  boy: number;
}

export interface KolajSayfasi {
  id: string;
  duzen: DuzenKey;
  // Index = slot. May be longer than the layout's slot count after switching
  // to a smaller layout; the extra photos are kept, not thrown away.
  resimler: (KolajResmi | null)[];
}

export function yeniId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `k-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// ---- Naming ---------------------------------------------------------------

export function sayfaAdi(onEk: string, sira: number): string {
  return `${onEk.trim() || "Sayfa"} ${sira}`;
}

// "Fotoğraf-03.jpg": numbers padded to the page count so files sort in order.
export function dosyaAdi(onEk: string, sira: number, toplam: number): string {
  const temiz = (onEk.trim() || "Sayfa").replace(/[\\/:*?"<>|]+/g, "").replace(/\s+/g, "-");
  return `${temiz}-${String(sira).padStart(Math.max(2, String(toplam).length), "0")}.jpg`;
}

// ---- Rendering --------------------------------------------------------------

// ~200 dpi A4: sharp in print and on screen, and fits under 1 MB as JPEG.
const PIKSEL_EN = 1654;
export const BOYUT_SINIRI = 1_000_000;

function resimYukle(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Resim okunamadı"));
    img.src = url;
  });
}

async function sayfayiCiz(sayfa: KolajSayfasi, sigdirma: Sigdirma, olcek: number): Promise<HTMLCanvasElement> {
  const en = Math.round(PIKSEL_EN * olcek);
  const boy = Math.round((en * A4.boy) / A4.en);
  const mm = en / A4.en;
  const c = document.createElement("canvas");
  c.width = en;
  c.height = boy;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, en, boy);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const kutular = hucreler(sayfa.duzen);
  for (let i = 0; i < kutular.length; i++) {
    const r = sayfa.resimler[i];
    if (!r) continue;
    const img = await resimYukle(r.url);
    const k = kutular[i];
    const [kx, ky, kw, kh] = [k.x * mm, k.y * mm, k.en * mm, k.boy * mm];
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    if (sigdirma === "doldur") {
      // Cover: crop the photo's overflow, centred.
      const s = Math.max(kw / iw, kh / ih);
      const sw = kw / s;
      const sh = kh / s;
      ctx.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, kx, ky, kw, kh);
    } else {
      // Contain: whole photo, centred on a light panel.
      ctx.fillStyle = "#f1f5f9";
      ctx.fillRect(kx, ky, kw, kh);
      const s = Math.min(kw / iw, kh / ih);
      const dw = iw * s;
      const dh = ih * s;
      ctx.drawImage(img, kx + (kw - dw) / 2, ky + (kh - dh) / 2, dw, dh);
    }
  }
  return c;
}

function jpeg(c: HTMLCanvasElement, kalite: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    c.toBlob((b) => (b ? resolve(b) : reject(new Error("JPEG oluşturulamadı"))), "image/jpeg", kalite),
  );
}

// Highest JPEG quality that stays under the size limit; only if even a
// modest quality won't fit is the resolution lowered a little.
export async function sayfaJpeg(sayfa: KolajSayfasi, sigdirma: Sigdirma): Promise<{ blob: Blob; kalite: number }> {
  for (const olcek of [1, 0.9, 0.8, 0.7]) {
    const c = await sayfayiCiz(sayfa, sigdirma, olcek);
    let alt = 0.6;
    let ust = 0.95;
    let enIyi: { blob: Blob; kalite: number } | null = null;
    const ilk = await jpeg(c, ust);
    if (ilk.size < BOYUT_SINIRI) return { blob: ilk, kalite: ust };
    // Binary search the quality between alt and ust.
    for (let adim = 0; adim < 6; adim++) {
      const q = (alt + ust) / 2;
      const b = await jpeg(c, q);
      if (b.size < BOYUT_SINIRI) {
        enIyi = { blob: b, kalite: q };
        alt = q;
      } else {
        ust = q;
      }
    }
    if (enIyi) return enIyi;
  }
  throw new Error("Sayfa 1 MB altına sığdırılamadı");
}
