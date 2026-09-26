"use client";

import { Building, Building2, FileText, Home, MapPin } from "lucide-react";
import { AkiciAlan } from "@/components/akici-metin/baglam";
import KonutTespitleri from "@/components/talep/sections/KonutTespitleri";
import { BinaOzellikleri, KatDagilimBilgisi, MimariAykirilik } from "@/components/talep/sections/KonutProjeBina";
import { SectionCard, sectionCardClass } from "@/components/talep/form-fields";
import { NitelikKarti, TapuBilgisi } from "@/components/talep/sections/ortak";
import { KONUT_MAHALLINDEKI_NITELIKLER, insaatNizamiOzeti } from "@/lib/talep/konut";
import type { KonutOzellikleriData, TapuKaydiData } from "@/lib/talep/types";

const FormGroup = SectionCard;

export default function KonutOzellikleriSection({
  data,
  tapuKaydi,
  onChange,
}: {
  data: KonutOzellikleriData;
  tapuKaydi: TapuKaydiData;
  onChange: (patch: Partial<KonutOzellikleriData>) => void;
}) {
  const bloklu = data.mahallindekiNitelik === "bloklu";
  const tapuBilgileri = [
    { etiket: "Ana Taşınmaz Nitelik", deger: tapuKaydi.anaTasinmazNitelik },
    { etiket: "Bağımsız Bölüm Nitelik", deger: tapuKaydi.bagimsizBolumNitelik },
    { etiket: "Bağımsız Bölüm Brüt Yüzölçümü", deger: tapuKaydi.bagimsizBolumBrutYuzolcum },
    { etiket: "Bağımsız Bölüm Net Yüzölçümü", deger: tapuKaydi.bagimsizBolumNetYuzolcum },
    { etiket: "Blok", deger: tapuKaydi.blok },
    { etiket: "Kat", deger: tapuKaydi.kat },
    { etiket: "Giriş", deger: tapuKaydi.giris },
    { etiket: "BBNo", deger: tapuKaydi.bbNo },
    { etiket: "Arsa Pay", deger: tapuKaydi.arsaPay },
    { etiket: "Arsa Payda", deger: tapuKaydi.arsaPayda },
  ];
  const tapuBos = tapuBilgileri.every((b) => !b.deger.trim());

  return (
    <div className="space-y-4">
      <div className={sectionCardClass}>
        <p className="mb-2.5 text-sm font-semibold text-slate-900">Mahallindeki Niteliği</p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3" role="radiogroup" aria-label="Mahallindeki niteliği">
          {KONUT_MAHALLINDEKI_NITELIKLER.map((n) => (
            <NitelikKarti
              key={n.value}
              aktif={data.mahallindekiNitelik === n.value}
              baslik={n.label}
              aciklama={n.aciklama}
              icon={n.value === "bloklu" ? <Building2 className="h-5 w-5" /> : n.value === "bloksuz" ? <Building className="h-5 w-5" /> : <Home className="h-5 w-5" />}
              onClick={() => onChange({ mahallindekiNitelik: data.mahallindekiNitelik === n.value ? "" : n.value })}
            />
          ))}
        </div>
      </div>

      {!data.mahallindekiNitelik ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 px-4 py-10 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-slate-400 shadow-sm">
            <Building2 className="h-5 w-5" />
          </span>
          <p className="text-sm font-semibold text-slate-700">Mahallindeki niteliği seçin</p>
          <p className="max-w-sm text-xs text-slate-500">Bloklu, bloksuz veya müstakil seçimine göre ilgili formlar açılır.</p>
        </div>
      ) : (
        <>
          <FormGroup title="Tapu Bilgileri">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {(tapuKaydi.blok || tapuKaydi.bbNo) && (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-semibold text-lime-300">
                  <MapPin className="h-3.5 w-3.5" />
                  {[tapuKaydi.blok && `${tapuKaydi.blok} Blok`, tapuKaydi.kat && `${tapuKaydi.kat}. Kat`, tapuKaydi.bbNo && `BB ${tapuKaydi.bbNo}`]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              )}
              <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700 ring-1 ring-sky-200">
                <FileText className="h-3 w-3" />
                Tapu Kaydı sekmesinden otomatik alınır
              </span>
            </div>
            {tapuBos && (
              <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Tapu Kaydı sekmesinde henüz bilgi girilmemiş. Tapu belgesini orada yüklediğinizde bu alanlar kendiliğinden dolar.
              </p>
            )}
            <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
              {tapuBilgileri.map((b) => (
                <TapuBilgisi key={b.etiket} etiket={b.etiket} deger={b.deger} />
              ))}
            </div>
            <AkiciAlan
              etiket="Mahallindeki Niteliği"
              deger={KONUT_MAHALLINDEKI_NITELIKLER.find((n) => n.value === data.mahallindekiNitelik)?.label ?? ""}
            />
          </FormGroup>

          <FormGroup title="Konum Tespiti">
            <KonutTespitleri data={data} tapuKaydi={tapuKaydi} bloklu={bloklu} onChange={onChange} />
            <AkiciAlan etiket="İnşaat Nizamı" deger={insaatNizamiOzeti(data)} />
          </FormGroup>

          <FormGroup title="Kat Dağılım Bilgisi">
            <KatDagilimBilgisi data={data} onChange={onChange} />
          </FormGroup>

          <FormGroup title="Mimari Projesine Göre Aykırılık">
            <MimariAykirilik data={data} onChange={onChange} />
          </FormGroup>

          <FormGroup title="Bina Özellikleri">
            <BinaOzellikleri data={data} onChange={onChange} />
          </FormGroup>
        </>
      )}
    </div>
  );
}
