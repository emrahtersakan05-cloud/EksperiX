"use client";

import { useEffect, useState } from "react";
import { ComboboxField, Field, RepeatableList, SelectField, helperTextClass, inputClass } from "@/components/talep/form-fields";
import { evetHayirOptions } from "@/lib/talep/options";
import { addBelgeCinsi, getBelgeCinsleri, getRuhsatKurumlari, removeBelgeCinsi } from "@/lib/talep/ruhsat-referans";
import { newRowId, type RuhsatBelgeKaydi, type RuhsatIncelemeData } from "@/lib/talep/types";

export default function KurumIncelemeleriSection({
  data,
  onChange,
  city,
  district,
}: {
  data: RuhsatIncelemeData;
  onChange: (patch: Partial<RuhsatIncelemeData>) => void;
  city?: string;
  district?: string;
}) {
  const [kurumOptions, setKurumOptions] = useState<string[]>([]);
  const [belgeCinsiOptions, setBelgeCinsiOptions] = useState<string[]>([]);

  useEffect(() => {
    getRuhsatKurumlari(city, district).then(setKurumOptions);
  }, [city, district]);

  useEffect(() => {
    getBelgeCinsleri().then(setBelgeCinsiOptions);
  }, []);

  function updateBelge(id: string, patch: Partial<RuhsatBelgeKaydi>) {
    onChange({
      belgeler: data.belgeler.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    });
  }

  async function handleAddBelgeCinsi(value: string) {
    const next = await addBelgeCinsi(value);
    setBelgeCinsiOptions(next);
  }

  async function handleRemoveBelgeCinsi(value: string) {
    const next = await removeBelgeCinsi(value);
    setBelgeCinsiOptions(next);
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <SelectField
          label="Ruhsat / Resmi Evrak Var mı?"
          value={data.ruhsatResmiEvrakVarMi}
          options={evetHayirOptions}
          onChange={(value) =>
            onChange(
              value === "Evet"
                ? {
                    ruhsatResmiEvrakVarMi: value,
                    belgeler: data.belgeler.length > 0 ? data.belgeler : [{ id: newRowId(), belgeCinsi: "", belgeTarihi: "", belgeNo: "" }],
                  }
                : { ruhsatResmiEvrakVarMi: value, incelenenKurumAdi: "", belgeler: [] },
            )
          }
          className="lg:col-span-4"
        />
      </div>

      {data.ruhsatResmiEvrakVarMi === "Hayır" && (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
          Bu bölümde ruhsat veya resmi evrak bulunmadığı işaretlendi.
        </div>
      )}

      {data.ruhsatResmiEvrakVarMi === "Evet" && (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <ComboboxField
              label="İncelenen Kurum Adı"
              value={data.incelenenKurumAdi}
              onChange={(value) => onChange({ incelenenKurumAdi: value })}
              options={kurumOptions}
              placeholder="Kurum seçin..."
              className="lg:col-span-7"
            />
            <div className="lg:col-span-5">
              <span className={helperTextClass}>
                Kurum önerileri, GitHub&apos;taki il-ilçe SQL kaynağından okunup seçili il ve ilçe bilgisine göre türetilir.
              </span>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Belge Bilgileri</p>
            <RepeatableList
              items={data.belgeler}
              addLabel="Belge Satırı Ekle"
              emptyLabel="Henüz belge satırı eklenmedi."
              onAdd={() =>
                onChange({
                  belgeler: [...data.belgeler, { id: newRowId(), belgeCinsi: "", belgeTarihi: "", belgeNo: "" }],
                })
              }
              onRemove={(id) => onChange({ belgeler: data.belgeler.filter((item) => item.id !== id) })}
              renderItem={(item) => (
                <div className="grid grid-cols-1 gap-3 pr-6 lg:grid-cols-12">
                  <ComboboxField
                    label="Belge Cinsi"
                    value={item.belgeCinsi}
                    onChange={(value) => updateBelge(item.id, { belgeCinsi: value })}
                    options={belgeCinsiOptions}
                    onAddNew={handleAddBelgeCinsi}
                    onRemoveOption={handleRemoveBelgeCinsi}
                    placeholder="Belge cinsi seçin..."
                    className="lg:col-span-5"
                  />
                  <Field label="Belge Tarihi" className="lg:col-span-3">
                    <input
                      type="date"
                      className={inputClass}
                      value={item.belgeTarihi}
                      onChange={(e) => updateBelge(item.id, { belgeTarihi: e.target.value })}
                    />
                  </Field>
                  <Field label="Belge No" className="lg:col-span-4">
                    <input
                      className={inputClass}
                      value={item.belgeNo}
                      placeholder="2024/145"
                      onChange={(e) => updateBelge(item.id, { belgeNo: e.target.value })}
                    />
                  </Field>
                </div>
              )}
            />
          </div>
        </div>
      )}
    </div>
  );
}
