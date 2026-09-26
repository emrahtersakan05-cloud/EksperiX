"use client";

import { useState, type ReactNode } from "react";
import {
  Building2,
  Check,
  Compass,
  FileText,
  MapPin,
  Mountain,
  Navigation,
  PencilLine,
  Plus,
  Sprout,
  Trash2,
  Trees,
  Wheat,
  X,
} from "lucide-react";
import {
  Field,
  SectionCard,
  TextAreaField,
  TextField,
  inputClass,
  sectionBodyClass,
} from "@/components/talep/form-fields";
import { AkiciAlan, useAkiciAlan } from "@/components/akici-metin/baglam";
import type { AraziOzellikleriData, DigerCephe, MahallindekiNitelik, TapuKaydiData } from "@/lib/talep/types";

const FormGroup = SectionCard;

export const MAHALLINDEKI_NITELIKLER: { value: MahallindekiNitelik; label: string }[] = [
  { value: "bina-var", label: "TARLA, BAĞ, BAHÇE, VB. (Üzerinde Bina Var İse)" },
  { value: "bina-yok", label: "TARLA, BAĞ, BAHÇE, VB. (Üzerinde Bina Yok İse)" },
];

const ARAZI_SEKILLERI = ["Dikdörtgen", "Şekilsiz", "Üçgen", "Diğer"];
const ARAZI_EGIMLERI = ["Az Eğimli", "Çok Eğimli", "Eğimli", "Düz", "Engebeli", "Diğer"];
const SULAMA_IMKANLARI = ["Var", "Yok", "Diğer"];
export const YONLER = ["Kuzey", "Güney", "Doğu", "Batı", "Kuzeydoğu", "Kuzeybatı", "Güneybatı", "Güneydoğu"];

function yeniId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `c-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// A fixed-choice select; a value saved earlier that is no longer in the list
// (custom entries from the old free-form picker) still shows up.
function Secim({
  label,
  value,
  options,
  onChange,
  metinDegeri,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  // Value used in akıcı metin (e.g. the text typed for "Diğer").
  metinDegeri?: string;
}) {
  useAkiciAlan(label, metinDegeri ?? value);
  const liste = value && !options.includes(value) ? [value, ...options] : options;
  return (
    <Field label={label}>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={`${inputClass} appearance-none`}>
        <option value="">Seçiniz</option>
        {liste.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </Field>
  );
}

// "Diğer" picked → a text box to spell it out appears right below.
function DigerliSecim({
  label,
  value,
  diger,
  options,
  onChange,
}: {
  label: string;
  value: string;
  diger: string;
  options: string[];
  onChange: (value: string, diger: string) => void;
}) {
  // Focus the text box only when the user has just picked "Diğer", not
  // when a saved "Diğer" is shown on load.
  const [yeniSecildi, setYeniSecildi] = useState(false);
  return (
    <div className="space-y-1.5">
      <Secim
        label={label}
        value={value}
        metinDegeri={value === "Diğer" && diger.trim() ? diger : value}
        options={options}
        onChange={(v) => {
          setYeniSecildi(v === "Diğer");
          onChange(v, v === "Diğer" ? diger : "");
        }}
      />
      {value === "Diğer" && (
        <div className="relative">
          <PencilLine className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-lime-600" />
          <input
            value={diger}
            onChange={(e) => onChange(value, e.target.value)}
            autoFocus={yeniSecildi}
            placeholder="Değeri yazınız"
            aria-label={`${label} (Diğer)`}
            className={`${inputClass} border-lime-300! bg-lime-50/60! pl-9 focus:border-lime-400!`}
          />
        </div>
      )}
    </div>
  );
}

// Compass positions (degrees clockwise from north) and short labels.
const YON_ACILARI: Record<string, { aci: number; kisa: string }> = {
  Kuzey: { aci: 0, kisa: "K" },
  Kuzeydoğu: { aci: 45, kisa: "KD" },
  Doğu: { aci: 90, kisa: "D" },
  Güneydoğu: { aci: 135, kisa: "GD" },
  Güney: { aci: 180, kisa: "G" },
  Güneybatı: { aci: 225, kisa: "GB" },
  Batı: { aci: 270, kisa: "B" },
  Kuzeybatı: { aci: 315, kisa: "KB" },
};

// Road-frontage picker: the parcel in the middle, eight directions around it.
function YonPusulasi({ secili, onChange }: { secili: string[]; onChange: (v: string[]) => void }) {
  function degistir(y: string) {
    onChange(secili.includes(y) ? secili.filter((x) => x !== y) : YONLER.filter((x) => x === y || secili.includes(x)));
  }
  return (
    <div
      className="relative mx-auto aspect-square w-52 shrink-0 rounded-full border border-slate-200 bg-[radial-gradient(circle,white_45%,#f1f5f9_100%)]"
      role="group"
      aria-label="Kadastral yola cephe yönleri"
    >
      <span className="pointer-events-none absolute inset-[22%] rounded-full border border-dashed border-slate-200" />
      {secili.map((y) => (
        // A road stroke on each chosen side of the parcel.
        <span
          key={`yol-${y}`}
          className="pointer-events-none absolute left-1/2 top-1/2 h-1.5 w-[30%] origin-left rounded-full bg-lime-400/70"
          style={{ transform: `rotate(${YON_ACILARI[y].aci - 90}deg)` }}
        />
      ))}
      <span className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-lg border-2 border-slate-900 bg-white text-[10px] font-bold text-slate-900 shadow-sm">
        <Trees className="mb-0.5 h-4 w-4 text-lime-600" />
        Parsel
      </span>
      {YONLER.map((y) => {
        const { aci, kisa } = YON_ACILARI[y];
        const aktif = secili.includes(y);
        const rad = (aci * Math.PI) / 180;
        return (
          <button
            key={y}
            type="button"
            aria-pressed={aktif}
            aria-label={y}
            title={y}
            onClick={() => degistir(y)}
            className={`absolute flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border text-xs font-bold transition-all ${
              aktif
                ? "border-slate-900 bg-slate-900 text-lime-300 shadow-md"
                : "border-slate-200 bg-white text-slate-500 hover:border-slate-400 hover:text-slate-900"
            }`}
            style={{ left: `${50 + 42 * Math.sin(rad)}%`, top: `${50 - 42 * Math.cos(rad)}%` }}
          >
            {kisa}
          </button>
        );
      })}
    </div>
  );
}

function AltBaslik({ icon, baslik, aciklama, sag }: { icon: ReactNode; baslik: string; aciklama?: string; sag?: ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-[12rem] flex-1 items-start gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-lime-100 text-lime-800">{icon}</span>
        <div>
          <p className="text-sm font-semibold text-slate-900">{baslik}</p>
          {aciklama && <p className="text-xs text-slate-500">{aciklama}</p>}
        </div>
      </div>
      {sag}
    </div>
  );
}

function NitelikKarti({
  aktif,
  baslik,
  aciklama,
  icon,
  onClick,
}: {
  aktif: boolean;
  baslik: string;
  aciklama: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={aktif}
      onClick={onClick}
      className={`relative flex items-center gap-3 rounded-xl border-2 p-3.5 text-left transition-all ${
        aktif
          ? "border-slate-900 bg-gradient-to-br from-lime-50 to-white shadow-[0_8px_24px_-14px_rgba(15,23,42,0.45)]"
          : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm"
      }`}
    >
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors ${
          aktif ? "bg-slate-900 text-lime-300" : "bg-slate-100 text-slate-500"
        }`}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-slate-900">{baslik}</span>
        <span className="block text-xs text-slate-500">{aciklama}</span>
      </span>
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
          aktif ? "border-slate-900 bg-slate-900 text-lime-300" : "border-slate-300"
        }`}
      >
        {aktif && <Check className="h-3 w-3" />}
      </span>
    </button>
  );
}

// Read-only tapu data shown as values, not as greyed-out inputs.
function TapuBilgisi({ etiket, deger, genis = false }: { etiket: string; deger: string; genis?: boolean }) {
  return (
    <div className={`rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2 ${genis ? "col-span-2" : ""}`}>
      <p className="text-[11px] font-medium text-slate-500">{etiket}</p>
      <p className={`truncate text-sm font-semibold ${deger ? "text-slate-900" : "text-slate-300"}`} title={deger}>
        {deger || "—"}
      </p>
      <AkiciAlan etiket={etiket} deger={deger} />
    </div>
  );
}

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

        <div className="mt-5 border-t border-slate-100 pt-4">
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
                <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
                  <YonPusulasi secili={data.yolCepheleri} onChange={(yolCepheleri) => onChange({ yolCepheleri })} />
                  <div className="w-full min-w-0 flex-1 space-y-2">
                    {data.yolCepheleri.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-slate-200 px-3 py-3 text-sm text-slate-500">
                        Yön seçilmedi — kadastral yola cephesi <strong>yok</strong> kabul edilir.
                      </p>
                    ) : (
                      <>
                        <p className="text-xs font-medium text-slate-500">Yola cephesi olan yönler</p>
                        <div className="flex flex-wrap gap-1.5">
                          {data.yolCepheleri.map((y) => (
                            <button
                              key={y}
                              type="button"
                              onClick={() => onChange({ yolCepheleri: data.yolCepheleri.filter((x) => x !== y) })}
                              className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-lime-300 hover:bg-slate-700"
                              title={`${y} yönünü kaldır`}
                            >
                              {y}
                              <X className="h-3 w-3" />
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
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
