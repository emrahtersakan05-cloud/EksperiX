import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { TrendingDown, TrendingUp } from "lucide-react";

export default function StatCard({
  label,
  value,
  deltaPct,
  deltaIyi = "artis",
  hint,
  href,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  // Real change vs a previous period; omitted when there is nothing to compare.
  deltaPct?: number | null;
  // Whether a rise is good news ("artis") or bad news ("azalis", e.g. overdue items).
  deltaIyi?: "artis" | "azalis";
  hint?: string;
  href?: string;
  icon: LucideIcon;
  accent: "blue" | "amber" | "emerald" | "violet" | "rose";
}) {
  const accents: Record<typeof accent, string> = {
    blue: "bg-blue-50 text-blue-600 ring-blue-100",
    amber: "bg-amber-50 text-amber-600 ring-amber-100",
    emerald: "bg-emerald-50 text-emerald-600 ring-emerald-100",
    violet: "bg-violet-50 text-violet-600 ring-violet-100",
    rose: "bg-rose-50 text-rose-600 ring-rose-100",
  };
  const bars: Record<typeof accent, string> = {
    blue: "bg-blue-500",
    amber: "bg-amber-500",
    emerald: "bg-emerald-500",
    violet: "bg-violet-500",
    rose: "bg-rose-500",
  };
  const artis = (deltaPct ?? 0) >= 0;
  const iyi = deltaIyi === "artis" ? artis : !artis;

  const icerik = (
    <>
      <span className={`absolute inset-x-0 top-0 h-1 ${bars[accent]}`} />
      <div className="flex items-center justify-between">
        <span className={`flex h-11 w-11 items-center justify-center rounded-xl ring-4 ${accents[accent]}`}>
          <Icon className="h-5 w-5" />
        </span>
        {deltaPct != null && (
          <span
            className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
              iyi ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
            }`}
            title="Geçen aya göre"
          >
            {artis ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(deltaPct)}%
          </span>
        )}
      </div>
      <p className="mt-4 text-3xl font-semibold tracking-tight tabular-nums text-slate-900">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{label}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
    </>
  );

  const sinif =
    "group relative block overflow-hidden rounded-2xl border border-slate-100 bg-white/90 p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)] backdrop-blur-sm transition-shadow duration-200 hover:shadow-[0_1px_2px_rgba(15,23,42,0.04),0_16px_32px_-12px_rgba(15,23,42,0.12)]";

  return href ? (
    <Link href={href} className={sinif}>
      {icerik}
    </Link>
  ) : (
    <div className={sinif}>{icerik}</div>
  );
}
