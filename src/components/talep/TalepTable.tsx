"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Trash2 } from "lucide-react";
import { EkipHucresi, KimlikHucresi, TasinmazHucresi } from "@/components/talep/liste/ListeHucreleri";
import SilmeOnayi from "@/components/talep/liste/SilmeOnayi";
import {
  getTalepCompletion,
  getTalepDurum,
  talepDurumBadgeStyles,
  talepDurumDotStyles,
  type TalepDurum,
} from "@/lib/talep/completion";
import { deleteTalep } from "@/lib/talep/service";
import type { Talep } from "@/lib/talep/types";

function DurumHucresi({ durum, pct }: { durum: TalepDurum; pct: number }) {
  return (
    <div className="space-y-2">
      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${talepDurumBadgeStyles[durum]}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${talepDurumDotStyles[durum]}`} />
        {durum}
      </span>
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
          <span className={`block h-full rounded-full ${talepDurumDotStyles[durum]}`} style={{ width: `${pct}%` }} />
        </span>
        <span className="text-xs font-medium tabular-nums text-slate-500">%{pct}</span>
      </div>
    </div>
  );
}

function Islemler({ talep, onSil }: { talep: Talep; onSil: () => void }) {
  return (
    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
      <Link
        href={`/taleplerim/${encodeURIComponent(talep.id)}`}
        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
      >
        Aç
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
      <button
        type="button"
        onClick={onSil}
        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
        aria-label={`${talep.talepNo} talebini sil`}
        title="Talebi sil"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function TalepTable({
  talepler,
  onDeleted,
}: {
  talepler: Talep[];
  onDeleted?: () => void;
}) {
  const router = useRouter();
  const [silinecek, setSilinecek] = useState<Talep | null>(null);

  const satirlar = talepler.map((talep, i) => {
    const { pct } = getTalepCompletion(talep);
    return { talep, pct, durum: getTalepDurum(pct), renk: i };
  });
  const ac = (t: Talep) => router.push(`/taleplerim/${encodeURIComponent(t.id)}`);

  return (
    <>
      {/* Masaüstü: tablo */}
      <div className="-mx-4 hidden overflow-x-auto md:block">
        <table className="w-full min-w-[900px] table-fixed text-left text-sm">
          <colgroup>
            <col className="w-[26%]" />
            <col className="w-[34%]" />
            <col className="w-[18%]" />
            <col className="w-[13%]" />
            <col className="w-[9%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-400">
              <th className="py-2.5 pl-4 pr-4 font-semibold">Talep / Kurum / Tarihler</th>
              <th className="py-2.5 pr-4 font-semibold">Müşteri / Taşınmaz</th>
              <th className="py-2.5 pr-4 font-semibold">Firma / Eksper</th>
              <th className="py-2.5 pr-4 font-semibold">Durum</th>
              <th className="py-2.5 pr-4 text-right font-semibold">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {satirlar.map(({ talep, pct, durum, renk }) => (
              <tr
                key={talep.id}
                onClick={() => ac(talep)}
                className="group cursor-pointer align-top transition-colors hover:bg-lime-50/40"
              >
                <td className="relative py-4 pl-4 pr-4">
                  <span className="absolute inset-y-3 left-0 w-0.5 rounded-full bg-lime-400 opacity-0 transition-opacity group-hover:opacity-100" />
                  <KimlikHucresi talep={talep} tapular={talep.tapular} />
                </td>
                <td className="py-4 pr-4">
                  <TasinmazHucresi talep={talep} tapular={talep.tapular} renkSirasi={renk} />
                </td>
                <td className="py-4 pr-4">
                  <EkipHucresi talep={talep} tapular={talep.tapular} />
                </td>
                <td className="py-4 pr-4">
                  <DurumHucresi durum={durum} pct={pct} />
                </td>
                <td className="py-4 pr-4">
                  <Islemler talep={talep} onSil={() => setSilinecek(talep)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobil: kartlar */}
      <ul className="space-y-3 md:hidden">
        {satirlar.map(({ talep, pct, durum, renk }) => (
          <li
            key={talep.id}
            onClick={() => ac(talep)}
            className="cursor-pointer space-y-3 rounded-2xl border border-slate-100 bg-white p-4 active:bg-slate-50"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <KimlikHucresi talep={talep} tapular={talep.tapular} />
              <DurumHucresi durum={durum} pct={pct} />
            </div>
            <TasinmazHucresi talep={talep} tapular={talep.tapular} renkSirasi={renk} />
            <div className="flex items-end justify-between gap-3 border-t border-slate-100 pt-3">
              <EkipHucresi talep={talep} tapular={talep.tapular} />
              <Islemler talep={talep} onSil={() => setSilinecek(talep)} />
            </div>
          </li>
        ))}
      </ul>

      {silinecek && (
        <SilmeOnayi
          baslik="Talebi sil"
          onayMetni={silinecek.talepNo}
          ozet={[
            { etiket: "Talep No", deger: silinecek.talepNo },
            { etiket: "Müşteri", deger: silinecek.musteriUnvani },
            { etiket: "Kurum / Banka", deger: silinecek.degerlemeKurumBanka },
            { etiket: "Tapu sayısı", deger: String(silinecek.tapular.length) },
          ]}
          uyari="Talep; tüm tapuları, emsalleri, değer hesaplamaları ve rapor bilgileriyle birlikte silinir. Emin değilseniz önce Yedek Al ile yedek alın."
          onVazgec={() => setSilinecek(null)}
          onSil={async () => {
            await deleteTalep(silinecek.id);
            setSilinecek(null);
            onDeleted?.();
          }}
        />
      )}
    </>
  );
}
