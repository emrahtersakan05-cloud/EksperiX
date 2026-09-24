"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  Calculator,
  ChevronLeft,
  ChevronRight,
  MapPinned,
  Pencil,
  Table2,
} from "lucide-react";
import { formatTrNumber, parseTrNumber } from "@/lib/emsal/hesaplama";
import {
  alan,
  birimFiyat,
  eskiIlanMi,
  formatMesafe,
  istatistik,
  kisaFiyat,
  mesafeMetre,
  type CevreAnalizi,
} from "@/lib/emsal-haritasi/analiz";
import type { EmsalDurum, EmsalHaritaKaydi } from "@/lib/emsal-haritasi/types";
import DegerTahminiPaneli from "@/components/emsal-haritasi/DegerTahminiPaneli";

type Sekme = "tablo" | "grafik" | "bolge" | "deger";

// Every chart here is a single series (one durum at a time), so one hue and
// no legend; ink and chrome stay in the app's slate text tokens.
const SERI_RENK = "#2a78d6";
const SERI_RENK_SOLUK = "#9ec5f4";
const GRID = "#eef2f6";
const EKSEN = "#e2e8f0";
const MUTED = "#64748b";
const tick = { fontSize: 11, fill: MUTED };

const fmt = (v: number | null) => (v === null ? "—" : formatTrNumber(v));
const fmtTam = (v: number | null) => (v === null ? "—" : v.toLocaleString("tr-TR", { maximumFractionDigits: 0 }));

function medyan(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const n = s.length;
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
}

export default function EmsalAnalizSekmeleri({
  records,
  cevre,
  focusId,
  onFocus,
  canModify,
  onEdit,
}: {
  records: EmsalHaritaKaydi[];
  cevre: CevreAnalizi | null;
  focusId: string | null;
  onFocus: (id: string) => void;
  canModify: (kaydi: EmsalHaritaKaydi) => boolean;
  onEdit: (kaydi: EmsalHaritaKaydi) => void;
}) {
  const [sekme, setSekme] = useState<Sekme>("tablo");

  const sekmeler: { id: Sekme; label: string; icon: ReactNode }[] = [
    { id: "tablo", label: "Tablo", icon: <Table2 className="h-4 w-4" /> },
    { id: "grafik", label: "Grafikler", icon: <BarChart3 className="h-4 w-4" /> },
    { id: "bolge", label: "Bölge Özeti", icon: <MapPinned className="h-4 w-4" /> },
    { id: "deger", label: "Değer Tahmini", icon: <Calculator className="h-4 w-4" /> },
  ];

  return (
    <section className="rounded-2xl border border-slate-100 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 pt-3">
        <div role="tablist" className="-mx-1 flex gap-1 overflow-x-auto">
          {sekmeler.map((s) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={sekme === s.id}
              onClick={() => setSekme(s.id)}
              className={`-mb-px inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 pb-2.5 pt-1 text-sm font-medium transition-colors ${
                sekme === s.id
                  ? "border-slate-900 text-slate-900"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {s.icon}
              {s.label}
            </button>
          ))}
        </div>
        <p className="pb-2.5 text-xs text-slate-400">
          {records.length} kayıt · sol paneldeki filtreler{cevre ? " ve çevre analizi" : ""} uygulanır
        </p>
      </div>

      <div className="p-4">
        {records.length === 0 ? (
          <p className="rounded-xl border-2 border-dashed border-slate-200 px-4 py-10 text-center text-xs text-slate-400">
            Gösterilecek emsal yok.
          </p>
        ) : sekme === "tablo" ? (
          <EmsalTablosu
            records={records}
            cevre={cevre}
            focusId={focusId}
            onFocus={onFocus}
            canModify={canModify}
            onEdit={onEdit}
          />
        ) : sekme === "grafik" ? (
          <EmsalGrafikleri records={records} />
        ) : sekme === "bolge" ? (
          <BolgeOzeti records={records} />
        ) : (
          <DegerTahminiPaneli records={records} cevre={cevre} />
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ Tablo */

type Kolon = "durum" | "tip" | "konum" | "alan" | "oda" | "kat" | "yas" | "tarih" | "fiyat" | "birim" | "mesafe" | "ekleyen";
const SAYFA_BOYUTU = 20;

function EmsalTablosu({
  records,
  cevre,
  focusId,
  onFocus,
  canModify,
  onEdit,
}: {
  records: EmsalHaritaKaydi[];
  cevre: CevreAnalizi | null;
  focusId: string | null;
  onFocus: (id: string) => void;
  canModify: (kaydi: EmsalHaritaKaydi) => boolean;
  onEdit: (kaydi: EmsalHaritaKaydi) => void;
}) {
  const [siralama, setSiralama] = useState<{ kolon: Kolon; yon: 1 | -1 }>({ kolon: "tarih", yon: -1 });
  const [sayfa, setSayfa] = useState(0);

  const mesafe = (r: EmsalHaritaKaydi) => (cevre ? mesafeMetre(cevre.lat, cevre.lng, r.lat, r.lng) : null);
  const fiyat = (r: EmsalHaritaKaydi) => parseTrNumber(r.pazarlikliFiyat) ?? parseTrNumber(r.istenenFiyat);

  const deger = (r: EmsalHaritaKaydi, k: Kolon): string | number | null => {
    switch (k) {
      case "durum":
        return r.durum === "kiralik" ? "Kiralık" : "Satılık";
      case "tip":
        return r.emlakTipi;
      case "konum":
        return [r.il, r.ilce, r.mahalle].join(" ");
      case "alan":
        return alan(r);
      case "oda":
        return r.odaSayisi || null;
      case "kat":
        return parseTrNumber(r.kat);
      case "yas":
        return parseTrNumber(r.binaYasi);
      case "tarih":
        return r.ilanTarihi || r.olusturmaTarihi.slice(0, 10);
      case "fiyat":
        return fiyat(r);
      case "birim":
        return birimFiyat(r);
      case "mesafe":
        return mesafe(r);
      case "ekleyen":
        return r.ekleyenAdSoyad;
    }
  };

  const sirali = useMemo(() => {
    const { kolon, yon } = siralama;
    return [...records].sort((a, b) => {
      const va = deger(a, kolon);
      const vb = deger(b, kolon);
      // Empty cells always sink to the bottom, whichever direction.
      if (va === null || va === "") return 1;
      if (vb === null || vb === "") return -1;
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * yon;
      return String(va).localeCompare(String(vb), "tr") * yon;
    });
    // deger only closes over cevre, listed below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records, siralama, cevre]);

  const sayfaSayisi = Math.max(1, Math.ceil(sirali.length / SAYFA_BOYUTU));
  const aktifSayfa = Math.min(sayfa, sayfaSayisi - 1);
  const gorunen = sirali.slice(aktifSayfa * SAYFA_BOYUTU, (aktifSayfa + 1) * SAYFA_BOYUTU);

  function sirala(kolon: Kolon) {
    setSiralama((prev) => (prev.kolon === kolon ? { kolon, yon: prev.yon === 1 ? -1 : 1 } : { kolon, yon: 1 }));
    setSayfa(0);
  }

  const kolonlar: { id: Kolon; label: string; sag?: boolean }[] = [
    { id: "durum", label: "Durum" },
    { id: "tip", label: "Tip" },
    { id: "konum", label: "Konum" },
    { id: "alan", label: "m²", sag: true },
    { id: "oda", label: "Oda" },
    { id: "kat", label: "Kat", sag: true },
    { id: "yas", label: "Yaş", sag: true },
    { id: "tarih", label: "İlan Tarihi" },
    { id: "fiyat", label: "Fiyat (₺)", sag: true },
    { id: "birim", label: "₺/m²", sag: true },
    ...(cevre ? [{ id: "mesafe" as const, label: "Mesafe", sag: true }] : []),
    { id: "ekleyen", label: "Ekleyen" },
  ];

  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-slate-100">
        <table className="w-full min-w-[900px] text-left text-xs">
          <thead className="bg-slate-50 text-[11px] text-slate-500">
            <tr>
              {kolonlar.map((k) => (
                <th key={k.id} className={`px-3 py-2 font-medium ${k.sag ? "text-right" : ""}`}>
                  <button
                    type="button"
                    onClick={() => sirala(k.id)}
                    className={`inline-flex items-center gap-1 hover:text-slate-900 ${
                      siralama.kolon === k.id ? "text-slate-900" : ""
                    }`}
                  >
                    {k.label}
                    {siralama.kolon === k.id &&
                      (siralama.yon === 1 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                  </button>
                </th>
              ))}
              <th className="w-8 px-2 py-2" aria-label="İşlemler" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {gorunen.map((r) => {
              const m = mesafe(r);
              return (
                <tr
                  key={r.id}
                  onClick={() => onFocus(r.id)}
                  className={`cursor-pointer transition-colors ${focusId === r.id ? "bg-lime-50" : "hover:bg-slate-50"}`}
                >
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        r.durum === "kiralik" ? "bg-sky-100 text-sky-800" : "bg-lime-100 text-lime-800"
                      }`}
                    >
                      {r.durum === "kiralik" ? "Kiralık" : "Satılık"}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-medium text-slate-900">{r.emlakTipi || "—"}</td>
                  <td className="max-w-[220px] truncate px-3 py-2" title={[r.mahalle, r.ilce, r.il].filter(Boolean).join(", ")}>
                    {[r.mahalle, r.ilce, r.il].filter(Boolean).join(", ") || "—"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmtTam(alan(r))}</td>
                  <td className="px-3 py-2">{r.odaSayisi || "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.kat || "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.binaYasi || "—"}</td>
                  <td className="px-3 py-2 tabular-nums">
                    {r.ilanTarihi ? new Date(r.ilanTarihi).toLocaleDateString("tr-TR") : "—"}
                    {eskiIlanMi(r) && (
                      <span className="ml-1.5 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                        eski
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmtTam(fiyat(r))}</td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums text-slate-900">{fmt(birimFiyat(r))}</td>
                  {cevre && <td className="px-3 py-2 text-right tabular-nums">{m === null ? "—" : formatMesafe(m)}</td>}
                  <td className="max-w-[140px] truncate px-3 py-2 text-slate-500">{r.ekleyenAdSoyad || "—"}</td>
                  <td className="px-2 py-2" onClick={(e) => e.stopPropagation()}>
                    {canModify(r) && (
                      <button
                        type="button"
                        onClick={() => onEdit(r)}
                        className="rounded-full p-1 text-slate-300 hover:bg-slate-100 hover:text-slate-700"
                        aria-label="Kaydı düzenle"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {sayfaSayisi > 1 && (
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
          <span>
            {aktifSayfa * SAYFA_BOYUTU + 1}–{Math.min((aktifSayfa + 1) * SAYFA_BOYUTU, sirali.length)} / {sirali.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSayfa(aktifSayfa - 1)}
              disabled={aktifSayfa === 0}
              className="rounded-md border border-slate-200 p-1 hover:bg-slate-50 disabled:opacity-40"
              aria-label="Önceki sayfa"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="px-2">
              {aktifSayfa + 1} / {sayfaSayisi}
            </span>
            <button
              type="button"
              onClick={() => setSayfa(aktifSayfa + 1)}
              disabled={aktifSayfa >= sayfaSayisi - 1}
              className="rounded-md border border-slate-200 p-1 hover:bg-slate-50 disabled:opacity-40"
              aria-label="Sonraki sayfa"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- Grafikler */

function GrafikKarti({
  baslik,
  alt,
  aksiyon,
  children,
}: {
  baslik: string;
  alt?: string;
  aksiyon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-100 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">{baslik}</p>
          {alt && <p className="mt-0.5 text-[11px] text-slate-400">{alt}</p>}
        </div>
        {aksiyon}
      </div>
      <div className="mt-3 h-60 w-full">{children}</div>
    </div>
  );
}

function BosGrafik({ mesaj }: { mesaj: string }) {
  return <div className="flex h-full items-center justify-center text-xs text-slate-400">{mesaj}</div>;
}

function TooltipKutusu({ satirlar }: { satirlar: [string, string][] }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
      {satirlar.map(([k, v], i) => (
        <p key={k} className={i === 0 ? "mb-1 font-semibold text-slate-900" : "text-slate-600"}>
          {i === 0 ? k : `${k}: `}
          {i === 0 ? "" : <span className="font-medium text-slate-900">{v}</span>}
        </p>
      ))}
    </div>
  );
}

// A 1-2-5 step so bin edges read as round numbers.
function yuvarlakAdim(ham: number): number {
  const us = 10 ** Math.floor(Math.log10(ham));
  const oran = ham / us;
  return (oran <= 1 ? 1 : oran <= 2 ? 2 : oran <= 5 ? 5 : 10) * us;
}

interface Kutu {
  etiket: string;
  alt: number;
  ust: number;
  adet: number;
}

function histogram(values: number[]): Kutu[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) return [{ etiket: kisaFiyat(min), alt: min, ust: max, adet: values.length }];
  const adim = yuvarlakAdim((max - min) / 8);
  const baslangic = Math.floor(min / adim) * adim;
  const sayi = Math.floor((max - baslangic) / adim) + 1;
  const kutular: Kutu[] = Array.from({ length: sayi }, (_, i) => ({
    etiket: kisaFiyat(baslangic + i * adim),
    alt: baslangic + i * adim,
    ust: baslangic + (i + 1) * adim,
    adet: 0,
  }));
  values.forEach((v) => {
    kutular[Math.min(sayi - 1, Math.floor((v - baslangic) / adim))].adet += 1;
  });
  return kutular;
}

function EmsalGrafikleri({ records }: { records: EmsalHaritaKaydi[] }) {
  const satilikVar = records.some((r) => r.durum !== "kiralik");
  const kiralikVar = records.some((r) => r.durum === "kiralik");
  // Satılık and kiralık unit prices live on different scales, so charts show one durum at a time.
  const [secim, setSecim] = useState<EmsalDurum>(satilikVar ? "satilik" : "kiralik");
  const durum: EmsalDurum = secim === "kiralik" ? (kiralikVar ? "kiralik" : "satilik") : satilikVar ? "satilik" : "kiralik";
  const [bolgeSeviye, setBolgeSeviye] = useState<"ilce" | "mahalle">("mahalle");

  const kayitlar = useMemo(
    () => records.filter((r) => (durum === "kiralik" ? r.durum === "kiralik" : r.durum !== "kiralik")),
    [records, durum],
  );
  const fiyatli = useMemo(
    () =>
      kayitlar
        .map((r) => ({ r, birim: birimFiyat(r), alan: alan(r) }))
        .filter((x): x is { r: EmsalHaritaKaydi; birim: number; alan: number | null } => x.birim !== null),
    [kayitlar],
  );
  const stats = useMemo(() => istatistik(kayitlar), [kayitlar]);

  const dagilim = useMemo(() => histogram(fiyatli.map((x) => x.birim)), [fiyatli]);

  const bolgeler = useMemo(() => {
    const gruplar = new Map<string, number[]>();
    fiyatli.forEach(({ r, birim }) => {
      const ad = (bolgeSeviye === "mahalle" ? r.mahalle : r.ilce) || "Belirtilmemiş";
      gruplar.set(ad, [...(gruplar.get(ad) ?? []), birim]);
    });
    return [...gruplar.entries()]
      .map(([ad, list]) => ({ ad, medyan: medyan(list) ?? 0, adet: list.length }))
      .sort((a, b) => b.medyan - a.medyan)
      .slice(0, 10);
  }, [fiyatli, bolgeSeviye]);

  const dagilimNoktalari = useMemo(
    () =>
      fiyatli
        .filter((x): x is { r: EmsalHaritaKaydi; birim: number; alan: number } => x.alan !== null)
        .map((x) => ({ alan: x.alan, birim: x.birim, ad: x.r.emlakTipi, konum: x.r.mahalle || x.r.ilce })),
    [fiyatli],
  );

  const trend = useMemo(() => {
    const aylar = new Map<string, number[]>();
    fiyatli.forEach(({ r, birim }) => {
      const tarih = r.ilanTarihi || r.olusturmaTarihi;
      const ay = tarih.slice(0, 7);
      if (!/^\d{4}-\d{2}$/.test(ay)) return;
      aylar.set(ay, [...(aylar.get(ay) ?? []), birim]);
    });
    return [...aylar.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([ay, list]) => ({
        ay: new Date(`${ay}-01`).toLocaleDateString("tr-TR", { month: "short", year: "2-digit" }),
        medyan: medyan(list) ?? 0,
        adet: list.length,
      }));
  }, [fiyatli]);

  const yEksen = {
    tick,
    tickLine: false,
    axisLine: false,
    tickFormatter: (v: number) => kisaFiyat(v),
    width: 52,
  } as const;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg bg-slate-100 p-0.5">
          {(
            [
              ["satilik", "Satılık", satilikVar],
              ["kiralik", "Kiralık", kiralikVar],
            ] as const
          ).map(([value, label, var_]) => (
            <button
              key={value}
              type="button"
              disabled={!var_}
              onClick={() => setSecim(value)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                durum === value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500">
          {stats.fiyatliAdet} fiyatlı kayıt · medyan{" "}
          <strong className="text-slate-900">{fmt(stats.medyan)} ₺/m²</strong>
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <GrafikKarti baslik="Birim fiyat dağılımı" alt="₺/m² aralıklarına göre kayıt sayısı · kesikli çizgi medyan">
          {dagilim.length === 0 ? (
            <BosGrafik mesaj="Fiyat ve alanı girilmiş kayıt yok." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dagilim} margin={{ top: 16, right: 8, left: 0, bottom: 0 }} barCategoryGap={2}>
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis dataKey="etiket" tick={tick} tickLine={false} axisLine={{ stroke: EKSEN }} interval="preserveStartEnd" />
                <YAxis tick={tick} tickLine={false} axisLine={false} allowDecimals={false} width={28} />
                <Tooltip
                  cursor={{ fill: "#f1f5f9" }}
                  content={({ active, payload }) => {
                    const k = payload?.[0]?.payload as Kutu | undefined;
                    if (!active || !k) return null;
                    return (
                      <TooltipKutusu
                        satirlar={[
                          [`${fmtTam(k.alt)} – ${fmtTam(k.ust)} ₺/m²`, ""],
                          ["Kayıt", String(k.adet)],
                        ]}
                      />
                    );
                  }}
                />
                {stats.medyan !== null && (
                  <ReferenceLine
                    x={dagilim.find((k) => stats.medyan! >= k.alt && stats.medyan! < k.ust)?.etiket ?? dagilim[dagilim.length - 1].etiket}
                    stroke="#0f172a"
                    strokeDasharray="4 4"
                    label={{ value: "medyan", position: "top", fontSize: 10, fill: MUTED }}
                  />
                )}
                <Bar dataKey="adet" fill={SERI_RENK} radius={[4, 4, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </GrafikKarti>

        <GrafikKarti
          baslik={`${bolgeSeviye === "mahalle" ? "Mahallelere" : "İlçelere"} göre medyan ₺/m²`}
          alt="En yüksek 10 bölge · soluk çubuk tek kayda dayanır"
          aksiyon={
            <select
              value={bolgeSeviye}
              onChange={(e) => setBolgeSeviye(e.target.value as "ilce" | "mahalle")}
              className="shrink-0 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600"
              aria-label="Bölge seviyesi"
            >
              <option value="mahalle">Mahalle</option>
              <option value="ilce">İlçe</option>
            </select>
          }
        >
          {bolgeler.length === 0 ? (
            <BosGrafik mesaj="Fiyat ve alanı girilmiş kayıt yok." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bolgeler} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }} barCategoryGap={4}>
                <CartesianGrid horizontal={false} stroke={GRID} />
                <XAxis type="number" {...yEksen} axisLine={{ stroke: EKSEN }} width={undefined} />
                <YAxis type="category" dataKey="ad" tick={tick} tickLine={false} axisLine={false} width={96} />
                <Tooltip
                  cursor={{ fill: "#f1f5f9" }}
                  content={({ active, payload }) => {
                    const b = payload?.[0]?.payload as (typeof bolgeler)[number] | undefined;
                    if (!active || !b) return null;
                    return (
                      <TooltipKutusu
                        satirlar={[
                          [b.ad, ""],
                          ["Medyan", `${fmt(b.medyan)} ₺/m²`],
                          ["Kayıt", String(b.adet)],
                        ]}
                      />
                    );
                  }}
                />
                <Bar dataKey="medyan" radius={[0, 4, 4, 0]} maxBarSize={18}>
                  {bolgeler.map((b) => (
                    <Cell key={b.ad} fill={b.adet > 1 ? SERI_RENK : SERI_RENK_SOLUK} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </GrafikKarti>

        <GrafikKarti baslik="Alan – birim fiyat ilişkisi" alt="Her nokta bir emsal · yatay: m², dikey: ₺/m²">
          {dagilimNoktalari.length === 0 ? (
            <BosGrafik mesaj="Alanı girilmiş kayıt yok." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={GRID} />
                <XAxis
                  type="number"
                  dataKey="alan"
                  name="m²"
                  tick={tick}
                  tickLine={false}
                  axisLine={{ stroke: EKSEN }}
                  domain={["auto", "auto"]}
                  tickFormatter={(v: number) => `${v.toLocaleString("tr-TR")}`}
                />
                <YAxis type="number" dataKey="birim" name="₺/m²" domain={["auto", "auto"]} {...yEksen} />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3", stroke: EKSEN }}
                  content={({ active, payload }) => {
                    const p = payload?.[0]?.payload as (typeof dagilimNoktalari)[number] | undefined;
                    if (!active || !p) return null;
                    return (
                      <TooltipKutusu
                        satirlar={[
                          [[p.ad, p.konum].filter(Boolean).join(" · ") || "Emsal", ""],
                          ["Alan", `${fmtTam(p.alan)} m²`],
                          ["Birim fiyat", `${fmt(p.birim)} ₺/m²`],
                        ]}
                      />
                    );
                  }}
                />
                {stats.medyan !== null && <ReferenceLine y={stats.medyan} stroke="#0f172a" strokeDasharray="4 4" />}
                <Scatter data={dagilimNoktalari} fill={SERI_RENK} stroke="#fff" strokeWidth={2} shape="circle" />
              </ScatterChart>
            </ResponsiveContainer>
          )}
        </GrafikKarti>

        <GrafikKarti baslik="Aylık medyan ₺/m²" alt="İlan tarihine göre (yoksa eklenme tarihi)">
          {trend.length < 2 ? (
            <BosGrafik mesaj="Trend için en az iki farklı aya ait kayıt gerekli." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis dataKey="ay" tick={tick} tickLine={false} axisLine={{ stroke: EKSEN }} />
                <YAxis domain={["auto", "auto"]} {...yEksen} />
                <Tooltip
                  cursor={{ stroke: "#94a3b8", strokeDasharray: "3 3" }}
                  content={({ active, payload }) => {
                    const t = payload?.[0]?.payload as (typeof trend)[number] | undefined;
                    if (!active || !t) return null;
                    return (
                      <TooltipKutusu
                        satirlar={[
                          [t.ay, ""],
                          ["Medyan", `${fmt(t.medyan)} ₺/m²`],
                          ["Kayıt", String(t.adet)],
                        ]}
                      />
                    );
                  }}
                />
                <Line
                  type="linear"
                  dataKey="medyan"
                  stroke={SERI_RENK}
                  strokeWidth={2}
                  dot={{ r: 4, fill: SERI_RENK, stroke: "#fff", strokeWidth: 2 }}
                  activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </GrafikKarti>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- Bölge Özeti */

type Seviye = "il" | "ilce" | "mahalle";

function BolgeOzeti({ records }: { records: EmsalHaritaKaydi[] }) {
  const [seviye, setSeviye] = useState<Seviye>("ilce");

  const satirlar = useMemo(() => {
    const anahtar = (r: EmsalHaritaKaydi) =>
      seviye === "il"
        ? r.il || "Belirtilmemiş"
        : seviye === "ilce"
          ? [r.il, r.ilce || "Belirtilmemiş"].join(" / ")
          : [r.ilce, r.mahalle || "Belirtilmemiş"].filter(Boolean).join(" / ");
    const gruplar = new Map<string, EmsalHaritaKaydi[]>();
    records.forEach((r) => gruplar.set(anahtar(r), [...(gruplar.get(anahtar(r)) ?? []), r]));
    return [...gruplar.entries()]
      .map(([ad, list]) => {
        const satilik = istatistik(list.filter((r) => r.durum !== "kiralik"));
        const kiralik = istatistik(list.filter((r) => r.durum === "kiralik"));
        const alanlar = list.map(alan).filter((v): v is number => v !== null);
        return {
          ad,
          adet: list.length,
          satilik,
          kiralik,
          ortAlan: alanlar.length ? alanlar.reduce((s, v) => s + v, 0) / alanlar.length : null,
        };
      })
      .sort((a, b) => b.adet - a.adet || a.ad.localeCompare(b.ad, "tr"));
  }, [records, seviye]);

  // Horizontal in-cell bar scaled to the highest satılık median in view.
  const enYuksek = Math.max(0, ...satirlar.map((s) => s.satilik.medyan ?? 0));

  return (
    <div>
      <div className="mb-3 inline-flex rounded-lg bg-slate-100 p-0.5">
        {(
          [
            ["il", "İl"],
            ["ilce", "İlçe"],
            ["mahalle", "Mahalle"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setSeviye(value)}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              seviye === value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-100">
        <table className="w-full min-w-[760px] text-left text-xs">
          <thead className="bg-slate-50 text-[11px] text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">Bölge</th>
              <th className="px-3 py-2 text-right font-medium">Kayıt</th>
              <th className="px-3 py-2 font-medium">Satılık medyan ₺/m²</th>
              <th className="px-3 py-2 text-right font-medium">Satılık aralık</th>
              <th className="px-3 py-2 text-right font-medium">Kiralık medyan ₺/m²</th>
              <th className="px-3 py-2 text-right font-medium">Ort. m²</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {satirlar.map((s) => (
              <tr key={s.ad} className="hover:bg-slate-50">
                <td className="px-3 py-2 font-medium text-slate-900">{s.ad}</td>
                <td className="px-3 py-2 text-right tabular-nums">{s.adet}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="w-20 shrink-0 text-right font-semibold tabular-nums text-slate-900">
                      {fmtTam(s.satilik.medyan)}
                    </span>
                    {s.satilik.medyan !== null && enYuksek > 0 && (
                      <span className="h-1.5 flex-1 rounded-full bg-slate-100">
                        <span
                          className="block h-full rounded-full"
                          style={{ width: `${(s.satilik.medyan / enYuksek) * 100}%`, background: SERI_RENK }}
                        />
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-500">
                  {s.satilik.min === null ? "—" : `${fmtTam(s.satilik.min)} – ${fmtTam(s.satilik.max)}`}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{fmtTam(s.kiralik.medyan)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{fmtTam(s.ortAlan)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
