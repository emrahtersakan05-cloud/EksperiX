"use client";

import { useState, type ReactNode } from "react";
import {
  Calculator,
  ChartPie,
  CircleCheck,
  Copy,
  Download,
  Layers,
  Plus,
  Ruler,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { TextField, tableInputClass } from "@/components/talep/form-fields";
import { formatTrNumber } from "@/lib/emsal/hesaplama";
import {
  hesaplaAlanFarki,
  hesaplaHisseli,
  hesaplaNormal,
  hesaplaSeviyeli,
  hisseliMetni,
  seviyeliMetni,
} from "@/lib/talep/deger-hesaplama";
import { newRowId, type DegerHesaplamalari, type HisseSatiri, type MulkiyetKaydi } from "@/lib/talep/types";

const para = (v: number) => `${formatTrNumber(v)} ₺`;
const yuzde = (oran: number) => `%${(oran * 100).toLocaleString("tr-TR", { maximumFractionDigits: 4 })}`;

type HesapKey = "normal" | "alanFarki" | "seviyeli" | "hisseli";

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
  sonucEtiketi = "Hesaplanan Değer",
  sonucAciklama,
  onUse,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  sonuc: number | null;
  sonucEtiketi?: string;
  sonucAciklama?: string;
  onUse: (deger: number) => void;
  children: ReactNode;
}) {
  const [used, setUsed] = useState(false);

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

      <footer className="flex flex-wrap items-center justify-between gap-3 rounded-b-2xl border-t border-lime-100 bg-lime-50/70 px-4 py-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-lime-800">{sonucEtiketi}</p>
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
  emsal,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  emsal: EmsalOrtalamasi;
}) {
  const oneri = emsal.net ?? emsal.birim;
  return (
    <div>
      <TextField label={label} value={value} onChange={onChange} placeholder="Örn. 12.500" />
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
  const [aktif, setAktif] = useState<HesapKey>("normal");

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
                <span className="block text-sm font-semibold text-slate-900">{s.title}</span>
                <span className="mt-0.5 block text-xs text-slate-500">{s.description}</span>
                <span className="mt-1.5 block text-xs font-medium tabular-nums text-slate-700">
                  {s.sonuc === null ? <span className="text-slate-300">Henüz hesaplanmadı</span> : para(s.sonuc)}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {aktif === "normal" && (
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
      )}

      {aktif === "alanFarki" && (
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
      )}

      {aktif === "seviyeli" && (
        <CalcCard
          icon={<Layers className="h-5 w-5" />}
          title="Seviyeli Değerleme"
          description="Bitmesi halindeki değerden kalan maliyet düşülerek güncel satış değeri bulunur."
          sonuc={seviyeSonuc.guncel}
          sonucEtiketi="Güncel Satış Değeri"
          sonucAciklama="Yuvarlanmış Fiyat − Yuvarlanmış Maliyet Fiyatı"
          onUse={onNihaiDeger}
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
                emsal={emsal}
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
          onUse={onNihaiDeger}
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
                emsal={emsal}
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
  );
}
