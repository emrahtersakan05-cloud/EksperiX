"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Card from "@/components/card";
import {
  getAttributeSeries,
  getBankSeries,
  getCompanySeries,
  timeRangeLabels,
  timeRanges,
  type TimeRange,
} from "@/lib/mock-data";

export type ValuationMetric = "company" | "attribute" | "bank";

const seriesByMetric: Record<ValuationMetric, (range: TimeRange) => ReturnType<typeof getCompanySeries>> = {
  company: getCompanySeries,
  attribute: getAttributeSeries,
  bank: getBankSeries,
};

export default function ValuationChart({
  title,
  metric,
  color = "#2563eb",
}: {
  title: string;
  metric: ValuationMetric;
  color?: string;
}) {
  const [range, setRange] = useState<TimeRange>("1m");
  const data = useMemo(() => seriesByMetric[metric](range), [metric, range]);
  const total = useMemo(() => data.reduce((sum, d) => sum + d.value, 0), [data]);
  const gradientId = `chart-gradient-${metric}`;

  return (
    <Card
      title={title}
      action={
        <span className="whitespace-nowrap rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
          Toplam {total.toLocaleString("tr-TR")}
        </span>
      }
    >
      <div className="mb-4 inline-flex flex-wrap gap-0.5 rounded-full bg-slate-100 p-1">
        {timeRanges.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRange(r)}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition-all ${
              range === r
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {timeRangeLabels[r]}
          </button>
        ))}
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.95} />
                <stop offset="100%" stopColor={color} stopOpacity={0.5} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: "#64748b" }}
              tickLine={false}
              axisLine={{ stroke: "#e2e8f0" }}
              interval={0}
              angle={-15}
              textAnchor="end"
              height={50}
            />
            <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
            <Tooltip
              cursor={{ fill: "#f8fafc" }}
              contentStyle={{
                fontSize: 12,
                borderRadius: 12,
                border: "1px solid #f1f5f9",
                boxShadow: "0 8px 24px -8px rgba(15,23,42,0.15)",
              }}
            />
            <Bar dataKey="value" fill={`url(#${gradientId})`} radius={[6, 6, 0, 0]} name="Rapor Sayısı" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
