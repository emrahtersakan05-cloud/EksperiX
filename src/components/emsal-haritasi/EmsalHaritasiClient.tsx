"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CircleDot,
  Download,
  Maximize2,
  MapPin,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { formatTrNumber } from "@/lib/emsal/hesaplama";
import { deleteEmsalKaydiAction } from "@/lib/emsal-haritasi/actions";
import {
  BOS_FILTRE,
  aktifFiltreSayisi,
  birimFiyat,
  csvOlustur,
  durumMedyanlari,
  filtrele,
  formatMesafe,
  istatistik,
  mesafeMetre,
  sirala,
  type CevreAnalizi,
  type EmsalFiltre,
  type EmsalIstatistik,
  type EmsalSiralama,
  type HaritaSinirlari,
} from "@/lib/emsal-haritasi/analiz";
import type { EmsalHaritaKaydi } from "@/lib/emsal-haritasi/types";
import type { PublicUser } from "@/lib/auth/types";
import EmsalHaritaMap, { SEVIYE_RENK, type PinModu } from "@/components/emsal-haritasi/EmsalHaritaMap";
import EmsalKayitFormu from "@/components/emsal-haritasi/EmsalKayitFormu";

const YARICAP_SECENEKLERI = [250, 500, 1000, 2000, 5000] as const;

const SIRALAMA_SECENEKLERI: { value: EmsalSiralama; label: string }[] = [
  { value: "yeni", label: "En yeni" },
  { value: "eski", label: "En eski" },
  { value: "birim-artan", label: "₺/m² artan" },
  { value: "birim-azalan", label: "₺/m² azalan" },
  { value: "alan-artan", label: "m² artan" },
  { value: "alan-azalan", label: "m² azalan" },
  { value: "yakin", label: "Merkeze yakınlık" },
];

const smallInputClass =
  "w-full min-w-0 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 hover:border-slate-300 focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200";

const fmt = (v: number | null) => (v === null ? "—" : formatTrNumber(v));

function benzersiz(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, "tr"));
}

function EmsalCard({
  kaydi,
  canModify,
  active,
  mesafe,
  onFocus,
  onEdit,
}: {
  kaydi: EmsalHaritaKaydi;
  canModify: boolean;
  active: boolean;
  mesafe: number | null;
  onFocus: () => void;
  onEdit: () => void;
}) {
  const birim = birimFiyat(kaydi);
  return (
    <div
      onClick={onFocus}
      className={`group cursor-pointer rounded-xl border p-3 transition-colors ${
        active ? "border-slate-900 bg-slate-50" : "border-slate-100 bg-white hover:bg-slate-50"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                kaydi.durum === "kiralik" ? "bg-sky-100 text-sky-800" : "bg-lime-100 text-lime-800"
              }`}
            >
              {kaydi.durum === "kiralik" ? "Kiralık" : "Satılık"}
            </span>
            <span className="truncate text-sm font-medium text-slate-900">{kaydi.emlakTipi || "—"}</span>
          </div>
          <p className="mt-1 truncate text-xs text-slate-500">
            {[kaydi.mahalle, kaydi.ilce, kaydi.il].filter(Boolean).join(", ") || "Konum bilgisi yok"}
          </p>
        </div>
        {canModify && (
          <div className="flex shrink-0 items-center" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={onEdit}
              className="rounded-full p-1 text-slate-300 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Kaydı düzenle"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <form
              action={deleteEmsalKaydiAction}
              onSubmit={(e) => {
                if (!window.confirm("Bu emsal kaydı silinsin mi?")) e.preventDefault();
              }}
            >
              <input type="hidden" name="id" value={kaydi.id} />
              <button
                type="submit"
                className="rounded-full p-1 text-slate-300 hover:bg-rose-50 hover:text-rose-600"
                aria-label="Kaydı sil"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 text-xs">
        <span className="truncate text-slate-500">
          {kaydi.m2Net || kaydi.m2Brut || "—"} m²
          {kaydi.odaSayisi ? ` · ${kaydi.odaSayisi}` : ""}
          {mesafe !== null ? ` · ${formatMesafe(mesafe)}` : ""}
        </span>
        <span className="shrink-0 font-semibold text-slate-900">{birim ? `${formatTrNumber(birim)} ₺/m²` : "—"}</span>
      </div>
    </div>
  );
}

// Satılık and kiralık unit prices are never averaged together — a mixed
// average would be meaningless — so each durum present gets its own block.
function IstatistikKarti({ records, baslik }: { records: EmsalHaritaKaydi[]; baslik: string }) {
  const gruplar = (
    [
      ["Satılık", records.filter((r) => r.durum !== "kiralik")],
      ["Kiralık", records.filter((r) => r.durum === "kiralik")],
    ] as const
  ).filter(([, list]) => list.length > 0);
  return (
    <div className="space-y-2 rounded-xl bg-slate-50 p-3">
      <div className="flex items-baseline justify-between">
        <p className="text-[11px] font-medium text-slate-500">{baslik}</p>
        <p className="text-[11px] text-slate-400">{records.length} kayıt</p>
      </div>
      {gruplar.length === 0 && <p className="text-xs text-slate-400">Kayıt yok.</p>}
      {gruplar.map(([etiket, list]) => (
        <IstatistikSatiri key={etiket} etiket={gruplar.length > 1 ? etiket : null} stats={istatistik(list)} />
      ))}
    </div>
  );
}

function IstatistikSatiri({ etiket, stats }: { etiket: string | null; stats: EmsalIstatistik }) {
  return (
    <div className={etiket ? "border-t border-slate-200/70 pt-2 first:border-0 first:pt-0" : ""}>
      {etiket && (
        <p className="text-[11px] font-semibold text-slate-700">
          {etiket} <span className="font-normal text-slate-400">· {stats.adet} kayıt</span>
        </p>
      )}
      {stats.fiyatliAdet !== stats.adet && (
        <p className="text-[10px] text-slate-400">{stats.fiyatliAdet} kayıtta fiyat ve alan var</p>
      )}
      <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
        <div>
          <p className="text-[10px] text-slate-400">Ortalama ₺/m²</p>
          <p className="font-semibold text-slate-900">{fmt(stats.ortalama)}</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-400">Medyan ₺/m²</p>
          <p className="font-semibold text-slate-900">{fmt(stats.medyan)}</p>
        </div>
        <div className="col-span-2">
          <p className="text-[10px] text-slate-400">Aralık</p>
          <p className="font-medium text-slate-700">
            {stats.min === null ? "—" : `${fmt(stats.min)} – ${fmt(stats.max)}`}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function EmsalHaritasiClient({
  records,
  currentUser,
  storeError,
}: {
  records: EmsalHaritaKaydi[];
  currentUser: PublicUser | null;
  storeError?: string;
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<EmsalHaritaKaydi | null>(null);
  const [pickedPoint, setPickedPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);

  const [filtre, setFiltre] = useState<EmsalFiltre>(BOS_FILTRE);
  const [filtrelerAcik, setFiltrelerAcik] = useState(false);
  const [siralama, setSiralama] = useState<EmsalSiralama>("yeni");
  const [pinModu, setPinModu] = useState<PinModu>("durum");
  const [sinirlar, setSinirlar] = useState<HaritaSinirlari | null>(null);
  const [fitSignal, setFitSignal] = useState(0);

  const [cevreSeciliyor, setCevreSeciliyor] = useState(false);
  const [cevre, setCevre] = useState<CevreAnalizi | null>(null);
  const [yaricap, setYaricap] = useState<number>(1000);

  // On narrow screens the form stacks below the map, out of view — bring it in.
  const formPanelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (formOpen && window.matchMedia("(max-width: 1023px)").matches) {
      formPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [formOpen, editing]);

  const patchFiltre = (next: Partial<EmsalFiltre>) => setFiltre((prev) => ({ ...prev, ...next }));

  const secenekler = useMemo(
    () => ({
      emlakTipi: benzersiz(records.map((r) => r.emlakTipi)),
      il: benzersiz(records.map((r) => r.il)),
      ilce: benzersiz(records.filter((r) => !filtre.il || r.il === filtre.il).map((r) => r.ilce)),
    }),
    [records, filtre.il],
  );

  // Pins show every record matching the attribute filters; the list and the
  // statistics additionally narrow to the çevre circle and (optionally) the
  // visible map area, so the circle's surroundings stay visible for context.
  const haritaKayitlari = useMemo(
    () => filtrele(records, { ...filtre, sadeceGorunen: false }, { kullaniciId: currentUser?.id }),
    [records, filtre, currentUser?.id],
  );
  const listeKayitlari = useMemo(
    () =>
      sirala(
        filtrele(haritaKayitlari, BOS_FILTRE, { cevre }).filter((r) => {
          if (!filtre.sadeceGorunen || !sinirlar) return true;
          return r.lat >= sinirlar.south && r.lat <= sinirlar.north && r.lng >= sinirlar.west && r.lng <= sinirlar.east;
        }),
        siralama,
        cevre,
      ),
    [haritaKayitlari, cevre, filtre.sadeceGorunen, sinirlar, siralama],
  );
  const cevreMedyanlari = useMemo(() => durumMedyanlari(listeKayitlari), [listeKayitlari]);
  const filtreSayisi = aktifFiltreSayisi(filtre);
  const filtreliMi = filtreSayisi > 0 || !!filtre.arama || !!filtre.durum || !!cevre;

  const canModify = (kaydi: EmsalHaritaKaydi) =>
    currentUser?.role === "admin" || currentUser?.id === kaydi.ekleyenKullaniciId;

  function openForm() {
    setEditing(null);
    setPickedPoint(null);
    setCevreSeciliyor(false);
    setFormOpen(true);
  }

  function openEdit(kaydi: EmsalHaritaKaydi) {
    setEditing(kaydi);
    setPickedPoint({ lat: kaydi.lat, lng: kaydi.lng });
    setCevreSeciliyor(false);
    setFormOpen(true);
  }

  const closeForm = useCallback(() => {
    setFormOpen(false);
    setEditing(null);
    setPickedPoint(null);
  }, []);

  function handlePick(lat: number, lng: number) {
    if (formOpen) {
      setPickedPoint({ lat, lng });
    } else if (cevreSeciliyor) {
      setCevre({ lat, lng, yaricap });
      setCevreSeciliyor(false);
      setSiralama("yakin");
    }
  }

  function changeYaricap(value: number) {
    setYaricap(value);
    setCevre((prev) => (prev ? { ...prev, yaricap: value } : prev));
  }

  function clearCevre() {
    setCevre(null);
    setCevreSeciliyor(false);
    setSiralama((prev) => (prev === "yakin" ? "yeni" : prev));
  }

  function exportCsv() {
    const blob = new Blob([csvOlustur(listeKayitlari)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `emsal-haritasi-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-4 lg:h-[calc(100vh-8rem)] lg:min-h-[560px] lg:flex-row">
      <aside className="order-2 flex max-h-[80vh] flex-col rounded-2xl border border-slate-100 bg-white lg:order-none lg:max-h-none lg:w-80 lg:shrink-0">
        <div className="shrink-0 space-y-3 border-b border-slate-100 p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h1 className="text-lg font-semibold text-slate-900">Emsal Haritası</h1>
              <p className="mt-0.5 text-xs text-slate-500">
                {filtreliMi ? `${listeKayitlari.length} / ${records.length} kayıt` : `${records.length} kayıt`}
              </p>
            </div>
            <button
              type="button"
              onClick={exportCsv}
              disabled={listeKayitlari.length === 0}
              title="Listedeki kayıtları Excel (CSV) olarak indir"
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Download className="h-3.5 w-3.5" />
              Excel
            </button>
          </div>
          <button
            type="button"
            onClick={openForm}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-lime-300 hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            Yeni Emsal Ekle
          </button>

          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={filtre.arama}
              onChange={(e) => patchFiltre({ arama: e.target.value })}
              placeholder="Mahalle, ilçe, tip, ekleyen..."
              className={`${smallInputClass} pl-8`}
            />
          </div>

          <div className="flex items-center gap-1.5">
            <div className="flex flex-1 rounded-lg bg-slate-100 p-0.5">
              {(
                [
                  ["", "Tümü"],
                  ["satilik", "Satılık"],
                  ["kiralik", "Kiralık"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => patchFiltre({ durum: value })}
                  className={`flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                    filtre.durum === value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setFiltrelerAcik((v) => !v)}
              className={`relative inline-flex items-center gap-1 rounded-lg border px-2 py-1.5 text-xs font-medium ${
                filtrelerAcik || filtreSayisi > 0
                  ? "border-slate-900 bg-slate-900 text-lime-300"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
              aria-expanded={filtrelerAcik}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filtre{filtreSayisi > 0 ? ` (${filtreSayisi})` : ""}
            </button>
          </div>

        </div>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
          {filtrelerAcik && (
            <div className="space-y-2.5 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="mb-0.5 block text-[10px] font-medium text-slate-500">Emlak Tipi</span>
                  <select
                    value={filtre.emlakTipi}
                    onChange={(e) => patchFiltre({ emlakTipi: e.target.value })}
                    className={smallInputClass}
                  >
                    <option value="">Tümü</option>
                    {secenekler.emlakTipi.map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-0.5 block text-[10px] font-medium text-slate-500">İl</span>
                  <select
                    value={filtre.il}
                    onChange={(e) => patchFiltre({ il: e.target.value, ilce: "" })}
                    className={smallInputClass}
                  >
                    <option value="">Tümü</option>
                    {secenekler.il.map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </label>
                <label className="col-span-2 block">
                  <span className="mb-0.5 block text-[10px] font-medium text-slate-500">İlçe</span>
                  <select
                    value={filtre.ilce}
                    onChange={(e) => patchFiltre({ ilce: e.target.value })}
                    className={smallInputClass}
                  >
                    <option value="">Tümü</option>
                    {secenekler.ilce.map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div>
                <span className="mb-0.5 block text-[10px] font-medium text-slate-500">Birim Fiyat (₺/m²)</span>
                <div className="flex items-center gap-1.5">
                  <input
                    inputMode="decimal"
                    value={filtre.birimMin}
                    onChange={(e) => patchFiltre({ birimMin: e.target.value })}
                    placeholder="En az"
                    className={smallInputClass}
                  />
                  <span className="text-slate-300">–</span>
                  <input
                    inputMode="decimal"
                    value={filtre.birimMax}
                    onChange={(e) => patchFiltre({ birimMax: e.target.value })}
                    placeholder="En çok"
                    className={smallInputClass}
                  />
                </div>
              </div>
              <div>
                <span className="mb-0.5 block text-[10px] font-medium text-slate-500">Alan (m²)</span>
                <div className="flex items-center gap-1.5">
                  <input
                    inputMode="decimal"
                    value={filtre.alanMin}
                    onChange={(e) => patchFiltre({ alanMin: e.target.value })}
                    placeholder="En az"
                    className={smallInputClass}
                  />
                  <span className="text-slate-300">–</span>
                  <input
                    inputMode="decimal"
                    value={filtre.alanMax}
                    onChange={(e) => patchFiltre({ alanMax: e.target.value })}
                    placeholder="En çok"
                    className={smallInputClass}
                  />
                </div>
              </div>
              <label className="block">
                <span className="mb-0.5 block text-[10px] font-medium text-slate-500">İlan tarihi (bu tarihten sonra)</span>
                <input
                  type="date"
                  value={filtre.ilanTarihiBaslangic}
                  onChange={(e) => patchFiltre({ ilanTarihiBaslangic: e.target.value })}
                  className={smallInputClass}
                />
              </label>
              <div className="space-y-1.5 pt-0.5">
                <label className="flex items-center gap-2 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={filtre.sadeceGorunen}
                    onChange={(e) => patchFiltre({ sadeceGorunen: e.target.checked })}
                    className="h-3.5 w-3.5 accent-slate-900"
                  />
                  Yalnızca harita alanındakiler
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={filtre.sadeceBenim}
                    onChange={(e) => patchFiltre({ sadeceBenim: e.target.checked })}
                    className="h-3.5 w-3.5 accent-slate-900"
                  />
                  Yalnızca benim eklediklerim
                </label>
              </div>
              {(filtreSayisi > 0 || filtre.arama || filtre.durum) && (
                <button
                  type="button"
                  onClick={() => setFiltre(BOS_FILTRE)}
                  className="text-xs font-medium text-rose-600 hover:text-rose-700"
                >
                  Filtreleri temizle
                </button>
              )}
            </div>
          )}

          <IstatistikKarti records={listeKayitlari} baslik={cevre ? `Çevre (${formatMesafe(cevre.yaricap)})` : "Listedeki emsaller"} />

          <label className="flex items-center justify-between gap-2 text-xs text-slate-500">
            Sırala
            <select
              value={siralama}
              onChange={(e) => setSiralama(e.target.value as EmsalSiralama)}
              className={`${smallInputClass} w-auto`}
            >
              {SIRALAMA_SECENEKLERI.filter((o) => o.value !== "yakin" || cevre).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          {storeError && (
            <div className="flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {storeError}
            </div>
          )}
          {records.length === 0 && !storeError && (
            <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-200 px-4 py-10 text-center">
              <MapPin className="h-6 w-6 text-slate-300" />
              <p className="text-xs text-slate-400">Henüz emsal eklenmedi. Haritayı doldurmak için ilk kaydı ekleyin.</p>
            </div>
          )}
          {records.length > 0 && listeKayitlari.length === 0 && (
            <div className="rounded-xl border-2 border-dashed border-slate-200 px-4 py-8 text-center text-xs text-slate-400">
              Filtrelere uyan emsal yok.
            </div>
          )}
          {listeKayitlari.map((kaydi) => (
            <EmsalCard
              key={kaydi.id}
              kaydi={kaydi}
              active={focusId === kaydi.id}
              canModify={canModify(kaydi)}
              mesafe={cevre ? mesafeMetre(cevre.lat, cevre.lng, kaydi.lat, kaydi.lng) : null}
              onFocus={() => setFocusId(kaydi.id)}
              onEdit={() => openEdit(kaydi)}
            />
          ))}
        </div>
      </aside>

      <div className="relative order-1 h-[60vh] min-h-[380px] overflow-hidden rounded-2xl border border-slate-100 lg:order-none lg:h-auto lg:min-h-0 lg:flex-1">
        <EmsalHaritaMap
          records={haritaKayitlari}
          pinModu={pinModu}
          picking={formOpen || cevreSeciliyor}
          pickedPoint={pickedPoint}
          onPick={handlePick}
          focusId={focusId}
          cevre={cevre}
          fitSignal={fitSignal}
          onBoundsChange={setSinirlar}
        />

        {/* Map toolbar */}
        <div className="absolute right-3 top-3 z-[500] flex flex-col items-end gap-2">
          <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm">
            <button
              type="button"
              onClick={() => setPinModu("durum")}
              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium ${
                pinModu === "durum" ? "bg-slate-900 text-lime-300" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <MapPin className="h-3.5 w-3.5" />
              Durum
            </button>
            <button
              type="button"
              onClick={() => setPinModu("fiyat")}
              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium ${
                pinModu === "fiyat" ? "bg-slate-900 text-lime-300" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Tag className="h-3.5 w-3.5" />
              ₺/m²
            </button>
          </div>
          <button
            type="button"
            onClick={() => (cevre || cevreSeciliyor ? clearCevre() : setCevreSeciliyor(true))}
            disabled={formOpen}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium shadow-sm disabled:cursor-not-allowed disabled:opacity-50 ${
              cevre || cevreSeciliyor
                ? "border-violet-600 bg-violet-600 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <CircleDot className="h-3.5 w-3.5" />
            {cevre || cevreSeciliyor ? "Çevre analizini kapat" : "Çevre analizi"}
          </button>
          <button
            type="button"
            onClick={() => setFitSignal((n) => n + 1)}
            disabled={haritaKayitlari.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            Tümünü göster
          </button>
        </div>

        {(cevreSeciliyor || cevre) && (
          <div className="absolute left-3 top-3 z-[500] w-64 rounded-xl border border-violet-200 bg-white p-3 shadow-lg">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-violet-700">Çevre Analizi</p>
              <button
                type="button"
                onClick={clearCevre}
                className="rounded-full p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Çevre analizini kapat"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {YARICAP_SECENEKLERI.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => changeYaricap(r)}
                  className={`rounded-md px-2 py-1 text-[11px] font-medium ${
                    yaricap === r ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {formatMesafe(r)}
                </button>
              ))}
            </div>
            {cevreSeciliyor && !cevre ? (
              <p className="mt-2 text-xs text-slate-500">Analiz merkezini seçmek için haritaya tıklayın.</p>
            ) : cevre ? (
              <>
                <div className="mt-2 space-y-0.5 text-xs text-slate-600">
                  <p>
                    <strong className="text-slate-900">{listeKayitlari.length}</strong> emsal bu çevrede
                  </p>
                  {cevreMedyanlari.satilik !== null && (
                    <p>
                      Satılık medyan <strong className="text-slate-900">{fmt(cevreMedyanlari.satilik)} ₺/m²</strong>
                    </p>
                  )}
                  {cevreMedyanlari.kiralik !== null && (
                    <p>
                      Kiralık medyan <strong className="text-slate-900">{fmt(cevreMedyanlari.kiralik)} ₺/m²</strong>
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setCevreSeciliyor(true)}
                  className="mt-1.5 text-[11px] font-medium text-violet-700 hover:text-violet-800"
                >
                  {cevreSeciliyor ? "Yeni merkez için haritaya tıklayın…" : "Merkezi değiştir"}
                </button>
              </>
            ) : null}
          </div>
        )}

        {pinModu === "fiyat" && (
          <div className="absolute bottom-3 left-3 z-[500] rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-[11px] text-slate-600 shadow-sm">
            <p className="mb-1 font-medium text-slate-700">₺/m² · medyana göre</p>
            <div className="flex items-center gap-3">
              {(
                [
                  ["dusuk", "−%10 altı"],
                  ["normal", "±%10"],
                  ["yuksek", "+%10 üstü"],
                ] as const
              ).map(([seviye, label]) => (
                <span key={seviye} className="inline-flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: SEVIYE_RENK[seviye] }} />
                  {label}
                </span>
              ))}
            </div>
            <p className="mt-1 text-[10px] text-slate-400">Satılık ve kiralık ayrı değerlendirilir · K = kiralık</p>
          </div>
        )}
      </div>

      {formOpen && (
        <div
          ref={formPanelRef}
          className="order-1 max-h-[85vh] overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-lg lg:order-none lg:max-h-none lg:w-96 lg:shrink-0"
        >
          <EmsalKayitFormu
            key={editing?.id ?? "yeni"}
            kaydi={editing ?? undefined}
            pickedPoint={pickedPoint}
            onSuccess={closeForm}
            onCancel={closeForm}
          />
        </div>
      )}
    </div>
  );
}
