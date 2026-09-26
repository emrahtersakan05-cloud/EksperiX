"use client";

import type { ReactNode } from "react";
import { Building2, Check, Plus, Sprout, Trash2, Trees } from "lucide-react";
import {
  Field,
  SectionCard,
  TextAreaField,
  TextField,
  helperTextClass,
  inputClass,
  sectionBodyClass,
} from "@/components/talep/form-fields";
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
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
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
  return (
    <div className="space-y-2">
      <Secim label={label} value={value} options={options} onChange={(v) => onChange(v, v === "Diğer" ? diger : "")} />
      {value === "Diğer" && (
        <TextField label={`${label} (Diğer)`} value={diger} onChange={(v) => onChange(value, v)} placeholder="Belirtiniz" />
      )}
    </div>
  );
}

function YonCipleri({ secili, onChange }: { secili: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Kadastral yola cephe yönleri">
      {YONLER.map((y) => {
        const aktif = secili.includes(y);
        return (
          <button
            key={y}
            type="button"
            aria-pressed={aktif}
            onClick={() => onChange(aktif ? secili.filter((x) => x !== y) : YONLER.filter((x) => x === y || secili.includes(x)))}
            className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              aktif
                ? "border-slate-900 bg-slate-900 text-lime-300"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
            }`}
          >
            {aktif && <Check className="h-3 w-3" />}
            {y}
          </button>
        );
      })}
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
      className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-all ${
        aktif ? "border-slate-900 bg-slate-50 ring-1 ring-slate-900" : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
          aktif ? "bg-slate-900 text-lime-300" : "bg-slate-100 text-slate-500"
        }`}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-slate-900">{baslik}</span>
        <span className="block text-xs text-slate-500">{aciklama}</span>
      </span>
    </button>
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

  return (
    <div className="space-y-4">
      <FormGroup title="Tapu Bilgileri Formu">
        <div className={`${sectionBodyClass} grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-2 xl:grid-cols-4`}>
          <TextField label="İl" value={tapuKaydi.il} onChange={() => {}} readOnly />
          <TextField label="İlçe" value={tapuKaydi.ilce} onChange={() => {}} readOnly />
          <TextField label="Mahalle / Köy" value={tapuKaydi.mahalleKoyAdi} onChange={() => {}} readOnly />
          <TextField label="Mevki" value={tapuKaydi.mevkii} onChange={() => {}} readOnly />
          <TextField label="Ada" value={tapuKaydi.ada} onChange={() => {}} readOnly />
          <TextField label="Parsel" value={tapuKaydi.parsel} onChange={() => {}} readOnly />
          <TextField label="AT Yüzölçüm (m²)" value={tapuKaydi.atYuzolcum} onChange={() => {}} readOnly />
          <TextField label="Ana Taşınmaz Nitelik" value={tapuKaydi.anaTasinmazNitelik} onChange={() => {}} readOnly />
        </div>
        <span className={helperTextClass}>Bu bilgiler Tapu Kaydı sekmesinden otomatik olarak alınır.</span>

        <div className="mt-4">
          <p className="mb-2 text-sm font-medium text-slate-700">Mahallindeki Niteliği</p>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2" role="radiogroup" aria-label="Mahallindeki niteliği">
            {MAHALLINDEKI_NITELIKLER.map((n) => (
              <NitelikKarti
                key={n.value}
                aktif={data.mahallindekiNitelik === n.value}
                baslik={n.label}
                aciklama={n.value === "bina-var" ? "Üzerindeki yapının bilgileri girilir" : "Arazinin özellikleri girilir"}
                icon={n.value === "bina-var" ? <Building2 className="h-4 w-4" /> : <Trees className="h-4 w-4" />}
                onClick={() => onChange({ mahallindekiNitelik: data.mahallindekiNitelik === n.value ? "" : n.value })}
              />
            ))}
          </div>
        </div>
      </FormGroup>

      {data.mahallindekiNitelik === "bina-var" && <FormGroup title="Üzerindeki Yapı Bilgileri">{binaFormu}</FormGroup>}

      {data.mahallindekiNitelik === "bina-yok" && (
        <>
          <FormGroup title="Taşınmaz Özellikleri">
            <div className={`${sectionBodyClass} space-y-5`}>
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

              <div>
                <p className="mb-1 text-sm font-medium text-slate-700">Kadastral Yola Cephesi Var mı?</p>
                <p className="mb-2 text-xs text-slate-400">Yola cephesi olan yönleri seçin (birden fazla seçilebilir).</p>
                <YonCipleri secili={data.yolCepheleri} onChange={(yolCepheleri) => onChange({ yolCepheleri })} />
                {data.yolCepheleri.length === 0 && (
                  <p className="mt-2 text-xs text-slate-400">Seçim yapılmazsa kadastral yola cephesi yok kabul edilir.</p>
                )}
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-slate-700">Diğer Cephe Bilgisi</p>
                    <p className="text-xs text-slate-400">Her yön için komşu parsel, dere, ham yol vb. bilgisini yazın.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onChange({ digerCepheler: [...data.digerCepheler, { id: yeniId(), yon: "", bilgi: "" }] })}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Cephe Ekle
                  </button>
                </div>
                {data.digerCepheler.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-slate-200 px-3 py-3 text-center text-xs text-slate-400">
                    Henüz diğer cephe bilgisi eklenmedi.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {data.digerCepheler.map((c, i) => (
                      <li key={c.id} className="flex flex-col gap-2 rounded-lg bg-slate-50 p-2 sm:flex-row sm:items-center">
                        <span className="hidden w-5 shrink-0 text-center text-xs font-semibold text-slate-400 sm:block">{i + 1}</span>
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

              <div className="grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-3">
                <div>
                  <span className="mb-1 block text-[11px] font-medium text-slate-500">Ekili Ürün Var mı?</span>
                  <div className="inline-flex w-full rounded-lg bg-slate-100 p-0.5" role="radiogroup" aria-label="Ekili ürün var mı">
                    {(["Evet", "Hayır"] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        role="radio"
                        aria-checked={data.ekiliUrun === s}
                        onClick={() =>
                          onChange({ ekiliUrun: data.ekiliUrun === s ? "" : s, ...(s === "Hayır" ? { ekiliUrunBilgi: "" } : {}) })
                        }
                        className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                          data.ekiliUrun === s ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                {data.ekiliUrun === "Evet" && (
                  <div className="md:col-span-2">
                    <Field label="Ekili Ürün">
                      <div className="relative">
                        <Sprout className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-lime-600" />
                        <input
                          value={data.ekiliUrunBilgi}
                          onChange={(e) => onChange({ ekiliUrunBilgi: e.target.value })}
                          placeholder="Örn. buğday, zeytin ağaçları (yaklaşık 40 adet)"
                          className={`${inputClass} pl-9`}
                        />
                      </div>
                    </Field>
                  </div>
                )}
              </div>
            </div>
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
        <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
          Devam etmek için taşınmazın mahallindeki niteliğini seçin.
        </p>
      )}
    </div>
  );
}
