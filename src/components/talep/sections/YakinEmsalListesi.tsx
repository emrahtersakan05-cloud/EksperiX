"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRightLeft, CircleCheck, Loader2, MapPinned, RefreshCw, TriangleAlert, X } from "lucide-react";
import { formatTrNumber } from "@/lib/emsal/hesaplama";
import { listEmsalKayitlariAction } from "@/lib/emsal-haritasi/actions";
import { birimFiyat, eskiIlanMi, formatMesafe, istatistik } from "@/lib/emsal-haritasi/analiz";
import {
  SLOT_ETIKETI,
  bulunduguSlot,
  emsalKaydinaCevir,
  konuMesafesi,
  slotDoluMu,
  slotlariFor,
  type EmsalSlotKey,
} from "@/lib/emsal-haritasi/talep-aktar";
import type { EmsalHaritaKaydi } from "@/lib/emsal-haritasi/types";
import type { EmsalKaydi, EmsallerData, KmlKonumu } from "@/lib/talep/types";
import { SectionCard, primaryButtonClass, secondaryButtonClass } from "@/components/talep/form-fields";
import YakinEmsalHaritasi from "@/components/talep/sections/YakinEmsalHaritasi";

const YARICAPLAR: { value: number | null; label: string }[] = [
  { value: 500, label: "500 m" },
  { value: 1000, label: "1 km" },
  { value: 2000, label: "2 km" },
  { value: 5000, label: "5 km" },
  { value: 10000, label: "10 km" },
  { value: null, label: "Tümü" },
];

const fmt = (v: number | null) => (v === null ? "—" : formatTrNumber(v));

type Durum = "" | "satilik" | "kiralik";

// Resolve each selected emsal's target slot: explicit choices first, then the
// next empty slot of its durum that nobody else has taken; null = no room.
function hedefleriHesapla(
  secilenler: EmsalHaritaKaydi[],
  secimler: Map<string, EmsalSlotKey>,
  data: EmsallerData,
): Map<string, EmsalSlotKey | null> {
  const alinan = new Set<EmsalSlotKey>(secimler.values());
  const sonuc = new Map<string, EmsalSlotKey | null>();
  for (const kaydi of secilenler) {
    const secim = secimler.get(kaydi.id);
    if (secim) {
      sonuc.set(kaydi.id, secim);
      continue;
    }
    const bos = slotlariFor(kaydi).find((key) => !alinan.has(key) && !slotDoluMu(data[key])) ?? null;
    if (bos) alinan.add(bos);
    sonuc.set(kaydi.id, bos);
  }
  return sonuc;
}

export default function YakinEmsalListesi({
  konular,
  data,
  onAktar,
  onSekmeAc,
}: {
  konular: KmlKonumu[];
  data: EmsallerData;
  onAktar: (atamalar: { slot: EmsalSlotKey; kaydi: EmsalKaydi }[]) => void;
  onSekmeAc: (slot: EmsalSlotKey) => void;
}) {
  const [records, setRecords] = useState<EmsalHaritaKaydi[] | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState<string | null>(null);
  const [yaricap, setYaricap] = useState<number | null>(2000);
  const [durum, setDurum] = useState<Durum>("");
  const [emlakTipi, setEmlakTipi] = useState("");
  // Selection keeps click order, which is the order slots are filled in.
  const [seciliSira, setSeciliSira] = useState<string[]>([]);
  const [hedefSecimleri, setHedefSecimleri] = useState<Map<string, EmsalSlotKey>>(new Map());
  const [odakId, setOdakId] = useState<string | null>(null);
  const [sonAktarim, setSonAktarim] = useState<EmsalSlotKey[] | null>(null);

  async function yukle() {
    setYukleniyor(true);
    setHata(null);
    const sonuc = await listEmsalKayitlariAction();
    if (sonuc.error) setHata(sonuc.error);
    setRecords(sonuc.records ?? []);
    setYukleniyor(false);
  }

  useEffect(() => {
    let iptal = false;
    listEmsalKayitlariAction().then((sonuc) => {
      if (iptal) return;
      if (sonuc.error) setHata(sonuc.error);
      setRecords(sonuc.records ?? []);
      setYukleniyor(false);
    });
    return () => {
      iptal = true;
    };
  }, []);

  const mesafeler = useMemo(
    () => new Map((records ?? []).map((r) => [r.id, konuMesafesi(r, konular)] as const)),
    [records, konular],
  );

  const tipler = useMemo(
    () => [...new Set((records ?? []).map((r) => r.emlakTipi).filter(Boolean))].sort((a, b) => a.localeCompare(b, "tr")),
    [records],
  );

  const yakinlar = useMemo(() => {
    if (!records || konular.length === 0) return [];
    return records
      .filter((r) => {
        const m = mesafeler.get(r.id);
        if (m === null || m === undefined) return false;
        if (yaricap !== null && m > yaricap) return false;
        if (durum && (r.durum === "kiralik" ? "kiralik" : "satilik") !== durum) return false;
        if (emlakTipi && r.emlakTipi !== emlakTipi) return false;
        return true;
      })
      .sort((a, b) => (mesafeler.get(a.id) ?? 0) - (mesafeler.get(b.id) ?? 0));
  }, [records, konular.length, mesafeler, yaricap, durum, emlakTipi]);

  const seciliIds = useMemo(() => new Set(seciliSira), [seciliSira]);
  const secilenler = useMemo(() => {
    const byId = new Map((records ?? []).map((r) => [r.id, r]));
    return seciliSira.map((id) => byId.get(id)).filter((r): r is EmsalHaritaKaydi => !!r);
  }, [records, seciliSira]);
  const hedefler = useMemo(() => hedefleriHesapla(secilenler, hedefSecimleri, data), [secilenler, hedefSecimleri, data]);

  const satilikStats = istatistik(yakinlar.filter((r) => r.durum !== "kiralik"));
  const kiralikStats = istatistik(yakinlar.filter((r) => r.durum === "kiralik"));

  // Two selections aimed at the same slot would overwrite each other.
  const hedefSayilari = new Map<EmsalSlotKey, number>();
  hedefler.forEach((slot) => slot && hedefSayilari.set(slot, (hedefSayilari.get(slot) ?? 0) + 1));
  const cakisma = [...hedefSayilari.values()].some((n) => n > 1);
  const aktarilacak = secilenler.filter((r) => hedefler.get(r.id));

  function toggle(id: string) {
    setSonAktarim(null);
    setSeciliSira((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    setHedefSecimleri((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }

  function hedefSec(id: string, slot: EmsalSlotKey) {
    setHedefSecimleri((prev) => new Map(prev).set(id, slot));
  }

  function aktar() {
    const atamalar = aktarilacak.map((r) => ({ slot: hedefler.get(r.id)!, kaydi: emsalKaydinaCevir(r) }));
    onAktar(atamalar);
    setSonAktarim(atamalar.map((a) => a.slot));
    setSeciliSira([]);
    setHedefSecimleri(new Map());
  }

  if (konular.length === 0) {
    return (
      <SectionCard title="Yakın Emsal Listesi">
        <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-200 px-6 py-12 text-center">
          <MapPinned className="h-7 w-7 text-slate-300" />
          <p className="text-sm font-medium text-slate-700">Konu taşınmazın konumu yok</p>
          <p className="max-w-md text-xs text-slate-500">
            Yakın emsaller, <strong>Adres / Konum</strong> sekmesinde yüklenen KML dosyasındaki koordinata göre
            bulunur. Önce KML dosyasını yükleyin.
          </p>
        </div>
      </SectionCard>
    );
  }

  return (
    <div className="space-y-4">
      <SectionCard title="Yakın Emsal Listesi">
        <p className="mb-3 text-xs text-slate-500">
          Emsal Haritası&apos;ndaki kayıtlardan, KML ile yüklenen konu taşınmaza yakın olanlar. Listeden ya da haritadan
          seçip Satılık / Kiralık sekmelerine aktarabilirsiniz.
        </p>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <span className="mb-1 block text-[11px] font-medium text-slate-500">Yarıçap</span>
            <div className="inline-flex flex-wrap rounded-lg bg-slate-100 p-0.5">
              {YARICAPLAR.map((y) => (
                <button
                  key={y.label}
                  type="button"
                  onClick={() => setYaricap(y.value)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                    yaricap === y.value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {y.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="mb-1 block text-[11px] font-medium text-slate-500">Durum</span>
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5">
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
                  onClick={() => setDurum(value)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                    durum === value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-slate-500">Emlak tipi</span>
            <select
              value={emlakTipi}
              onChange={(e) => setEmlakTipi(e.target.value)}
              className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700"
            >
              <option value="">Tümü</option>
              {tipler.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={yukle}
            disabled={yukleniyor}
            className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            title="Emsal Haritası kayıtlarını yeniden yükle"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${yukleniyor ? "animate-spin" : ""}`} />
            Yenile
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Bulunan emsal</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900">{yakinlar.length}</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {yaricap === null ? "Tüm kayıtlar" : `${formatMesafe(yaricap)} içinde`} · {records?.length ?? 0} kayıttan
            </p>
          </div>
          <div className="rounded-xl border border-lime-200 bg-lime-50 px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-wider text-lime-800">Satılık medyan</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900">
              {satilikStats.medyan === null ? "—" : `${fmt(satilikStats.medyan)} ₺/m²`}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">{satilikStats.fiyatliAdet} fiyatlı satılık emsal</p>
          </div>
          <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-wider text-sky-800">Kiralık medyan</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900">
              {kiralikStats.medyan === null ? "—" : `${fmt(kiralikStats.medyan)} ₺/m²`}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">{kiralikStats.fiyatliAdet} fiyatlı kiralık emsal</p>
          </div>
        </div>
      </SectionCard>

      {hata && (
        <p className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
          <TriangleAlert className="h-3.5 w-3.5 shrink-0" />
          {hata}
        </p>
      )}

      {sonAktarim && sonAktarim.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CircleCheck className="h-4 w-4 shrink-0" />
          <span className="font-medium">{sonAktarim.length} emsal aktarıldı:</span>
          {sonAktarim.map((slot) => (
            <button
              key={slot}
              type="button"
              onClick={() => onSekmeAc(slot)}
              className="rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100"
            >
              {SLOT_ETIKETI[slot]} →
            </button>
          ))}
          <span className="text-xs text-emerald-700">Şerefiye ve pazarlıklı fiyatı ilgili sekmede kontrol edin.</span>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-5">
        <div className="min-w-0 xl:col-span-3">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="max-h-[560px] overflow-auto">
              <table className="w-full min-w-[720px] text-left text-xs">
                <thead className="sticky top-0 z-10 bg-slate-50 text-[11px] text-slate-500">
                  <tr>
                    <th className="w-10 px-3 py-2" aria-label="Seç" />
                    <th className="px-2 py-2 text-right font-medium">Mesafe</th>
                    <th className="px-2 py-2 font-medium">Emsal</th>
                    <th className="px-2 py-2 font-medium">Konum</th>
                    <th className="px-2 py-2 text-right font-medium">m²</th>
                    <th className="px-2 py-2 text-right font-medium">Fiyat (₺)</th>
                    <th className="px-2 py-2 text-right font-medium">₺/m²</th>
                    <th className="px-2 py-2 font-medium">İlan Tarihi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {yukleniyor && !records && (
                    <tr>
                      <td colSpan={8} className="px-3 py-10 text-center text-slate-400">
                        <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                      </td>
                    </tr>
                  )}
                  {records && yakinlar.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-3 py-10 text-center text-slate-400">
                        Bu yarıçapta emsal yok. Yarıçapı büyütün ya da{" "}
                        <Link href="/deger-haritasi/emsal-haritasi/yeni" className="font-medium text-lime-700 hover:underline">
                          Emsal Haritası&apos;na yeni emsal ekleyin
                        </Link>
                        .
                      </td>
                    </tr>
                  )}
                  {yakinlar.map((r) => {
                    const secili = seciliIds.has(r.id);
                    const mevcutSlot = bulunduguSlot(r, data);
                    const birim = birimFiyat(r);
                    return (
                      <tr
                        key={r.id}
                        onClick={() => toggle(r.id)}
                        onMouseEnter={() => setOdakId(r.id)}
                        className={`cursor-pointer transition-colors ${secili ? "bg-lime-50" : "hover:bg-slate-50"}`}
                      >
                        <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={secili}
                            onChange={() => toggle(r.id)}
                            aria-label="Emsali seç"
                            className="h-3.5 w-3.5 accent-lime-600"
                          />
                        </td>
                        <td className="px-2 py-2 text-right font-semibold tabular-nums text-slate-900">
                          {formatMesafe(mesafeler.get(r.id) ?? 0)}
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex flex-wrap items-center gap-1">
                            <span
                              className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                                r.durum === "kiralik" ? "bg-sky-100 text-sky-800" : "bg-lime-100 text-lime-800"
                              }`}
                            >
                              {r.durum === "kiralik" ? "Kiralık" : "Satılık"}
                            </span>
                            <span className="font-medium text-slate-900">{r.emlakTipi || "—"}</span>
                            {r.odaSayisi && <span className="text-slate-400">{r.odaSayisi}</span>}
                            {mevcutSlot && (
                              <span className="rounded-full bg-slate-900 px-1.5 py-0.5 text-[10px] font-medium text-lime-300">
                                {SLOT_ETIKETI[mevcutSlot]}&apos;de
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="max-w-[180px] truncate px-2 py-2 text-slate-500">
                          {[r.mahalle, r.ilce].filter(Boolean).join(", ") || r.il}
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums">{r.m2Net || r.m2Brut || "—"}</td>
                        <td className="px-2 py-2 text-right tabular-nums">{r.pazarlikliFiyat || r.istenenFiyat || "—"}</td>
                        <td className="px-2 py-2 text-right font-semibold tabular-nums text-slate-900">{fmt(birim)}</td>
                        <td className="px-2 py-2 tabular-nums">
                          {r.ilanTarihi ? new Date(r.ilanTarihi).toLocaleDateString("tr-TR") : "—"}
                          {eskiIlanMi(r) && (
                            <span className="ml-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                              eski
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="relative h-[420px] overflow-hidden rounded-xl border border-slate-200 xl:col-span-2 xl:h-[560px]">
          <YakinEmsalHaritasi
            konular={konular}
            records={yakinlar}
            mesafeler={mesafeler}
            yaricap={yaricap}
            seciliIds={seciliIds}
            onToggle={toggle}
            odakId={odakId}
          />
          <div className="pointer-events-none absolute bottom-2 left-2 z-[500] rounded-lg bg-white/95 px-2.5 py-1.5 text-[10px] text-slate-600 shadow-sm">
            <span className="mr-2 inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-red-600" />
              Konu
            </span>
            <span className="mr-2 inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-slate-900" />
              Satılık
            </span>
            <span className="mr-2 inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-sky-700" />
              Kiralık
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-lime-600" />
              Seçili
            </span>
          </div>
        </div>
      </div>

      {secilenler.length > 0 && (
        <div className="sticky bottom-0 z-[600] rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-900">
              {secilenler.length} emsal seçildi · aktarılacak sekmeler
            </p>
            <button
              type="button"
              onClick={() => {
                setSeciliSira([]);
                setHedefSecimleri(new Map());
              }}
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800"
            >
              <X className="h-3.5 w-3.5" />
              Seçimi temizle
            </button>
          </div>
          {/* Capped so a long selection never covers the list and map behind this sticky panel. */}
          <div className="mt-3 grid max-h-[30vh] gap-2 overflow-y-auto md:grid-cols-2">
            {secilenler.map((r) => {
              const hedef = hedefler.get(r.id) ?? null;
              const dolu = hedef ? slotDoluMu(data[hedef]) : false;
              const cift = hedef ? (hedefSayilari.get(hedef) ?? 0) > 1 : false;
              return (
                <div key={r.id} className="flex items-center gap-2 rounded-lg border border-slate-100 px-3 py-2 text-xs">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-900">
                      {r.emlakTipi || "Emsal"} · {[r.mahalle, r.ilce].filter(Boolean).join(", ")}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {formatMesafe(mesafeler.get(r.id) ?? 0)} · {fmt(birimFiyat(r))} ₺/m²
                    </p>
                  </div>
                  <ArrowRightLeft className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                  <div className="shrink-0 text-right">
                    <select
                      value={hedef ?? ""}
                      onChange={(e) => hedefSec(r.id, e.target.value as EmsalSlotKey)}
                      className={`h-8 rounded-lg border px-2 text-xs font-medium ${
                        !hedef || cift
                          ? "border-rose-300 text-rose-700"
                          : dolu
                            ? "border-amber-300 text-amber-800"
                            : "border-slate-200 text-slate-800"
                      }`}
                      aria-label="Hedef sekme"
                    >
                      {!hedef && <option value="">Boş sekme yok — seçin</option>}
                      {slotlariFor(r).map((slot) => (
                        <option key={slot} value={slot}>
                          {SLOT_ETIKETI[slot]}
                          {slotDoluMu(data[slot]) ? " (dolu)" : ""}
                        </option>
                      ))}
                    </select>
                    {hedef && dolu && !cift && <p className="mt-0.5 text-[10px] text-amber-700">Üzerine yazılacak</p>}
                    {cift && <p className="mt-0.5 text-[10px] text-rose-600">Aynı sekme iki kez seçildi</p>}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
            {secilenler.length > aktarilacak.length && (
              <p className="mr-auto text-xs text-rose-600">
                {secilenler.length - aktarilacak.length} emsal için boş sekme kalmadı; bir hedef seçin ya da seçimden
                çıkarın.
              </p>
            )}
            <button
              type="button"
              onClick={() => {
                setSeciliSira([]);
                setHedefSecimleri(new Map());
              }}
              className={secondaryButtonClass}
            >
              Vazgeç
            </button>
            <button
              type="button"
              onClick={aktar}
              disabled={aktarilacak.length === 0 || cakisma}
              className={`${primaryButtonClass} inline-flex items-center gap-1.5`}
            >
              <ArrowRightLeft className="h-4 w-4" />
              {aktarilacak.length} emsali aktar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
