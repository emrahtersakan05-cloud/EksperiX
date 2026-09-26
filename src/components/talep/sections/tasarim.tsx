"use client";

import type { ReactNode } from "react";

// Shared look for the redesigned talep tabs (İmar Durumu, Talep Detayı, Tapu
// Kaydı, Proje İncelemeleri): a dark summary header with figure tiles, and
// icon-headed panels for grouping fields inside a form card.

export function OzetBasligi({
  etiket,
  ikon,
  baslik,
  altBaslik,
  bos = false,
  sag,
  children,
  alt,
}: {
  etiket: string;
  ikon: ReactNode;
  baslik: string;
  altBaslik?: string;
  // The title is a placeholder ("… girilmedi").
  bos?: boolean;
  sag?: ReactNode;
  children?: ReactNode;
  // Footer strip (status, progress).
  alt?: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl bg-slate-900 text-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-lime-300">
            {ikon}
            {etiket}
          </p>
          <h3 className={`mt-1 truncate text-lg font-semibold ${bos ? "text-slate-500" : "text-white"}`} title={baslik}>
            {baslik}
          </h3>
          {altBaslik && <p className="truncate text-xs text-slate-400">{altBaslik}</p>}
        </div>
        {sag && <div className="flex flex-wrap items-center gap-2">{sag}</div>}
      </div>
      {children && <div className="px-4 pb-4">{children}</div>}
      {alt && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-white/10 bg-white/[0.03] px-4 py-2.5 text-[11px] text-slate-400">
          {alt}
        </div>
      )}
    </section>
  );
}

// One figure in the dark header.
export function Ozet({
  etiket,
  deger,
  birim,
  ton,
}: {
  etiket: string;
  deger: string;
  birim?: string;
  ton?: "iyi" | "uyari" | "kotu";
}) {
  const renk = !deger
    ? "text-slate-600"
    : ton === "iyi"
      ? "text-emerald-300"
      : ton === "uyari"
        ? "text-amber-300"
        : ton === "kotu"
          ? "text-rose-300"
          : "text-white";
  return (
    <div className="min-w-0 rounded-lg bg-white/5 px-3 py-2 ring-1 ring-white/10">
      <p className="truncate text-[10px] font-medium uppercase tracking-wide text-slate-400">{etiket}</p>
      <p className={`truncate text-base font-semibold tabular-nums ${renk}`} title={deger}>
        {deger || "—"}
        {deger && birim ? <span className="ml-0.5 text-xs font-medium text-slate-400">{birim}</span> : null}
      </p>
    </div>
  );
}

export function OzetIzgarasi({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">{children}</div>;
}

// "15/20 alan dolu" with a thin bar, for the header footer.
export function Doluluk({ dolu, toplam }: { dolu: number; toplam: number }) {
  return (
    <>
      <span className="tabular-nums">
        {dolu}/{toplam} alan dolu
      </span>
      <span className="h-1 w-24 overflow-hidden rounded-full bg-white/10">
        <span className="block h-full rounded-full bg-lime-300" style={{ width: `${toplam ? (dolu / toplam) * 100 : 0}%` }} />
      </span>
    </>
  );
}

export function Panel({
  baslik,
  icon,
  sag,
  children,
  className = "",
}: {
  baslik: string;
  icon: ReactNode;
  sag?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`min-w-0 rounded-xl border border-slate-200 bg-slate-50/40 p-3.5 ${className}`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white text-slate-500 shadow-sm ring-1 ring-slate-200">
            {icon}
          </span>
          {baslik}
        </p>
        {sag}
      </div>
      {children}
    </div>
  );
}

// "2026-09-25" → "25.09.2026"
export function tarihYaz(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : iso;
}
