"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlarmClock,
  ArrowUpDown,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDashed,
  ClipboardList,
  FilterX,
  Layers,
  Loader,
  Search,
  X,
  type LucideIcon,
} from "lucide-react";
import Card from "@/components/card";
import TalepTable from "@/components/talep/TalepTable";
import YeniTalepButton from "@/components/talep/YeniTalepButton";
import TalepYedekleme from "@/components/talep/TalepYedekleme";
import { getTalepCompletion, getTalepDurum, type TalepDurum } from "@/lib/talep/completion";
import { listTalepler } from "@/lib/talep/service";
import type { Talep } from "@/lib/talep/types";
import { normalizeLabel } from "@/lib/text/normalize-tr";

const PAGE_SIZE = 10;

type DurumFilter = "Tümü" | TalepDurum;
type SortKey = "yeni" | "eski" | "ilerleme" | "musteri" | "talepNo";

const durumFilters: DurumFilter[] = ["Tümü", "Başlanmadı", "Devam Ediyor", "Tamamlandı"];

const DURUM_GORUNUM: Record<DurumFilter, { icon: LucideIcon; ikon: string; bar: string; aciklama: string }> = {
  Tümü: { icon: Layers, ikon: "bg-slate-900 text-lime-300", bar: "bg-slate-900", aciklama: "Tüm talepler" },
  Başlanmadı: { icon: CircleDashed, ikon: "bg-slate-100 text-slate-500", bar: "bg-slate-400", aciklama: "Veri girilmedi" },
  "Devam Ediyor": { icon: Loader, ikon: "bg-amber-100 text-amber-700", bar: "bg-amber-400", aciklama: "Doldurulmakta" },
  Tamamlandı: { icon: CheckCircle2, ikon: "bg-emerald-100 text-emerald-700", bar: "bg-emerald-500", aciklama: "Eksiksiz" },
};

// A talep is late when any tapu's target date has passed before delivery.
function gecikmisMi(talep: Talep, bugun: string): boolean {
  return talep.tapular.some(
    (t) =>
      t.talepDetayi.hedefTeslimTarihi !== "" &&
      t.talepDetayi.hedefTeslimTarihi < bugun &&
      t.raporSonucu.durum !== "Teslim Edildi",
  );
}

const sortOptions: { value: SortKey; label: string }[] = [
  { value: "yeni", label: "Önce en yeni" },
  { value: "eski", label: "Önce en eski" },
  { value: "ilerleme", label: "Tamamlanma oranı" },
  { value: "musteri", label: "Müşteri unvanı (A-Z)" },
  { value: "talepNo", label: "Talep no" },
];

interface Row {
  talep: Talep;
  durum: TalepDurum;
  pct: number;
}

function compareRows(sort: SortKey): (a: Row, b: Row) => number {
  switch (sort) {
    case "eski":
      return (a, b) => a.talep.olusturmaTarihi.localeCompare(b.talep.olusturmaTarihi);
    case "ilerleme":
      return (a, b) => b.pct - a.pct;
    case "musteri":
      return (a, b) => a.talep.musteriUnvani.localeCompare(b.talep.musteriUnvani, "tr-TR");
    case "talepNo":
      return (a, b) => a.talep.talepNo.localeCompare(b.talep.talepNo, "tr-TR", { numeric: true });
    default:
      return (a, b) => b.talep.olusturmaTarihi.localeCompare(a.talep.olusturmaTarihi);
  }
}

export default function TaleplerimPage() {
  const [talepler, setTalepler] = useState<Talep[] | null>(null);
  const [query, setQuery] = useState("");
  const [durumFilter, setDurumFilter] = useState<DurumFilter>("Tümü");
  const [sort, setSort] = useState<SortKey>("yeni");
  const [page, setPage] = useState(1);

  function reload() {
    listTalepler().then(setTalepler);
  }

  useEffect(() => {
    reload();
  }, []);

  const rows = useMemo<Row[] | null>(() => {
    if (!talepler) return null;
    return talepler.map((talep) => {
      const { pct } = getTalepCompletion(talep);
      return { talep, pct, durum: getTalepDurum(pct) };
    });
  }, [talepler]);

  const searched = useMemo(() => {
    if (!rows) return null;
    const q = normalizeLabel(query);
    if (!q) return rows;
    return rows.filter(({ talep }) =>
      [
        talep.talepNo,
        talep.musteriUnvani,
        talep.degerlemeFirmasi,
        talep.degerlemeKurumBanka,
        talep.tasinmazNiteligi,
        ...talep.tapular.flatMap((t) => [
          t.talepDetayi.atananEksper,
          t.tapuKaydi.il,
          t.tapuKaydi.ilce,
          t.tapuKaydi.mahalleKoyAdi,
          t.adresKonum.il,
          t.adresKonum.ilce,
          t.adresKonum.mahalle,
          t.tapuKaydi.ada && `${t.tapuKaydi.ada}/${t.tapuKaydi.parsel}`,
        ]),
      ].some((field) => normalizeLabel(field ?? "").includes(q)),
    );
  }, [rows, query]);

  const counts = useMemo(() => {
    const base: Record<DurumFilter, number> = {
      Tümü: searched?.length ?? 0,
      Başlanmadı: 0,
      "Devam Ediyor": 0,
      Tamamlandı: 0,
    };
    searched?.forEach((row) => {
      base[row.durum] += 1;
    });
    return base;
  }, [searched]);

  const filtered = useMemo(() => {
    if (!searched) return null;
    const byDurum = durumFilter === "Tümü" ? searched : searched.filter((r) => r.durum === durumFilter);
    return [...byDurum].sort(compareRows(sort));
  }, [searched, durumFilter, sort]);

  const total = filtered?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageRows = filtered?.slice(pageStart, pageStart + PAGE_SIZE) ?? [];

  const ozet = useMemo(() => {
    if (!rows || rows.length === 0) return null;
    const simdi = new Date();
    const bugun = `${simdi.getFullYear()}-${String(simdi.getMonth() + 1).padStart(2, "0")}-${String(simdi.getDate()).padStart(2, "0")}`;
    const buAy = bugun.slice(0, 7);
    return {
      ortalama: Math.round(rows.reduce((t, r) => t + r.pct, 0) / rows.length),
      buAy: rows.filter((r) => r.talep.olusturmaTarihi.slice(0, 7) === buAy).length,
      geciken: rows.filter((r) => gecikmisMi(r.talep, bugun)).length,
    };
  }, [rows]);

  const hasActiveFilter = query.trim() !== "" || durumFilter !== "Tümü";

  function clearFilters() {
    setQuery("");
    setDurumFilter("Tümü");
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)] sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-lime-200/40 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-lime-300 shadow-[0_0_32px_-8px] shadow-lime-400/40">
              <ClipboardList className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Taleplerim</h1>
              <p className="mt-0.5 text-sm text-slate-500">
                Tüm değerleme taleplerinizi buradan görüntüleyip yönetebilirsiniz.
              </p>
              {ozet && (
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">
                    Bu ay <strong className="text-slate-900">{ozet.buAy}</strong> yeni talep
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">
                    Ortalama doluluk <strong className="text-slate-900">%{ozet.ortalama}</strong>
                  </span>
                  {ozet.geciken > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 font-medium text-rose-700">
                      <AlarmClock className="h-3.5 w-3.5" />
                      Teslim tarihi geçen: {ozet.geciken}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:shrink-0 lg:flex-nowrap">
            <TalepYedekleme onYuklendi={reload} />
            <YeniTalepButton />
          </div>
        </div>
      </div>

      {talepler !== null && talepler.length > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" role="group" aria-label="Duruma göre filtrele">
            {durumFilters.map((d) => {
              const active = durumFilter === d;
              const g = DURUM_GORUNUM[d];
              const Icon = g.icon;
              const oran = counts.Tümü ? Math.round((counts[d] / counts.Tümü) * 100) : 0;
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setDurumFilter(d);
                    setPage(1);
                  }}
                  className={`flex flex-col gap-3 rounded-2xl border bg-white p-4 text-left transition-all ${
                    active
                      ? "border-slate-900 shadow-[0_8px_24px_-12px_rgba(15,23,42,0.35)] ring-1 ring-slate-900"
                      : "border-slate-100 hover:-translate-y-0.5 hover:border-slate-200 hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${g.ikon}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="text-2xl font-semibold tabular-nums text-slate-900">{counts[d]}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{d}</p>
                    <p className="truncate text-xs text-slate-500">
                      {d === "Tümü" ? g.aciklama : `%${oran} · ${g.aciklama}`}
                    </p>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full transition-all ${g.bar}`}
                      style={{ width: `${d === "Tümü" ? (counts.Tümü ? 100 : 0) : oran}%` }}
                    />
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
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Talep no, müşteri, banka, ada/parsel, il, eksper ara..."
                aria-label="Talep ara"
                className="w-full rounded-xl border-0 bg-slate-50 py-2.5 pl-10 pr-9 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-lime-200 [&::-webkit-search-cancel-button]:hidden"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setPage(1);
                  }}
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
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value as SortKey);
                  setPage(1);
                }}
                className="w-full cursor-pointer rounded-xl border-0 bg-slate-50 py-2.5 pl-10 pr-8 text-sm font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-lime-200 sm:w-auto"
              >
                {sortOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>

            {hasActiveFilter && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              >
                <FilterX className="h-4 w-4" />
                Temizle
              </button>
            )}
          </div>
        </div>
      )}

      <Card>
        {talepler === null ? (
          <div className="space-y-3 py-2" aria-busy="true" aria-label="Talepler yükleniyor">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-11 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : talepler.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-lime-300">
              <ClipboardList className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold text-slate-800">Henüz talep oluşturmadınız</p>
            <p className="max-w-sm text-sm text-slate-500">
              İlk değerleme talebinizi başlatın; talepleriniz burada listelenecek, aranabilecek ve
              filtrelenebilecek.
            </p>
            <YeniTalepButton />
          </div>
        ) : total === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <FilterX className="h-5 w-5" />
            </div>
            <p className="text-sm font-semibold text-slate-800">Eşleşen talep bulunamadı</p>
            <p className="max-w-sm text-sm text-slate-500">
              {query.trim() ? <>&quot;{query.trim()}&quot; araması ve seçili filtrelerle</> : "Seçili filtrelerle"}{" "}
              eşleşen bir talep yok.
            </p>
            {hasActiveFilter && (
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-full border border-slate-200 px-4 py-1.5 text-sm font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50"
              >
                Filtreleri temizle
              </button>
            )}
          </div>
        ) : (
          <>
            <TalepTable talepler={pageRows.map((r) => r.talep)} onDeleted={reload} />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-50 pt-3 text-sm text-slate-500">
              <span>
                {total} talepten {pageStart + 1}&ndash;{Math.min(pageStart + PAGE_SIZE, total)} arası gösteriliyor
              </span>
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPage(safePage - 1)}
                    disabled={safePage === 1}
                    aria-label="Önceki sayfa"
                    className="rounded-full p-1.5 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="min-w-[4.5rem] text-center tabular-nums">
                    {safePage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage(safePage + 1)}
                    disabled={safePage === totalPages}
                    aria-label="Sonraki sayfa"
                    className="rounded-full p-1.5 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
