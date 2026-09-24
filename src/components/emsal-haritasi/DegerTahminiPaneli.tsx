"use client";

import { useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";
import { formatTrNumber, parseTrNumber } from "@/lib/emsal/hesaplama";
import {
  alan,
  birimFiyat,
  degerTahmini,
  formatMesafe,
  mesafeMetre,
  type CevreAnalizi,
  type GuvenSeviyesi,
} from "@/lib/emsal-haritasi/analiz";
import type { EmsalDurum, EmsalHaritaKaydi } from "@/lib/emsal-haritasi/types";

const fmt = (v: number | null) => (v === null ? "—" : formatTrNumber(v));
const fmtTam = (v: number | null) => (v === null ? "—" : v.toLocaleString("tr-TR", { maximumFractionDigits: 0 }));

const GUVEN_ETIKET: Record<GuvenSeviyesi, { label: string; cls: string; aciklama: string }> = {
  yuksek: {
    label: "Yüksek güven",
    cls: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    aciklama: "En az 8 emsal ve fiyatlar birbirine yakın (değişim katsayısı ≤ %20).",
  },
  orta: {
    label: "Orta güven",
    cls: "bg-amber-50 text-amber-700 ring-amber-200",
    aciklama: "En az 4 emsal, fiyat dağılımı makul (değişim katsayısı ≤ %35).",
  },
  dusuk: {
    label: "Düşük güven",
    cls: "bg-rose-50 text-rose-700 ring-rose-200",
    aciklama: "Emsal sayısı az ya da fiyatlar çok dağınık; sonucu dikkatle kullanın.",
  },
};

const girdiCls =
  "min-h-[36px] rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200";

const durumaUyar = (r: EmsalHaritaKaydi, durum: EmsalDurum) =>
  durum === "kiralik" ? r.durum === "kiralik" : r.durum !== "kiralik";

export default function DegerTahminiPaneli({
  records,
  cevre,
}: {
  records: EmsalHaritaKaydi[];
  cevre: CevreAnalizi | null;
}) {
  const [durumSecim, setDurumSecim] = useState<EmsalDurum>("satilik");
  // Fall back to the other durum when the filtered list has none of the chosen one.
  const durum: EmsalDurum = records.some((r) => durumaUyar(r, durumSecim))
    ? durumSecim
    : durumSecim === "kiralik"
      ? "satilik"
      : "kiralik";
  const [konuAlan, setKonuAlan] = useState("");
  const [tip, setTip] = useState("");
  const [aykiriTemizle, setAykiriTemizle] = useState(true);
  const [haric, setHaric] = useState<Set<string>>(new Set());
  const [kopyalandi, setKopyalandi] = useState(false);

  const tipler = useMemo(
    () => [...new Set(records.map((r) => r.emlakTipi).filter(Boolean))].sort((a, b) => a.localeCompare(b, "tr")),
    [records],
  );
  const havuz = useMemo(
    () => records.filter((r) => durumaUyar(r, durum) && (!tip || r.emlakTipi === tip)),
    [records, durum, tip],
  );
  const tahmin = useMemo(
    () => degerTahmini(havuz.filter((r) => !haric.has(r.id)), { aykiriTemizle, merkez: cevre }),
    [havuz, haric, aykiriTemizle, cevre],
  );
  const aykiriIdler = useMemo(() => new Set(tahmin?.aykiri.map((r) => r.id) ?? []), [tahmin]);
  const siraliHavuz = useMemo(
    () =>
      havuz
        .map((r) => ({ r, b: birimFiyat(r) }))
        .sort((a, b) => (a.b ?? Infinity) - (b.b ?? Infinity)),
    [havuz],
  );

  const alanDegeri = parseTrNumber(konuAlan);
  const kiralik = durum === "kiralik";
  const toplam = (birim: number | null) =>
    birim !== null && alanDegeri !== null && alanDegeri > 0 ? birim * alanDegeri : null;

  function toggle(id: string) {
    setHaric((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function ozetiKopyala() {
    if (!tahmin) return;
    const kapsam = [kiralik ? "kiralık" : "satılık", tip, cevre ? `${formatMesafe(cevre.yaricap)} çevre` : ""]
      .filter(Boolean)
      .join(", ");
    const satirlar = [
      `Emsal analizi (${kapsam})`,
      `Kullanılan emsal: ${tahmin.kullanilan.length}${tahmin.aykiri.length ? ` (${tahmin.aykiri.length} aykırı değer hariç)` : ""}`,
      `Medyan birim değer: ${fmt(tahmin.medyan)} ₺/m²`,
      `Ortalama birim değer: ${fmt(tahmin.ortalama)} ₺/m²`,
      `Çeyrekler arası aralık: ${fmt(tahmin.p25)} – ${fmt(tahmin.p75)} ₺/m²`,
      ...(tahmin.agirlikli !== null ? [`Mesafe ağırlıklı ortalama: ${fmt(tahmin.agirlikli)} ₺/m²`] : []),
      ...(alanDegeri
        ? [
            `Konu taşınmaz: ${fmtTam(alanDegeri)} m²`,
            `Tahmini ${kiralik ? "aylık kira" : "değer"}: ${fmtTam(toplam(tahmin.medyan))} ₺ (${fmtTam(toplam(tahmin.p25))} – ${fmtTam(toplam(tahmin.p75))} ₺)`,
          ]
        : []),
      `Güven: ${GUVEN_ETIKET[tahmin.guven].label}`,
    ];
    try {
      await navigator.clipboard.writeText(satirlar.join("\n"));
      setKopyalandi(true);
      setTimeout(() => setKopyalandi(false), 2000);
    } catch {
      // Clipboard can be blocked (permissions, insecure context); nothing to recover.
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <span className="mb-1 block text-[11px] font-medium text-slate-500">Durum</span>
          <div className="inline-flex rounded-lg bg-slate-100 p-0.5">
            {(
              [
                ["satilik", "Satılık"],
                ["kiralik", "Kiralık"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setDurumSecim(value)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                  durum === value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium text-slate-500">Konu taşınmaz alanı (m²)</span>
          <input
            inputMode="decimal"
            value={konuAlan}
            onChange={(e) => setKonuAlan(e.target.value)}
            placeholder="örn. 120"
            className={`${girdiCls} w-36`}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium text-slate-500">Emlak tipi</span>
          <select value={tip} onChange={(e) => setTip(e.target.value)} className={`${girdiCls} w-40`}>
            <option value="">Tümü</option>
            {tipler.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="flex min-h-[36px] items-center gap-2 text-xs text-slate-600">
          <input
            type="checkbox"
            checked={aykiriTemizle}
            onChange={(e) => setAykiriTemizle(e.target.checked)}
            className="h-3.5 w-3.5 accent-slate-900"
          />
          Aykırı değerleri çıkar (1,5×IQR)
        </label>
        <button
          type="button"
          onClick={ozetiKopyala}
          disabled={!tahmin}
          className="ml-auto inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
        >
          {kopyalandi ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
          {kopyalandi ? "Kopyalandı" : "Özeti kopyala"}
        </button>
      </div>

      {!cevre && (
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
          İpucu: Haritada <strong>Çevre analizi</strong> ile konu taşınmazın konumunu seçerseniz yalnızca yakın emsaller
          kullanılır ve mesafe ağırlıklı değer de hesaplanır.
        </p>
      )}

      {!tahmin ? (
        <p className="rounded-xl border-2 border-dashed border-slate-200 px-4 py-8 text-center text-xs text-slate-400">
          Bu seçimle fiyatı ve alanı girilmiş emsal yok.
        </p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl bg-slate-900 p-4 text-white">
              <p className="text-[11px] text-slate-400">Tahmini {kiralik ? "aylık kira" : "değer"}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-lime-300">
                {toplam(tahmin.medyan) === null ? "—" : `${fmtTam(toplam(tahmin.medyan))} ₺`}
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                {toplam(tahmin.medyan) === null
                  ? "Konu taşınmaz alanını girin"
                  : `${fmtTam(toplam(tahmin.p25))} – ${fmtTam(toplam(tahmin.p75))} ₺ aralığında`}
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 p-4">
              <p className="text-[11px] text-slate-500">Medyan birim değer</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900">{fmt(tahmin.medyan)}</p>
              <p className="mt-1 text-[11px] text-slate-400">
                ₺/m² · çeyrekler {fmtTam(tahmin.p25)} – {fmtTam(tahmin.p75)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 p-4">
              <p className="text-[11px] text-slate-500">
                {tahmin.agirlikli !== null ? "Mesafe ağırlıklı" : "Ortalama"} birim değer
              </p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900">
                {fmt(tahmin.agirlikli ?? tahmin.ortalama)}
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                ₺/m²{tahmin.agirlikli !== null ? ` · düz ortalama ${fmtTam(tahmin.ortalama)}` : ""}
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 p-4">
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${GUVEN_ETIKET[tahmin.guven].cls}`}
              >
                {GUVEN_ETIKET[tahmin.guven].label}
              </span>
              <p className="mt-2 text-[11px] text-slate-500">
                {tahmin.kullanilan.length} emsal · değişim katsayısı %{Math.round(tahmin.degisimKatsayisi * 100)}
              </p>
              <p className="mt-1 text-[11px] text-slate-400">{GUVEN_ETIKET[tahmin.guven].aciklama}</p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead className="bg-slate-50 text-[11px] text-slate-500">
                <tr>
                  <th className="w-12 px-3 py-2 font-medium">Dahil</th>
                  <th className="px-3 py-2 font-medium">Emsal</th>
                  <th className="px-3 py-2 text-right font-medium">m²</th>
                  <th className="px-3 py-2 text-right font-medium">₺/m²</th>
                  <th className="px-3 py-2 text-right font-medium">Medyana göre</th>
                  {cevre && <th className="px-3 py-2 text-right font-medium">Mesafe</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {siraliHavuz.map(({ r, b }) => {
                  const dahil = !haric.has(r.id);
                  const aykiriMi = aykiriIdler.has(r.id);
                  const fark = b !== null ? (b - tahmin.medyan) / tahmin.medyan : null;
                  return (
                    <tr key={r.id} className={dahil && !aykiriMi && b !== null ? "" : "text-slate-400"}>
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={dahil}
                          onChange={() => toggle(r.id)}
                          aria-label="Hesaplamaya dahil et"
                          className="h-3.5 w-3.5 accent-slate-900"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <span className="font-medium">{r.emlakTipi || "Emsal"}</span>
                        <span className="text-slate-400"> · {[r.mahalle, r.ilce].filter(Boolean).join(", ") || r.il}</span>
                        {aykiriMi && dahil && (
                          <span className="ml-1.5 rounded-full bg-rose-50 px-1.5 py-0.5 text-[10px] font-medium text-rose-600">
                            aykırı
                          </span>
                        )}
                        {b === null && <span className="ml-1.5 text-[10px]">(fiyat/alan eksik)</span>}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmtTam(alan(r))}</td>
                      <td className="px-3 py-2 text-right font-semibold tabular-nums">{fmt(b)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {fark === null ? "—" : `${fark > 0 ? "+" : fark < 0 ? "-" : ""}%${Math.abs(Math.round(fark * 100))}`}
                      </td>
                      {cevre && (
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatMesafe(mesafeMetre(cevre.lat, cevre.lng, r.lat, r.lng))}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-slate-400">
            Bu hesap, şerefiye düzeltmesi yapılmamış ilan fiyatlarına dayanan bir ön tahmindir; rapordaki emsal
            değerlendirmesinin yerini tutmaz.
          </p>
        </>
      )}
    </div>
  );
}
