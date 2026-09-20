"use client";

import type { ReactNode } from "react";
import { Field, SectionCard, SectionGrid, SelectField, TextAreaField, TextField, inputClass, sectionBodyClass } from "@/components/talep/form-fields";
import { degerlemeDurumOptions, finalDegerKaynakOptions } from "@/lib/talep/options";
import type { DegerlemeData } from "@/lib/talep/types";

function ApproachCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <SectionCard title={title}>
      <div className={`${sectionBodyClass} grid grid-cols-1 gap-3 sm:grid-cols-2`}>{children}</div>
    </SectionCard>
  );
}

export default function DegerlemeSection({
  data,
  onChange,
}: {
  data: DegerlemeData;
  onChange: (patch: Partial<DegerlemeData>) => void;
}) {
  return (
    <div className="space-y-4">
      <TextField
        label="Değerlenen Alan (m²)"
        type="number"
        value={data.alanM2}
        onChange={(v) => onChange({ alanM2: v })}
        className="max-w-xs"
      />

      <ApproachCard title="Emsal Karşılaştırma Yaklaşımı">
        <Field label="Hesaplanan Değer (₺)">
          <input
            className={inputClass}
            type="number"
            value={data.emsalYaklasimiDegeri}
            onChange={(e) => onChange({ emsalYaklasimiDegeri: e.target.value })}
          />
        </Field>
      </ApproachCard>

      <ApproachCard title="Gelir Yaklaşımı">
        <Field label="Yıllık Net Gelir (₺)">
          <input
            className={inputClass}
            type="number"
            value={data.yillikNetGelir}
            onChange={(e) => onChange({ yillikNetGelir: e.target.value })}
          />
        </Field>
        <Field label="Kapitalizasyon Oranı (%)">
          <input
            className={inputClass}
            type="number"
            value={data.kapitalizasyonOrani}
            onChange={(e) => onChange({ kapitalizasyonOrani: e.target.value })}
          />
        </Field>
        <Field label="Hesaplanan Değer (₺)" className="sm:col-span-2">
          <input
            className={inputClass}
            type="number"
            value={data.gelirYaklasimiDegeri}
            onChange={(e) => onChange({ gelirYaklasimiDegeri: e.target.value })}
          />
        </Field>
      </ApproachCard>

      <ApproachCard title="Maliyet Yaklaşımı">
        <Field label="m² Birim Maliyet (₺)">
          <input
            className={inputClass}
            type="number"
            value={data.m2BirimMaliyet}
            onChange={(e) => onChange({ m2BirimMaliyet: e.target.value })}
          />
        </Field>
        <Field label="Yıpranma Oranı (%)">
          <input
            className={inputClass}
            type="number"
            value={data.yipranmaOrani}
            onChange={(e) => onChange({ yipranmaOrani: e.target.value })}
          />
        </Field>
        <Field label="Hesaplanan Değer (₺)" className="sm:col-span-2">
          <input
            className={inputClass}
            type="number"
            value={data.maliyetYaklasimiDegeri}
            onChange={(e) => onChange({ maliyetYaklasimiDegeri: e.target.value })}
          />
        </Field>
      </ApproachCard>

      <SectionCard title="Nihai Değer Mutabakatı">
        <div className={sectionBodyClass}>
          <SectionGrid>
            <TextField
              label="Nihai Değer (₺)"
              type="number"
              value={data.nihaiDeger}
              onChange={(v) => onChange({ nihaiDeger: v })}
            />
            <SelectField
              label="Nihai Değer Kaynağı"
              value={data.finalDegerKaynagi}
              options={finalDegerKaynakOptions}
              onChange={(v) => onChange({ finalDegerKaynagi: v })}
            />
            <TextField
              label="Varyans (%)"
              type="number"
              value={data.varyansYuzdesi}
              onChange={(v) => onChange({ varyansYuzdesi: v })}
            />
            <SelectField
              label="Durum"
              value={data.durum}
              options={degerlemeDurumOptions}
              onChange={(v) => onChange({ durum: v })}
            />
            <TextAreaField
              label="Mutabakat Notu"
              value={data.mutabakatNotu}
              onChange={(v) => onChange({ mutabakatNotu: v })}
              className="sm:col-span-2"
            />
          </SectionGrid>
        </div>
      </SectionCard>
    </div>
  );
}
