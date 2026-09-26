import Link from "next/link";
import { CalendarClock, CalendarPlus } from "lucide-react";
import Card from "@/components/card";
import type { TalepSatiri } from "@/lib/panel/ozet";

const ONCELIK_STILI: Record<string, string> = {
  Acil: "bg-rose-100 text-rose-700",
  Yüksek: "bg-amber-100 text-amber-800",
  Normal: "bg-slate-100 text-slate-600",
  Düşük: "bg-slate-50 text-slate-500",
};

function kalanMetni(gun: number): { metin: string; sinif: string } {
  if (gun < 0) return { metin: `${-gun} gün gecikti`, sinif: "bg-rose-600 text-white" };
  if (gun === 0) return { metin: "Bugün", sinif: "bg-amber-500 text-white" };
  if (gun === 1) return { metin: "Yarın", sinif: "bg-amber-100 text-amber-800" };
  if (gun <= 7) return { metin: `${gun} gün kaldı`, sinif: "bg-amber-50 text-amber-700" };
  return { metin: `${gun} gün kaldı`, sinif: "bg-slate-100 text-slate-600" };
}

// Open talepler ordered by their Hedef Teslim Tarihi (Talep Detayı).
export default function TeslimlerKarti({ satirlar, tarihsizAcik }: { satirlar: TalepSatiri[]; tarihsizAcik: number }) {
  return (
    <Card title="Yaklaşan Teslimler">
      {satirlar.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <CalendarPlus className="h-6 w-6 text-slate-300" />
          <p className="text-sm text-slate-500">Hedef teslim tarihi girilmiş açık talep yok.</p>
          <p className="text-xs text-slate-400">Talep Detayı&apos;nda &quot;Hedef Teslim Tarihi&quot; girildiğinde burada izlenir.</p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {satirlar.map((s) => {
            const kalan = kalanMetni(s.kalanGun ?? 0);
            return (
              <li key={s.talep.id}>
                <Link
                  href={`/taleplerim/${encodeURIComponent(s.talep.id)}?bolum=talepDetayi`}
                  className="flex items-center gap-3 rounded-lg px-1 py-2.5 hover:bg-slate-50"
                >
                  <CalendarClock className={`h-4 w-4 shrink-0 ${(s.kalanGun ?? 0) < 0 ? "text-rose-500" : "text-slate-400"}`} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-medium text-slate-900">{s.talep.talepNo}</span>
                      {s.oncelik && (
                        <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${ONCELIK_STILI[s.oncelik] ?? ONCELIK_STILI.Normal}`}>
                          {s.oncelik}
                        </span>
                      )}
                    </span>
                    <span className="block truncate text-xs text-slate-500">
                      {s.talep.musteriUnvani}
                      {s.eksper ? ` · ${s.eksper}` : ""} · %{s.pct}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${kalan.sinif}`}>{kalan.metin}</span>
                    <span className="mt-0.5 block text-[11px] tabular-nums text-slate-400">
                      {s.hedef?.toLocaleDateString("tr-TR")}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {tarihsizAcik > 0 && (
        <p className="mt-2 text-[11px] text-slate-400">
          {tarihsizAcik} açık talebin hedef teslim tarihi girilmemiş.
        </p>
      )}
    </Card>
  );
}
