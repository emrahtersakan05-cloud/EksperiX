"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Card from "@/components/card";
import {
  DONEM_ETIKETLERI,
  aylikTalepler,
  dagilim,
  donemdekiler,
  type Donem,
  type TalepSatiri,
} from "@/lib/panel/ozet";

// Single-series charts: one hue, no legend; ink stays in slate text tokens.
const SERI = "#2a78d6";
const GRID = "#eef2f6";
const EKSEN = "#e2e8f0";
const tick = { fontSize: 11, fill: "#64748b" };

function Ipucu({ baslik, adet }: { baslik: string; adet: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="font-semibold text-slate-900">{baslik}</p>
      <p className="text-slate-600">
        <span className="font-medium text-slate-900">{adet}</span> talep
      </p>
    </div>
  );
}

function Bos({ children }: { children: ReactNode }) {
  return <div className="flex h-full items-center justify-center text-xs text-slate-400">{children}</div>;
}

function YatayDagilim({ veri }: { veri: { ad: string; adet: number }[] }) {
  if (veri.length === 0) return <Bos>Bu dönemde talep yok.</Bos>;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={veri} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }} barCategoryGap={4}>
        <CartesianGrid horizontal={false} stroke={GRID} />
        <XAxis type="number" allowDecimals={false} tick={tick} tickLine={false} axisLine={{ stroke: EKSEN }} />
        <YAxis type="category" dataKey="ad" tick={tick} tickLine={false} axisLine={false} width={110} />
        <Tooltip
          cursor={{ fill: "#f1f5f9" }}
          content={({ active, payload }) => {
            const p = payload?.[0]?.payload as { ad: string; adet: number } | undefined;
            return active && p ? <Ipucu baslik={p.ad} adet={p.adet} /> : null;
          }}
        />
        <Bar dataKey="adet" fill={SERI} radius={[0, 4, 4, 0]} maxBarSize={18} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function PanelGrafikleri({ satirlar, simdi }: { satirlar: TalepSatiri[]; simdi: Date }) {
  const [donem, setDonem] = useState<Donem>("12m");
  const secili = useMemo(() => donemdekiler(satirlar, donem, simdi), [satirlar, donem, simdi]);
  const ayAdedi = { "1m": 2, "3m": 3, "6m": 6, "12m": 12, tum: 12 }[donem];
  const aylik = useMemo(() => aylikTalepler(satirlar, simdi, ayAdedi), [satirlar, simdi, ayAdedi]);
  const nitelik = useMemo(() => dagilim(secili, (t) => t.tasinmazNiteligi), [secili]);
  const kurum = useMemo(() => dagilim(secili, (t) => t.degerlemeKurumBanka, "Kurum girilmedi"), [secili]);

  const donemSecici = (
    <div className="inline-flex flex-wrap gap-0.5 rounded-full bg-slate-100 p-1">
      {(Object.keys(DONEM_ETIKETLERI) as Donem[]).map((d) => (
        <button
          key={d}
          type="button"
          onClick={() => setDonem(d)}
          className={`rounded-full px-2.5 py-1 text-xs font-medium transition-all ${
            donem === d ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          {DONEM_ETIKETLERI[d]}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-slate-900">Talep Analizi</h2>
        {donemSecici}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Aylık Talep Sayısı">
          <div className="h-60">
            {aylik.every((a) => a.adet === 0) ? (
              <Bos>Bu dönemde talep yok.</Bos>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={aylik} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barCategoryGap={4}>
                  <CartesianGrid vertical={false} stroke={GRID} />
                  <XAxis dataKey="ay" tick={tick} tickLine={false} axisLine={{ stroke: EKSEN }} interval="preserveStartEnd" />
                  <YAxis allowDecimals={false} tick={tick} tickLine={false} axisLine={false} />
                  <Tooltip
                    cursor={{ fill: "#f1f5f9" }}
                    content={({ active, payload }) => {
                      const p = payload?.[0]?.payload as { ay: string; adet: number } | undefined;
                      return active && p ? <Ipucu baslik={p.ay} adet={p.adet} /> : null;
                    }}
                  />
                  <Bar dataKey="adet" fill={SERI} radius={[4, 4, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
        <Card title="Taşınmaz Niteliği">
          <div className="h-60">
            <YatayDagilim veri={nitelik} />
          </div>
        </Card>
        <Card title="Kurum / Banka">
          <div className="h-60">
            <YatayDagilim veri={kurum} />
          </div>
        </Card>
      </div>
    </div>
  );
}
