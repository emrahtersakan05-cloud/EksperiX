"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ArrowUpDown,
  CheckCircle2,
  CircleDashed,
  FileDown,
  FilePen,
  FileSearch,
  FileText,
  FilterX,
  Loader2,
  Search,
  Send,
  X,
  type LucideIcon,
} from "lucide-react";
import Card from "@/components/card";
import { formatTrNumber, tamSayi } from "@/lib/emsal/hesaplama";
import { getTapuCompletion } from "@/lib/talep/completion";
import { oneCikanSonuc } from "@/lib/talep/deger-hesaplama";
import { exportReportAsDocx, exportReportAsPdf } from "@/lib/talep/report-export";
import { generateValuationReport } from "@/lib/talep/report";
import { listTalepler } from "@/lib/talep/service";
import type { Talep, Tapu } from "@/lib/talep/types";
import { normalizeLabel } from "@/lib/text/normalize-tr";

type DurumFiltresi = "Tümü" | "Taslak" | "İncelemede" | "Onaylandı" | "Teslim Edildi" | "Belirtilmedi";

const DURUM_STILI: Record<string, string> = {
  Taslak: "bg-slate-100 text-slate-700",
  İncelemede: "bg-amber-100 text-amber-800",
  Onaylandı: "bg-sky-100 text-sky-800",
  "Teslim Edildi": "bg-emerald-100 text-emerald-800",
  Belirtilmedi: "bg-slate-50 text-slate-400",
};

const DURUMLAR = ["Taslak", "İncelemede", "Onaylandı", "Teslim Edildi", "Belirtilmedi"] as const;

const DURUM_GORUNUM: Record<(typeof DURUMLAR)[number], { icon: LucideIcon; ikon: string; bar: string }> = {
  Taslak: { icon: FilePen, ikon: "bg-slate-100 text-slate-600", bar: "bg-slate-500" },
  İncelemede: { icon: FileSearch, ikon: "bg-amber-100 text-amber-700", bar: "bg-amber-400" },
  Onaylandı: { icon: CheckCircle2, ikon: "bg-sky-100 text-sky-700", bar: "bg-sky-500" },
  "Teslim Edildi": { icon: Send, ikon: "bg-emerald-100 text-emerald-700", bar: "bg-emerald-500" },
  Belirtilmedi: { icon: CircleDashed, ikon: "bg-slate-50 text-slate-400", bar: "bg-slate-300" },
};

type Siralama = "yeni" | "eski" | "deger" | "teslim";

const SIRALAMALAR: { value: Siralama; label: string }[] = [
  { value: "yeni", label: "Önce en yeni" },
  { value: "eski", label: "Önce en eski" },
  { value: "deger", label: "Değere göre (yüksek)" },
  { value: "teslim", label: "Teslim tarihine göre" },
];

function teslimTarihi(s: { tapu: Tapu }): string {
  return s.tapu.raporSonucu.teslimTarihi || s.tapu.talepDetayi.hedefTeslimTarihi || "";
}

function sirala(siralama: Siralama): (a: RaporSatiri, b: RaporSatiri) => number {
  switch (siralama) {
    case "eski":
      return (a, b) => a.talep.olusturmaTarihi.localeCompare(b.talep.olusturmaTarihi);
    case "deger":
      return (a, b) => (b.deger ?? -1) - (a.deger ?? -1);
    case "teslim":
      // Undated reports go last.
      return (a, b) => (teslimTarihi(a) || "9999").localeCompare(teslimTarihi(b) || "9999");
    default:
      return (a, b) => b.talep.olusturmaTarihi.localeCompare(a.talep.olusturmaTarihi);
  }
}

interface RaporSatiri {
  talep: Talep;
  tapu: Tapu;
  durum: string;
  deger: number | null;
  degerNotu: string;
  pct: number;
}

// The figure a report puts forward (same rule as the report text).
function raporDegeri(tapu: Tapu): { deger: number | null; not: string } {
  const s = oneCikanSonuc(tapu.degerleme.hesaplamalar);
  return { deger: s.deger, not: s.eksik === "esas-secilmedi" ? "Esas yöntem seçilmedi" : s.eksik ? "Hesaplanmadı" : "" };
}

function satirlar(talepler: Talep[]): RaporSatiri[] {
  return talepler.flatMap((talep) =>
    talep.tapular.map((tapu, i) => {
      const { deger, not } = raporDegeri(tapu);
      const c = getTapuCompletion(tapu, { excludeSharedSections: i > 0 });
      return {
        talep,
        tapu,
        durum: tapu.raporSonucu.durum || "Belirtilmedi",
        deger,
        degerNotu: not,
        pct: c.total ? Math.round((c.filled / c.total) * 100) : 0,
      };
    }),
  );
}

export default function RaporlarimPage() {
  const [talepler, setTalepler] = useState<Talep[] | null>(null);
  const [durum, setDurum] = useState<DurumFiltresi>("Tümü");
  const [arama, setArama] = useState("");
  const [siralama, setSiralama] = useState<Siralama>("yeni");
  const [indiriliyor, setIndiriliyor] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  useEffect(() => {
    listTalepler().then(setTalepler);
  }, []);

  const tumu = useMemo(() => (talepler ? satirlar(talepler) : []), [talepler]);
  const sayilar = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of tumu) m.set(s.durum, (m.get(s.durum) ?? 0) + 1);
    return m;
  }, [tumu]);
  const gorunen = useMemo(() => {
    const q = normalizeLabel(arama);
    return tumu
      .filter((s) => durum === "Tümü" || s.durum === durum)
      .filter(
        (s) =>
          !q ||
          normalizeLabel(
            [s.talep.talepNo, s.talep.musteriUnvani, s.tapu.ad, s.tapu.raporSonucu.raporNo, s.talep.degerlemeKurumBanka].join(" "),
          ).includes(q),
      )
      .sort(sirala(siralama));
  }, [tumu, durum, arama, siralama]);
  const toplamDeger = gorunen.reduce((t, s) => t + (s.deger ?? 0), 0);

  const ozet = useMemo(() => {
    if (tumu.length === 0) return null;
    const buAy = new Date().toISOString().slice(0, 7);
    return {
      degerli: tumu.filter((s) => s.deger !== null).length,
      portfoy: tumu.reduce((t, s) => t + (s.deger ?? 0), 0),
      buAyTeslim: tumu.filter((s) => s.tapu.raporSonucu.teslimTarihi.slice(0, 7) === buAy).length,
    };
  }, [tumu]);
  const filtreVar = durum !== "Tümü" || arama.trim() !== "";

  async function indir(s: RaporSatiri, tur: "docx" | "pdf") {
    const anahtar = `${s.tapu.id}:${tur}`;
    setIndiriliyor(anahtar);
    setHata(null);
    try {
      const rapor = generateValuationReport({ talep: s.talep, tapu: s.tapu, sharedRuhsat: s.talep.tapular[0]?.kurumIncelemeleri });
      await (tur === "docx" ? exportReportAsDocx(rapor) : exportReportAsPdf(rapor));
    } catch {
      setHata(`${s.talep.talepNo} raporu oluşturulamadı.`);
    } finally {
      setIndiriliyor(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)] sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-lime-200/40 blur-3xl" />
        <div className="relative flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-lime-300 shadow-[0_0_32px_-8px] shadow-lime-400/40">
            <FileText className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Raporlarım</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Tüm taleplerdeki değerleme raporları. Rapor durumu, talebin Rapor Sonucu bölümünden güncellenir.
            </p>
            {ozet && (
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">
                  <strong className="text-slate-900">{tumu.length}</strong> rapor ·{" "}
                  <strong className="text-slate-900">{ozet.degerli}</strong> değeri hesaplandı
                </span>
                {ozet.portfoy > 0 && (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">
                    Toplam değer <strong className="text-slate-900">{tamSayi(ozet.portfoy)} ₺</strong>
                  </span>
                )}
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700">
                  Bu ay teslim: <strong>{ozet.buAyTeslim}</strong>
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5" role="group" aria-label="Duruma göre filtrele">
        {DURUMLAR.map((d) => {
          const aktif = durum === d;
          const g = DURUM_GORUNUM[d];
          const Icon = g.icon;
          const adet = sayilar.get(d) ?? 0;
          const oran = tumu.length ? Math.round((adet / tumu.length) * 100) : 0;
          return (
            <button
              key={d}
              type="button"
              onClick={() => setDurum(aktif ? "Tümü" : d)}
              aria-pressed={aktif}
              className={`flex flex-col gap-3 rounded-2xl border bg-white p-4 text-left transition-all last:col-span-2 sm:last:col-span-1 ${
                aktif
                  ? "border-slate-900 shadow-[0_8px_24px_-12px_rgba(15,23,42,0.35)] ring-1 ring-slate-900"
                  : "border-slate-100 hover:-translate-y-0.5 hover:border-slate-200 hover:shadow-sm"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${g.ikon}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <span className="text-2xl font-semibold tabular-nums text-slate-900">{adet}</span>
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{d}</p>
                <p className="text-xs text-slate-500">%{oran}</p>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full rounded-full transition-all ${g.bar}`} style={{ width: `${oran}%` }} />
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-white p-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={arama}
            onChange={(e) => setArama(e.target.value)}
            placeholder="Talep no, müşteri, rapor no, kurum…"
            aria-label="Rapor ara"
            className="w-full rounded-xl border-0 bg-slate-50 py-2.5 pl-10 pr-9 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-lime-200 [&::-webkit-search-cancel-button]:hidden"
          />
          {arama && (
            <button
              type="button"
              onClick={() => setArama("")}
              aria-label="Aramayı temizle"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <label className="relative flex items-center">
          <ArrowUpDown className="pointer-events-none absolute left-3.5 h-4 w-4 text-slate-400" />
          <span className="sr-only">Sırala</span>
          <select
            value={siralama}
            onChange={(e) => setSiralama(e.target.value as Siralama)}
            className="w-full cursor-pointer rounded-xl border-0 bg-slate-50 py-2.5 pl-10 pr-8 text-sm font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-lime-200 sm:w-auto"
          >
            {SIRALAMALAR.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        {filtreVar && (
          <button
            type="button"
            onClick={() => {
              setArama("");
              setDurum("Tümü");
            }}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <FilterX className="h-4 w-4" />
            Temizle
          </button>
        )}
      </div>

      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate-500">
            <strong className="text-slate-900">{gorunen.length}</strong> rapor{durum !== "Tümü" ? ` · ${durum}` : ""}
            {toplamDeger > 0 && (
              <>
                {" "}
                · toplam <strong className="text-slate-900">{tamSayi(toplamDeger)} ₺</strong>
              </>
            )}
          </p>
          {hata && <p className="text-xs font-medium text-rose-600">{hata}</p>}
        </div>

        {talepler === null ? (
          <div className="space-y-2 py-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : gorunen.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <FileText className="h-7 w-7 text-slate-300" />
            <p className="text-sm text-slate-500">
              {tumu.length === 0 ? "Henüz talep yok; raporlar talepler oluştukça burada listelenir." : "Bu filtreye uyan rapor yok."}
            </p>
          </div>
        ) : (
          <div className="-mx-4 overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="text-[11px] uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="py-2 pl-4 pr-3 font-medium">Talep / Tapu</th>
                  <th className="py-2 pr-3 font-medium">Müşteri</th>
                  <th className="py-2 pr-3 font-medium">Rapor No</th>
                  <th className="py-2 pr-3 font-medium">Durum</th>
                  <th className="py-2 pr-3 text-right font-medium">Değer</th>
                  <th className="py-2 pr-3 font-medium">Teslim</th>
                  <th className="py-2 pr-4 text-right font-medium">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {gorunen.map((s) => (
                  <tr key={s.tapu.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 pl-4 pr-3">
                      <p className="font-medium text-slate-900">{s.talep.talepNo}</p>
                      <p className="text-xs text-slate-400">
                        {s.tapu.ad} · %{s.pct} dolu
                      </p>
                    </td>
                    <td className="max-w-[200px] truncate py-2.5 pr-3 text-slate-600">{s.talep.musteriUnvani}</td>
                    <td className="py-2.5 pr-3 tabular-nums text-slate-600">
                      {s.tapu.raporSonucu.raporNo || "—"}
                      {s.tapu.raporSonucu.versiyon && s.tapu.raporSonucu.raporNo ? (
                        <span className="text-xs text-slate-400"> · v{s.tapu.raporSonucu.versiyon}</span>
                      ) : null}
                    </td>
                    <td className="py-2.5 pr-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${DURUM_STILI[s.durum] ?? DURUM_STILI.Belirtilmedi}`}>
                        {s.durum}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">
                      {s.deger === null ? (
                        <span className="text-xs text-slate-400">{s.degerNotu}</span>
                      ) : (
                        <span className="font-semibold text-slate-900">{formatTrNumber(s.deger)} ₺</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-3 text-xs tabular-nums text-slate-500">
                      {s.tapu.raporSonucu.teslimTarihi
                        ? new Date(s.tapu.raporSonucu.teslimTarihi).toLocaleDateString("tr-TR")
                        : s.tapu.talepDetayi.hedefTeslimTarihi
                          ? `Hedef ${new Date(s.tapu.talepDetayi.hedefTeslimTarihi).toLocaleDateString("tr-TR")}`
                          : "—"}
                    </td>
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center justify-end gap-1">
                        {(["docx", "pdf"] as const).map((tur) => (
                          <button
                            key={tur}
                            type="button"
                            onClick={() => indir(s, tur)}
                            disabled={indiriliyor !== null}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                            title={tur === "docx" ? "Word olarak indir" : "PDF olarak indir"}
                          >
                            {indiriliyor === `${s.tapu.id}:${tur}` ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <FileDown className="h-3 w-3" />
                            )}
                            {tur === "docx" ? "Word" : "PDF"}
                          </button>
                        ))}
                        <Link
                          href={`/taleplerim/${encodeURIComponent(s.talep.id)}?bolum=raporSonucu&tapu=${encodeURIComponent(s.tapu.id)}`}
                          className="inline-flex items-center gap-0.5 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                          title="Rapor Sonucu bölümünü aç"
                        >
                          Aç
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
