"use client";

import { useMemo } from "react";
import { SectionCard, SectionGrid, SelectField, TextAreaField, TextField, sectionBodyClass } from "@/components/talep/form-fields";
import DegerHesaplamasi from "@/components/talep/sections/DegerHesaplamasi";
import NotTaslaklari from "@/components/talep/sections/NotTaslaklari";
import { ortalamaEmsalBirimFiyatlari } from "@/lib/emsal/hesaplama";
import { degerlemeDurumOptions, finalDegerKaynakOptions } from "@/lib/talep/options";
import type { DegerlemeData, EmsallerData, MulkiyetKaydi } from "@/lib/talep/types";

export type DegerlemeView = "satisKabiliyeti" | "degerlemeAciklamasi" | "degerHesaplamasi";

export default function DegerlemeSection({
  view,
  data,
  emsaller,
  mulkiyetKayitlari,
  onChange,
}: {
  view: DegerlemeView;
  data: DegerlemeData;
  emsaller: EmsallerData;
  mulkiyetKayitlari: MulkiyetKaydi[];
  onChange: (patch: Partial<DegerlemeData>) => void;
}) {
  const emsalOrtalamasi = useMemo(
    () =>
      ortalamaEmsalBirimFiyatlari([
        emsaller.satilik1,
        emsaller.satilik2,
        emsaller.satilik3,
        emsaller.satilik4,
        emsaller.satilik5,
      ]),
    [emsaller],
  );

  if (view === "satisKabiliyeti") {
    return (
      <NotTaslaklari
        items={data.satisKabiliyetiNotlari}
        onChange={(items) => onChange({ satisKabiliyetiNotlari: items })}
        baslikPlaceholder="Örn. Konum ve ulaşım"
        emptyText="Taşınmazın satış kabiliyetine ilişkin not taslakları burada saklanır. “Yeni Not Ekle” ile başlık ve not detayı girin."
      />
    );
  }

  if (view === "degerlemeAciklamasi") {
    return (
      <NotTaslaklari
        items={data.degerlemeAciklamaNotlari}
        onChange={(items) => onChange({ degerlemeAciklamaNotlari: items })}
        baslikPlaceholder="Örn. Değer takdirinde esas alınan kriterler"
        emptyText="Değerlemeye ilişkin açıklama taslakları burada saklanır. “Yeni Not Ekle” ile başlık ve not detayı girin."
      />
    );
  }

  return (
    <div className="space-y-4">
      <DegerHesaplamasi
        value={data.hesaplamalar}
        onChange={(hesaplamalar) => onChange({ hesaplamalar })}
        emsal={emsalOrtalamasi}
        mulkiyetKayitlari={mulkiyetKayitlari}
        onNihaiDeger={(deger) => onChange({ nihaiDeger: String(Math.round(deger)) })}
      />

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
