"use client";

import type { ReactNode } from "react";
import type { EvetHayirSecimi } from "@/lib/talep/types";

// Small, quiet form pieces for the konut Ana Gayrimenkul cards.

export const girdi =
  "h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none";

export function Etiket({ children }: { children: ReactNode }) {
  return <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-slate-400">{children}</p>;
}

export function Hap({
  aktif,
  onClick,
  children,
  disabled,
  title,
}: {
  aktif: boolean;
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={aktif}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`h-7 min-w-7 rounded-full border px-2.5 text-[11px] font-semibold transition-colors disabled:cursor-not-allowed ${
        aktif
          ? "border-slate-900 bg-slate-900 text-white"
          : disabled
            ? "border-slate-100 bg-slate-50 text-slate-300"
            : "border-slate-200 bg-white text-slate-600 hover:border-slate-400"
      }`}
    >
      {children}
    </button>
  );
}

// Segmented single choice; clicking the chosen option again clears it.
export function Segment<T extends string>({
  secenekler,
  deger,
  onChange,
  etiket,
}: {
  secenekler: readonly { value: T; label: string }[];
  deger: T | "";
  onChange: (v: T | "") => void;
  etiket: string;
}) {
  return (
    <div className="inline-flex flex-wrap rounded-md bg-slate-100 p-0.5" role="radiogroup" aria-label={etiket}>
      {secenekler.map((o) => {
        const aktif = deger === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={aktif}
            onClick={() => onChange(aktif ? "" : o.value)}
            className={`rounded px-2.5 py-1 text-[11px] font-semibold transition-colors ${
              aktif ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export const EVET_HAYIR = [
  { value: "Evet", label: "Evet" },
  { value: "Hayır", label: "Hayır" },
] as const;

export const alan =
  "w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs leading-relaxed text-slate-800 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none";

// Evet/Hayır question whose note opens on one answer (`acan`, "Evet" by default).
export function EvetHayirAciklama({
  soru,
  deger,
  aciklama,
  yerTutucu,
  onChange,
  acan = "Evet",
}: {
  soru: string;
  deger: EvetHayirSecimi;
  aciklama: string;
  yerTutucu: string;
  onChange: (deger: EvetHayirSecimi, aciklama: string) => void;
  acan?: "Evet" | "Hayır";
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium text-slate-700">{soru}</p>
        <Segment secenekler={EVET_HAYIR} deger={deger} onChange={(v) => onChange(v, v === acan ? aciklama : "")} etiket={soru} />
      </div>
      {deger === acan && (
        <textarea
          value={aciklama}
          onChange={(e) => onChange(deger, e.target.value)}
          rows={3}
          placeholder={yerTutucu}
          aria-label={soru}
          className={`${alan} resize-y`}
        />
      )}
    </div>
  );
}
