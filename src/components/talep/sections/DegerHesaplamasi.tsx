"use client";

import { useState, type ReactNode } from "react";
import { Calculator, ChartPie, CircleCheck, Download, Layers, Plus, Ruler, Trash2, TriangleAlert } from "lucide-react";
import { TextField, tableInputClass } from "@/components/talep/form-fields";
import { formatTrNumber } from "@/lib/emsal/hesaplama";
import {
  hesaplaAlanFarki,
  hesaplaHisseli,
  hesaplaNormal,
  hesaplaSeviyeli,
} from "@/lib/talep/deger-hesaplama";
import {
  newRowId,
  type DegerHesaplamalari,
  type HisseSatiri,
  type MulkiyetKaydi,
  type SeviyeSatiri,
} from "@/lib/talep/types";

const para = (v: number) => `${formatTrNumber(v)} ₺`;
const yuzde = (oran: number) => `%${(oran * 100).toLocaleString("tr-TR", { maximumFractionDigits: 4 })}`;

export interface EmsalOrtalamasi {
  birim: number | null;
  net: number | null;
  adet: number;
}

function CalcCard({
  icon,
  title,
  description,
  sonuc,
  sonucAciklama,
  onUse,
  children,
  className = "",
}: {
  icon: ReactNode;
  title: string;
  description: string;
  sonuc: number | null;
  sonucAciklama?: string;
  onUse: (deger: number) => void;
  children: ReactNode;
  className?: string;
}) {
  const [used, setUsed] = useState(false);

  return (
    <section
      className={`flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${className}`}
    >
      <header className="flex items-start gap-3 border-b border-slate-100 p-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lime-100 text-lime-800">
          {icon}
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{description}</p>
        </div>
      </header>

      <div className="flex-1 space-y-3 p-4">{children}</div>

      <footer className="flex flex-wrap items-center justify-between gap-3 rounded-b-2xl border-t border-lime-100 bg-lime-50/70 px-4 py-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-lime-800">Hesaplanan Değer</p>
          <p className="text-xl font-semibold tabular-nums text-slate-900">{sonuc === null ? "—" : para(sonuc)}</p>
          {sonucAciklama && <p className="text-xs text-slate-500">{sonucAciklama}</p>}
        </div>
        <button
          type="button"
          disabled={sonuc === null}
          onClick={() => {
            if (sonuc === null) return;
            onUse(sonuc);
            setUsed(true);
            window.setTimeout(() => setUsed(false), 2000);
          }}
          className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {used ? <CircleCheck className="h-4 w-4 text-lime-300" /> : <Download className="h-4 w-4" />}
          {used ? "Aktarıldı" : "Nihai Değere Aktar"}
        </button>
      </footer>
    </section>
  );
}

function BirimDegerField({
  value,
  onChange,
  emsal,
}: {
  value: string;
  onChange: (v: string) => void;
  emsal: EmsalOrtalamasi;
}) {
  const oneri = emsal.net ?? emsal.birim;
  return (
    <div>
      <TextField label="Birim Değer (₺/m²)" value={value} onChange={onChange} placeholder="Örn. 48.000" />
      {oneri !== null && (
        <button
          type="button"
          onClick={() => onChange(formatTrNumber(oneri))}
          className="mt-1.5 text-xs font-medium text-lime-800 underline-offset-2 hover:underline"
        >
          Emsal ortalamasını kullan: {formatTrNumber(oneri)} ₺/m²
          {emsal.net !== null ? " (net)" : ""}
        </button>
      )}
    </div>
  );
}

function SatirListesiBaslik({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center justify-between gap-2">{children}</div>;
}

const ekleButtonClass =
  "inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-slate-400 hover:bg-slate-50";

function Th({ children, right = false }: { children: ReactNode; right?: boolean }) {
  return (
    <th className={`py-2 pr-2 text-[11px] font-medium uppercase tracking-wider text-slate-400 ${right ? "text-right" : ""}`}>
      {children}
    </th>
  );
}

export default function DegerHesaplamasi({
  value,
  onChange,
  emsal,
  mulkiyetKayitlari,
  onNihaiDeger,
}: {
  value: DegerHesaplamalari;
  onChange: (next: DegerHesaplamalari) => void;
  emsal: EmsalOrtalamasi;
  mulkiyetKayitlari: MulkiyetKaydi[];
  onNihaiDeger: (deger: number) => void;
}) {
  const { normal, alanFarki, seviyeli, hisseli } = value;

  const normalSonuc = hesaplaNormal(normal);
  const farkSonuc = hesaplaAlanFarki(alanFarki);
  const seviyeSonuc = hesaplaSeviyeli(seviyeli);
  const hisseSonuc = hesaplaHisseli(hisseli);

  function updateSeviye(id: string, patch: Partial<SeviyeSatiri>) {
    onChange({ ...value, seviyeli: seviyeli.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
  }
  function updateHisse(id: string, patch: Partial<HisseSatiri>) {
    onChange({
      ...value,
      hisseli: { ...hisseli, satirlar: hisseli.satirlar.map((s) => (s.id === id ? { ...s, ...patch } : s)) },
    });
  }
  function tapudanGetir() {
    const satirlar: HisseSatiri[] = mulkiyetKayitlari.map((m) => ({
      id: newRowId(),
      malik: m.malik,
      pay: m.hissePay,
      payda: m.hissePayda,
    }));
    onChange({ ...value, hisseli: { ...hisseli, satirlar } });
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      {/* Normal Değerleme */}
      <CalcCard
        icon={<Calculator className="h-5 w-5" />}
        title="Normal Değerleme"
        description="Değerlenen alan ile birim değerin çarpımı."
        sonuc={normalSonuc}
        sonucAciklama="Alan × Birim Değer"
        onUse={onNihaiDeger}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField
            label="Alan (m²)"
            value={normal.alanM2}
            onChange={(v) => onChange({ ...value, normal: { ...normal, alanM2: v } })}
            placeholder="Örn. 120"
          />
          <BirimDegerField
            value={normal.birimDeger}
            onChange={(v) => onChange({ ...value, normal: { ...normal, birimDeger: v } })}
            emsal={emsal}
          />
        </div>
      </CalcCard>

      {/* Alan Farkı Değerleme */}
      <CalcCard
        icon={<Ruler className="h-5 w-5" />}
        title="Alan Farkı Değerleme"
        description="Resmi alan ile fiili alan arasındaki fark, belirlenen katsayıyla değerlenir."
        sonuc={farkSonuc?.toplam ?? null}
        sonucAciklama="Resmi alan değeri + Fark alanı değeri"
        onUse={onNihaiDeger}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField
            label="Resmi (Tapu / Ruhsat) Alan (m²)"
            value={alanFarki.resmiAlanM2}
            onChange={(v) => onChange({ ...value, alanFarki: { ...alanFarki, resmiAlanM2: v } })}
          />
          <TextField
            label="Fiili Alan (m²)"
            value={alanFarki.fiiliAlanM2}
            onChange={(v) => onChange({ ...value, alanFarki: { ...alanFarki, fiiliAlanM2: v } })}
          />
          <BirimDegerField
            value={alanFarki.birimDeger}
            onChange={(v) => onChange({ ...value, alanFarki: { ...alanFarki, birimDeger: v } })}
            emsal={emsal}
          />
          <div>
            <TextField
              label="Fark Alanı Değer Katsayısı (%)"
              value={alanFarki.farkKatsayisi}
              onChange={(v) => onChange({ ...value, alanFarki: { ...alanFarki, farkKatsayisi: v } })}
              placeholder="100"
            />
            <span className="mt-1.5 block text-xs text-slate-400">Boş bırakılırsa %100 uygulanır.</span>
          </div>
        </div>
        {farkSonuc && (
          <dl className="grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-3 text-xs">
            <div>
              <dt className="text-slate-400">Alan farkı</dt>
              <dd className="mt-0.5 font-semibold tabular-nums text-slate-800">
                {farkSonuc.alanFarki > 0 ? "+" : ""}
                {formatTrNumber(farkSonuc.alanFarki)} m²
              </dd>
            </div>
            <div>
              <dt className="text-slate-400">Resmi alan değeri</dt>
              <dd className="mt-0.5 font-semibold tabular-nums text-slate-800">{para(farkSonuc.resmiDeger)}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Fark alanı değeri</dt>
              <dd className="mt-0.5 font-semibold tabular-nums text-slate-800">{para(farkSonuc.farkDeger)}</dd>
            </div>
          </dl>
        )}
      </CalcCard>

      {/* Seviyeli Değerleme */}
      <CalcCard
        className="xl:col-span-2"
        icon={<Layers className="h-5 w-5" />}
        title="Seviyeli Değerleme"
        description="Bodrum, zemin, normal kat gibi seviyeler ayrı alan, birim değer ve katsayıyla değerlenir; toplam alınır."
        sonuc={seviyeSonuc?.toplamDeger ?? null}
        sonucAciklama={
          seviyeSonuc
            ? `${formatTrNumber(seviyeSonuc.toplamAlan)} m²${
                seviyeSonuc.ortalamaBirim !== null ? ` · ortalama ${formatTrNumber(seviyeSonuc.ortalamaBirim)} ₺/m²` : ""
              }`
            : "Seviyelerin tutarlarının toplamı"
        }
        onUse={onNihaiDeger}
      >
        {seviyeli.length > 0 && (
          <div className="-mx-4 overflow-x-auto px-4">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr>
                  <Th>Seviye</Th>
                  <Th>Alan (m²)</Th>
                  <Th>Birim Değer (₺/m²)</Th>
                  <Th>Katsayı (%)</Th>
                  <Th right>Tutar (₺)</Th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {seviyeli.map((s) => {
                  const tutar = seviyeSonuc?.satirDegerleri[s.id] ?? null;
                  return (
                    <tr key={s.id} className="border-t border-slate-100">
                      <td className="py-2 pr-2">
                        <input
                          className={tableInputClass}
                          value={s.ad}
                          placeholder="Örn. Zemin kat"
                          onChange={(e) => updateSeviye(s.id, { ad: e.target.value })}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          className={tableInputClass}
                          value={s.alanM2}
                          onChange={(e) => updateSeviye(s.id, { alanM2: e.target.value })}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          className={tableInputClass}
                          value={s.birimDeger}
                          onChange={(e) => updateSeviye(s.id, { birimDeger: e.target.value })}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          className={tableInputClass}
                          value={s.katsayi}
                          placeholder="100"
                          onChange={(e) => updateSeviye(s.id, { katsayi: e.target.value })}
                        />
                      </td>
                      <td className="whitespace-nowrap py-2 pr-2 text-right font-medium tabular-nums text-slate-800">
                        {tutar === null ? <span className="text-slate-300">—</span> : para(tutar)}
                      </td>
                      <td className="py-2 text-right">
                        <button
                          type="button"
                          aria-label="Seviyeyi sil"
                          onClick={() => onChange({ ...value, seviyeli: seviyeli.filter((x) => x.id !== s.id) })}
                          className="rounded-full p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <SatirListesiBaslik>
          <button
            type="button"
            onClick={() =>
              onChange({
                ...value,
                seviyeli: [...seviyeli, { id: newRowId(), ad: "", alanM2: "", birimDeger: "", katsayi: "" }],
              })
            }
            className={ekleButtonClass}
          >
            <Plus className="h-3.5 w-3.5" />
            Seviye Ekle
          </button>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            {emsal.net !== null || emsal.birim !== null ? (
              <span className="text-slate-400">
                Emsal ortalaması: {formatTrNumber((emsal.net ?? emsal.birim) as number)} ₺/m²
              </span>
            ) : null}
            <span className="text-slate-400">Katsayı boşsa %100 uygulanır.</span>
          </div>
        </SatirListesiBaslik>
      </CalcCard>

      {/* Hisseli Değerleme */}
      <CalcCard
        className="xl:col-span-2"
        icon={<ChartPie className="h-5 w-5" />}
        title="Hisseli Değerleme"
        description="Taşınmazın tam değeri, hissedarların pay / payda oranlarına göre paylaştırılır."
        sonuc={hisseSonuc?.toplamDeger ?? null}
        sonucAciklama={hisseSonuc ? `Toplam hisse: ${yuzde(hisseSonuc.toplamOran)}` : "Hisse değerlerinin toplamı"}
        onUse={onNihaiDeger}
      >
        <div className="max-w-sm">
          <TextField
            label="Taşınmazın Tam Değeri (₺)"
            value={hisseli.tamDeger}
            onChange={(v) => onChange({ ...value, hisseli: { ...hisseli, tamDeger: v } })}
            placeholder="Örn. 4.800.000"
          />
          {normalSonuc !== null && (
            <button
              type="button"
              onClick={() => onChange({ ...value, hisseli: { ...hisseli, tamDeger: formatTrNumber(normalSonuc) } })}
              className="mt-1.5 text-xs font-medium text-lime-800 underline-offset-2 hover:underline"
            >
              Normal değerleme sonucunu kullan: {para(normalSonuc)}
            </button>
          )}
        </div>

        {hisseli.satirlar.length > 0 && (
          <div className="-mx-4 overflow-x-auto px-4">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr>
                  <Th>Hissedar (Malik)</Th>
                  <Th>Pay</Th>
                  <Th>Payda</Th>
                  <Th right>Oran</Th>
                  <Th right>Hisse Değeri (₺)</Th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {hisseli.satirlar.map((s) => {
                  const sonuc = hisseSonuc?.satirlar[s.id] ?? null;
                  return (
                    <tr key={s.id} className="border-t border-slate-100">
                      <td className="py-2 pr-2">
                        <input
                          className={tableInputClass}
                          value={s.malik}
                          onChange={(e) => updateHisse(s.id, { malik: e.target.value })}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          className={`${tableInputClass} max-w-[6rem]`}
                          value={s.pay}
                          onChange={(e) => updateHisse(s.id, { pay: e.target.value })}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          className={`${tableInputClass} max-w-[6rem]`}
                          value={s.payda}
                          onChange={(e) => updateHisse(s.id, { payda: e.target.value })}
                        />
                      </td>
                      <td className="whitespace-nowrap py-2 pr-2 text-right tabular-nums text-slate-600">
                        {sonuc ? yuzde(sonuc.oran) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="whitespace-nowrap py-2 pr-2 text-right font-medium tabular-nums text-slate-800">
                        {sonuc ? para(sonuc.deger) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="py-2 text-right">
                        <button
                          type="button"
                          aria-label="Hisseyi sil"
                          onClick={() =>
                            onChange({
                              ...value,
                              hisseli: { ...hisseli, satirlar: hisseli.satirlar.filter((x) => x.id !== s.id) },
                            })
                          }
                          className="rounded-full p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {hisseSonuc && hisseSonuc.toplamOran > 1.000001 && (
          <p className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
            <TriangleAlert className="h-4 w-4 shrink-0" />
            Toplam hisse oranı {yuzde(hisseSonuc.toplamOran)}; %100&apos;ü aşıyor, pay / payda değerlerini kontrol edin.
          </p>
        )}

        <SatirListesiBaslik>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...value,
                  hisseli: {
                    ...hisseli,
                    satirlar: [...hisseli.satirlar, { id: newRowId(), malik: "", pay: "", payda: "" }],
                  },
                })
              }
              className={ekleButtonClass}
            >
              <Plus className="h-3.5 w-3.5" />
              Hisse Ekle
            </button>
            {mulkiyetKayitlari.length > 0 && (
              <button type="button" onClick={tapudanGetir} className={ekleButtonClass}>
                <Download className="h-3.5 w-3.5" />
                Tapu Kaydından Getir
              </button>
            )}
          </div>
          {mulkiyetKayitlari.length > 0 && hisseli.satirlar.length > 0 && (
            <span className="text-xs text-slate-400">&quot;Tapu Kaydından Getir&quot; mevcut satırların yerine geçer.</span>
          )}
        </SatirListesiBaslik>
      </CalcCard>
    </div>
  );
}
