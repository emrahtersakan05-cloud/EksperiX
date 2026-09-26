import { konutMu } from "./konut";
import type { Talep, Tapu } from "./types";

function isFilled(value: unknown): boolean {
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "boolean") return value === true;
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === "object") return isSectionFilled(value);
  return false;
}

export function isSectionFilled(section: unknown): boolean {
  if (Array.isArray(section)) return section.length > 0;
  if (section && typeof section === "object") {
    return Object.entries(section as Record<string, unknown>).some(([key, value]) => {
      if (key === "id") return false;
      return isFilled(value);
    });
  }
  return false;
}

export function getTapuCompletion(tapu: Tapu, options?: { excludeSharedSections?: boolean }): { filled: number; total: number } {
  const sections = [
    tapu.talepDetayi,
    tapu.adresKonum,
    tapu.tapuKaydi,
    ...(options?.excludeSharedSections ? [] : [tapu.kurumIncelemeleri]),
    tapu.projeIncelemeleri,
    tapu.imarDurumu,
    // Land (tarla, bağ, bahçe) and konut fill the Ana Gayrimenkul tab with their own forms.
    tapu.talepDetayi.tasinmazNiteligi === "TARLA, BAĞ, BAHÇE VB."
      ? tapu.araziOzellikleri
      : konutMu(tapu.talepDetayi.tasinmazNiteligi)
        ? tapu.konutOzellikleri
        : tapu.anaGayrimenkul,
    tapu.bagimsizBolum,
    tapu.degerleme,
    tapu.emsaller,
    tapu.raporSonucu,
  ];
  return { filled: sections.filter(isSectionFilled).length, total: sections.length };
}

export function getTalepCompletion(talep: Talep): { filled: number; total: number; pct: number } {
  const totals = talep.tapular.reduce(
    (acc, tapu, index) => {
      const c = getTapuCompletion(tapu, { excludeSharedSections: index > 0 });
      return { filled: acc.filled + c.filled, total: acc.total + c.total };
    },
    { filled: 0, total: 0 },
  );
  const pct = totals.total === 0 ? 0 : Math.round((totals.filled / totals.total) * 100);
  return { ...totals, pct };
}

export type TalepDurum = "Başlanmadı" | "Devam Ediyor" | "Tamamlandı";

export function getTalepDurum(pct: number): TalepDurum {
  if (pct <= 0) return "Başlanmadı";
  if (pct >= 100) return "Tamamlandı";
  return "Devam Ediyor";
}

export const talepDurumBadgeStyles: Record<TalepDurum, string> = {
  "Başlanmadı": "bg-slate-100 text-slate-600",
  "Devam Ediyor": "bg-amber-50 text-amber-700",
  "Tamamlandı": "bg-emerald-50 text-emerald-700",
};

export const talepDurumDotStyles: Record<TalepDurum, string> = {
  "Başlanmadı": "bg-slate-400",
  "Devam Ediyor": "bg-amber-500",
  "Tamamlandı": "bg-emerald-500",
};
