"use client";

import { useActionState, useEffect, useState } from "react";
import { Loader2, MapPin, Search, X } from "lucide-react";
import {
  ComboboxField,
  Field,
  TextField,
  helperTextClass,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/talep/form-fields";
import { addIl, addIlce, addMahalle, getIlceler, getIller, getMahalleler } from "@/lib/talep/adres-referans";
import { createEmsalKaydiAction, type EmsalFormState } from "@/lib/emsal-haritasi/actions";
import { EMLAK_TIPI_OPTIONS, type EmsalDurum } from "@/lib/emsal-haritasi/types";

interface FormData {
  durum: EmsalDurum;
  emlakTipi: string;
  il: string;
  ilce: string;
  mahalle: string;
  m2Brut: string;
  m2Net: string;
  odaSayisi: string;
  binaYasi: string;
  kat: string;
  ilanTarihi: string;
  istenenFiyat: string;
  pazarlikliFiyat: string;
  webAdresi: string;
  gorselUrl: string;
}

const EMPTY_FORM: FormData = {
  durum: "satilik",
  emlakTipi: "",
  il: "",
  ilce: "",
  mahalle: "",
  m2Brut: "",
  m2Net: "",
  odaSayisi: "",
  binaYasi: "",
  kat: "",
  ilanTarihi: "",
  istenenFiyat: "",
  pazarlikliFiyat: "",
  webAdresi: "",
  gorselUrl: "",
};

const initialActionState: EmsalFormState = {};

export default function EmsalKayitFormu({
  pickedPoint,
  onSuccess,
  onCancel,
}: {
  pickedPoint: { lat: number; lng: number } | null;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [data, setData] = useState<FormData>(EMPTY_FORM);
  const [kaynak, setKaynak] = useState<"manuel" | "url-bridge">("manuel");
  const [ilOptions, setIlOptions] = useState<string[]>([]);
  const [ilceOptions, setIlceOptions] = useState<string[]>([]);
  const [mahalleOptions, setMahalleOptions] = useState<string[]>([]);
  const [fetching, setFetching] = useState(false);
  const [fetchMessage, setFetchMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [state, formAction, pending] = useActionState(createEmsalKaydiAction, initialActionState);

  function patch(next: Partial<FormData>) {
    setData((prev) => ({ ...prev, ...next }));
  }

  useEffect(() => {
    getIller().then(setIlOptions);
  }, []);

  useEffect(() => {
    if (!data.il) {
      queueMicrotask(() => setIlceOptions([]));
      return;
    }
    getIlceler(data.il).then(setIlceOptions);
  }, [data.il]);

  useEffect(() => {
    if (!data.il || !data.ilce) {
      queueMicrotask(() => setMahalleOptions([]));
      return;
    }
    getMahalleler(data.il, data.ilce).then(setMahalleOptions);
  }, [data.il, data.ilce]);

  useEffect(() => {
    if (state.success) onSuccess();
  }, [state.success, onSuccess]);

  async function handleUrlFetch() {
    const url = data.webAdresi.trim();
    if (!url) return;
    setFetching(true);
    setFetchMessage(null);
    try {
      const res = await fetch("/api/emsal-web-getir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const body = await res.json();
      if (!res.ok) {
        setFetchMessage({ tone: "error", text: body.error ?? "Sayfa okunamadı." });
        return;
      }
      const fields = body.fields ?? {};
      const filledCount = Object.keys(fields).length;
      setData((prev) => ({
        ...prev,
        emlakTipi: fields.emlakTipi ?? prev.emlakTipi,
        il: fields.il ?? prev.il,
        m2Brut: fields.m2Brut ?? prev.m2Brut,
        m2Net: fields.m2Net ?? prev.m2Net,
        odaSayisi: fields.odaSayisi ?? prev.odaSayisi,
        binaYasi: fields.binaYasi ?? prev.binaYasi,
        ilanTarihi: fields.ilanTarihi ?? prev.ilanTarihi,
        istenenFiyat: fields.istenenFiyat ?? prev.istenenFiyat,
        pazarlikliFiyat: fields.pazarlikliFiyat ?? prev.pazarlikliFiyat,
        gorselUrl: body.gorselUrl ?? prev.gorselUrl,
      }));
      setKaynak("url-bridge");
      setFetchMessage(
        filledCount > 0
          ? { tone: "success", text: `${filledCount} alan sayfadan dolduruldu. Koordinatı haritadan işaretlemeyi unutmayın.` }
          : { tone: "error", text: "Sayfa okundu ancak eşleşen alan bulunamadı. Bilgileri elle girebilirsiniz." },
      );
    } catch {
      setFetchMessage({ tone: "error", text: "Sayfa alınırken bir hata oluştu." });
    } finally {
      setFetching(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4">
        <h2 className="text-base font-semibold text-slate-900">Yeni Emsal Ekle</h2>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          aria-label="Kapat"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <form id="emsal-kayit-formu" action={formAction} className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <input type="hidden" name="lat" value={pickedPoint?.lat ?? ""} />
        <input type="hidden" name="lng" value={pickedPoint?.lng ?? ""} />
        <input type="hidden" name="kaynak" value={kaynak} />
        {(["durum", "emlakTipi", "il", "ilce", "mahalle", "m2Brut", "m2Net", "odaSayisi", "binaYasi", "kat", "ilanTarihi", "istenenFiyat", "pazarlikliFiyat", "webAdresi", "gorselUrl"] as const).map(
          (key) => (
            <input key={key} type="hidden" name={key} value={data[key]} />
          ),
        )}

        <div className="space-y-4">
          <div
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${
              pickedPoint ? "border-lime-200 bg-lime-50 text-lime-800" : "border-amber-200 bg-amber-50 text-amber-800"
            }`}
          >
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            {pickedPoint
              ? `Konum seçildi: ${pickedPoint.lat.toFixed(5)}, ${pickedPoint.lng.toFixed(5)}`
              : "Haritada bir noktaya tıklayarak konum seçin."}
          </div>

          <Field label="İlan Adresi (opsiyonel)">
            <div className="flex gap-2">
              <input
                type="url"
                value={data.webAdresi}
                onChange={(e) => patch({ webAdresi: e.target.value })}
                placeholder="https://..."
                className={inputClass}
              />
              <button
                type="button"
                onClick={handleUrlFetch}
                disabled={!data.webAdresi.trim() || fetching}
                className={`${secondaryButtonClass} inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap`}
              >
                {fetching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                Getir
              </button>
            </div>
            {fetchMessage && (
              <p className={`mt-1.5 text-xs ${fetchMessage.tone === "success" ? "text-emerald-600" : "text-rose-600"}`}>
                {fetchMessage.text}
              </p>
            )}
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Durum">
              <div className="flex gap-1.5">
                {(["satilik", "kiralik"] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => patch({ durum: opt })}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                      data.durum === opt
                        ? "border-slate-900 bg-slate-900 text-lime-300"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    {opt === "satilik" ? "Satılık" : "Kiralık"}
                  </button>
                ))}
              </div>
            </Field>
            <ComboboxField
              label="Emlak Tipi"
              value={data.emlakTipi}
              options={EMLAK_TIPI_OPTIONS}
              onChange={(v) => patch({ emlakTipi: v })}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <ComboboxField
              label="İl"
              value={data.il}
              options={ilOptions}
              onChange={(v) => patch({ il: v, ilce: "", mahalle: "" })}
              onAddNew={async (v) => setIlOptions(await addIl(v))}
            />
            <ComboboxField
              label="İlçe"
              value={data.ilce}
              options={ilceOptions}
              placeholder={data.il ? "Ara veya seçin..." : "Önce il seçin"}
              onChange={(v) => patch({ ilce: v, mahalle: "" })}
              onAddNew={data.il ? async (v) => setIlceOptions(await addIlce(data.il, v)) : undefined}
            />
            <ComboboxField
              label="Mahalle"
              value={data.mahalle}
              options={mahalleOptions}
              placeholder={data.ilce ? "Ara veya seçin..." : "Önce ilçe seçin"}
              onChange={(v) => patch({ mahalle: v })}
              onAddNew={
                data.il && data.ilce ? async (v) => setMahalleOptions(await addMahalle(data.il, data.ilce, v)) : undefined
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <TextField label="m² (Brüt)" value={data.m2Brut} onChange={(v) => patch({ m2Brut: v })} />
            <TextField label="m² (Net)" value={data.m2Net} onChange={(v) => patch({ m2Net: v })} />
            <TextField label="Oda Sayısı" value={data.odaSayisi} onChange={(v) => patch({ odaSayisi: v })} />
            <TextField label="Bina Yaşı" value={data.binaYasi} onChange={(v) => patch({ binaYasi: v })} />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <TextField label="Bulunduğu Kat" value={data.kat} onChange={(v) => patch({ kat: v })} />
            <TextField label="İlan Tarihi" type="date" value={data.ilanTarihi} onChange={(v) => patch({ ilanTarihi: v })} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <TextField label="İlan Fiyatı" value={data.istenenFiyat} onChange={(v) => patch({ istenenFiyat: v })} />
            <TextField
              label="Pazarlıklı Fiyat"
              value={data.pazarlikliFiyat}
              onChange={(v) => patch({ pazarlikliFiyat: v })}
            />
          </div>

          {state.error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{state.error}</p>}
          <p className={helperTextClass}>İl ve emlak tipi zorunludur; koordinat haritadan seçilmelidir.</p>
        </div>
      </form>

      <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 px-5 py-3">
        <button type="button" onClick={onCancel} className={secondaryButtonClass}>
          Vazgeç
        </button>
        <button type="submit" form="emsal-kayit-formu" disabled={pending} className={primaryButtonClass}>
          {pending ? "Kaydediliyor..." : "Kaydet"}
        </button>
      </div>
    </div>
  );
}
