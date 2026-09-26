"use client";

import { useState, type ReactNode } from "react";
import { DoorOpen, Plus, X } from "lucide-react";
import { AkiciAlan } from "@/components/akici-metin/baglam";
import { YONLER, yeniId } from "@/components/talep/sections/ortak";
import {
  GIRIS_TURLERI,
  NIZAMLAR,
  PARSEL_KONUMLARI,
  binaGirisCumlesi,
  blokAdi,
  blokTespitiCumlesi,
  insaatNizamiOzeti,
  konumEki,
} from "@/lib/talep/konut";
import type { BinaGirisi, KonutOzellikleriData, TapuKaydiData } from "@/lib/talep/types";

type Degistir = (p: Partial<KonutOzellikleriData>) => void;

const AZAMI_BLOK = 26;

const KISA: Record<string, string> = {
  Kuzey: "K",
  Kuzeydoğu: "KD",
  Doğu: "D",
  Güneydoğu: "GD",
  Güney: "G",
  Güneybatı: "GB",
  Batı: "B",
  Kuzeybatı: "KB",
  Orta: "•",
};

const girdi =
  "h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none";

function Etiket({ children }: { children: ReactNode }) {
  return <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">{children}</p>;
}

function Hap({
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
      className={`h-8 min-w-8 rounded-full border px-3 text-xs font-semibold transition-colors disabled:cursor-not-allowed ${
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

// Compact segmented control; "Diğer" opens a text box beside it.
function NizamSecici({ nizam, diger, onChange }: { nizam: string; diger: string; onChange: (n: string, d: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex rounded-lg bg-slate-100 p-0.5" role="radiogroup" aria-label="İnşaat nizamı">
        {NIZAMLAR.map((n) => {
          const aktif = nizam === n;
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={aktif}
              onClick={() => onChange(aktif ? "" : n, n === "Diğer" ? diger : "")}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                aktif ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {n}
            </button>
          );
        })}
      </div>
      {nizam === "Diğer" && (
        <input
          value={diger}
          onChange={(e) => onChange(nizam, e.target.value)}
          placeholder="Nizamı yazınız"
          aria-label="İnşaat nizamı (Diğer)"
          className={`${girdi} w-full max-w-[200px]`}
        />
      )}
    </div>
  );
}

// One row of the list: title + summary, and a small switch when optional.
function Satir({
  baslik,
  ozet,
  acik = true,
  onAc,
  children,
}: {
  baslik: string;
  ozet?: string;
  acik?: boolean;
  onAc?: (a: boolean) => void;
  children: ReactNode;
}) {
  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">{baslik}</p>
          {ozet && <p className="truncate text-xs text-slate-500">{ozet}</p>}
        </div>
        {onAc && (
          <button
            type="button"
            role="switch"
            aria-checked={acik}
            aria-label={baslik}
            onClick={() => onAc(!acik)}
            className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${acik ? "bg-slate-900" : "bg-slate-200"}`}
          >
            <span
              className={`absolute left-0 top-0.5 h-4 w-4 rounded-full shadow transition-transform ${
                acik ? "translate-x-[18px] bg-lime-300" : "translate-x-0.5 bg-white"
              }`}
            />
          </button>
        )}
      </div>
      {acik && <div className="@container pt-3">{children}</div>}
    </div>
  );
}

// ---- Blok tespiti ---------------------------------------------------------------

function BlokTespiti({ data, tapuKaydi, onChange }: { data: KonutOzellikleriData; tapuKaydi: TapuKaydiData; onChange: Degistir }) {
  const sayi = parseInt(data.blokSayisi, 10) || 0;
  const tapuBlok = tapuKaydi.blok.trim();
  const secenekler = [...new Set([...Array.from({ length: sayi }, (_, i) => blokAdi(data, i)), ...(tapuBlok ? [tapuBlok] : [])])];
  const elle = !!data.konuBlok && !secenekler.includes(data.konuBlok);
  const [yaz, setYaz] = useState(elle || secenekler.length === 0);

  return (
    <div className="flex flex-col gap-4 @md:flex-row @md:items-start @md:gap-6">
      <div className="min-w-0 flex-1">
        <Etiket>Blok</Etiket>
        <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label="Konu blok">
          {secenekler.map((b) => (
            <Hap
              key={b}
              aktif={data.konuBlok === b}
              onClick={() => {
                onChange({ konuBlok: data.konuBlok === b ? "" : b });
                setYaz(false);
              }}
              title={b === tapuBlok ? "Tapu Kaydı'ndaki blok" : undefined}
            >
              {b}
              {b === tapuBlok && <span className="ml-1 font-normal opacity-60">tapu</span>}
            </Hap>
          ))}
          {yaz ? (
            <input
              value={data.konuBlok}
              onChange={(e) => onChange({ konuBlok: e.target.value.slice(0, 12) })}
              placeholder="Blok adı"
              aria-label="Konu blok adı"
              autoFocus={secenekler.length > 0}
              className={`${girdi} h-8 w-24 rounded-full`}
            />
          ) : (
            <button type="button" onClick={() => setYaz(true)} className="h-8 rounded-full px-2 text-xs font-medium text-slate-400 hover:text-slate-700">
              + başka
            </button>
          )}
        </div>
      </div>

      <div className="w-fit">
        <Etiket>Parseldeki konumu</Etiket>
        <div
          className="grid w-[132px] grid-cols-3 gap-1 rounded-lg border border-dashed border-slate-300 p-1"
          role="radiogroup"
          aria-label="Bloğun parsel içindeki konumu"
        >
          {PARSEL_KONUMLARI.map((k) => {
            const aktif = data.blokKonumu === k;
            return (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={aktif}
                aria-label={k}
                title={k}
                onClick={() => onChange({ blokKonumu: aktif ? "" : k })}
                className={`flex aspect-square items-center justify-center rounded text-[10px] font-semibold transition-colors ${
                  aktif ? "bg-slate-900 text-lime-300" : "bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                }`}
              >
                {aktif ? data.konuBlok.trim().slice(0, 3) || KISA[k] : KISA[k]}
              </button>
            );
          })}
        </div>
        <p className="mt-1 text-center text-[10px] text-slate-400">↑ Kuzey</p>
      </div>
    </div>
  );
}

// ---- Bina giriş tespiti ---------------------------------------------------------

const KAPI_YERLERI: Record<string, { left: string; top: string }> = {
  Kuzey: { left: "50%", top: "0%" },
  Kuzeydoğu: { left: "100%", top: "0%" },
  Doğu: { left: "100%", top: "50%" },
  Güneydoğu: { left: "100%", top: "100%" },
  Güney: { left: "50%", top: "100%" },
  Güneybatı: { left: "0%", top: "100%" },
  Batı: { left: "0%", top: "50%" },
  Kuzeybatı: { left: "0%", top: "0%" },
};

function BinaGirisTespiti({ data, onChange }: { data: KonutOzellikleriData; onChange: Degistir }) {
  const girisler = data.binaGirisleri;

  function yonDegistir(yon: string) {
    const var_ = girisler.find((g) => g.yon === yon);
    if (var_) onChange({ binaGirisleri: girisler.filter((g) => g !== var_) });
    else
      onChange({
        binaGirisleri: [...girisler, { id: yeniId(), yon, yol: "", tur: girisler.some((g) => g.tur === "Ana giriş") ? "Yan giriş" : "Ana giriş" }],
      });
  }

  function guncelle(id: string, p: Partial<BinaGirisi>) {
    onChange({ binaGirisleri: girisler.map((g) => (g.id === id ? { ...g, ...p } : g)) });
  }

  const sirali = [...girisler].sort((a, b) => YONLER.indexOf(a.yon) - YONLER.indexOf(b.yon));

  return (
    <div className="flex flex-col gap-4 @md:flex-row @md:items-start @md:gap-6">
      <div className="w-fit shrink-0">
        <Etiket>Giriş cephesi</Etiket>
        <div className="relative mx-3 my-3 h-[108px] w-[108px] rounded border-2 border-slate-700 bg-slate-50">
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-slate-400">Bina</span>
          {YONLER.map((yon) => {
            const g = girisler.find((x) => x.yon === yon);
            const yer = KAPI_YERLERI[yon];
            return (
              <button
                key={yon}
                type="button"
                aria-pressed={!!g}
                aria-label={`${yon} cephesinde giriş`}
                title={yon}
                onClick={() => yonDegistir(yon)}
                style={{ left: yer.left, top: yer.top }}
                className={`absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded text-[9px] font-bold transition-colors ${
                  g ? "bg-lime-400 text-slate-900" : "border border-slate-300 bg-white text-slate-400 hover:border-slate-500 hover:text-slate-700"
                }`}
              >
                {g ? <DoorOpen className="h-3.5 w-3.5" /> : KISA[yon]}
              </button>
            );
          })}
        </div>
        <p className="text-center text-[10px] text-slate-400">↑ Kuzey</p>
      </div>

      <div className="min-w-0 flex-1">
        <Etiket>Girişler</Etiket>
        {sirali.length === 0 ? (
          <p className="text-xs text-slate-400">Plandan girişin olduğu cepheyi seçin.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {sirali.map((g) => (
              <li
                key={g.id}
                className="grid grid-cols-[72px_minmax(0,1fr)_28px] items-center gap-2 py-1.5 sm:grid-cols-[84px_minmax(0,1fr)_132px_28px]"
              >
                <span className="text-xs font-semibold text-slate-700">{g.yon}</span>
                <input
                  value={g.yol}
                  onChange={(e) => guncelle(g.id, { yol: e.target.value })}
                  placeholder="Yol / sokak"
                  aria-label={`${g.yon} girişinin yolu`}
                  className={`${girdi} w-full`}
                />
                <select
                  value={g.tur}
                  onChange={(e) => guncelle(g.id, { tur: e.target.value })}
                  aria-label={`${g.yon} girişinin türü`}
                  className={`${girdi} order-last col-span-2 col-start-2 w-full appearance-none sm:order-none sm:col-span-1 sm:col-start-auto`}
                >
                  <option value="">Tür</option>
                  {GIRIS_TURLERI.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => onChange({ binaGirisleri: girisler.filter((x) => x.id !== g.id) })}
                  aria-label={`${g.yon} girişini kaldır`}
                  className="flex h-7 w-7 items-center justify-center rounded text-slate-300 hover:bg-rose-50 hover:text-rose-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ---- İnşaat nizamı --------------------------------------------------------------

function YapiSinifi({ data, onChange }: { data: KonutOzellikleriData; onChange: Degistir }) {
  return (
    <label className="block">
      <Etiket>Yapı sınıfı</Etiket>
      <input
        value={data.yapiSinifi}
        onChange={(e) => onChange({ yapiSinifi: e.target.value })}
        placeholder="3B"
        aria-label="Yapı sınıfı"
        className={`${girdi} w-20`}
      />
    </label>
  );
}

function BlokNizamlari({ data, onChange }: { data: KonutOzellikleriData; onChange: Degistir }) {
  const [secili, setSecili] = useState<number[]>([]);
  const [nizam, setNizam] = useState("");
  const [diger, setDiger] = useState("");
  const sayi = Math.min(AZAMI_BLOK, Math.max(0, parseInt(data.blokSayisi, 10) || 0));
  const atanan = new Set(data.nizamAtamalari.flatMap((a) => a.bloklar));
  const kalan = Array.from({ length: sayi }, (_, i) => i).filter((i) => !atanan.has(i));
  const eklenebilir = secili.length > 0 && !!nizam && (nizam !== "Diğer" || !!diger.trim());

  function sayiDegistir(v: string) {
    const n = Math.min(AZAMI_BLOK, Math.max(0, parseInt(v, 10) || 0));
    onChange({
      blokSayisi: v.replace(/\D/g, "").slice(0, 2),
      blokAdlari: Array.from({ length: n }, (_, i) => data.blokAdlari[i] ?? ""),
      nizamAtamalari: data.nizamAtamalari.map((a) => ({ ...a, bloklar: a.bloklar.filter((b) => b < n) })).filter((a) => a.bloklar.length),
    });
    setSecili((s) => s.filter((b) => b < n));
  }

  function ekle() {
    if (!eklenebilir) return;
    onChange({
      nizamAtamalari: [...data.nizamAtamalari, { id: yeniId(), bloklar: [...secili].sort((a, b) => a - b), nizam, nizamDiger: diger.trim() }],
    });
    setSecili([]);
    setNizam("");
    setDiger("");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start gap-4">
        <YapiSinifi data={data} onChange={onChange} />
        <label className="block">
          <Etiket>Blok sayısı</Etiket>
          <input
            type="number"
            min={0}
            max={AZAMI_BLOK}
            value={data.blokSayisi}
            onChange={(e) => sayiDegistir(e.target.value)}
            placeholder="0"
            className={`${girdi} w-20`}
          />
        </label>
        {sayi > 0 && (
          <div className="min-w-0 basis-full sm:basis-auto sm:flex-1">
            <Etiket>Blok adları</Etiket>
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: sayi }, (_, i) => (
                <input
                  key={i}
                  value={data.blokAdlari[i] ?? ""}
                  maxLength={6}
                  onChange={(e) =>
                    onChange({ blokAdlari: Array.from({ length: sayi }, (_, j) => (j === i ? e.target.value : (data.blokAdlari[j] ?? ""))) })
                  }
                  placeholder={String(i + 1)}
                  aria-label={`${i + 1}. blok adı`}
                  className={`${girdi} w-16 text-center font-semibold uppercase`}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {sayi > 0 && (
        <div>
          <Etiket>Nizam</Etiket>
          {kalan.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex flex-wrap gap-1" role="group" aria-label="Bloklar">
                {Array.from({ length: sayi }, (_, i) => (
                  <Hap
                    key={i}
                    aktif={secili.includes(i)}
                    disabled={atanan.has(i)}
                    onClick={() => setSecili(secili.includes(i) ? secili.filter((x) => x !== i) : [...secili, i])}
                    title={atanan.has(i) ? "Nizamı belirlendi" : undefined}
                  >
                    {blokAdi(data, i)}
                  </Hap>
                ))}
              </div>
              <span className="text-slate-300">→</span>
              <NizamSecici
                nizam={nizam}
                diger={diger}
                onChange={(n, d) => {
                  setNizam(n);
                  setDiger(d);
                }}
              />
              <button
                type="button"
                onClick={ekle}
                disabled={!eklenebilir}
                className="inline-flex h-8 items-center gap-1 rounded-full bg-slate-900 px-3 text-xs font-semibold text-white disabled:bg-slate-200 disabled:text-slate-400"
              >
                <Plus className="h-3.5 w-3.5" />
                Ekle
              </button>
            </div>
          )}
          {data.nizamAtamalari.length > 0 && (
            <div className={`flex flex-wrap gap-1.5 ${kalan.length ? "mt-3" : ""}`}>
              {data.nizamAtamalari.map((a) => (
                <span key={a.id} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 py-1 pl-3 pr-1 text-xs text-slate-700">
                  <strong className="font-semibold text-slate-900">{a.bloklar.map((b) => blokAdi(data, b)).join(", ")}</strong>
                  {a.nizam === "Diğer" ? a.nizamDiger : a.nizam}
                  <button
                    type="button"
                    onClick={() => onChange({ nizamAtamalari: data.nizamAtamalari.filter((x) => x.id !== a.id) })}
                    aria-label="Atamayı kaldır"
                    className="rounded-full p-0.5 text-slate-400 hover:bg-white hover:text-rose-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          {kalan.length === 0 && <p className="mt-2 text-xs text-slate-400">Tüm blokların nizamı belirlendi.</p>}
        </div>
      )}
    </div>
  );
}

// Konum Tespiti as one quiet list: Blok Tespiti (bloklu), Bina Giriş Tespiti
// and İnşaat Nizamı, each a row with a summary.
export default function KonutTespitleri({
  data,
  tapuKaydi,
  bloklu,
  onChange,
}: {
  data: KonutOzellikleriData;
  tapuKaydi: TapuKaydiData;
  bloklu: boolean;
  onChange: Degistir;
}) {
  const blokOzet = [data.konuBlok.trim() && `${data.konuBlok.trim()} Blok`, data.blokKonumu && `parselin ${konumEki(data.blokKonumu)}`]
    .filter(Boolean)
    .join(" · ");
  const girisOzet = data.binaGirisleri
    .filter((g) => g.yon)
    .map((g) => `${g.yon}${g.tur ? ` (${g.tur.toLocaleLowerCase("tr-TR")})` : ""}`)
    .join(", ");
  const nizamOzet = [data.yapiSinifi.trim() && `Yapı sınıfı ${data.yapiSinifi.trim()}`, insaatNizamiOzeti(data)].filter(Boolean).join(" · ");

  return (
    <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
      {/* Blok and Bina Giriş Tespiti side by side on wide screens. */}
      <div className={`grid grid-cols-1 divide-y divide-slate-100 ${bloklu ? "lg:grid-cols-2 lg:divide-x lg:divide-y-0" : ""}`}>
        {bloklu && (
          <Satir
            baslik="Blok Tespiti"
            ozet={data.blokTespiti === "Evet" ? blokOzet || "Blok ve konumunu seçin" : "Tespit yapılmayacak"}
            acik={data.blokTespiti === "Evet"}
            onAc={(a) => onChange({ blokTespiti: a ? "Evet" : "Hayır" })}
          >
            <BlokTespiti data={data} tapuKaydi={tapuKaydi} onChange={onChange} />
          </Satir>
        )}
        <Satir
          baslik="Bina Giriş Tespiti"
          ozet={data.binaGirisTespiti === "Evet" ? girisOzet || "Giriş cephesini seçin" : "Tespit yapılmayacak"}
          acik={data.binaGirisTespiti === "Evet"}
          onAc={(a) => onChange({ binaGirisTespiti: a ? "Evet" : "Hayır" })}
        >
          <BinaGirisTespiti data={data} onChange={onChange} />
        </Satir>
      </div>
      <Satir baslik="İnşaat Nizamı" ozet={nizamOzet || undefined}>
        {bloklu ? (
          <BlokNizamlari data={data} onChange={onChange} />
        ) : (
          <div className="flex flex-wrap items-start gap-4">
            <YapiSinifi data={data} onChange={onChange} />
            <div>
              <Etiket>Nizam</Etiket>
              <NizamSecici
                nizam={data.insaatNizami}
                diger={data.insaatNizamiDiger}
                onChange={(insaatNizami, insaatNizamiDiger) => onChange({ insaatNizami, insaatNizamiDiger })}
              />
            </div>
          </div>
        )}
      </Satir>
      <AkiciAlan etiket="Blok Tespiti" deger={blokTespitiCumlesi(data)} />
      <AkiciAlan etiket="Bina Giriş Tespiti" deger={binaGirisCumlesi(data)} />
      <AkiciAlan etiket="Yapı Sınıfı" deger={data.yapiSinifi} />
      {bloklu && <AkiciAlan etiket="Blok Sayısı" deger={data.blokSayisi} />}
      {bloklu && (
        <AkiciAlan
          etiket="Blok Adları"
          deger={Array.from({ length: parseInt(data.blokSayisi, 10) || 0 }, (_, i) => blokAdi(data, i)).join(", ")}
        />
      )}
    </div>
  );
}
