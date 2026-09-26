"use client";

import { useState, type ReactNode } from "react";
import { Check, PencilLine, Trees, X } from "lucide-react";
import { Field, inputClass } from "@/components/talep/form-fields";
import { AkiciAlan, useAkiciAlan } from "@/components/akici-metin/baglam";

// Building blocks shared by the Ana Gayrimenkul variants (arazi, konut…).

export const YONLER = ["Kuzey", "Güney", "Doğu", "Batı", "Kuzeydoğu", "Kuzeybatı", "Güneybatı", "Güneydoğu"];

export function yeniId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `c-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// A fixed-choice select; a value saved earlier that is no longer in the list
// (custom entries from the old free-form picker) still shows up.
export function Secim({
  label,
  value,
  options,
  onChange,
  metinDegeri,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  // Value used in akıcı metin (e.g. the text typed for "Diğer").
  metinDegeri?: string;
}) {
  useAkiciAlan(label, metinDegeri ?? value);
  const liste = value && !options.includes(value) ? [value, ...options] : options;
  return (
    <Field label={label}>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={`${inputClass} appearance-none`}>
        <option value="">Seçiniz</option>
        {liste.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </Field>
  );
}

// "Diğer" picked → a text box to spell it out appears right below.
export function DigerliSecim({
  label,
  value,
  diger,
  options,
  onChange,
}: {
  label: string;
  value: string;
  diger: string;
  options: string[];
  onChange: (value: string, diger: string) => void;
}) {
  // Focus the text box only when the user has just picked "Diğer", not
  // when a saved "Diğer" is shown on load.
  const [yeniSecildi, setYeniSecildi] = useState(false);
  return (
    <div className="space-y-1.5">
      <Secim
        label={label}
        value={value}
        metinDegeri={value === "Diğer" && diger.trim() ? diger : value}
        options={options}
        onChange={(v) => {
          setYeniSecildi(v === "Diğer");
          onChange(v, v === "Diğer" ? diger : "");
        }}
      />
      {value === "Diğer" && (
        <div className="relative">
          <PencilLine className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-lime-600" />
          <input
            value={diger}
            onChange={(e) => onChange(value, e.target.value)}
            autoFocus={yeniSecildi}
            placeholder="Değeri yazınız"
            aria-label={`${label} (Diğer)`}
            className={`${inputClass} border-lime-300! bg-lime-50/60! pl-9 focus:border-lime-400!`}
          />
        </div>
      )}
    </div>
  );
}

// Compass positions (degrees clockwise from north) and short labels.
export const YON_ACILARI: Record<string, { aci: number; kisa: string }> = {
  Kuzey: { aci: 0, kisa: "K" },
  Kuzeydoğu: { aci: 45, kisa: "KD" },
  Doğu: { aci: 90, kisa: "D" },
  Güneydoğu: { aci: 135, kisa: "GD" },
  Güney: { aci: 180, kisa: "G" },
  Güneybatı: { aci: 225, kisa: "GB" },
  Batı: { aci: 270, kisa: "B" },
  Kuzeybatı: { aci: 315, kisa: "KB" },
};

// Eight-direction picker around a centre marker (the parcel, the building…);
// chosen sides get a stroke from the centre. Used for road frontage, block
// and building-entrance directions.
export function YonPusulasi({
  secili,
  onChange,
  etiket = "Kadastral yola cephe yönleri",
  merkez = "Parsel",
  merkezIcon,
}: {
  secili: string[];
  onChange: (v: string[]) => void;
  etiket?: string;
  merkez?: string;
  merkezIcon?: ReactNode;
}) {
  function degistir(y: string) {
    onChange(secili.includes(y) ? secili.filter((x) => x !== y) : YONLER.filter((x) => x === y || secili.includes(x)));
  }
  return (
    <div
      className="relative mx-auto aspect-square w-52 shrink-0 rounded-full border border-slate-200 bg-[radial-gradient(circle,white_45%,#f1f5f9_100%)]"
      role="group"
      aria-label={etiket}
    >
      <span className="pointer-events-none absolute inset-[22%] rounded-full border border-dashed border-slate-200" />
      {secili.map((y) => (
        <span
          key={`cizgi-${y}`}
          className="pointer-events-none absolute left-1/2 top-1/2 h-1.5 w-[30%] origin-left rounded-full bg-lime-400/70"
          style={{ transform: `rotate(${YON_ACILARI[y].aci - 90}deg)` }}
        />
      ))}
      <span className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-lg border-2 border-slate-900 bg-white text-center text-[10px] font-bold leading-tight text-slate-900 shadow-sm">
        {merkezIcon ?? <Trees className="mb-0.5 h-4 w-4 text-lime-600" />}
        {merkez}
      </span>
      {YONLER.map((y) => {
        const { aci, kisa } = YON_ACILARI[y];
        const aktif = secili.includes(y);
        const rad = (aci * Math.PI) / 180;
        return (
          <button
            key={y}
            type="button"
            aria-pressed={aktif}
            aria-label={y}
            title={y}
            onClick={() => degistir(y)}
            className={`absolute flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border text-xs font-bold transition-all ${
              aktif
                ? "border-slate-900 bg-slate-900 text-lime-300 shadow-md"
                : "border-slate-200 bg-white text-slate-500 hover:border-slate-400 hover:text-slate-900"
            }`}
            style={{ left: `${50 + 42 * Math.sin(rad)}%`, top: `${50 - 42 * Math.cos(rad)}%` }}
          >
            {kisa}
          </button>
        );
      })}
    </div>
  );
}

// Compass + the chosen directions as removable chips.
export function YonSecici({
  secili,
  onChange,
  etiket,
  merkez,
  merkezIcon,
  bosMetin,
  seciliBaslik,
}: {
  secili: string[];
  onChange: (v: string[]) => void;
  etiket?: string;
  merkez?: string;
  merkezIcon?: ReactNode;
  bosMetin: ReactNode;
  seciliBaslik: string;
}) {
  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
      <YonPusulasi secili={secili} onChange={onChange} etiket={etiket} merkez={merkez} merkezIcon={merkezIcon} />
      <div className="w-full min-w-0 flex-1 space-y-2">
        {secili.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 px-3 py-3 text-sm text-slate-500">{bosMetin}</p>
        ) : (
          <>
            <p className="text-xs font-medium text-slate-500">{seciliBaslik}</p>
            <div className="flex flex-wrap gap-1.5">
              {secili.map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => onChange(secili.filter((x) => x !== y))}
                  className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-lime-300 hover:bg-slate-700"
                  title={`${y} yönünü kaldır`}
                >
                  {y}
                  <X className="h-3 w-3" />
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Evet / Hayır segmented toggle; clicking the chosen side again clears it.
export function EvetHayir({
  value,
  onChange,
  etiket,
}: {
  value: "Evet" | "Hayır" | "";
  onChange: (v: "Evet" | "Hayır" | "") => void;
  etiket: string;
}) {
  return (
    <div className="inline-flex w-full max-w-xs rounded-xl bg-slate-100 p-1" role="radiogroup" aria-label={etiket}>
      {(["Evet", "Hayır"] as const).map((s) => (
        <button
          key={s}
          type="button"
          role="radio"
          aria-checked={value === s}
          onClick={() => onChange(value === s ? "" : s)}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
            value === s
              ? s === "Evet"
                ? "bg-slate-900 text-lime-300 shadow-sm"
                : "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          {s}
        </button>
      ))}
    </div>
  );
}

export function AltBaslik({ icon, baslik, aciklama, sag }: { icon: ReactNode; baslik: string; aciklama?: string; sag?: ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-[12rem] flex-1 items-start gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-lime-100 text-lime-800">{icon}</span>
        <div>
          <p className="text-sm font-semibold text-slate-900">{baslik}</p>
          {aciklama && <p className="text-xs text-slate-500">{aciklama}</p>}
        </div>
      </div>
      {sag}
    </div>
  );
}

export function NitelikKarti({
  aktif,
  baslik,
  aciklama,
  icon,
  onClick,
}: {
  aktif: boolean;
  baslik: string;
  aciklama: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={aktif}
      onClick={onClick}
      className={`relative flex items-center gap-3 rounded-xl border-2 p-3.5 text-left transition-all ${
        aktif
          ? "border-slate-900 bg-gradient-to-br from-lime-50 to-white shadow-[0_8px_24px_-14px_rgba(15,23,42,0.45)]"
          : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm"
      }`}
    >
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors ${
          aktif ? "bg-slate-900 text-lime-300" : "bg-slate-100 text-slate-500"
        }`}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-slate-900">{baslik}</span>
        <span className="block text-xs text-slate-500">{aciklama}</span>
      </span>
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
          aktif ? "border-slate-900 bg-slate-900 text-lime-300" : "border-slate-300"
        }`}
      >
        {aktif && <Check className="h-3 w-3" />}
      </span>
    </button>
  );
}

// Read-only tapu data shown as values, not as greyed-out inputs.
export function TapuBilgisi({ etiket, deger, genis = false }: { etiket: string; deger: string; genis?: boolean }) {
  return (
    <div className={`rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2 ${genis ? "col-span-2" : ""}`}>
      <p className="text-[11px] font-medium text-slate-500">{etiket}</p>
      <p className={`truncate text-sm font-semibold ${deger ? "text-slate-900" : "text-slate-300"}`} title={deger}>
        {deger || "—"}
      </p>
      <AkiciAlan etiket={etiket} deger={deger} />
    </div>
  );
}

