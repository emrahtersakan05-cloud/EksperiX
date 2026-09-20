"use client";

import { ComboboxField, SectionGrid, SelectField, TextAreaField, TextField } from "@/components/talep/form-fields";
import { oncelikOptions, talepTuruOptions } from "@/lib/talep/options";
import {
  degerlemeFirmasiOptions,
  degerlemeKurumBankaGroups,
  tasinmazNiteligiOptions,
} from "@/lib/talep/reference-lists";
import type { TalepDetayiData } from "@/lib/talep/types";

export default function TalepDetayiSection({
  data,
  onChange,
}: {
  data: TalepDetayiData;
  onChange: (patch: Partial<TalepDetayiData>) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Talep Oluşturma Bilgileri
        </p>
        <SectionGrid>
          <TextField
            label="Müşteri Unvanı"
            value={data.musteriUnvani}
            onChange={(v) => onChange({ musteriUnvani: v })}
          />
          <ComboboxField
            label="Değerleme Firması"
            value={data.degerlemeFirmasi}
            options={degerlemeFirmasiOptions}
            onChange={(v) => onChange({ degerlemeFirmasi: v })}
          />
          <ComboboxField
            label="Değerleme Kurum / Banka"
            value={data.degerlemeKurumBanka}
            groups={degerlemeKurumBankaGroups}
            onChange={(v) => onChange({ degerlemeKurumBanka: v })}
          />
          <ComboboxField
            label="Taşınmaz Niteliği"
            value={data.tasinmazNiteligi}
            options={tasinmazNiteligiOptions}
            onChange={(v) => onChange({ tasinmazNiteligi: v })}
          />
        </SectionGrid>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Talep Detayı</p>
        <SectionGrid>
          <SelectField
            label="Talep Türü"
            value={data.talepTuru}
            options={talepTuruOptions}
            onChange={(v) => onChange({ talepTuru: v })}
          />
          <TextField
            label="İlgili Kurum / Banka"
            value={data.ilgiliKurum}
            onChange={(v) => onChange({ ilgiliKurum: v })}
            placeholder="Örn. Ziraat Bankası"
          />
          <TextField label="Dosya No" value={data.dosyaNo} onChange={(v) => onChange({ dosyaNo: v })} />
          <SelectField
            label="Öncelik"
            value={data.oncelik}
            options={oncelikOptions}
            onChange={(v) => onChange({ oncelik: v })}
          />
          <TextField
            label="Talep Tarihi"
            type="date"
            value={data.talepTarihi}
            onChange={(v) => onChange({ talepTarihi: v })}
          />
          <TextField
            label="Hedef Teslim Tarihi"
            type="date"
            value={data.hedefTeslimTarihi}
            onChange={(v) => onChange({ hedefTeslimTarihi: v })}
          />
          <TextField
            label="Atanan Eksper"
            value={data.atananEksper}
            onChange={(v) => onChange({ atananEksper: v })}
            className="sm:col-span-2"
          />
          <TextAreaField
            label="Notlar"
            value={data.notlar}
            onChange={(v) => onChange({ notlar: v })}
            className="sm:col-span-2"
          />
        </SectionGrid>
      </div>
    </div>
  );
}
