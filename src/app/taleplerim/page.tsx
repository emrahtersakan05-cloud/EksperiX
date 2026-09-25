"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ClipboardList, FilterX, Search, X } from "lucide-react";
import Card from "@/components/card";
import TalepTable from "@/components/talep/TalepTable";
import YeniTalepButton from "@/components/talep/YeniTalepButton";
import TalepYedekleme from "@/components/talep/TalepYedekleme";
import { inputClass } from "@/components/talep/form-fields";
import { getTalepCompletion, getTalepDurum, type TalepDurum } from "@/lib/talep/completion";
import { listTalepler } from "@/lib/talep/service";
import type { Talep } from "@/lib/talep/types";
import { normalizeLabel } from "@/lib/text/normalize-tr";

const PAGE_SIZE = 10;

type DurumFilter = "Tümü" | TalepDurum;
type SortKey = "yeni" | "eski" | "ilerleme" | "musteri" | "talepNo";

const durumFilters: DurumFilter[] = ["Tümü", "Başlanmadı", "Devam Ediyor", "Tamamlandı"];

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

  const hasActiveFilter = query.trim() !== "" || durumFilter !== "Tümü";

  function clearFilters() {
    setQuery("");
    setDurumFilter("Tümü");
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Taleplerim</h1>
          <p className="mt-1 text-sm text-slate-500">
            Tüm değerleme taleplerinizi buradan görüntüleyip yönetebilirsiniz.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TalepYedekleme onYuklendi={reload} />
          <YeniTalepButton />
        </div>
      </div>

      {talepler !== null && talepler.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full max-w-sm">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Talep no, müşteri, firma, banka veya nitelik ara..."
                aria-label="Talep ara"
                className={`${inputClass} rounded-full pl-9 pr-9 [&::-webkit-search-cancel-button]:hidden`}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setPage(1);
                  }}
                  aria-label="Aramayı temizle"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <label className="ml-auto flex items-center gap-2 text-sm text-slate-500">
              Sırala
              <select
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value as SortKey);
                  setPage(1);
                }}
                className={`${inputClass} w-auto rounded-full py-1.5`}
              >
                {sortOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex flex-wrap gap-2" role="group" aria-label="Duruma göre filtrele">
            {durumFilters.map((d) => {
              const active = durumFilter === d;
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setDurumFilter(d);
                    setPage(1);
                  }}
                  className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                    active
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
                  }`}
                >
                  {d}
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs tabular-nums ${
                      active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {counts[d]}
                  </span>
                </button>
              );
            })}
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
