"use client";

import { SectionCard, SectionGrid, SelectField, TextField, ToggleField } from "@/components/talep/form-fields";
import { isitmaTipiOptions, kullanimSekliOptions } from "@/lib/talep/options";
import type { BagimsizBolumData } from "@/lib/talep/types";

export default function BagimsizBolumSection({
  data,
  onChange,
  baslik = "Bağımsız Bölüm Özellikleri Formu",
}: {
  data: BagimsizBolumData;
  onChange: (patch: Partial<BagimsizBolumData>) => void;
  baslik?: string;
}) {
  return (
    <SectionCard title={baslik}>
      <div className="space-y-4">
        <SectionGrid>
          <TextField
            label="Bağımsız Bölüm No"
            value={data.bagimsizBolumNo}
            onChange={(v) => onChange({ bagimsizBolumNo: v })}
          />
          <TextField label="Bulunduğu Kat" value={data.bulunduguKat} onChange={(v) => onChange({ bulunduguKat: v })} />
          <TextField
            label="Brüt Alan (m²)"
            type="number"
            value={data.brutAlanM2}
            onChange={(v) => onChange({ brutAlanM2: v })}
          />
          <TextField
            label="Net Alan (m²)"
            type="number"
            value={data.netAlanM2}
            onChange={(v) => onChange({ netAlanM2: v })}
          />
          <TextField
            label="Oda Sayısı"
            value={data.odaSayisi}
            onChange={(v) => onChange({ odaSayisi: v })}
            placeholder="3+1"
          />
          <SelectField
            label="Kullanım Şekli"
            value={data.kullanimSekli}
            options={kullanimSekliOptions}
            onChange={(v) => onChange({ kullanimSekli: v })}
          />
          <TextField label="Cephe Yönü" value={data.cepheYonu} onChange={(v) => onChange({ cepheYonu: v })} />
          <SelectField
            label="Isıtma Tipi"
            value={data.isitmaTipi}
            options={isitmaTipiOptions}
            onChange={(v) => onChange({ isitmaTipi: v })}
          />
          <TextField
            label="Banyo / Tuvalet Sayısı"
            type="number"
            value={data.banyoTuvaletSayisi}
            onChange={(v) => onChange({ banyoTuvaletSayisi: v })}
          />
          <TextField label="Manzara" value={data.manzara} onChange={(v) => onChange({ manzara: v })} />
          <TextField
            label="Tapu Niteliği"
            value={data.tapuNiteligi}
            onChange={(v) => onChange({ tapuNiteligi: v })}
            placeholder="Mesken"
          />
        </SectionGrid>

        <ToggleField label="Balkon" checked={data.balkon} onChange={(v) => onChange({ balkon: v })} />
      </div>
    </SectionCard>
  );
}
