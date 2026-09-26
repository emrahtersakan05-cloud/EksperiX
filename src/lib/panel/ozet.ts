import { getTalepCompletion, getTalepDurum, isSectionFilled, type TalepDurum } from "@/lib/talep/completion";
import { sectionMeta } from "@/lib/talep/sections-meta";
import type { Talep, Tapu, TapuSectionKey } from "@/lib/talep/types";

// Everything the Ana Sayfa shows, derived from the user's real talepler.
// Pure functions of (talepler, now) so they are easy to reason about and test.

const GUN = 86_400_000;

function gunBasi(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

// "2026-09-30" (date input) or an ISO timestamp → Date; invalid → null.
function tarihOku(raw: string | undefined): Date | null {
  if (!raw) return null;
  const d = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? new Date(`${raw}T00:00:00`) : new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Where each Tapu section's data lives, in the order the talep page lists them.
const BOLUM_VERISI: Partial<Record<TapuSectionKey, (t: Tapu) => unknown>> = {
  talepDetayi: (t) => t.talepDetayi,
  adresKonum: (t) => t.adresKonum,
  tapuKaydi: (t) => t.tapuKaydi,
  projeIncelemeleri: (t) => t.projeIncelemeleri,
  imarDurumu: (t) => t.imarDurumu,
  anaGayrimenkul: (t) => t.anaGayrimenkul,
  bagimsizBolum: (t) => t.bagimsizBolum,
  satisKabiliyeti: (t) => t.degerleme.satisKabiliyetiNotlari,
  degerlemeAciklamasi: (t) => t.degerleme.degerlemeAciklamaNotlari,
  degerHesaplamasi: (t) => t.degerleme.hesaplamalar,
  emsaller: (t) => t.emsaller,
  raporSonucu: (t) => t.raporSonucu,
};

export interface EksikBolum {
  key: TapuSectionKey;
  label: string;
}

// The first section of a tapu that has nothing entered yet.
export function ilkEksikBolum(tapu: Tapu): EksikBolum | null {
  for (const meta of sectionMeta) {
    const veri = BOLUM_VERISI[meta.key];
    if (veri && !isSectionFilled(veri(tapu))) return { key: meta.key, label: meta.label };
  }
  return null;
}

export interface TalepSatiri {
  talep: Talep;
  pct: number;
  durum: TalepDurum;
  olusturma: Date | null;
  hedef: Date | null;
  // Whole days from today to the target date; negative = overdue.
  kalanGun: number | null;
  oncelik: string;
  eksper: string;
}

export function talepSatirlari(talepler: Talep[], simdi: Date): TalepSatiri[] {
  const bugun = gunBasi(simdi);
  return talepler.map((talep) => {
    const { pct } = getTalepCompletion(talep);
    const detay = talep.tapular[0]?.talepDetayi;
    const hedef = tarihOku(detay?.hedefTeslimTarihi);
    return {
      talep,
      pct,
      durum: getTalepDurum(pct),
      olusturma: tarihOku(talep.olusturmaTarihi),
      hedef,
      kalanGun: hedef ? Math.round((gunBasi(hedef) - bugun) / GUN) : null,
      oncelik: detay?.oncelik ?? "",
      eksper: detay?.atananEksper ?? "",
    };
  });
}

export interface PanelIstatistikleri {
  toplam: number;
  buAy: number;
  gecenAy: number;
  devamEden: number;
  baslanmadi: number;
  tamamlanan: number;
  geciken: number;
  buHafta: number;
}

export function istatistikler(satirlar: TalepSatiri[], simdi: Date): PanelIstatistikleri {
  const ayBasi = new Date(simdi.getFullYear(), simdi.getMonth(), 1).getTime();
  const gecenAyBasi = new Date(simdi.getFullYear(), simdi.getMonth() - 1, 1).getTime();
  const acik = satirlar.filter((s) => s.durum !== "Tamamlandı");
  return {
    toplam: satirlar.length,
    buAy: satirlar.filter((s) => s.olusturma && s.olusturma.getTime() >= ayBasi).length,
    gecenAy: satirlar.filter(
      (s) => s.olusturma && s.olusturma.getTime() >= gecenAyBasi && s.olusturma.getTime() < ayBasi,
    ).length,
    devamEden: satirlar.filter((s) => s.durum === "Devam Ediyor").length,
    baslanmadi: satirlar.filter((s) => s.durum === "Başlanmadı").length,
    tamamlanan: satirlar.filter((s) => s.durum === "Tamamlandı").length,
    geciken: acik.filter((s) => s.kalanGun !== null && s.kalanGun < 0).length,
    buHafta: acik.filter((s) => s.kalanGun !== null && s.kalanGun >= 0 && s.kalanGun <= 7).length,
  };
}

// Open talepler with a target date, overdue first, then soonest.
export function yaklasanTeslimler(satirlar: TalepSatiri[], limit = 6): TalepSatiri[] {
  return satirlar
    .filter((s) => s.durum !== "Tamamlandı" && s.kalanGun !== null)
    .sort((a, b) => (a.kalanGun ?? 0) - (b.kalanGun ?? 0))
    .slice(0, limit);
}

export interface DevamEdilecek {
  satir: TalepSatiri;
  tapu: Tapu;
  eksik: EksikBolum;
}

// In-progress talepler (most complete first — closest to done) with the
// first empty section of their first unfinished tapu.
export function devamEdilecekler(satirlar: TalepSatiri[], limit = 4): DevamEdilecek[] {
  const sonuc: DevamEdilecek[] = [];
  const adaylar = satirlar
    .filter((s) => s.durum !== "Tamamlandı")
    .sort((a, b) => b.pct - a.pct || (b.olusturma?.getTime() ?? 0) - (a.olusturma?.getTime() ?? 0));
  for (const satir of adaylar) {
    for (const tapu of satir.talep.tapular) {
      const eksik = ilkEksikBolum(tapu);
      if (eksik) {
        sonuc.push({ satir, tapu, eksik });
        break;
      }
    }
    if (sonuc.length >= limit) break;
  }
  return sonuc;
}

export const RAPOR_DURUMLARI = ["Taslak", "İncelemede", "Onaylandı", "Teslim Edildi"] as const;

// Report status across every tapu (a talep can hold several reports).
export function raporDurumSayilari(talepler: Talep[]): { durum: string; adet: number }[] {
  const sayac = new Map<string, number>();
  for (const talep of talepler) {
    for (const tapu of talep.tapular) {
      const d = tapu.raporSonucu?.durum || "Belirtilmedi";
      sayac.set(d, (sayac.get(d) ?? 0) + 1);
    }
  }
  return [...RAPOR_DURUMLARI, "Belirtilmedi"].map((durum) => ({ durum, adet: sayac.get(durum) ?? 0 }));
}

export type Donem = "1m" | "3m" | "6m" | "12m" | "tum";
export const DONEM_ETIKETLERI: Record<Donem, string> = {
  "1m": "1 Ay",
  "3m": "3 Ay",
  "6m": "6 Ay",
  "12m": "12 Ay",
  tum: "Tümü",
};

export function donemdekiler(satirlar: TalepSatiri[], donem: Donem, simdi: Date): TalepSatiri[] {
  if (donem === "tum") return satirlar;
  const ay = { "1m": 1, "3m": 3, "6m": 6, "12m": 12 }[donem];
  const baslangic = new Date(simdi.getFullYear(), simdi.getMonth(), simdi.getDate());
  baslangic.setMonth(baslangic.getMonth() - ay);
  return satirlar.filter((s) => s.olusturma && s.olusturma >= baslangic);
}

// Talepler per month for the last `ay` months, oldest first (empty months included).
export function aylikTalepler(satirlar: TalepSatiri[], simdi: Date, ay = 12): { ay: string; adet: number }[] {
  const sonuc: { anahtar: string; ay: string; adet: number }[] = [];
  for (let i = ay - 1; i >= 0; i--) {
    const d = new Date(simdi.getFullYear(), simdi.getMonth() - i, 1);
    sonuc.push({
      anahtar: `${d.getFullYear()}-${d.getMonth()}`,
      ay: d.toLocaleDateString("tr-TR", { month: "short", year: "2-digit" }),
      adet: 0,
    });
  }
  const index = new Map(sonuc.map((s, i) => [s.anahtar, i]));
  for (const s of satirlar) {
    if (!s.olusturma) continue;
    const i = index.get(`${s.olusturma.getFullYear()}-${s.olusturma.getMonth()}`);
    if (i !== undefined) sonuc[i].adet += 1;
  }
  return sonuc.map(({ ay, adet }) => ({ ay, adet }));
}

// Counts by a talep field (niteliği, kurum…), largest first; blanks grouped.
export function dagilim(
  satirlar: TalepSatiri[],
  alan: (t: Talep) => string,
  bosEtiket = "Belirtilmedi",
  limit = 6,
): { ad: string; adet: number }[] {
  const sayac = new Map<string, number>();
  for (const s of satirlar) {
    const ad = alan(s.talep).trim() || bosEtiket;
    sayac.set(ad, (sayac.get(ad) ?? 0) + 1);
  }
  const sirali = [...sayac.entries()].map(([ad, adet]) => ({ ad, adet })).sort((a, b) => b.adet - a.adet);
  if (sirali.length <= limit) return sirali;
  const diger = sirali.slice(limit - 1).reduce((t, x) => t + x.adet, 0);
  return [...sirali.slice(0, limit - 1), { ad: "Diğer", adet: diger }];
}

// Change of this month vs last month as a whole percentage; null when there
// is no last-month base to compare against.
export function degisimYuzdesi(buAy: number, gecenAy: number): number | null {
  if (gecenAy === 0) return null;
  return Math.round(((buAy - gecenAy) / gecenAy) * 100);
}
