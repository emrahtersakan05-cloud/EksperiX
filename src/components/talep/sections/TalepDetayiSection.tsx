"use client";

import { Building2, CalendarClock, ClipboardList, Home, NotebookPen, UserRound } from "lucide-react";
import {
  ComboboxField,
  SectionCard,
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/talep/form-fields";
import { Doluluk, Ozet, OzetBasligi, OzetIzgarasi, Panel, tarihYaz } from "@/components/talep/sections/tasarim";
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

// Days from today to the target date (negative once it has passed).
function kalanGun(tarih: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(tarih);
  if (!m) return null;
  const hedef = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const b = new Date();
  const bugun = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((hedef - bugun) / 86_400_000);
}

const ONCELIK_TONU: Record<string, "iyi" | "uyari" | "kotu" | undefined> = {
  Düşük: "iyi",
  Normal: undefined,
  Yüksek: "uyari",
  Acil: "kotu",
};

const ikiSutun = "grid grid-cols-1 gap-x-3 gap-y-3 sm:grid-cols-2";

export default function TalepDetayiSection({
  data,
  onChange,
}: {
  data: TalepDetayiData;
  onChange: (patch: Partial<TalepDetayiData>) => void;
}) {
  const alanlar = Object.values(data) as string[];
  const dolu = alanlar.filter((v) => v.trim()).length;
  const kalan = kalanGun(data.hedefTeslimTarihi);
  const teslim =
    kalan === null ? "" : kalan > 0 ? `${kalan} gün kaldı` : kalan === 0 ? "Bugün" : `${-kalan} gün gecikti`;

  return (
    <div className="space-y-4">
      <OzetBasligi
        etiket="Talep Özeti"
        ikon={<ClipboardList className="h-3.5 w-3.5" />}
        baslik={data.musteriUnvani || "Müşteri girilmedi"}
        bos={!data.musteriUnvani}
        altBaslik={
          [data.degerlemeKurumBanka, data.dosyaNo && `Dosya ${data.dosyaNo}`, data.degerlemeFirmasi].filter(Boolean).join(" · ") ||
          "Kurum ve dosya bilgisi yok"
        }
        alt={
          <>
            <Doluluk dolu={dolu} toplam={alanlar.length} />
            {data.tasinmazNiteligi && (
              <span className="inline-flex min-w-0 items-center gap-1 truncate">
                <Home className="h-3 w-3 shrink-0" />
                <span className="truncate">{data.tasinmazNiteligi}</span>
              </span>
            )}
          </>
        }
      >
        <OzetIzgarasi>
          <Ozet etiket="Talep Türü" deger={data.talepTuru} />
          <Ozet etiket="Öncelik" deger={data.oncelik} ton={ONCELIK_TONU[data.oncelik]} />
          <Ozet etiket="Talep Tarihi" deger={tarihYaz(data.talepTarihi)} />
          <Ozet
            etiket={teslim ? `Teslim · ${teslim}` : "Hedef Teslim"}
            deger={tarihYaz(data.hedefTeslimTarihi)}
            ton={kalan === null ? undefined : kalan < 0 ? "kotu" : kalan <= 1 ? "uyari" : "iyi"}
          />
          <Ozet etiket="Atanan Eksper" deger={data.atananEksper} />
        </OzetIzgarasi>
      </OzetBasligi>

      <SectionCard title="Talep Oluşturma Bilgileri">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <Panel baslik="Müşteri ve Firma" icon={<UserRound className="h-3.5 w-3.5" />}>
            <div className="grid grid-cols-1 gap-3">
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
            </div>
          </Panel>
          <Panel baslik="Kurum ve Taşınmaz" icon={<Building2 className="h-3.5 w-3.5" />}>
            <div className="grid grid-cols-1 gap-3">
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
            </div>
          </Panel>
        </div>
      </SectionCard>

      <SectionCard title="Talep Detayı">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <Panel baslik="Talep" icon={<ClipboardList className="h-3.5 w-3.5" />}>
            <div className={ikiSutun}>
              <SelectField
                label="Talep Türü"
                value={data.talepTuru}
                options={talepTuruOptions}
                onChange={(v) => onChange({ talepTuru: v })}
              />
              <SelectField
                label="Öncelik"
                value={data.oncelik}
                options={oncelikOptions}
                onChange={(v) => onChange({ oncelik: v })}
              />
              <TextField
                label="İlgili Kurum / Banka"
                value={data.ilgiliKurum}
                onChange={(v) => onChange({ ilgiliKurum: v })}
                placeholder="Örn. Ziraat Bankası"
              />
              <TextField label="Dosya No" value={data.dosyaNo} onChange={(v) => onChange({ dosyaNo: v })} />
            </div>
          </Panel>

          <Panel
            baslik="Takvim ve Eksper"
            icon={<CalendarClock className="h-3.5 w-3.5" />}
            sag={
              teslim && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    kalan !== null && kalan < 0
                      ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
                      : kalan !== null && kalan <= 1
                        ? "bg-amber-50 text-amber-800 ring-1 ring-amber-200"
                        : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                  }`}
                >
                  {teslim}
                </span>
              )
            }
          >
            <div className={ikiSutun}>
              <TextField
                label="Talep Tarihi"
                type="date"
                value={data.talepTarihi}
                onChange={(v) => {
                  // Fill the target date, unless the user has set one by hand
                  // (i.e. it no longer matches the previous automatic value).
                  const otomatik =
                    !data.hedefTeslimTarihi || data.hedefTeslimTarihi === gunEkle(data.talepTarihi, TESLIM_SURESI_GUN);
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
            </div>
          </Panel>

          <Panel baslik="Notlar" icon={<NotebookPen className="h-3.5 w-3.5" />} className="lg:col-span-2">
            <TextAreaField label="Notlar" value={data.notlar} onChange={(v) => onChange({ notlar: v })} />
          </Panel>
        </div>
      </SectionCard>
    </div>
  );
}
