"use client";

import { useMemo } from "react";
import DegerHesaplamasi from "@/components/talep/sections/DegerHesaplamasi";
import NotTaslaklari from "@/components/talep/sections/NotTaslaklari";
import { ortalamaEmsalBirimFiyatlari } from "@/lib/emsal/hesaplama";
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
    <DegerHesaplamasi
      value={data.hesaplamalar}
      onChange={(hesaplamalar) => onChange({ hesaplamalar })}
      emsal={emsalOrtalamasi}
      mulkiyetKayitlari={mulkiyetKayitlari}
    />
  );
}
