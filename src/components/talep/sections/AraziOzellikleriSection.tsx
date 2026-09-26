"use client";

import type { ReactNode } from "react";
import {
  Building2,
  Compass,
  FileText,
  MapPin,
  Mountain,
  Navigation,
  Plus,
  Sprout,
  Trash2,
  Trees,
  Wheat,
} from "lucide-react";
import {
  SectionCard,
  TextAreaField,
  TextField,
  inputClass,
  sectionBodyClass,
  sectionCardClass,
} from "@/components/talep/form-fields";
import { AkiciAlan } from "@/components/akici-metin/baglam";
import {
  AltBaslik,
  DigerliSecim,
  NitelikKarti,
  TapuBilgisi,
  YON_ACILARI,
  YONLER,
  YonSecici,
  yeniId,
} from "@/components/talep/sections/ortak";
import type { AraziOzellikleriData, DigerCephe, MahallindekiNitelik, TapuKaydiData } from "@/lib/talep/types";

const FormGroup = SectionCard;

export const MAHALLINDEKI_NITELIKLER: { value: MahallindekiNitelik; label: string }[] = [
  { value: "bina-var", label: "TARLA, BAĞ, BAHÇE, VB. (Üzerinde Bina Var İse)" },
  { value: "bina-yok", label: "TARLA, BAĞ, BAHÇE, VB. (Üzerinde Bina Yok İse)" },
];

const ARAZI_SEKILLERI = ["Dikdörtgen", "Şekilsiz", "Üçgen", "Diğer"];
const ARAZI_EGIMLERI = ["Az Eğimli", "Çok Eğimli", "Eğimli", "Düz", "Engebeli", "Diğer"];
const SULAMA_IMKANLARI = ["Var", "Yok", "Diğer"];

export default function AraziOzellikleriSection({
  data,
  tapuKaydi,
  onChange,
  binaFormu,
}: {
  data: AraziOzellikleriData;
  tapuKaydi: TapuKaydiData;
  onChange: (patch: Partial<AraziOzellikleriData>) => void;
  // The building form, shown when the land has a building on it.
  binaFormu?: ReactNode;
}) {
  function cepheGuncelle(id: string, degisiklik: Partial<DigerCephe>) {
    onChange({ digerCepheler: data.digerCepheler.map((c) => (c.id === id ? { ...c, ...degisiklik } : c)) });
  }

  const tapuBilgileri: { etiket: string; deger: string; genis?: boolean }[] = [
    { etiket: "İl", deger: tapuKaydi.il },
    { etiket: "İlçe", deger: tapuKaydi.ilce },
    { etiket: "Mahalle / Köy", deger: tapuKaydi.mahalleKoyAdi },
    { etiket: "Mevki", deger: tapuKaydi.mevkii },
    { etiket: "Ada", deger: tapuKaydi.ada },
    { etiket: "Parsel", deger: tapuKaydi.parsel },
    { etiket: "AT Yüzölçüm (m²)", deger: tapuKaydi.atYuzolcum },
    { etiket: "Ana Taşınmaz Nitelik", deger: tapuKaydi.anaTasinmazNitelik },
  ];
  const tapuBos = tapuBilgileri.every((b) => !b.deger.trim());

  return (
    <div className="space-y-4">
      <div className={sectionCardClass}>
        <p className="mb-2.5 text-sm font-semibold text-slate-900">Mahallindeki Niteliği</p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2" role="radiogroup" aria-label="Mahallindeki niteliği">
          {MAHALLINDEKI_NITELIKLER.map((n) => (
            <NitelikKarti
              key={n.value}
              aktif={data.mahallindekiNitelik === n.value}
              baslik={n.label}
              aciklama={n.value === "bina-var" ? "Üzerindeki yapının bilgileri girilir" : "Arazinin özellikleri girilir"}
              icon={n.value === "bina-var" ? <Building2 className="h-5 w-5" /> : <Trees className="h-5 w-5" />}
              onClick={() => onChange({ mahallindekiNitelik: data.mahallindekiNitelik === n.value ? "" : n.value })}
            />
          ))}
        </div>
      </div>

      <FormGroup title="Tapu Bilgileri Formu">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {tapuKaydi.ada || tapuKaydi.parsel ? (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-semibold text-lime-300">
              <MapPin className="h-3.5 w-3.5" />
              {tapuKaydi.ada || "—"} Ada / {tapuKaydi.parsel || "—"} Parsel
            </span>
          ) : null}
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
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {tapuBilgileri.map((b) => (
            <TapuBilgisi key={b.etiket} etiket={b.etiket} deger={b.deger} />
          ))}
        </div>
        <AkiciAlan
          etiket="Mahallindeki Niteliği"
          deger={MAHALLINDEKI_NITELIKLER.find((n) => n.value === data.mahallindekiNitelik)?.label ?? ""}
        />
      </FormGroup>

      {data.mahallindekiNitelik === "bina-var" && binaFormu}

      {data.mahallindekiNitelik === "bina-yok" && (
        <>
          <FormGroup title="Taşınmaz Özellikleri">
            <div className="space-y-4">
              <div className={sectionBodyClass}>
                <AltBaslik icon={<Mountain className="h-4 w-4" />} baslik="Arazi Yapısı" aciklama="Şekil, eğim ve sulama durumu" />
                <div className="grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-3">
                  <DigerliSecim
                    label="Arazi Şekli"
                    value={data.araziSekli}
                    diger={data.araziSekliDiger}
                    options={ARAZI_SEKILLERI}
                    onChange={(araziSekli, araziSekliDiger) => onChange({ araziSekli, araziSekliDiger })}
                  />
                  <DigerliSecim
                    label="Arazi Eğimi"
                    value={data.araziYapisi}
                    diger={data.araziYapisiDiger}
                    options={ARAZI_EGIMLERI}
                    onChange={(araziYapisi, araziYapisiDiger) => onChange({ araziYapisi, araziYapisiDiger })}
                  />
                  <DigerliSecim
                    label="Sulama İmkânı"
                    value={data.sulamaImkani}
                    diger={data.sulamaImkaniDiger}
                    options={SULAMA_IMKANLARI}
                    onChange={(sulamaImkani, sulamaImkaniDiger) => onChange({ sulamaImkani, sulamaImkaniDiger })}
                  />
                </div>
              </div>

              <div className={sectionBodyClass}>
                <AltBaslik
                  icon={<Compass className="h-4 w-4" />}
                  baslik="Kadastral Yola Cephesi Var mı?"
                  aciklama="Pusulada yola cephesi olan yönlere tıklayın (birden fazla seçilebilir)."
                />
                <YonSecici
                  secili={data.yolCepheleri}
                  onChange={(yolCepheleri) => onChange({ yolCepheleri })}
                  seciliBaslik="Yola cephesi olan yönler"
                  bosMetin={
                    <>
                      Yön seçilmedi — kadastral yola cephesi <strong>yok</strong> kabul edilir.
                    </>
                  }
                />
              </div>

              <div className={sectionBodyClass}>
                <AltBaslik
                  icon={<Navigation className="h-4 w-4" />}
                  baslik="Diğer Cephe Bilgisi"
                  aciklama="Her yön için komşu parsel, dere, ham yol vb. bilgisini yazın."
                  sag={
                    <button
                      type="button"
                      onClick={() => onChange({ digerCepheler: [...data.digerCepheler, { id: yeniId(), yon: "", bilgi: "" }] })}
                      className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-lime-300 hover:bg-slate-700"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Cephe Ekle
                    </button>
                  }
                />
                {data.digerCepheler.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-400">
                    Henüz diğer cephe bilgisi eklenmedi.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {data.digerCepheler.map((c, i) => (
                      <li
                        key={c.id}
                        className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-white p-2 shadow-sm sm:flex-row sm:items-center"
                      >
                        <span className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500 sm:flex">
                          {c.yon ? YON_ACILARI[c.yon]?.kisa ?? i + 1 : i + 1}
                        </span>
                        <select
                          value={c.yon}
                          onChange={(e) => cepheGuncelle(c.id, { yon: e.target.value })}
                          aria-label={`${i + 1}. cephe yönü`}
                          className={`${inputClass} appearance-none sm:w-44`}
                        >
                          <option value="">Yön seçiniz</option>
                          {YONLER.map((y) => (
                            <option key={y} value={y}>
                              {y}
                            </option>
                          ))}
                        </select>
                        {c.yon && (
                          <input
                            value={c.bilgi}
                            onChange={(e) => cepheGuncelle(c.id, { bilgi: e.target.value })}
                            placeholder={`${c.yon} cephesi: örn. 125 ada 4 parsel, dere, ham yol`}
                            aria-label={`${c.yon} cephe bilgisi`}
                            className={`${inputClass} flex-1`}
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => onChange({ digerCepheler: data.digerCepheler.filter((x) => x.id !== c.id) })}
                          aria-label={`${i + 1}. cepheyi kaldır`}
                          className="self-end rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 sm:self-auto"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className={sectionBodyClass}>
                <AltBaslik icon={<Wheat className="h-4 w-4" />} baslik="Ekili Ürün Var mı?" />
                <div className="grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-3">
                  <div className="inline-flex w-full self-start rounded-xl bg-slate-100 p-1" role="radiogroup" aria-label="Ekili ürün var mı">
                    {(["Evet", "Hayır"] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        role="radio"
                        aria-checked={data.ekiliUrun === s}
                        onClick={() =>
                          onChange({ ekiliUrun: data.ekiliUrun === s ? "" : s, ...(s === "Hayır" ? { ekiliUrunBilgi: "" } : {}) })
                        }
                        className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                          data.ekiliUrun === s
                            ? s === "Evet"
                              ? "bg-slate-900 text-lime-300 shadow-sm"
                              : "bg-white text-slate-900 shadow-sm"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  {data.ekiliUrun === "Evet" && (
                    <div className="relative md:col-span-2">
                      <Sprout className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-lime-600" />
                      <input
                        value={data.ekiliUrunBilgi}
                        onChange={(e) => onChange({ ekiliUrunBilgi: e.target.value })}
                        placeholder="Ekili ürün: örn. buğday, zeytin ağaçları (yaklaşık 40 adet)"
                        aria-label="Ekili ürün"
                        className={`${inputClass} border-lime-300! bg-lime-50/60! pl-9`}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
            <AkiciAlan etiket="Kadastral Yola Cephesi" deger={data.yolCepheleri.length ? data.yolCepheleri.join(", ") : "Yok"} />
            <AkiciAlan
              etiket="Diğer Cephe Bilgisi"
              deger={data.digerCepheler
                .filter((c) => c.yon && c.bilgi.trim())
                .map((c) => `${c.yon}: ${c.bilgi.trim()}`)
                .join("; ")}
            />
            <AkiciAlan etiket="Ekili Ürün Var mı?" deger={data.ekiliUrun} />
            <AkiciAlan etiket="Ekili Ürün" deger={data.ekiliUrun === "Evet" ? data.ekiliUrunBilgi : ""} />
          </FormGroup>

          <FormGroup title="İsteğe Bağlı Özellik Girişleri">
            <div className={`${sectionBodyClass} space-y-3`}>
              <div className="grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-3">
                <TextField
                  label="Parsel Genişliği (m)"
                  value={data.parselGenisligi}
                  onChange={(v) => onChange({ parselGenisligi: v })}
                  placeholder="Örn. 35"
                />
                <TextField
                  label="Parsel Derinliği (m)"
                  value={data.parselDerinligi}
                  onChange={(v) => onChange({ parselDerinligi: v })}
                  placeholder="Örn. 80"
                />
                <TextField
                  label="Toprak Yapısı"
                  value={data.toprakYapisi}
                  onChange={(v) => onChange({ toprakYapisi: v })}
                  placeholder="Örn. killi-tınlı, taşlı"
                />
              </div>
              <TextAreaField label="Diğer Açıklama" value={data.digerAciklama} onChange={(v) => onChange({ digerAciklama: v })} rows={4} />
            </div>
          </FormGroup>
        </>
      )}

      {!data.mahallindekiNitelik && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 px-4 py-10 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-slate-400 shadow-sm">
            <Trees className="h-5 w-5" />
          </span>
          <p className="text-sm font-semibold text-slate-700">Mahallindeki niteliği seçin</p>
          <p className="max-w-sm text-xs text-slate-500">
            Üzerinde bina varsa yapı bilgileri, yoksa arazi özellikleri formu açılır.
          </p>
        </div>
      )}
    </div>
  );
}
