"use client";

import { useEffect, useRef, useState } from "react";
import { acknowledgeBridge, readBridgeDetail } from "@/lib/bridge/event-detail";
import { Check, RotateCw } from "lucide-react";
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
import { HESAP_GIRDI_ALANLARI, hesaplaEmsalDegerleri } from "@/lib/emsal/hesaplama";
import { parseEmsalBridgeText } from "@/lib/emsal/listing-extract";
import type { EmsalKaydi, EmsallerData, KmlKonumu } from "@/lib/talep/types";
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

const LISTE_COLUMNS = [
  "Sıra No",
  "İl",
  "İlçe",
  "Emlak Tipi",
  "m² (Net)",
  "Gerçekçi Alan(m²)",
  "İlan Fiyatı",
  "Pazarlıklı Fiyat",
  "Konum Şerefiyesi",
  "Yapı Şerefiyesi",
  "Kat Şerefiyesi",
];

function EmsallerListTable({ title, keys, data }: { title: string; keys: EmsalKaydiKey[]; data: EmsallerData }) {
  return (
    <SectionCard title={title}>
      <div className="-mx-4 overflow-x-auto">
        <table className="w-full min-w-[1080px] text-left text-sm">
          <thead>
            <tr className="text-[11px] whitespace-nowrap uppercase tracking-wider text-slate-400">
              {LISTE_COLUMNS.map((col) => (
                <th key={col} className="py-2 pl-4 pr-4 font-medium">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {keys.map((key, index) => {
              const kaydi = data[key];
              return (
                <tr key={key} className="border-t border-slate-50">
                  <td className="whitespace-nowrap py-2.5 pl-4 pr-4 text-slate-500">{index + 1}</td>
                  <td className="py-2.5 pr-4 text-slate-700">{kaydi.il || "—"}</td>
                  <td className="py-2.5 pr-4 text-slate-700">{kaydi.ilce || "—"}</td>
                  <td className="py-2.5 pr-4 text-slate-700">{kaydi.emlakTipi || "—"}</td>
                  <td className="py-2.5 pr-4 text-slate-700">{kaydi.m2Net || "—"}</td>
                  <td className="py-2.5 pr-4 text-slate-700">{kaydi.gercekAlan || "—"}</td>
                  <td className="py-2.5 pr-4 text-slate-700">{kaydi.istenenFiyat || "—"}</td>
                  <td className="py-2.5 pr-4 text-slate-700">{kaydi.pazarlikliFiyat || "—"}</td>
                  <td className="py-2.5 pr-4 text-slate-700">{kaydi.konumSerefiyesi || "—"}</td>
                  <td className="py-2.5 pr-4 text-slate-700">{kaydi.yapiSerefiyesi || "—"}</td>
                  <td className="py-2.5 pr-4 text-slate-700">{kaydi.katSerefiyesi || "—"}</td>
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
          <EmsallerListTable title="Satılık Emsaller Listesi" keys={SATILIK_KEYS} data={data} />
          <EmsallerListTable title="Kiralık Emsaller Listesi" keys={KIRALIK_KEYS} data={data} />
          <SectionCard title="Emsaller ile İlgili Diğer Açıklamalar">
            <TextAreaField
              label="Açıklamalar"
              value={data.digerAciklamalar}
              onChange={(v) => onChange({ digerAciklamalar: v })}
              rows={5}
            />
          </SectionCard>
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
