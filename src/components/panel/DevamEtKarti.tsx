import Link from "next/link";
import { ArrowRight, CircleCheck, PlayCircle } from "lucide-react";
import Card from "@/components/card";
import { talepDurumDotStyles } from "@/lib/talep/completion";
import type { DevamEdilecek } from "@/lib/panel/ozet";

// In-progress talepler with a direct link to the first empty section.
export default function DevamEtKarti({ ogeler }: { ogeler: DevamEdilecek[] }) {
  return (
    <Card title="Kaldığın Yerden Devam Et">
      {ogeler.length === 0 ? (
        <div className="flex items-center gap-3 rounded-xl bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
          <CircleCheck className="h-5 w-5 shrink-0" />
          Açık iş yok — tüm talepler tamamlanmış ya da henüz talep oluşturulmamış.
        </div>
      ) : (
        <ul className="space-y-2">
          {ogeler.map(({ satir, tapu, eksik }) => {
            const cokTapu = satir.talep.tapular.length > 1;
            return (
              <li key={satir.talep.id}>
                <Link
                  href={`/taleplerim/${encodeURIComponent(satir.talep.id)}?bolum=${eksik.key}&tapu=${encodeURIComponent(tapu.id)}`}
                  className="group flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2.5 transition-colors hover:border-lime-300 hover:bg-lime-50/60"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-lime-300">
                    <PlayCircle className="h-4.5 w-4.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-slate-900">{satir.talep.talepNo}</span>
                      <span className="truncate text-xs text-slate-500">{satir.talep.musteriUnvani}</span>
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-slate-500">
                      Sıradaki: <strong className="font-medium text-slate-700">{eksik.label}</strong>
                      {cokTapu ? ` · ${tapu.ad}` : ""}
                    </span>
                    <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-slate-100">
                      <span
                        className={`block h-full rounded-full ${talepDurumDotStyles[satir.durum]}`}
                        style={{ width: `${satir.pct}%` }}
                      />
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-sm font-semibold tabular-nums text-slate-900">%{satir.pct}</span>
                    <ArrowRight className="ml-auto mt-0.5 h-3.5 w-3.5 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-600" />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
