"use client";

import { CheckCheck, FileText, TriangleAlert } from "lucide-react";
import { AkiciAlan } from "@/components/akici-metin/baglam";
import { Field, SectionCard, TextField, inputClass } from "@/components/talep/form-fields";
import { EVET_HAYIR, EvetHayirAciklama, Segment, alan } from "@/components/talep/sections/sade";
import { aykirilikCumlesi } from "@/lib/talep/konut";
import { PROJE_UYUMLARI, projeMetni, projeTarihSayiCumlesi, projeUyumCumlesi, type ProjeUyumu } from "@/lib/talep/proje";
import type { ProjeIncelemeData, TapuKaydiData } from "@/lib/talep/types";

type Degistir = (patch: Partial<ProjeIncelemeData>) => void;

const GRUPLAR = ["Blok / Bina", "Bağımsız Bölüm"] as const;

// Tapu values worth having in view while comparing the project with the site.
function tapuOzeti(t: TapuKaydiData, grup: (typeof GRUPLAR)[number]): { etiket: string; deger: string }[] {
  if (grup === "Blok / Bina") return [{ etiket: "Blok", deger: t.blok }, { etiket: "Ana Taşınmaz", deger: t.anaTasinmazNitelik }];
  return [
    { etiket: "Kat", deger: t.kat },
    { etiket: "BB No", deger: t.bbNo },
    { etiket: "Brüt", deger: t.bagimsizBolumBrutYuzolcum && `${t.bagimsizBolumBrutYuzolcum} m²` },
    { etiket: "Net", deger: t.bagimsizBolumNetYuzolcum && `${t.bagimsizBolumNetYuzolcum} m²` },
  ];
}

function UyumSatiri({ u, data, onChange }: { u: ProjeUyumu; data: ProjeIncelemeData; onChange: Degistir }) {
  const deger = data[u.alan];
  const soru = `${u.grup} ${u.kisa.toLocaleLowerCase("tr-TR")} açısından uyumlu mu?`;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-slate-700">{u.kisa} açısından uyumlu mu?</p>
        <Segment
          secenekler={EVET_HAYIR}
          deger={deger}
          onChange={(v) => onChange({ [u.alan]: v, [u.aciklama]: v === "Hayır" ? data[u.aciklama] : "" })}
          etiket={soru}
        />
      </div>
      {deger === "Hayır" && (
        <textarea
          value={data[u.aciklama]}
          onChange={(e) => onChange({ [u.aciklama]: e.target.value })}
          rows={2}
          placeholder={
            u.kisa === "Alan"
              ? "Projedeki ve yerindeki alanı yazın (örn. projede 120 m², yerinde 135 m²)."
              : "Farkı açıklayın (örn. projede kuzeyde görünen blok yerinde güneyde)."
          }
          aria-label={soru}
          className={`${alan} resize-y border-rose-200`}
        />
      )}
      <AkiciAlan etiket={u.etiket} deger={projeUyumCumlesi(data, u)} />
    </div>
  );
}

export default function ProjeIncelemeleriSection({
  data,
  tapuKaydi,
  onChange,
}: {
  data: ProjeIncelemeData;
  tapuKaydi: TapuKaydiData;
  onChange: Degistir;
}) {
  const yanitli = PROJE_UYUMLARI.filter((u) => data[u.alan]).length;
  const uyumsuz = PROJE_UYUMLARI.filter((u) => data[u.alan] === "Hayır").length;
  const tumuUyumlu = PROJE_UYUMLARI.every((u) => data[u.alan] === "Evet");
  const metin = projeMetni(data);

  function hepsiUyumlu() {
    const patch: Partial<ProjeIncelemeData> = {};
    for (const u of PROJE_UYUMLARI) {
      patch[u.alan] = "Evet";
      patch[u.aciklama] = "";
    }
    onChange(patch);
  }

  return (
    <div className="space-y-4">
      <SectionCard title="Proje İncelemeleri">
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
            <TextField
              label="Proje İncelenen Kurum"
              value={data.incelenenKurum}
              onChange={(incelenenKurum) => onChange({ incelenenKurum })}
              placeholder="örn. Çankaya Belediyesi İmar ve Şehircilik Müdürlüğü"
              className="md:col-span-6"
            />
            <div className="md:col-span-6">
              <p className="mb-1.5 text-xs font-medium text-slate-700">Proje tarihi ve sayısı var mı?</p>
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
              <>
                <Field label="Proje Tarihi" className="md:col-span-6">
                  <input
                    type="date"
                    className={inputClass}
                    value={data.projeTarihi}
                    onChange={(e) => onChange({ projeTarihi: e.target.value })}
                  />
                </Field>
                <Field label="Proje Sayısı" className="md:col-span-6">
                  <input
                    className={inputClass}
                    value={data.projeSayisi}
                    placeholder="2024/145"
                    onChange={(e) => onChange({ projeSayisi: e.target.value })}
                  />
                </Field>
              </>
            )}
          </div>
          <AkiciAlan etiket="Proje Tarih ve Sayı" deger={projeTarihSayiCumlesi(data)} />

          <div className="border-t border-slate-100 pt-3">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-slate-900">Projeye Uyum</p>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium tabular-nums text-slate-600">
                  {yanitli}/{PROJE_UYUMLARI.length} yanıtlandı
                </span>
                {uyumsuz > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700 ring-1 ring-rose-200">
                    <TriangleAlert className="h-3 w-3" />
                    {uyumsuz} uyumsuzluk
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={hepsiUyumlu}
                disabled={tumuUyumlu}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:border-slate-400 disabled:cursor-default disabled:opacity-50"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Tümü uyumlu
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {GRUPLAR.map((grup) => {
                const ozet = tapuOzeti(tapuKaydi, grup).filter((b) => b.deger);
                const grupUyumsuz = PROJE_UYUMLARI.some((u) => u.grup === grup && data[u.alan] === "Hayır");
                return (
                  <div
                    key={grup}
                    className={`space-y-3 rounded-xl border p-3 ${grupUyumsuz ? "border-rose-200 bg-rose-50/30" : "border-slate-200 bg-slate-50/40"}`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{grup}</p>
                      {ozet.length > 0 && (
                        <div className="flex flex-wrap gap-1" title="Tapu Kaydı sekmesinden">
                          {ozet.map((b) => (
                            <span key={b.etiket} className="rounded-md bg-white px-1.5 py-0.5 text-[11px] text-slate-600 ring-1 ring-slate-200">
                              <span className="text-slate-400">{b.etiket}</span> {b.deger}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {PROJE_UYUMLARI.filter((u) => u.grup === grup).map((u) => (
                      <UyumSatiri key={u.alan} u={u} data={data} onChange={onChange} />
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
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

      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-4">
        <p className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
          <FileText className="h-3.5 w-3.5" />
          Rapora yansıyacak metin
        </p>
        <p className={`text-sm leading-relaxed ${metin ? "text-slate-700" : "text-slate-400"}`}>
          {metin || "Alanları doldurdukça rapor metni burada oluşur."}
        </p>
      </div>
    </div>
  );
}
