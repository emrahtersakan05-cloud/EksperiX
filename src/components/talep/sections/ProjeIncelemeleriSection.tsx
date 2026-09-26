"use client";

import { useEffect, useState } from "react";
import { AkiciAlan } from "@/components/akici-metin/baglam";
import { ComboboxField, Field, SectionCard, inputClass } from "@/components/talep/form-fields";
import { EVET_HAYIR, EvetHayirAciklama, Segment } from "@/components/talep/sections/sade";
import { aykirilikCumlesi } from "@/lib/talep/konut";
import { PROJE_UYUMLARI, projeTarihSayiCumlesi, projeUyumCumlesi } from "@/lib/talep/proje";
import { getRuhsatKurumlari } from "@/lib/talep/ruhsat-referans";
import type { ProjeIncelemeData } from "@/lib/talep/types";

export default function ProjeIncelemeleriSection({
  data,
  onChange,
  city,
  district,
}: {
  data: ProjeIncelemeData;
  onChange: (patch: Partial<ProjeIncelemeData>) => void;
  city?: string;
  district?: string;
}) {
  const [kurumlar, setKurumlar] = useState<string[]>([]);

  useEffect(() => {
    getRuhsatKurumlari(city, district).then(setKurumlar);
  }, [city, district]);

  return (
    <div className="space-y-4">
      <SectionCard title="Proje İncelemeleri">
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <ComboboxField
              label="Proje İncelenen Kurum"
              value={data.incelenenKurum}
              onChange={(incelenenKurum) => onChange({ incelenenKurum })}
              options={kurumlar}
              placeholder="Kurum seçin veya yazın..."
            />
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-medium text-slate-700">Proje tarihi ve sayısı var mı?</p>
              <Segment
                secenekler={EVET_HAYIR}
                deger={data.tarihSayiVarMi}
                onChange={(v) =>
                  onChange(v === "Evet" ? { tarihSayiVarMi: v } : { tarihSayiVarMi: v, projeTarihi: "", projeSayisi: "" })
                }
                etiket="Proje tarihi ve sayısı var mı?"
              />
            </div>
            {data.tarihSayiVarMi === "Evet" && (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Field label="Proje Tarihi">
                  <input
                    type="date"
                    className={inputClass}
                    value={data.projeTarihi}
                    onChange={(e) => onChange({ projeTarihi: e.target.value })}
                  />
                </Field>
                <Field label="Proje Sayısı">
                  <input
                    className={inputClass}
                    value={data.projeSayisi}
                    placeholder="2024/145"
                    onChange={(e) => onChange({ projeSayisi: e.target.value })}
                  />
                </Field>
              </div>
            )}
          </div>

          <div className="space-y-3 border-t border-slate-100 pt-3">
            {PROJE_UYUMLARI.map((u) => (
              <EvetHayirAciklama
                key={u.alan}
                soru={u.soru}
                deger={data[u.alan]}
                aciklama={data[u.aciklama]}
                yerTutucu="Uyumsuzluğu açıklayın."
                acan="Hayır"
                onChange={(deger, aciklama) => onChange({ [u.alan]: deger, [u.aciklama]: aciklama })}
              />
            ))}
          </div>

          <AkiciAlan etiket="Proje Tarih ve Sayı" deger={projeTarihSayiCumlesi(data)} />
          {PROJE_UYUMLARI.map((u) => (
            <AkiciAlan key={u.alan} etiket={u.etiket} deger={projeUyumCumlesi(data, u)} />
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Mimari Projesine Göre Aykırılık">
        <EvetHayirAciklama
          soru="Mimari projesine göre aykırılık var mı?"
          deger={data.aykirilik}
          aciklama={data.aykirilikAciklama}
          yerTutucu="Aykırılığı açıklayın (örn. zemin katta projede dükkan olarak görünen alan konut olarak kullanılmaktadır)."
          onChange={(aykirilik, aykirilikAciklama) => onChange({ aykirilik, aykirilikAciklama })}
        />
        <AkiciAlan etiket="Mimari Projeye Aykırılık" deger={aykirilikCumlesi(data)} />
      </SectionCard>
    </div>
  );
}
