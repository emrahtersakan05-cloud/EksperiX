export type TimeRange = "1w" | "1m" | "3m" | "6m" | "12m";

export const timeRanges: TimeRange[] = ["1w", "1m", "3m", "6m", "12m"];

export const timeRangeLabels: Record<TimeRange, string> = {
  "1w": "1 Haftalık",
  "1m": "1 Aylık",
  "3m": "3 Aylık",
  "6m": "6 Aylık",
  "12m": "12 Aylık",
};

const rangeScale: Record<TimeRange, number> = {
  "1w": 1,
  "1m": 3,
  "3m": 7,
  "6m": 13,
  "12m": 24,
};

export interface ChartDatum {
  name: string;
  value: number;
}

// Deterministic pseudo-random hash so server and client render identical
// values (no Math.random — that would cause a hydration mismatch).
function hash(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0;
  }
  return h;
}

function buildSeries(categories: string[], range: TimeRange): ChartDatum[] {
  const scale = rangeScale[range];
  return categories.map((name) => {
    const base = (hash(`${name}-${range}`) % 40) + 10;
    return { name, value: base * scale };
  });
}

export const companies = ["Alfa Gayrimenkul", "Bera İnşaat", "Cevahir Yapı", "Doğuş Emlak", "Ege Konut"];
export const attributes = ["Konut", "İşyeri", "Arsa", "Tarla", "Depo"];
export const banks = ["Ziraat Bankası", "Garanti BBVA", "İş Bankası", "Akbank", "Yapı Kredi"];

export function getCompanySeries(range: TimeRange): ChartDatum[] {
  return buildSeries(companies, range);
}

export function getAttributeSeries(range: TimeRange): ChartDatum[] {
  return buildSeries(attributes, range);
}

export function getBankSeries(range: TimeRange): ChartDatum[] {
  return buildSeries(banks, range);
}

export type TalepDurum = "Beklemede" | "İnceleniyor" | "Tamamlandı" | "Reddedildi";

export interface Talep {
  id: string;
  talepNo: string;
  musteri: string;
  firma: string;
  nitelik: string;
  tarih: string;
  durum: TalepDurum;
}

const durumlar: TalepDurum[] = ["Beklemede", "İnceleniyor", "Tamamlandı", "Reddedildi"];
const musteriler = [
  "Ahmet Yılmaz", "Elif Demir", "Mehmet Kaya", "Zeynep Şahin", "Can Öztürk",
  "Ayşe Arslan", "Burak Çelik", "Deniz Aydın", "Fatma Yıldız", "Emre Koç",
];

export function getRecentTalepler(count = 10): Talep[] {
  return Array.from({ length: count }, (_, i) => {
    const n = i + 1;
    const dayOffset = hash(`talep-${n}`) % 30;
    const date = new Date(2026, 7, 10 - dayOffset);
    return {
      id: `T-${n}`,
      talepNo: `2026-${String(1000 + n)}`,
      musteri: musteriler[hash(`musteri-${n}`) % musteriler.length],
      firma: companies[hash(`firma-${n}`) % companies.length],
      nitelik: attributes[hash(`nitelik-${n}`) % attributes.length],
      tarih: date.toLocaleDateString("tr-TR"),
      durum: durumlar[hash(`durum-${n}`) % durumlar.length],
    };
  });
}

export interface TalepStats {
  total: number;
  pending: number;
  completedThisMonth: number;
  avgResolutionDays: number;
  totalDeltaPct: number;
  pendingDeltaPct: number;
  completedDeltaPct: number;
  avgDeltaPct: number;
}

export function getTalepStats(): TalepStats {
  const pool = getRecentTalepler(48);
  const total = pool.length;
  const pending = pool.filter((t) => t.durum === "Beklemede" || t.durum === "İnceleniyor").length;
  const completedThisMonth = pool.filter((t) => t.durum === "Tamamlandı").length;
  const avgResolutionDays = 3 + (hash("avg-resolution-days") % 5);
  return {
    total,
    pending,
    completedThisMonth,
    avgResolutionDays,
    totalDeltaPct: 8 + (hash("delta-total") % 10),
    pendingDeltaPct: -(2 + (hash("delta-pending") % 6)),
    completedDeltaPct: 5 + (hash("delta-completed") % 15),
    avgDeltaPct: -(1 + (hash("delta-avg") % 4)),
  };
}
