"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  Calculator,
  ChartPie,
  CircleCheck,
  Copy,
  Download,
  Gauge,
  Layers,
  Plus,
  Ruler,
  Scale,
  Star,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { TextField, tableInputClass } from "@/components/talep/form-fields";
import { formatTrNumber, parseTrNumber } from "@/lib/emsal/hesaplama";
import {
  YONTEM_ADLARI,
  alanFarkiMetni,
  birimleHesapla,
  emsalDayanagi,
  hesaplaAlanFarki,
  hesaplaHisseli,
  hesaplaNormal,
  hesaplaSeviyeli,
  hisseliMetni,
  normalMetni,
  seviyeliMetni,
  tutarYaziyla,
  yontemBirimi,
  yontemSonuclari,
  yuvarla,
  type EmsalDayanagi,
} from "@/lib/talep/deger-hesaplama";
import {
  newRowId,
  type DegerHesaplamalari,
  type EmsalKaydi,
  type HesapYontemi,
  type HisseSatiri,
  type MulkiyetKaydi,
} from "@/lib/talep/types";

const para = (v: number) => `${formatTrNumber(v)} ₺`;
const yuzde = (oran: number) => `%${(oran * 100).toLocaleString("tr-TR", { maximumFractionDigits: 4 })}`;

type HesapKey = HesapYontemi;

// Deviation of a unit value from the emsal median, as a signed percentage badge.
function SapmaRozeti({ birim, medyan }: { birim: number | null; medyan: number | null }) {
  if (birim === null || medyan === null || medyan <= 0) return null;
  const fark = Math.round(((birim - medyan) / medyan) * 100);
  const renk =
    Math.abs(fark) <= 10
      ? "bg-emerald-50 text-emerald-700"
      : Math.abs(fark) <= 25
        ? "bg-amber-50 text-amber-700"
        : "bg-rose-50 text-rose-700";
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${renk}`}>
      Emsal medyanının {fark > 0 ? `%${fark} üstünde` : fark < 0 ? `%${-fark} altında` : "tam üzerinde"}
    </span>
  );
}

function CalcCard({
  icon,
  title,
  description,
  sonuc,
  sonucEtiketi = "Hesaplanan Değer",
  sonucAciklama,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  sonuc: number | null;
  sonucEtiketi?: string;
  sonucAciklama?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <header className="flex items-start gap-3 border-b border-slate-100 p-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lime-100 text-lime-800">
          {icon}
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{description}</p>
        </div>
      </header>

      <div className="flex-1 space-y-4 p-4">{children}</div>

      <footer className="rounded-b-2xl border-t border-lime-100 bg-lime-50/70 px-4 py-3">
        <p className="text-[11px] font-medium uppercase tracking-wider text-lime-800">{sonucEtiketi}</p>
        <p className="text-xl font-semibold tabular-nums text-slate-900">{sonuc === null ? "—" : para(sonuc)}</p>
        {sonucAciklama && <p className="text-xs text-slate-500">{sonucAciklama}</p>}
      </footer>
    </section>
  );
}

// Titled sub-block inside a calculation card.
function AltBlok({ baslik, children }: { baslik: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
      <h4 className="mb-3 text-xs font-semibold text-slate-700">{baslik}</h4>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function BirimDegerField({
  label = "Birim Değer (₺/m²)",
  value,
  onChange,
  dayanak,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  dayanak: EmsalDayanagi;
}) {
  const oneriler = [
    { ad: "Ortalama net", deger: dayanak.ortalamaNet },
    { ad: "Medyan net", deger: dayanak.medyanNet },
    { ad: "Ortalama birim", deger: dayanak.ortalamaBirim },
  ].filter((o): o is { ad: string; deger: number } => o.deger !== null);
  const girilen = parseTrNumber(value);
  return (
    <div>
      <TextField label={label} value={value} onChange={onChange} placeholder="Örn. 12.500" />
      {oneriler.length > 0 && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          <span className="text-[11px] text-slate-400">Emsallerden:</span>
          {oneriler.map((o) => (
            <button
              key={o.ad}
              type="button"
              onClick={() => onChange(formatTrNumber(o.deger))}
              title={`${formatTrNumber(o.deger)} ₺/m²`}
              className="rounded-md bg-lime-50 px-2 py-0.5 text-[11px] font-medium text-lime-800 ring-1 ring-lime-200 hover:bg-lime-100"
            >
              {o.ad} · {formatTrNumber(o.deger)}
            </button>
          ))}
        </div>
      )}
      <div className="mt-1.5">
        <SapmaRozeti birim={girilen} medyan={dayanak.medyanNet} />
      </div>
    </div>
  );
}

function HesapAlani({ label, value }: { label: string; value: number | null }) {
  return (
    <TextField
      label={label}
      value={value === null ? "" : para(value)}
      onChange={() => {}}
      readOnly
      placeholder="Otomatik hesaplanır"
    />
  );
}

function AkiciMetin({ metin }: { metin: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(metin);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the text stays selectable in the box.
    }
  }

  return (
    <AltBlok baslik="Akıcı Metin">
      {metin ? (
        <>
          <pre className="whitespace-pre-wrap rounded-lg border border-slate-100 bg-white p-3 font-sans text-sm leading-relaxed text-slate-700">
            {metin}
          </pre>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={copy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              {copied ? <CircleCheck className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Kopyalandı" : "Metni Kopyala"}
            </button>
          </div>
        </>
      ) : (
        <p className="text-sm text-slate-400">Metin, alan ve birim fiyat girildikçe otomatik oluşur.</p>
      )}
    </AltBlok>
  );
}

const ekleButtonClass =
  "inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-slate-400 hover:bg-slate-50";

function Th({ children, right = false }: { children: ReactNode; right?: boolean }) {
  return (
    <th
      className={`py-2 pr-2 text-[11px] font-medium uppercase tracking-wider text-slate-400 ${right ? "text-right" : ""}`}
    >
      {children}
    </th>
  );
}

// Headline card: the method put forward in the report (or the one on screen),
// its value in figures and in words, and every method's result to choose from.
function DegerOzeti({
  sonuclar,
  esas,
  gosterilen,
  birim,
  medyan,
  onEsasSec,
}: {
  sonuclar: Record<HesapYontemi, number | null>;
  esas: HesapYontemi | "";
  gosterilen: HesapYontemi;
  birim: number | null;
  medyan: number | null;
  onEsasSec: (y: HesapYontemi | "") => void;
}) {
  const [kopyalandi, setKopyalandi] = useState(false);
  const deger = sonuclar[gosterilen];
  const dolular = (Object.keys(sonuclar) as HesapYontemi[]).filter((y) => sonuclar[y] !== null);
  // Seviyeli / hisseli already round to 5.000; the others are shown rounded too.
  const yuvarlanmis = deger === null ? null : yuvarla(deger);

  async function yaziyiKopyala() {
    if (yuvarlanmis === null) return;
    try {
      await navigator.clipboard.writeText(`${formatTrNumber(yuvarlanmis)} TL (${tutarYaziyla(yuvarlanmis)})`);
      setKopyalandi(true);
      window.setTimeout(() => setKopyalandi(false), 2000);
    } catch {
      // Clipboard blocked: the text is on screen to select.
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl bg-slate-900 text-white shadow-lg shadow-slate-900/10">
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="p-5">
          <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-slate-400">
            <Scale className="h-3.5 w-3.5" />
            {esas ? "Rapora esas değer" : "Hesaplanan değer"} · {YONTEM_ADLARI[gosterilen]}
          </p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-lime-300 sm:text-4xl">
            {yuvarlanmis === null ? "—" : `${formatTrNumber(yuvarlanmis)} ₺`}
          </p>
          {yuvarlanmis !== null ? (
            <>
              <p className="mt-1 text-sm text-slate-300">{tutarYaziyla(yuvarlanmis)}</p>
              {deger !== null && Math.abs(deger - yuvarlanmis) >= 0.5 && (
                <p className="mt-0.5 text-xs text-slate-500">
                  Hesaplanan {formatTrNumber(deger)} ₺, en yakın 5.000&apos;e yuvarlandı.
                </p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={yaziyiKopyala}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/15"
                >
                  {kopyalandi ? <CircleCheck className="h-3.5 w-3.5 text-lime-300" /> : <Copy className="h-3.5 w-3.5" />}
                  {kopyalandi ? "Kopyalandı" : "Rakam ve yazıyla kopyala"}
                </button>
                {birim !== null && (
                  <span className="text-xs text-slate-400">Birim değer {formatTrNumber(birim)} ₺/m²</span>
                )}
                <SapmaRozeti birim={birim} medyan={medyan} />
              </div>
            </>
          ) : (
            <p className="mt-1 text-sm text-slate-400">Seçili yöntemin alanlarını doldurdukça değer burada görünür.</p>
          )}
        </div>

        <div className="border-t border-white/10 p-4 lg:border-l lg:border-t-0">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-slate-400">Rapora esas yöntem</p>
          <ul className="space-y-1">
            {(Object.keys(sonuclar) as HesapYontemi[]).map((y) => {
              const aktif = esas === y;
              return (
                <li key={y}>
                  <button
                    type="button"
                    disabled={sonuclar[y] === null}
                    onClick={() => onEsasSec(aktif ? "" : y)}
                    aria-pressed={aktif}
                    className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                      aktif ? "bg-lime-300 text-slate-900" : "hover:bg-white/10"
                    }`}
                  >
                    <Star className={`h-3.5 w-3.5 shrink-0 ${aktif ? "fill-slate-900" : "text-slate-500"}`} />
                    <span className="flex-1 font-medium">{YONTEM_ADLARI[y]}</span>
                    <span className="tabular-nums">{sonuclar[y] === null ? "—" : para(sonuclar[y]!)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
            {esas
              ? "Rapor bu yöntemin değerini öne çıkarır. Kaldırmak için tekrar tıklayın."
              : dolular.length > 1
                ? "Birden fazla yöntem dolu: rapora hangisinin esas alınacağını seçin."
                : "Tek yöntem doluysa rapor onu kullanır; birden fazlaysa esas yöntemi seçin."}
          </p>
        </div>
      </div>
    </section>
  );
}

function EmsalDayanagiPaneli({ dayanak }: { dayanak: EmsalDayanagi }) {
  const dolu = dayanak.satirlar.filter((s) => s.birim !== null);
  const cv = dayanak.degisimKatsayisi;
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        <Scale className="h-4 w-4 text-lime-700" />
        Emsal Dayanağı
      </h3>
      <p className="mt-0.5 text-xs text-slate-500">Emsal Girişleri&apos;ndeki satılık emsaller (şerefiye sonrası net).</p>
      {dolu.length === 0 ? (
        <p className="mt-3 rounded-lg bg-slate-50 px-3 py-3 text-xs text-slate-500">
          Henüz birim fiyatı hesaplanan satılık emsal yok. Emsal Girişleri&apos;nde pazarlıklı fiyat ve gerçekçi alan girin.
        </p>
      ) : (
        <>
          <table className="mt-3 w-full text-xs">
            <thead className="text-[10px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="pb-1 text-left font-medium">Emsal</th>
                <th className="pb-1 text-right font-medium">Birim</th>
                <th className="pb-1 text-right font-medium">Net</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dayanak.satirlar.map((sat) => (
                <tr key={sat.etiket} className={sat.birim === null ? "text-slate-300" : "text-slate-700"}>
                  <td className="py-1.5">
                    <span className="font-medium">{sat.etiket}</span>
                    {sat.konum && <span className="block truncate text-[10px] text-slate-400">{sat.konum}</span>}
                  </td>
                  <td className="py-1.5 text-right tabular-nums">{sat.birim === null ? "—" : formatTrNumber(sat.birim)}</td>
                  <td className="py-1.5 text-right font-semibold tabular-nums">
                    {sat.net === null ? "—" : formatTrNumber(sat.net)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg bg-lime-50 px-2.5 py-2">
              <dt className="text-[10px] text-lime-800">Ortalama net</dt>
              <dd className="font-semibold tabular-nums text-slate-900">
                {dayanak.ortalamaNet === null ? "—" : formatTrNumber(dayanak.ortalamaNet)}
              </dd>
            </div>
            <div className="rounded-lg bg-slate-50 px-2.5 py-2">
              <dt className="text-[10px] text-slate-500">Medyan net</dt>
              <dd className="font-semibold tabular-nums text-slate-900">
                {dayanak.medyanNet === null ? "—" : formatTrNumber(dayanak.medyanNet)}
              </dd>
            </div>
            <div className="rounded-lg bg-slate-50 px-2.5 py-2">
              <dt className="text-[10px] text-slate-500">Aralık</dt>
              <dd className="font-medium tabular-nums text-slate-800">
                {dayanak.minNet === null ? "—" : `${formatTrNumber(dayanak.minNet)} – ${formatTrNumber(dayanak.maxNet!)}`}
              </dd>
            </div>
            <div className="rounded-lg bg-slate-50 px-2.5 py-2">
              <dt className="text-[10px] text-slate-500">Değişim katsayısı</dt>
              <dd
                className={`font-semibold tabular-nums ${
                  cv === null ? "text-slate-800" : cv <= 0.15 ? "text-emerald-700" : cv <= 0.3 ? "text-amber-700" : "text-rose-700"
                }`}
              >
                {cv === null ? "—" : `%${Math.round(cv * 100)}`}
              </dd>
            </div>
          </dl>
          {cv !== null && cv > 0.3 && (
            <p className="mt-2 flex items-start gap-1.5 text-[11px] text-rose-700">
              <TriangleAlert className="mt-0.5 h-3 w-3 shrink-0" />
              Emsaller birbirinden çok farklı; şerefiye düzeltmelerini gözden geçirin.
            </p>
          )}
        </>
      )}
    </section>
  );
}

const DUYARLILIK_ADIMLARI = [-0.1, -0.05, 0, 0.05, 0.1];

// How the active method's result moves when only the unit value changes.
function DuyarlilikTablosu({ yontem, value }: { yontem: HesapYontemi; value: DegerHesaplamalari }) {
  const birim = yontemBirimi(yontem, value);
  const temel = birim === null ? null : birimleHesapla(yontem, value, birim);
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        <Gauge className="h-4 w-4 text-lime-700" />
        Duyarlılık
      </h3>
      <p className="mt-0.5 text-xs text-slate-500">{YONTEM_ADLARI[yontem]}: birim değer değişirse sonuç.</p>
      {birim === null || temel === null ? (
        <p className="mt-3 rounded-lg bg-slate-50 px-3 py-3 text-xs text-slate-500">
          Alan ve birim değer girildiğinde hesaplanır.
        </p>
      ) : (
        <table className="mt-3 w-full text-xs">
          <thead className="text-[10px] uppercase tracking-wider text-slate-400">
            <tr>
              <th className="pb-1 text-left font-medium">Değişim</th>
              <th className="pb-1 text-right font-medium">₺/m²</th>
              <th className="pb-1 text-right font-medium">Değer</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {DUYARLILIK_ADIMLARI.map((adim) => {
              const b = birim * (1 + adim);
              const d = birimleHesapla(yontem, value, b);
              const merkez = adim === 0;
              return (
                <tr key={adim} className={merkez ? "bg-lime-50 font-semibold text-slate-900" : "text-slate-700"}>
                  <td className="py-1.5 pl-1">{merkez ? "Mevcut" : `${adim > 0 ? "+" : "−"}%${Math.abs(adim * 100)}`}</td>
                  <td className="py-1.5 text-right tabular-nums">{formatTrNumber(b)}</td>
                  <td className="py-1.5 pr-1 text-right tabular-nums">{d === null ? "—" : para(d)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}

export default function DegerHesaplamasi({
  value,
  onChange,
  emsalKayitlari,
  mulkiyetKayitlari,
}: {
  value: DegerHesaplamalari;
  onChange: (next: DegerHesaplamalari) => void;
  emsalKayitlari: { etiket: string; kaydi: EmsalKaydi }[];
  mulkiyetKayitlari: MulkiyetKaydi[];
}) {
  const { normal, alanFarki, seviyeli, hisseli } = value;
  // Open on the method chosen for the report, if any.
  const [aktif, setAktif] = useState<HesapKey>(value.esasYontem || "normal");
  const dayanak = useMemo(() => emsalDayanagi(emsalKayitlari), [emsalKayitlari]);
  const sonuclar = yontemSonuclari(value);
  const gosterilen: HesapYontemi = value.esasYontem || aktif;

  const normalSonuc = hesaplaNormal(normal);
  const farkSonuc = hesaplaAlanFarki(alanFarki);
  const seviyeSonuc = hesaplaSeviyeli(seviyeli);
  const hisseSonuc = hesaplaHisseli(hisseli);

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

  const secenekler: { key: HesapKey; icon: ReactNode; title: string; description: string; sonuc: number | null }[] = [
    {
      key: "normal",
      icon: <Calculator className="h-5 w-5" />,
      title: "Normal Değerleme",
      description: "Alan × birim değer",
      sonuc: normalSonuc,
    },
    {
      key: "alanFarki",
      icon: <Ruler className="h-5 w-5" />,
      title: "Alan Farkı Değerleme",
      description: "Resmi ve fiili alan farkı",
      sonuc: farkSonuc?.toplam ?? null,
    },
    {
      key: "seviyeli",
      icon: <Layers className="h-5 w-5" />,
      title: "Seviyeli Değerleme",
      description: "Bitmesi halindeki değer − kalan maliyet",
      sonuc: seviyeSonuc.guncel,
    },
    {
      key: "hisseli",
      icon: <ChartPie className="h-5 w-5" />,
      title: "Hisseli Değerleme",
      description: "Pay / payda oranına göre",
      sonuc: hisseSonuc.durum?.yuvarlanmis ?? null,
    },
  ];

  return (
    <div className="space-y-4">
      <DegerOzeti
        sonuclar={sonuclar}
        esas={value.esasYontem}
        gosterilen={gosterilen}
        birim={yontemBirimi(gosterilen, value)}
        medyan={dayanak.medyanNet}
        onEsasSec={(y) => onChange({ ...value, esasYontem: y })}
      />

      <div role="group" aria-label="Değerleme yöntemi" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {secenekler.map((s) => {
          const active = aktif === s.key;
          return (
            <button
              key={s.key}
              type="button"
              aria-pressed={active}
              onClick={() => setAktif(s.key)}
              className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition-all ${
                active
                  ? "border-lime-400 bg-lime-50 shadow-[0_0_0_3px_rgba(190,242,100,0.45)]"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
              }`}
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  active ? "bg-lime-300 text-slate-900" : "bg-slate-100 text-slate-600"
                }`}
              >
                {s.icon}
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                  {s.title}
                  {value.esasYontem === s.key && (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-slate-900 px-1.5 py-0.5 text-[10px] font-semibold text-lime-300">
                      <Star className="h-2.5 w-2.5 fill-lime-300" />
                      Esas
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block text-xs text-slate-500">{s.description}</span>
                <span className="mt-1.5 block text-xs font-medium tabular-nums text-slate-700">
                  {s.sonuc === null ? <span className="text-slate-300">Henüz hesaplanmadı</span> : para(s.sonuc)}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          {aktif === "normal" && (
            <CalcCard
              icon={<Calculator className="h-5 w-5" />}
              title="Normal Değerleme"
              description="Değerlenen alan ile birim değerin çarpımı."
              sonuc={normalSonuc}
              sonucAciklama="Alan × Birim Değer"
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
                  dayanak={dayanak}
                />
              </div>
              <AkiciMetin metin={normalMetni(normal)} />
            </CalcCard>
          )}

          {aktif === "alanFarki" && (
            <CalcCard
              icon={<Ruler className="h-5 w-5" />}
              title="Alan Farkı Değerleme"
              description="Resmi alan ile fiili alan arasındaki fark, belirlenen katsayıyla değerlenir."
              sonuc={farkSonuc?.toplam ?? null}
              sonucAciklama="Resmi alan değeri + Fark alanı değeri"
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
                  dayanak={dayanak}
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
              <AkiciMetin metin={alanFarkiMetni(alanFarki)} />
            </CalcCard>
          )}

          {aktif === "seviyeli" && (
            <CalcCard
              icon={<Layers className="h-5 w-5" />}
              title="Seviyeli Değerleme"
              description="Bitmesi halindeki değerden kalan maliyet düşülerek güncel satış değeri bulunur."
              sonuc={seviyeSonuc.guncel}
              sonucEtiketi="Güncel Satış Değeri"
              sonucAciklama="Yuvarlanmış Fiyat − Yuvarlanmış Maliyet Fiyatı"
            >
              <AltBlok baslik="Bitmesi Halinde Değer Hesaplaması">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <TextField
                    label="Yasal ve Mevcut Alan (m²)"
                    value={seviyeli.alanM2}
                    onChange={(v) => onChange({ ...value, seviyeli: { ...seviyeli, alanM2: v } })}
                    placeholder="Örn. 125"
                  />
                  <BirimDegerField
                    label="Birim Fiyat (₺/m²)"
                    value={seviyeli.birimFiyat}
                    onChange={(v) => onChange({ ...value, seviyeli: { ...seviyeli, birimFiyat: v } })}
                    dayanak={dayanak}
                  />
                  <HesapAlani label="Net Fiyat" value={seviyeSonuc.durum?.net ?? null} />
                  <HesapAlani label="Yuvarlanmış Fiyat" value={seviyeSonuc.durum?.yuvarlanmis ?? null} />
                </div>
                <p className="text-xs text-slate-400">
                  Net Fiyat = Yasal ve Mevcut Alan × Birim Fiyat. Yuvarlanmış Fiyat, Net Fiyatın en yakın 5.000 katıdır.
                </p>
              </AltBlok>

              <AltBlok baslik="Kalan Maliyet Hesaplaması">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <TextField
                    label="Maliyet Birim Fiyat (₺/m²)"
                    value={seviyeli.maliyetBirimFiyat}
                    onChange={(v) => onChange({ ...value, seviyeli: { ...seviyeli, maliyetBirimFiyat: v } })}
                    placeholder="Örn. 8.000"
                  />
                  <TextField
                    label="Seviye Oranı (%)"
                    value={seviyeli.seviyeOrani}
                    onChange={(v) => onChange({ ...value, seviyeli: { ...seviyeli, seviyeOrani: v } })}
                    placeholder="Örn. 60"
                  />
                  <HesapAlani label="Net Maliyet Fiyatı" value={seviyeSonuc.maliyet?.net ?? null} />
                  <HesapAlani label="Yuvarlanmış Maliyet Fiyatı" value={seviyeSonuc.maliyet?.yuvarlanmis ?? null} />
                </div>
                <p className="text-xs text-slate-400">
                  Net Maliyet Fiyatı = Yasal ve Mevcut Alan × Maliyet Birim Fiyat × (1 − Seviye Oranı). Seviye oranı 0–100
                  arasında yüzde olarak girilir.
                </p>
              </AltBlok>

              <AltBlok baslik="Güncel Satış Değeri Hesaplaması">
                <div className="max-w-sm">
                  <HesapAlani label="Güncel Satış Değeri" value={seviyeSonuc.guncel} />
                </div>
              </AltBlok>

              <AkiciMetin metin={seviyeliMetni(seviyeSonuc)} />
            </CalcCard>
          )}

          {aktif === "hisseli" && (
            <CalcCard
              icon={<ChartPie className="h-5 w-5" />}
              title="Hisseli Değerleme"
              description="Yasal ve mevcut durum değeri, hissedarların pay / payda oranlarına göre paylaştırılır."
              sonuc={hisseSonuc.durum?.yuvarlanmis ?? null}
              sonucEtiketi="Yasal ve Mevcut Durum Değeri"
              sonucAciklama={
                hisseSonuc.hesaplananSatir > 0 ? `Toplam hisse: ${yuzde(hisseSonuc.toplamOran)}` : "Yuvarlanmış Fiyat"
              }
            >
              <AltBlok baslik="Yasal ve Mevcut Durum Değeri">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <TextField
                    label="Yasal ve Mevcut Alan (m²)"
                    value={hisseli.alanM2}
                    onChange={(v) => onChange({ ...value, hisseli: { ...hisseli, alanM2: v } })}
                    placeholder="Örn. 125"
                  />
                  <BirimDegerField
                    label="Birim Fiyat (₺/m²)"
                    value={hisseli.birimFiyat}
                    onChange={(v) => onChange({ ...value, hisseli: { ...hisseli, birimFiyat: v } })}
                    dayanak={dayanak}
                  />
                  <HesapAlani label="Net Fiyat" value={hisseSonuc.durum?.net ?? null} />
                  <HesapAlani label="Yuvarlanmış Fiyat" value={hisseSonuc.durum?.yuvarlanmis ?? null} />
                </div>
                <p className="text-xs text-slate-400">
                  Net Fiyat = Yasal ve Mevcut Alan × Birim Fiyat. Yuvarlanmış Fiyat, Net Fiyatın en yakın 5.000 katıdır.
                </p>
              </AltBlok>

              <AltBlok baslik="Hissedarlar">
                {hisseli.satirlar.length > 0 && (
                  <div className="-mx-4 overflow-x-auto px-4">
                    <table className="w-full min-w-[640px] text-left text-sm">
                      <thead>
                        <tr>
                          <Th>Hissedar Adı / Soyadı</Th>
                          <Th>Pay</Th>
                          <Th>Payda</Th>
                          <Th right>Hisse Değeri (₺)</Th>
                          <th className="w-8" />
                        </tr>
                      </thead>
                      <tbody>
                        {hisseli.satirlar.map((s) => {
                          const sonuc = hisseSonuc.satirlar[s.id] ?? null;
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
                              <td className="whitespace-nowrap py-2 pr-2 text-right font-medium tabular-nums text-slate-800">
                                {sonuc ? para(sonuc.deger) : <span className="text-slate-300">—</span>}
                              </td>
                              <td className="py-2 text-right">
                                <button
                                  type="button"
                                  aria-label="Hissedarı sil"
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

                {hisseSonuc.toplamOran > 1.000001 && (
                  <p className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                    <TriangleAlert className="h-4 w-4 shrink-0" />
                    Toplam hisse oranı {yuzde(hisseSonuc.toplamOran)}; %100&apos;ü aşıyor, pay / payda değerlerini kontrol
                    edin.
                  </p>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2">
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
                      Hissedar Ekle
                    </button>
                    {mulkiyetKayitlari.length > 0 && (
                      <button type="button" onClick={tapudanGetir} className={ekleButtonClass}>
                        <Download className="h-3.5 w-3.5" />
                        Tapu Kaydından Getir
                      </button>
                    )}
                  </div>
                  {mulkiyetKayitlari.length > 0 && hisseli.satirlar.length > 0 && (
                    <span className="text-xs text-slate-400">
                      &quot;Tapu Kaydından Getir&quot; mevcut satırların yerine geçer.
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400">Hisse Değeri = Yuvarlanmış Fiyat × Pay / Payda.</p>
              </AltBlok>

              <AkiciMetin metin={hisseliMetni(hisseli, hisseSonuc)} />
            </CalcCard>
          )}
        </div>
        <aside className="space-y-4">
          <EmsalDayanagiPaneli dayanak={dayanak} />
          <DuyarlilikTablosu yontem={aktif} value={value} />
        </aside>
      </div>
    </div>
  );
}
