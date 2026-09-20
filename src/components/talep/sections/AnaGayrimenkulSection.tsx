"use client";

import { SectionGrid, SelectField, TextField, ToggleField } from "@/components/talep/form-fields";
import { binaTuruOptions, genelDurumOptions, iskanDurumuOptions } from "@/lib/talep/options";
import type { AnaGayrimenkulData } from "@/lib/talep/types";

export default function AnaGayrimenkulSection({
  data,
  onChange,
}: {
  data: AnaGayrimenkulData;
  onChange: (patch: Partial<AnaGayrimenkulData>) => void;
}) {
  return (
    <div className="space-y-4">
      <SectionGrid>
        <SelectField
          label="Bina Türü"
          value={data.binaTuru}
          options={binaTuruOptions}
          onChange={(v) => onChange({ binaTuru: v })}
        />
        <TextField
          label="Yapım Yılı"
          type="number"
          value={data.yapimYili}
          onChange={(v) => onChange({ yapimYili: v })}
        />
        <TextField
          label="Kat Sayısı"
          type="number"
          value={data.katSayisi}
          onChange={(v) => onChange({ katSayisi: v })}
        />
        <TextField
          label="Toplam İnşaat Alanı (m²)"
          type="number"
          value={data.toplamInsaatAlaniM2}
          onChange={(v) => onChange({ toplamInsaatAlaniM2: v })}
        />
        <TextField
          label="Yapı Sınıfı"
          value={data.yapiSinifi}
          onChange={(v) => onChange({ yapiSinifi: v })}
          placeholder="Örn. 3A"
        />
        <TextField
          label="Dış Cephe Durumu"
          value={data.disCepheDurumu}
          onChange={(v) => onChange({ disCepheDurumu: v })}
        />
        <SelectField
          label="Genel Durum"
          value={data.genelDurum}
          options={genelDurumOptions}
          onChange={(v) => onChange({ genelDurum: v })}
        />
        <TextField
          label="Yapı Ruhsatı Tarihi"
          type="date"
          value={data.yapiRuhsatiTarihi}
          onChange={(v) => onChange({ yapiRuhsatiTarihi: v })}
        />
        <SelectField
          label="İskan Durumu"
          value={data.iskanDurumu}
          options={iskanDurumuOptions}
          onChange={(v) => onChange({ iskanDurumu: v })}
        />
      </SectionGrid>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <ToggleField label="Asansör" checked={data.asansor} onChange={(v) => onChange({ asansor: v })} />
        <ToggleField label="Otopark" checked={data.otopark} onChange={(v) => onChange({ otopark: v })} />
      </div>
    </div>
  );
}
