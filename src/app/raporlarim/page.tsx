"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, FileDown, FileText, Loader2, Search } from "lucide-react";
import Card from "@/components/card";
import { formatTrNumber } from "@/lib/emsal/hesaplama";
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
      .sort((a, b) => b.talep.olusturmaTarihi.localeCompare(a.talep.olusturmaTarihi));
  }, [tumu, durum, arama]);
  const toplamDeger = gorunen.reduce((t, s) => t + (s.deger ?? 0), 0);

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
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Raporlarım</h1>
        <p className="mt-1 text-sm text-slate-500">
          Tüm taleplerdeki değerleme raporları. Rapor durumu, talebin Rapor Sonucu bölümünden güncellenir.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {(["Taslak", "İncelemede", "Onaylandı", "Teslim Edildi", "Belirtilmedi"] as const).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDurum(durum === d ? "Tümü" : d)}
            aria-pressed={durum === d}
            className={`rounded-2xl border p-4 text-left transition-colors ${
              durum === d ? "border-slate-900 bg-slate-900 text-white" : "border-slate-100 bg-white hover:border-slate-200"
            }`}
          >
            <p className={`text-2xl font-semibold tabular-nums ${durum === d ? "text-lime-300" : "text-slate-900"}`}>
              {sayilar.get(d) ?? 0}
            </p>
            <p className={`mt-0.5 text-xs ${durum === d ? "text-slate-300" : "text-slate-500"}`}>{d}</p>
          </button>
        ))}
      </div>

      <Card>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={arama}
              onChange={(e) => setArama(e.target.value)}
              placeholder="Talep no, müşteri, rapor no, kurum…"
              className="w-full rounded-full border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </div>
          <p className="text-xs text-slate-500">
            {gorunen.length} rapor{durum !== "Tümü" ? ` · ${durum}` : ""}
            {toplamDeger > 0 && ` · toplam ${formatTrNumber(toplamDeger)} ₺`}
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
