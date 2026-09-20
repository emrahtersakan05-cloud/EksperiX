"use client";

import { useEffect, useRef, useState } from "react";
import { acknowledgeBridge, readBridgeDetail } from "@/lib/bridge/event-detail";
import { Check, ChevronRight, RotateCw } from "lucide-react";
import {
  ComboboxField,
  helperTextClass,
  primaryButtonClass,
  secondaryButtonClass,
  SectionCard,
  TextAreaField,
  TextField,
} from "@/components/talep/form-fields";
import { olusturEmsalMetni, type EmsalTuru } from "@/lib/emsal/akici-metin";
import { addTanim, getTanimlar, removeTanim } from "@/lib/emsal/tanim-referans";
import { formatTrNumber, HESAP_GIRDI_ALANLARI, hesaplaEmsalDegerleri, parseTrNumber } from "@/lib/emsal/hesaplama";
import { parseEmsalBridgeText } from "@/lib/emsal/listing-extract";
import type { EmsalKaydi, EmsallerData, KmlKonumu } from "@/lib/talep/types";
import DigerAciklamalarCard from "@/components/talep/sections/DigerAciklamalarCard";
import MiniLocationMap from "@/components/talep/sections/MiniLocationMap";

const EMSALLER_TABS = [
  { key: "liste", label: "Emsaller Listesi" },
  { key: "satilik1", label: "Satılık-1" },
  { key: "satilik2", label: "Satılık-2" },
  { key: "satilik3", label: "Satılık-3" },
  { key: "satilik4", label: "Satılık-4" },
  { key: "satilik5", label: "Satılık-5" },
  { key: "kiralik1", label: "Kiralık-1" },
  { key: "kiralik2", label: "Kiralık-2" },
] as const;

const EMSAL_BRIDGE_EVENT = "eksperix:emsal-import";

type EmsalBridgePayload = {
  text?: string;
  title?: string;
  url?: string;
  lat?: string;
  lng?: string;
  capturedAt?: number;
};

type BridgeMessage = { tone: "success" | "warning"; text: string } | null;

type EmsallerTabKey = (typeof EMSALLER_TABS)[number]["key"];
type EmsalKaydiKey = Exclude<EmsallerTabKey, "liste">;

const SATILIK_KEYS: EmsalKaydiKey[] = ["satilik1", "satilik2", "satilik3", "satilik4", "satilik5"];
const KIRALIK_KEYS: EmsalKaydiKey[] = ["kiralik1", "kiralik2"];

type ListeColumn = { label: string; numeric?: boolean; highlight?: boolean };

const LISTE_COLUMNS: ListeColumn[] = [
  { label: "Sıra No" },
  { label: "İl" },
  { label: "İlçe" },
  { label: "Emlak Tipi" },
  { label: "m² (Net)", numeric: true },
  { label: "Gerçekçi Alan(m²)", numeric: true },
  { label: "İlan Fiyatı", numeric: true },
  { label: "Pazarlıklı Fiyat", numeric: true },
  { label: "Birim Fiyat (₺/m²)", numeric: true, highlight: true },
  { label: "Konum Şerefiyesi", numeric: true },
  { label: "Yapı Şerefiyesi", numeric: true },
  { label: "Kat Şerefiyesi", numeric: true },
  { label: "Net Birim Fiyat (₺/m²)", numeric: true, highlight: true },
];

function isEmsalGirildi(k: EmsalKaydi): boolean {
  return [k.il, k.ilce, k.emlakTipi, k.m2Net, k.gercekAlan, k.istenenFiyat, k.pazarlikliFiyat].some(
    (v) => v.trim() !== "",
  );
}

function ortalama(values: number[]): number | null {
  return values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : null;
}

function StatTile({
  label,
  value,
  hint,
  accent = false,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div className={`rounded-xl border px-4 py-3 ${accent ? "border-lime-200 bg-lime-50" : "border-slate-100 bg-slate-50/70"}`}>
      <p className={`text-[11px] font-medium uppercase tracking-wider ${accent ? "text-lime-800" : "text-slate-400"}`}>
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

function EmsallerListTable({
  title,
  keys,
  data,
  tone,
  onOpen,
}: {
  title: string;
  keys: EmsalKaydiKey[];
  data: EmsallerData;
  tone: EmsalTuru;
  onOpen: (key: EmsalKaydiKey) => void;
}) {
  const rows = keys.map((key) => {
    const kaydi = data[key];
    return { key, kaydi, hesap: hesaplaEmsalDegerleri(kaydi), girildi: isEmsalGirildi(kaydi) };
  });
  const girilenSayisi = rows.filter((r) => r.girildi).length;
  const birimler = rows.map((r) => parseTrNumber(r.hesap.birimFiyat)).filter((v): v is number => v !== null);
  const netBirimler = rows.map((r) => parseTrNumber(r.hesap.netBirimFiyat)).filter((v): v is number => v !== null);
  const ortBirim = ortalama(birimler);
  const ortNet = ortalama(netBirimler);
  const money = (v: number | null) => (v === null ? "—" : `${formatTrNumber(v)} ₺`);
  const aralik =
    birimler.length > 1 ? `${formatTrNumber(Math.min(...birimler))} – ${formatTrNumber(Math.max(...birimler))} ₺` : undefined;

  return (
    <SectionCard title={title}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
            tone === "satilik" ? "bg-lime-100 text-lime-800" : "bg-sky-100 text-sky-800"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${tone === "satilik" ? "bg-lime-600" : "bg-sky-600"}`} />
          {girilenSayisi} / {keys.length} emsal girildi
        </span>
        <span className="text-xs text-slate-400">Bir satıra tıklayarak ilgili emsalin formunu açabilirsiniz.</span>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile
          accent
          label="Ortalama Birim Fiyat"
          value={money(ortBirim)}
          hint={
            ortBirim === null
              ? "Pazarlıklı fiyat ve gerçekçi alan girildikçe hesaplanır"
              : `${birimler.length} emsal üzerinden${aralik ? ` · ${aralik}` : ""}`
          }
        />
        <StatTile
          label="Ortalama Net Birim Fiyat"
          value={money(ortNet)}
          hint={ortNet === null ? "Şerefiye düzeltmeli birim fiyat ortalaması" : "Şerefiye düzeltmeleri sonrası"}
        />
        <StatTile label="Hesaba Giren Emsal" value={`${birimler.length} / ${keys.length}`} hint="Birim fiyatı hesaplanabilen emsaller" />
      </div>

      <div className="-mx-4 overflow-x-auto">
        <table className="w-full min-w-[1240px] text-left text-sm">
          <thead>
            <tr className="text-[11px] whitespace-nowrap uppercase tracking-wider text-slate-400">
              {LISTE_COLUMNS.map((col, i) => (
                <th
                  key={col.label}
                  className={`py-2 pr-4 font-medium ${i === 0 ? "sticky left-0 z-10 bg-white pl-4" : "pl-0"} ${
                    col.numeric ? "text-right" : ""
                  } ${col.highlight ? "bg-lime-50/70 pl-4 text-lime-800" : ""}`}
                >
                  {col.label}
                </th>
              ))}
              <th className="w-8" aria-hidden="true" />
            </tr>
          </thead>
          <tbody>
            {rows.map(({ key, kaydi, hesap, girildi }, index) => {
              const cell = (value: string, opts?: { numeric?: boolean; highlight?: boolean }) => (
                <td
                  className={`py-3 pr-4 ${opts?.numeric ? "text-right tabular-nums" : ""} ${
                    opts?.highlight ? "bg-lime-50/60 pl-4 font-semibold text-slate-900" : ""
                  } ${value ? "text-slate-700" : "text-slate-300"}`}
                >
                  {value || "—"}
                </td>
              );
              return (
                <tr
                  key={key}
                  tabIndex={0}
                  onClick={() => onOpen(key)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onOpen(key);
                    }
                  }}
                  aria-label={`${title} ${index + 1}. emsali aç`}
                  className="group cursor-pointer border-t border-slate-100 transition-colors hover:bg-slate-50/80 focus-visible:bg-slate-50 focus-visible:outline-none"
                >
                  <td className="sticky left-0 z-10 whitespace-nowrap bg-white py-3 pl-4 pr-4 group-hover:bg-slate-50">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                        girildi ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {index + 1}
                    </span>
                  </td>
                  {cell(kaydi.il)}
                  {cell(kaydi.ilce)}
                  {cell(kaydi.emlakTipi)}
                  {cell(kaydi.m2Net, { numeric: true })}
                  {cell(kaydi.gercekAlan, { numeric: true })}
                  {cell(kaydi.istenenFiyat, { numeric: true })}
                  {cell(kaydi.pazarlikliFiyat, { numeric: true })}
                  {cell(hesap.birimFiyat, { numeric: true, highlight: true })}
                  {cell(kaydi.konumSerefiyesi, { numeric: true })}
                  {cell(kaydi.yapiSerefiyesi, { numeric: true })}
                  {cell(kaydi.katSerefiyesi, { numeric: true })}
                  {cell(hesap.netBirimFiyat, { numeric: true, highlight: true })}
                  <td className="pr-3 text-slate-300 group-hover:text-slate-500" aria-hidden="true">
                    <ChevronRight className="h-4 w-4" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

function EmsalKaydiForm({
  label,
  kaydi,
  konuKonumlari,
  tur,
  onChange,
}: {
  label: string;
  tur: EmsalTuru;
  kaydi: EmsalKaydi;
  konuKonumlari: KmlKonumu[];
  onChange: (patch: Partial<EmsalKaydi>) => void;
}) {
  const [saved, setSaved] = useState(false);
  const [tanim1Options, setTanim1Options] = useState<string[]>([]);
  const [tanim2Options, setTanim2Options] = useState<string[]>([]);
  const hesap = hesaplaEmsalDegerleri(kaydi);
  const [bridgeMessage, setBridgeMessage] = useState<BridgeMessage>(null);
  const bridgeStateRef = useRef({ onChange, kaydi });

  useEffect(() => {
    bridgeStateRef.current = { onChange, kaydi };
  });

  useEffect(() => {
    getTanimlar("tanim1").then(setTanim1Options);
    getTanimlar("tanim2").then(setTanim2Options);
  }, []);

  // Only the emsal tab that is currently open is mounted, so the imported
  // listing always lands in the record the user is looking at.
  useEffect(() => {
    function handleBridgeImport(event: Event) {
      const detail = readBridgeDetail<EmsalBridgePayload>(event);
      const text = detail?.text?.trim();
      if (!text) return;
      acknowledgeBridge(EMSAL_BRIDGE_EVENT);

      const patch: Partial<EmsalKaydi> = parseEmsalBridgeText(text, detail?.title ?? "");
      if (detail?.lat && detail?.lng) {
        patch.enlem = detail.lat;
        patch.boylam = detail.lng;
      }
      const filledCount = Object.keys(patch).length;

      bridgeStateRef.current.onChange(patch);
      setBridgeMessage(
        filledCount > 0
          ? {
              tone: "success",
              text: `${filledCount} alan eklenti üzerinden ilan sayfasından dolduruldu. Lütfen doğruluğunu kontrol edin.`,
            }
          : {
              tone: "warning",
              text: "Eklenti sayfayı okudu ancak eşleşen alan bulunamadı. İlan detay sayfasında olduğunuzdan emin olun.",
            },
      );
    }

    window.addEventListener(EMSAL_BRIDGE_EVENT, handleBridgeImport as EventListener);
    return () => window.removeEventListener(EMSAL_BRIDGE_EVENT, handleBridgeImport as EventListener);
  }, []);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold text-slate-700">{label}</p>

      {bridgeMessage && (
        <p
          className={`rounded-lg px-3 py-2 text-xs ${
            bridgeMessage.tone === "success" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
          }`}
        >
          {bridgeMessage.text}
        </p>
      )}

      <SectionCard title="Emsal Bilgileri">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 md:grid-cols-5">
          <TextField
            label="İlan Tarihi"
            type="date"
            value={kaydi.ilanTarihi}
            onChange={(v) => onChange({ ilanTarihi: v })}
          />
          <TextField label="İlan Fiyatı" value={kaydi.istenenFiyat} onChange={(v) => onChange({ istenenFiyat: v })} />
          <TextField label="Emlak Tipi" value={kaydi.emlakTipi} onChange={(v) => onChange({ emlakTipi: v })} />
          <TextField label="Kimden" value={kaydi.kimden} onChange={(v) => onChange({ kimden: v })} />
          <TextField
            label="Telefon No"
            type="tel"
            value={kaydi.telefonNo}
            onChange={(v) => onChange({ telefonNo: v })}
          />
          <TextField label="m² (Brüt)" value={kaydi.m2Brut} onChange={(v) => onChange({ m2Brut: v })} />
          <TextField label="m² (Net)" value={kaydi.m2Net} onChange={(v) => onChange({ m2Net: v })} />
          <TextField label="Oda Sayısı" value={kaydi.odaSayisi} onChange={(v) => onChange({ odaSayisi: v })} />
          <TextField label="Bina Yaşı" value={kaydi.binaYasi} onChange={(v) => onChange({ binaYasi: v })} />
          <TextField label="Bulunduğu Kat" value={kaydi.bulunduguKat} onChange={(v) => onChange({ bulunduguKat: v })} />
        </div>
      </SectionCard>

      <SectionCard title="Emsal Konum Bilgileri">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4 lg:grid-cols-8">
          <TextField label="İl" value={kaydi.il} onChange={(v) => onChange({ il: v })} />
          <TextField label="İlçe" value={kaydi.ilce} onChange={(v) => onChange({ ilce: v })} />
          <TextField label="Köy/Mahalle" value={kaydi.koyMahalle} onChange={(v) => onChange({ koyMahalle: v })} />
          <TextField label="Cadde/Bulvar/Sokak" value={kaydi.semt} onChange={(v) => onChange({ semt: v })} />
          <TextField label="Ada No" value={kaydi.adaNo} onChange={(v) => onChange({ adaNo: v })} />
          <TextField label="Parsel No" value={kaydi.parselNo} onChange={(v) => onChange({ parselNo: v })} />
          <TextField label="Enlem" value={kaydi.enlem} onChange={(v) => onChange({ enlem: v })} />
          <TextField label="Boylam" value={kaydi.boylam} onChange={(v) => onChange({ boylam: v })} />
        </div>
      </SectionCard>

      <SectionCard title="Emsal Değer Bilgiler">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
          <TextField label="Gerçekçi Alan" value={kaydi.gercekAlan} onChange={(v) => onChange({ gercekAlan: v })} />
          <TextField
            label="Pazarlıklı Fiyat"
            value={kaydi.pazarlikliFiyat}
            onChange={(v) => onChange({ pazarlikliFiyat: v })}
          />
          <TextField
            label="Birim Fiyat"
            value={hesap.birimFiyat}
            placeholder="Pazarlıklı Fiyat ÷ Gerçekçi Alan"
            onChange={() => {}}
            readOnly
          />
          <TextField
            label="Konum Şerefiyesi"
            placeholder="-0,10 / +0,10"
            value={kaydi.konumSerefiyesi}
            onChange={(v) => onChange({ konumSerefiyesi: v })}
          />
          <TextField
            label="Yapı Şerefiyesi"
            placeholder="-0,10 / +0,10"
            value={kaydi.yapiSerefiyesi}
            onChange={(v) => onChange({ yapiSerefiyesi: v })}
          />
          <TextField
            label="Kat Şerefiyesi"
            placeholder="-0,10 / +0,10"
            value={kaydi.katSerefiyesi}
            onChange={(v) => onChange({ katSerefiyesi: v })}
          />
          <TextField
            label="Net Birim Fiyat"
            value={hesap.netBirimFiyat}
            placeholder="Şerefiyeler uygulanır"
            onChange={() => {}}
            readOnly
          />
        </div>
      </SectionCard>

      <SectionCard title="Emsal Akıcı Metin Açıklaması">
        <div className="mb-3 grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-2">
          <ComboboxField
            label="Tanım 1"
            value={kaydi.tanim1}
            options={tanim1Options}
            placeholder="Seçin veya yeni ekleyin..."
            onChange={(v) => onChange({ tanim1: v })}
            onAddNew={async (v) => setTanim1Options(await addTanim("tanim1", v))}
            onRemoveOption={async (v) => {
              setTanim1Options(await removeTanim("tanim1", v));
              if (kaydi.tanim1 === v) onChange({ tanim1: "" });
            }}
          />
          <ComboboxField
            label="Tanım 2"
            value={kaydi.tanim2}
            options={tanim2Options}
            placeholder="Seçin veya yeni ekleyin..."
            onChange={(v) => onChange({ tanim2: v })}
            onAddNew={async (v) => setTanim2Options(await addTanim("tanim2", v))}
            onRemoveOption={async (v) => {
              setTanim2Options(await removeTanim("tanim2", v));
              if (kaydi.tanim2 === v) onChange({ tanim2: "" });
            }}
          />
        </div>
        <TextAreaField
          label="Açıklama"
          value={kaydi.akiciMetinAciklama}
          onChange={(v) => onChange({ akiciMetinAciklama: v })}
          rows={9}
        />
        <div className="mt-2 flex items-start justify-between gap-3">
          <span className={helperTextClass}>
            Metin, form alanları doldukça otomatik oluşur. Elle düzenlerseniz otomatik güncelleme durur.
          </span>
          <button
            type="button"
            onClick={() => onChange({ akiciMetinAciklama: olusturEmsalMetni(kaydi, tur) })}
            className={`${secondaryButtonClass} inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap`}
          >
            <RotateCw className="h-3.5 w-3.5" />
            Metni Yeniden Oluştur
          </button>
        </div>
      </SectionCard>

      <MiniLocationMap
        lat={kaydi.enlem}
        lng={kaydi.boylam}
        konuKonumlari={konuKonumlari}
        onPick={(lat, lng) => onChange({ enlem: String(lat), boylam: String(lng) })}
      />

      <div className="flex items-center justify-end gap-2">
        {saved && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
            <Check className="h-3.5 w-3.5" />
            Kaydedildi
          </span>
        )}
        <button type="button" onClick={handleSave} className={primaryButtonClass}>
          Kaydet
        </button>
      </div>
    </div>
  );
}

export default function EmsallerSection({
  data,
  konuKonumlari,
  onChange,
}: {
  data: EmsallerData;
  konuKonumlari: KmlKonumu[];
  onChange: (patch: Partial<EmsallerData>) => void;
}) {
  const [activeTab, setActiveTab] = useState<EmsallerTabKey>("liste");

  function updateKaydi(key: EmsalKaydiKey, patch: Partial<EmsalKaydi>) {
    const previous = data[key];
    const tur: EmsalTuru = key.startsWith("satilik") ? "satilik" : "kiralik";
    let next = { ...previous, ...patch };
    // Keep the stored Birim / Net Birim Fiyat in step with the fields they derive from.
    if (HESAP_GIRDI_ALANLARI.some((field) => field in patch)) next = { ...next, ...hesaplaEmsalDegerleri(next) };
    // The akıcı metin follows the form while it is untouched; once the user edits the
    // text by hand it is left alone (the "Yeniden Oluştur" button restores auto mode).
    if (!("akiciMetinAciklama" in patch)) {
      const wasAuto =
        previous.akiciMetinAciklama === "" || previous.akiciMetinAciklama === olusturEmsalMetni(previous, tur);
      if (wasAuto) next = { ...next, akiciMetinAciklama: olusturEmsalMetni(next, tur) };
    }
    onChange({ [key]: next });
  }

  const activeKaydiTab = EMSALLER_TABS.find((tab) => tab.key === activeTab && tab.key !== "liste");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5 rounded-2xl border border-slate-100 bg-white/90 p-2">
        {EMSALLER_TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center justify-center whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-medium transition-colors ${
                isActive ? "bg-lime-300 text-slate-900" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "liste" && (
        <div className="space-y-4">
          <EmsallerListTable
            title="Satılık Emsaller Listesi"
            keys={SATILIK_KEYS}
            data={data}
            tone="satilik"
            onOpen={setActiveTab}
          />
          <EmsallerListTable
            title="Kiralık Emsaller Listesi"
            keys={KIRALIK_KEYS}
            data={data}
            tone="kiralik"
            onOpen={setActiveTab}
          />
          <DigerAciklamalarCard
            value={data.digerAciklamalar}
            onChange={(v) => onChange({ digerAciklamalar: v })}
          />
        </div>
      )}

      {activeKaydiTab && (
        <EmsalKaydiForm
          label={activeKaydiTab.label}
          kaydi={data[activeKaydiTab.key as EmsalKaydiKey]}
          tur={activeKaydiTab.key.startsWith("satilik") ? "satilik" : "kiralik"}
          konuKonumlari={konuKonumlari}
          onChange={(patch) => updateKaydi(activeKaydiTab.key as EmsalKaydiKey, patch)}
        />
      )}
    </div>
  );
}
