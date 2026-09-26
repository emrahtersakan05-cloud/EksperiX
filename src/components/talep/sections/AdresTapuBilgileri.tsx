"use client";

import { DoorOpen, FileText, LandPlot, MapPinned } from "lucide-react";
import { SectionCard, TextField } from "@/components/talep/form-fields";
import { Panel } from "@/components/talep/sections/tasarim";
import type { TapuKaydiData } from "@/lib/talep/types";

const ucSutun = "grid grid-cols-1 gap-x-3 gap-y-3 sm:grid-cols-3";

// Adres / Konum → Tapu: the location and unit fields of the Tapu Kaydı, edited
// in place (the same data as the Tapu Kaydı tab, not a copy).
export default function AdresTapuBilgileri({
  data,
  onChange,
}: {
  data: TapuKaydiData;
  onChange: (patch: Partial<TapuKaydiData>) => void;
}) {
  return (
    <SectionCard title="Tapu Kayıt Bilgileri">
      <p className="mb-3 inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700 ring-1 ring-sky-200">
        <FileText className="h-3 w-3" />
        Tapu Kaydı sekmesiyle ortak — burada yapılan değişiklik orada da görünür
      </p>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Panel baslik="Konum" icon={<MapPinned className="h-3.5 w-3.5" />}>
          <div className="grid grid-cols-1 gap-x-3 gap-y-3 sm:grid-cols-2">
            <TextField label="İl" value={data.il} onChange={(v) => onChange({ il: v })} />
            <TextField label="İlçe" value={data.ilce} onChange={(v) => onChange({ ilce: v })} />
            <TextField label="Mahalle / Köy Adı" value={data.mahalleKoyAdi} onChange={(v) => onChange({ mahalleKoyAdi: v })} />
            <TextField label="Mevkii" value={data.mevkii} onChange={(v) => onChange({ mevkii: v })} />
          </div>
        </Panel>

        <Panel baslik="Ana Taşınmaz" icon={<LandPlot className="h-3.5 w-3.5" />}>
          <div className={ucSutun}>
            <TextField label="Ada" value={data.ada} onChange={(v) => onChange({ ada: v })} />
            <TextField label="Parsel" value={data.parsel} onChange={(v) => onChange({ parsel: v })} />
            <TextField
              label="AT Yüzölçüm (m²)"
              type="number"
              value={data.atYuzolcum}
              onChange={(v) => onChange({ atYuzolcum: v })}
            />
            <TextField
              label="Ana Taşınmaz Nitelik"
              value={data.anaTasinmazNitelik}
              onChange={(v) => onChange({ anaTasinmazNitelik: v })}
              className="sm:col-span-3"
            />
          </div>
        </Panel>

        <Panel baslik="Bağımsız Bölüm" icon={<DoorOpen className="h-3.5 w-3.5" />} className="lg:col-span-2">
          <div className="grid grid-cols-2 gap-x-3 gap-y-3 sm:grid-cols-4 lg:grid-cols-5">
            <TextField
              label="Nitelik"
              value={data.bagimsizBolumNitelik}
              onChange={(v) => onChange({ bagimsizBolumNitelik: v })}
              className="col-span-2 sm:col-span-2 lg:col-span-1"
            />
            <TextField
              label="Brüt (m²)"
              type="number"
              value={data.bagimsizBolumBrutYuzolcum}
              onChange={(v) => onChange({ bagimsizBolumBrutYuzolcum: v })}
            />
            <TextField
              label="Net (m²)"
              type="number"
              value={data.bagimsizBolumNetYuzolcum}
              onChange={(v) => onChange({ bagimsizBolumNetYuzolcum: v })}
            />
            <TextField label="Blok" value={data.blok} onChange={(v) => onChange({ blok: v })} />
            <TextField label="Kat" value={data.kat} onChange={(v) => onChange({ kat: v })} />
            <TextField label="Giriş" value={data.giris} onChange={(v) => onChange({ giris: v })} />
            <TextField label="BBNo" value={data.bbNo} onChange={(v) => onChange({ bbNo: v })} />
            <TextField label="Arsa Pay" value={data.arsaPay} onChange={(v) => onChange({ arsaPay: v })} />
            <TextField label="Arsa Payda" value={data.arsaPayda} onChange={(v) => onChange({ arsaPayda: v })} />
          </div>
        </Panel>
      </div>
    </SectionCard>
  );
}
