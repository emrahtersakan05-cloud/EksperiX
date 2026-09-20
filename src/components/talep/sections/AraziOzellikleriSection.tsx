"use client";

import { useEffect, useState } from "react";
import {
  ComboboxField,
  SectionCard,
  TextField,
  helperTextClass,
  sectionBodyClass,
} from "@/components/talep/form-fields";
import {
  addAraziSekli,
  addAraziYapisi,
  addSulamaImkani,
  getAraziSekilleri,
  getAraziYapilari,
  getSulamaImkanlari,
  removeAraziSekli,
  removeAraziYapisi,
  removeSulamaImkani,
} from "@/lib/talep/arazi-referans";
import type { AraziOzellikleriData, TapuKaydiData } from "@/lib/talep/types";

const FormGroup = SectionCard;

export default function AraziOzellikleriSection({
  data,
  tapuKaydi,
  onChange,
}: {
  data: AraziOzellikleriData;
  tapuKaydi: TapuKaydiData;
  onChange: (patch: Partial<AraziOzellikleriData>) => void;
}) {
  const [araziSekliOptions, setAraziSekliOptions] = useState<string[]>([]);
  const [araziYapisiOptions, setAraziYapisiOptions] = useState<string[]>([]);
  const [sulamaImkaniOptions, setSulamaImkaniOptions] = useState<string[]>([]);

  useEffect(() => {
    getAraziSekilleri().then(setAraziSekliOptions);
    getAraziYapilari().then(setAraziYapisiOptions);
    getSulamaImkanlari().then(setSulamaImkaniOptions);
  }, []);

  async function handleAddAraziSekli(value: string) {
    setAraziSekliOptions(await addAraziSekli(value));
  }
  async function handleRemoveAraziSekli(value: string) {
    setAraziSekliOptions(await removeAraziSekli(value));
  }
  async function handleAddAraziYapisi(value: string) {
    setAraziYapisiOptions(await addAraziYapisi(value));
  }
  async function handleRemoveAraziYapisi(value: string) {
    setAraziYapisiOptions(await removeAraziYapisi(value));
  }
  async function handleAddSulamaImkani(value: string) {
    setSulamaImkaniOptions(await addSulamaImkani(value));
  }
  async function handleRemoveSulamaImkani(value: string) {
    setSulamaImkaniOptions(await removeSulamaImkani(value));
  }

  const showDigerRow =
    data.araziSekli === "Diğer" || data.araziYapisi === "Diğer" || data.sulamaImkani === "Diğer";

  return (
    <div className="space-y-4">
      <FormGroup title="Tapu Bilgileri Formu">
        <div className={`${sectionBodyClass} grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-2 xl:grid-cols-4`}>
          <TextField label="İl" value={tapuKaydi.il} onChange={() => {}} readOnly />
          <TextField label="İlçe" value={tapuKaydi.ilce} onChange={() => {}} readOnly />
          <TextField
            label="Mahalle / Köy Adı"
            value={tapuKaydi.mahalleKoyAdi}
            onChange={() => {}}
            readOnly
          />
          <TextField label="Mevkii" value={tapuKaydi.mevkii} onChange={() => {}} readOnly />
          <TextField label="Ada" value={tapuKaydi.ada} onChange={() => {}} readOnly />
          <TextField label="Parsel" value={tapuKaydi.parsel} onChange={() => {}} readOnly />
          <TextField
            label="AT Yüzölçüm (m²)"
            value={tapuKaydi.atYuzolcum}
            onChange={() => {}}
            readOnly
          />
        </div>
        <span className={helperTextClass}>Bu bilgiler Tapu Kaydı sekmesinden otomatik olarak alınır.</span>
      </FormGroup>

      <FormGroup title="Arazi Özellikleri Formu">
        <div className={`${sectionBodyClass} space-y-3`}>
          <div className="grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-3">
            <ComboboxField
              label="Arazi Şekli"
              value={data.araziSekli}
              onChange={(v) =>
                onChange({ araziSekli: v, ...(v !== "Diğer" ? { araziSekliDiger: "" } : {}) })
              }
              options={araziSekliOptions}
              onAddNew={handleAddAraziSekli}
              onRemoveOption={handleRemoveAraziSekli}
              placeholder="Arazi şekli seçin..."
            />
            <ComboboxField
              label="Arazi Yapısı"
              value={data.araziYapisi}
              onChange={(v) =>
                onChange({ araziYapisi: v, ...(v !== "Diğer" ? { araziYapisiDiger: "" } : {}) })
              }
              options={araziYapisiOptions}
              onAddNew={handleAddAraziYapisi}
              onRemoveOption={handleRemoveAraziYapisi}
              placeholder="Arazi yapısı seçin..."
            />
            <ComboboxField
              label="Sulama İmkânı"
              value={data.sulamaImkani}
              onChange={(v) =>
                onChange({ sulamaImkani: v, ...(v !== "Diğer" ? { sulamaImkaniDiger: "" } : {}) })
              }
              options={sulamaImkaniOptions}
              onAddNew={handleAddSulamaImkani}
              onRemoveOption={handleRemoveSulamaImkani}
              placeholder="Sulama imkânı seçin..."
            />
          </div>

          {showDigerRow && (
            <div className="grid grid-cols-1 gap-x-4 gap-y-3 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 md:grid-cols-3">
              {data.araziSekli === "Diğer" && (
                <TextField
                  label="Arazi Şekli (Diğer)"
                  value={data.araziSekliDiger}
                  onChange={(v) => onChange({ araziSekliDiger: v })}
                  placeholder="Arazi şeklini belirtin"
                />
              )}
              {data.araziYapisi === "Diğer" && (
                <TextField
                  label="Arazi Yapısı (Diğer)"
                  value={data.araziYapisiDiger}
                  onChange={(v) => onChange({ araziYapisiDiger: v })}
                  placeholder="Arazi yapısını belirtin"
                />
              )}
              {data.sulamaImkani === "Diğer" && (
                <TextField
                  label="Sulama İmkânı (Diğer)"
                  value={data.sulamaImkaniDiger}
                  onChange={(v) => onChange({ sulamaImkaniDiger: v })}
                  placeholder="Sulama imkânını belirtin"
                />
              )}
            </div>
          )}
        </div>
      </FormGroup>
    </div>
  );
}
