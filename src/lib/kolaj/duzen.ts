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

export type Sigdirma = "doldur" | "sigdir";
export type Donme = 0 | 90 | 180 | 270;

export interface KolajResmi {
  id: string;
  url: string;
  ad: string;
  en: number;
  boy: number;
  donme: Donme;
  // Which part of the photo stays in view when it overflows the slot
  // (0 = left/top edge, 0.5 = centre, 1 = right/bottom edge).
  odakX: number;
  odakY: number;
  // 1 = just fills (or fits) the slot; >1 zooms in.
  yakinlik: number;
  aciklama: string;
}

export interface KolajSayfasi {
  id: string;
  duzen: DuzenKey;
  // Index = slot. May be longer than the layout's slot count after switching
  // to a smaller layout; the extra photos are kept, not thrown away.
  resimler: (KolajResmi | null)[];
}

// Settings shared by every page of the collage.
export interface KolajAyarlari {
  onEk: string;
  sigdirma: Sigdirma;
  baslik: string;
  sayfaNo: boolean;
  aciklamaGoster: boolean;
}

export const VARSAYILAN_AYARLAR: KolajAyarlari = {
  onEk: "Fotoğraf",
  sigdirma: "doldur",
  baslik: "",
  sayfaNo: false,
  aciklamaGoster: true,
};

export function yeniId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `k-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// ---- Geometry (millimetres) -------------------------------------------------

export const A4 = { en: 210, boy: 297 };
const KENAR_MM = 8;
const ARALIK_MM = 4;
const BASLIK_MM = 10;
const ALTBILGI_MM = 7;
export const YAZI_MM = { baslik: 4.2, altBilgi: 3, aciklama: 3.1 };

export interface Kutu {
  x: number;
  y: number;
  en: number;
  boy: number;
}

// Header / footer bands, when present, push the photo area in.
export function bantlar(ayar: Pick<KolajAyarlari, "baslik" | "sayfaNo">) {
  const ust = ayar.baslik.trim() ? BASLIK_MM : 0;
  const alt = ayar.sayfaNo ? ALTBILGI_MM : 0;
  return {
    ust,
    alt,
    baslikY: KENAR_MM + ust / 2 - 1,
    altBilgiY: A4.boy - KENAR_MM - alt / 2 + 1,
  };
}

// Slot rectangles, row by row (left→right, top→bottom).
export function hucreler(key: DuzenKey, ayar: Pick<KolajAyarlari, "baslik" | "sayfaNo"> = VARSAYILAN_AYARLAR): Kutu[] {
  const d = duzenBul(key);
  const b = bantlar(ayar);
  const ustSinir = KENAR_MM + b.ust;
  const yukseklik = A4.boy - 2 * KENAR_MM - b.ust - b.alt;
  const en = (A4.en - 2 * KENAR_MM - (d.sutun - 1) * ARALIK_MM) / d.sutun;
  const boy = (yukseklik - (d.satir - 1) * ARALIK_MM) / d.satir;
  const kutular: Kutu[] = [];
  for (let r = 0; r < d.satir; r++) {
    for (let c = 0; c < d.sutun; c++) {
      kutular.push({ x: KENAR_MM + c * (en + ARALIK_MM), y: ustSinir + r * (boy + ARALIK_MM), en, boy });
    }
  }
  return kutular;
}

export interface Yerlesim {
  // Rotated photo's bounding box inside the slot (slot units).
  x: number;
  y: number;
  en: number;
  boy: number;
  // The unrotated photo's drawn size (what gets rotated about the centre).
  hamEn: number;
  hamBoy: number;
}

// Where a photo lands inside a slot of the given size. Works in any unit.
export function yerlesim(r: KolajResmi, kutuEn: number, kutuBoy: number, sigdirma: Sigdirma): Yerlesim {
  const dik = r.donme === 90 || r.donme === 270;
  const ie = dik ? r.boy : r.en;
  const ib = dik ? r.en : r.boy;
  const temel = sigdirma === "doldur" ? Math.max(kutuEn / ie, kutuBoy / ib) : Math.min(kutuEn / ie, kutuBoy / ib);
  const s = temel * Math.max(1, r.yakinlik);
  const en = ie * s;
  const boy = ib * s;
  return {
    x: (kutuEn - en) * r.odakX,
    y: (kutuBoy - boy) * r.odakY,
    en,
    boy,
    hamEn: r.en * s,
    hamBoy: r.boy * s,
  };
}

// ---- Naming -----------------------------------------------------------------

export function sayfaAdi(onEk: string, sira: number): string {
  return `${onEk.trim() || "Sayfa"} ${sira}`;
}

// "Fotoğraf-03.jpg": numbers padded to the page count so files sort in order.
export function dosyaAdi(onEk: string, sira: number, toplam: number): string {
  const temiz = (onEk.trim() || "Sayfa").replace(/[\\/:*?"<>|]+/g, "").replace(/\s+/g, "-");
  return `${temiz}-${String(sira).padStart(Math.max(2, String(toplam).length), "0")}.jpg`;
}

export function altBilgiMetni(sira: number, toplam: number): string {
  return `Sayfa ${sira} / ${toplam}`;
}

// ---- Rendering --------------------------------------------------------------

// ~200 dpi A4: sharp in print and on screen, and fits under 1 MB as JPEG.
const PIKSEL_EN = 1654;
export const BOYUT_SINIRI = 1_000_000;
const YAZI_TIPI = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

const resimOnbellegi = new Map<string, Promise<HTMLImageElement>>();

function resimYukle(url: string): Promise<HTMLImageElement> {
  let p = resimOnbellegi.get(url);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Resim okunamadı"));
      img.src = url;
    });
    resimOnbellegi.set(url, p);
    p.catch(() => resimOnbellegi.delete(url));
  }
  return p;
}

function kisalt(ctx: CanvasRenderingContext2D, metin: string, en: number): string {
  if (ctx.measureText(metin).width <= en) return metin;
  let s = metin;
  while (s.length > 1 && ctx.measureText(`${s}…`).width > en) s = s.slice(0, -1);
  return `${s}…`;
}

async function sayfayiCiz(
  sayfa: KolajSayfasi,
  ayar: KolajAyarlari,
  sira: number,
  toplam: number,
  olcek: number,
): Promise<HTMLCanvasElement> {
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

  const b = bantlar(ayar);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (b.ust) {
    ctx.fillStyle = "#0f172a";
    ctx.font = `600 ${YAZI_MM.baslik * mm}px ${YAZI_TIPI}`;
    ctx.fillText(kisalt(ctx, ayar.baslik.trim(), (A4.en - 16) * mm), (A4.en / 2) * mm, b.baslikY * mm);
  }
  if (b.alt) {
    ctx.fillStyle = "#64748b";
    ctx.font = `${YAZI_MM.altBilgi * mm}px ${YAZI_TIPI}`;
    ctx.fillText(altBilgiMetni(sira, toplam), (A4.en / 2) * mm, b.altBilgiY * mm);
  }

  const kutular = hucreler(sayfa.duzen, ayar);
  for (let i = 0; i < kutular.length; i++) {
    const r = sayfa.resimler[i];
    if (!r) continue;
    const img = await resimYukle(r.url);
    const k = kutular[i];
    const [kx, ky, kw, kh] = [k.x * mm, k.y * mm, k.en * mm, k.boy * mm];
    const y = yerlesim(r, kw, kh, ayar.sigdirma);
    ctx.save();
    ctx.beginPath();
    ctx.rect(kx, ky, kw, kh);
    ctx.clip();
    if (ayar.sigdirma === "sigdir") {
      ctx.fillStyle = "#f1f5f9";
      ctx.fillRect(kx, ky, kw, kh);
    }
    ctx.translate(kx + y.x + y.en / 2, ky + y.y + y.boy / 2);
    ctx.rotate((r.donme * Math.PI) / 180);
    ctx.drawImage(img, -y.hamEn / 2, -y.hamBoy / 2, y.hamEn, y.hamBoy);
    ctx.restore();

    if (ayar.aciklamaGoster && r.aciklama.trim()) {
      const bantBoy = YAZI_MM.aciklama * mm * 1.9;
      ctx.fillStyle = "rgba(15, 23, 42, 0.72)";
      ctx.fillRect(kx, ky + kh - bantBoy, kw, bantBoy);
      ctx.fillStyle = "#ffffff";
      ctx.font = `500 ${YAZI_MM.aciklama * mm}px ${YAZI_TIPI}`;
      ctx.fillText(kisalt(ctx, r.aciklama.trim(), kw - 4 * mm), kx + kw / 2, ky + kh - bantBoy / 2);
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
export async function sayfaJpeg(
  sayfa: KolajSayfasi,
  ayar: KolajAyarlari,
  sira: number,
  toplam: number,
): Promise<{ blob: Blob; kalite: number }> {
  for (const olcek of [1, 0.9, 0.8, 0.7]) {
    const c = await sayfayiCiz(sayfa, ayar, sira, toplam, olcek);
    let alt = 0.6;
    let ust = 0.95;
    const ilk = await jpeg(c, ust);
    if (ilk.size < BOYUT_SINIRI) return { blob: ilk, kalite: ust };
    let enIyi: { blob: Blob; kalite: number } | null = null;
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
