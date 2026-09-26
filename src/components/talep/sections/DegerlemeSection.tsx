"use client";

import { useMemo } from "react";
import DegerHesaplamasi from "@/components/talep/sections/DegerHesaplamasi";
import NotTaslaklari from "@/components/talep/sections/NotTaslaklari";
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
  // The satılık emsaller are the basis for the unit value (Emsal Dayanağı).
  const emsalKayitlari = useMemo(
    () => [
      { etiket: "Satılık-1", kaydi: emsaller.satilik1 },
      { etiket: "Satılık-2", kaydi: emsaller.satilik2 },
      { etiket: "Satılık-3", kaydi: emsaller.satilik3 },
      { etiket: "Satılık-4", kaydi: emsaller.satilik4 },
      { etiket: "Satılık-5", kaydi: emsaller.satilik5 },
    ],
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
    <DegerHesaplamasi
      value={data.hesaplamalar}
      onChange={(hesaplamalar) => onChange({ hesaplamalar })}
      emsalKayitlari={emsalKayitlari}
      mulkiyetKayitlari={mulkiyetKayitlari}
    />
  );
}
