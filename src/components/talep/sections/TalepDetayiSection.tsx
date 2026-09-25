"use client";

import { ComboboxField, SectionGrid, SelectField, TextAreaField, TextField } from "@/components/talep/form-fields";
import { oncelikOptions, talepTuruOptions } from "@/lib/talep/options";
import {
  degerlemeFirmasiOptions,
  degerlemeKurumBankaGroups,
  tasinmazNiteligiOptions,
} from "@/lib/talep/reference-lists";
import type { TalepDetayiData } from "@/lib/talep/types";

// Hedef Teslim Tarihi follows Talep Tarihi by this many days.
const TESLIM_SURESI_GUN = 2;

// "2026-09-25" + n days, in calendar days (no time zone drift).
function gunEkle(tarih: string, gun: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(tarih);
  if (!m) return "";
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + gun));
  return d.toISOString().slice(0, 10);
}

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
            onChange={(v) => {
              // Fill the target date, unless the user has set one by hand
              // (i.e. it no longer matches the previous automatic value).
              const otomatik = !data.hedefTeslimTarihi || data.hedefTeslimTarihi === gunEkle(data.talepTarihi, TESLIM_SURESI_GUN);
              const hedef = gunEkle(v, TESLIM_SURESI_GUN);
              onChange(otomatik && hedef ? { talepTarihi: v, hedefTeslimTarihi: hedef } : { talepTarihi: v });
            }}
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
