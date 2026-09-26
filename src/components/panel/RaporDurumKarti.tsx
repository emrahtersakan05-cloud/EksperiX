import Card from "@/components/card";

// Report stage of every tapu (a talep may carry several reports), as one
// stacked bar plus a labelled list — status is never shown by colour alone.
const RENK: Record<string, string> = {
  Taslak: "bg-slate-400",
  İncelemede: "bg-amber-400",
  Onaylandı: "bg-sky-500",
  "Teslim Edildi": "bg-emerald-500",
  Belirtilmedi: "bg-slate-200",
};

export default function RaporDurumKarti({ sayilar }: { sayilar: { durum: string; adet: number }[] }) {
  const toplam = sayilar.reduce((t, s) => t + s.adet, 0);
  return (
    <Card title="Rapor Durumları">
      {toplam === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">Henüz rapor yok.</p>
      ) : (
        <>
          <div className="flex h-3 overflow-hidden rounded-full bg-slate-100" role="img" aria-label="Rapor durumlarının dağılımı">
            {sayilar
              .filter((s) => s.adet > 0)
              .map((s) => (
                <span
                  key={s.durum}
                  className={`${RENK[s.durum]} h-full border-r-2 border-white last:border-r-0`}
                  style={{ width: `${(s.adet / toplam) * 100}%` }}
                  title={`${s.durum}: ${s.adet}`}
                />
              ))}
          </div>
          <ul className="mt-3 space-y-1.5">
            {sayilar.map((s) => (
              <li key={s.durum} className="flex items-center gap-2 text-sm">
                <span className={`h-2.5 w-2.5 rounded-full ${RENK[s.durum]}`} />
                <span className="flex-1 text-slate-600">{s.durum}</span>
                <span className="font-semibold tabular-nums text-slate-900">{s.adet}</span>
                <span className="w-10 text-right text-xs tabular-nums text-slate-400">
                  %{Math.round((s.adet / toplam) * 100)}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-slate-400">{toplam} tapu · Rapor Sonucu bölümündeki &quot;Durum&quot;a göre</p>
        </>
      )}
    </Card>
  );
}
