"use client";

import { Field, RepeatableList, inputClass } from "@/components/talep/form-fields";
import { kurumIncelemeDurumOptions } from "@/lib/talep/options";
import { newRowId, type KurumIncelemesi } from "@/lib/talep/types";

export default function ProjeIncelemeleriSection({
  items,
  onChange,
}: {
  items: KurumIncelemesi[];
  onChange: (items: KurumIncelemesi[]) => void;
}) {
  const update = (id: string, patch: Partial<KurumIncelemesi>) =>
    onChange(items.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  return (
    <RepeatableList
      items={items}
      addLabel="Proje İncelemesi Ekle"
      emptyLabel="Henüz proje incelemesi eklenmedi."
      onAdd={() =>
        onChange([
          ...items,
          { id: newRowId(), kurum: "", incelemeTuru: "", durum: "", tarih: "", notlar: "" },
        ])
      }
      onRemove={(id) => onChange(items.filter((i) => i.id !== id))}
      renderItem={(item) => (
        <div className="grid grid-cols-1 gap-3 pr-6 sm:grid-cols-2">
          <Field label="Proje / Birim">
            <input
              className={inputClass}
              value={item.kurum}
              placeholder="Statik, mimari veya mekanik proje birimi"
              onChange={(e) => update(item.id, { kurum: e.target.value })}
            />
          </Field>
          <Field label="İnceleme Türü">
            <input
              className={inputClass}
              value={item.incelemeTuru}
              placeholder="Mimari proje incelemesi"
              onChange={(e) => update(item.id, { incelemeTuru: e.target.value })}
            />
          </Field>
          <Field label="Durum">
            <select
              className={`${inputClass} appearance-none`}
              value={item.durum}
              onChange={(e) => update(item.id, { durum: e.target.value as KurumIncelemesi["durum"] })}
            >
              <option value="">Seçiniz</option>
              {kurumIncelemeDurumOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tarih">
            <input
              type="date"
              className={inputClass}
              value={item.tarih}
              onChange={(e) => update(item.id, { tarih: e.target.value })}
            />
          </Field>
          <Field label="Notlar" className="sm:col-span-2">
            <input
              className={inputClass}
              value={item.notlar}
              onChange={(e) => update(item.id, { notlar: e.target.value })}
            />
          </Field>
        </div>
      )}
    />
  );
}
