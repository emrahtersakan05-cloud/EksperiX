"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, MapPin, Plus, Trash2 } from "lucide-react";
import { formatTrNumber, parseTrNumber } from "@/lib/emsal/hesaplama";
import { deleteEmsalKaydiAction } from "@/lib/emsal-haritasi/actions";
import type { EmsalHaritaKaydi } from "@/lib/emsal-haritasi/types";
import type { PublicUser } from "@/lib/auth/types";
import EmsalHaritaMap from "@/components/emsal-haritasi/EmsalHaritaMap";
import EmsalKayitFormu from "@/components/emsal-haritasi/EmsalKayitFormu";

function birimFiyat(kaydi: EmsalHaritaKaydi): number | null {
  const fiyat = parseTrNumber(kaydi.pazarlikliFiyat) ?? parseTrNumber(kaydi.istenenFiyat);
  const alan = parseTrNumber(kaydi.m2Net) ?? parseTrNumber(kaydi.m2Brut);
  if (fiyat === null || alan === null || alan <= 0) return null;
  return fiyat / alan;
}

function EmsalCard({
  kaydi,
  canDelete,
  active,
  onFocus,
}: {
  kaydi: EmsalHaritaKaydi;
  canDelete: boolean;
  active: boolean;
  onFocus: () => void;
}) {
  const birim = birimFiyat(kaydi);
  return (
    <div
      onClick={onFocus}
      className={`cursor-pointer rounded-xl border p-3 transition-colors ${
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
        {canDelete && (
          <form
            action={deleteEmsalKaydiAction}
            onClick={(e) => e.stopPropagation()}
            className="shrink-0"
          >
            <input type="hidden" name="id" value={kaydi.id} />
            <input type="hidden" name="ekleyenKullaniciId" value={kaydi.ekleyenKullaniciId} />
            <button
              type="submit"
              className="rounded-full p-1 text-slate-300 hover:bg-rose-50 hover:text-rose-600"
              aria-label="Kaydı sil"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </form>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-slate-500">{kaydi.m2Net || kaydi.m2Brut || "—"} m²</span>
        <span className="font-semibold text-slate-900">{birim ? `${formatTrNumber(birim)} ₺/m²` : "—"}</span>
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
  const [pickedPoint, setPickedPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);

  const stats = useMemo(() => {
    const birimler = records.map(birimFiyat).filter((v): v is number => v !== null);
    const ortalama = birimler.length ? birimler.reduce((s, v) => s + v, 0) / birimler.length : null;
    return { adet: records.length, ortalama };
  }, [records]);

  function openForm() {
    setPickedPoint(null);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setPickedPoint(null);
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] min-h-[560px] gap-4">
      <aside className="flex w-80 shrink-0 flex-col rounded-2xl border border-slate-100 bg-white">
        <div className="shrink-0 space-y-3 border-b border-slate-100 p-4">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Emsal Haritası</h1>
            <p className="mt-0.5 text-xs text-slate-500">
              {stats.adet} kayıt{stats.ortalama !== null ? ` · Ort. ${formatTrNumber(stats.ortalama)} ₺/m²` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={openForm}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-lime-300 hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            Yeni Emsal Ekle
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
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
          {records.map((kaydi) => (
            <EmsalCard
              key={kaydi.id}
              kaydi={kaydi}
              active={focusId === kaydi.id}
              canDelete={currentUser?.role === "admin" || currentUser?.id === kaydi.ekleyenKullaniciId}
              onFocus={() => setFocusId(kaydi.id)}
            />
          ))}
        </div>
      </aside>

      <div className="relative flex-1 overflow-hidden rounded-2xl border border-slate-100">
        <EmsalHaritaMap
          records={records}
          picking={formOpen}
          pickedPoint={pickedPoint}
          onPick={(lat, lng) => setPickedPoint({ lat, lng })}
          focusId={focusId}
        />
      </div>

      {formOpen && (
        <div className="w-96 shrink-0 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-lg">
          <EmsalKayitFormu pickedPoint={pickedPoint} onSuccess={closeForm} onCancel={closeForm} />
        </div>
      )}
    </div>
  );
}
