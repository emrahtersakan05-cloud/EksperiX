"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Card from "@/components/card";
import type { TalepSatiri } from "@/lib/panel/ozet";

const GUNLER = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const GUNDE_EN_COK = 2;

function anahtar(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function renk(s: TalepSatiri): string {
  if (s.durum === "Tamamlandı") return "bg-emerald-100 text-emerald-800";
  if ((s.kalanGun ?? 0) < 0) return "bg-rose-100 text-rose-700";
  return "bg-amber-100 text-amber-800";
}

// Month view of Hedef Teslim Tarihleri (Talep Detayı), Monday-first.
export default function TeslimTakvimi({ satirlar, simdi }: { satirlar: TalepSatiri[]; simdi: Date }) {
  const [kayma, setKayma] = useState(0);
  const ay = new Date(simdi.getFullYear(), simdi.getMonth() + kayma, 1);

  const gunlereGore = useMemo(() => {
    const harita = new Map<string, TalepSatiri[]>();
    for (const s of satirlar) {
      if (!s.hedef) continue;
      const k = anahtar(s.hedef);
      harita.set(k, [...(harita.get(k) ?? []), s]);
    }
    return harita;
  }, [satirlar]);

  // 6 weeks from the Monday on/before the 1st.
  const ilk = new Date(ay);
  ilk.setDate(1 - ((ay.getDay() + 6) % 7));
  const hucreler = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(ilk);
    d.setDate(ilk.getDate() + i);
    return d;
  });
  // Drop a trailing week that belongs entirely to the next month.
  const gorunen = hucreler[35].getMonth() !== ay.getMonth() ? hucreler.slice(0, 35) : hucreler;
  const bugun = anahtar(simdi);
  const buAydaki = satirlar.filter((s) => s.hedef && s.hedef.getMonth() === ay.getMonth() && s.hedef.getFullYear() === ay.getFullYear()).length;

  return (
    <Card
      title="Teslim Takvimi"
      action={
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setKayma((k) => k - 1)}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            aria-label="Önceki ay"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setKayma(0)}
            className="min-w-[7.5rem] rounded-lg px-2 py-1 text-sm font-medium text-slate-700 hover:bg-slate-100"
            title="Bu aya dön"
          >
            {ay.toLocaleDateString("tr-TR", { month: "long", year: "numeric" })}
          </button>
          <button
            type="button"
            onClick={() => setKayma((k) => k + 1)}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            aria-label="Sonraki ay"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {GUNLER.map((g) => (
          <div key={g} className="py-1">
            {g}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {gorunen.map((d) => {
          const k = anahtar(d);
          const oAy = d.getMonth() === ay.getMonth();
          const teslimler = gunlereGore.get(k) ?? [];
          const bugunMu = k === bugun;
          return (
            <div
              key={k}
              className={`min-h-[4.25rem] rounded-lg border p-1 text-left ${
                bugunMu ? "border-lime-400 bg-lime-50" : oAy ? "border-slate-100 bg-white" : "border-transparent bg-slate-50/60"
              }`}
            >
              <p
                className={`text-[11px] font-medium tabular-nums ${
                  bugunMu ? "text-lime-800" : oAy ? "text-slate-600" : "text-slate-300"
                }`}
              >
                {d.getDate()}
              </p>
              <div className="mt-0.5 space-y-0.5">
                {teslimler.slice(0, GUNDE_EN_COK).map((s) => (
                  <Link
                    key={s.talep.id}
                    href={`/taleplerim/${encodeURIComponent(s.talep.id)}?bolum=talepDetayi`}
                    title={`${s.talep.talepNo} · ${s.talep.musteriUnvani} · %${s.pct}`}
                    className={`block truncate rounded px-1 py-0.5 text-[10px] font-medium leading-tight hover:ring-1 hover:ring-slate-300 ${renk(s)}`}
                  >
                    {s.talep.talepNo}
                  </Link>
                ))}
                {teslimler.length > GUNDE_EN_COK && (
                  <p className="px-1 text-[10px] text-slate-400">+{teslimler.length - GUNDE_EN_COK} daha</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
        <span>{buAydaki} teslim</span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm bg-rose-300" /> Gecikmiş
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm bg-amber-300" /> Açık
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm bg-emerald-300" /> Tamamlandı
        </span>
      </div>
    </Card>
  );
}
