"use client";

import type { ReactNode } from "react";
import { Building, Building2, DoorOpen, Navigation, Plus, Trash2 } from "lucide-react";
import { AkiciAlan } from "@/components/akici-metin/baglam";
import { inputClass, sectionBodyClass } from "@/components/talep/form-fields";
import { YONLER, yeniId } from "@/components/talep/sections/ortak";
import { GIRIS_TURLERI, PARSEL_KONUMLARI, blokAdi, blokTespitiCumlesi, binaGirisCumlesi, konumEki } from "@/lib/talep/konut";
import type { BinaGirisi, KonutOzellikleriData, TapuKaydiData } from "@/lib/talep/types";

type Degistir = (p: Partial<KonutOzellikleriData>) => void;

const KISA: Record<string, string> = {
  Kuzey: "K",
  Kuzeydoğu: "KD",
  Doğu: "D",
  Güneydoğu: "GD",
  Güney: "G",
  Güneybatı: "GB",
  Batı: "B",
  Kuzeybatı: "KB",
  Orta: "Orta",
};

// A detection card: a switch in the header turns it on; once filled in, the
// header shows a one-line summary so the card can stay collapsed.
function TespitKarti({
  icon,
  baslik,
  aciklama,
  acik,
  onAc,
  ozet,
  children,
}: {
  icon: ReactNode;
  baslik: string;
  aciklama: string;
  acik: boolean;
  onAc: (acik: boolean) => void;
  ozet?: string;
  children: ReactNode;
}) {
  return (
    <div className={`overflow-hidden rounded-xl border transition-colors ${acik ? "border-slate-300 bg-white" : "border-slate-100 bg-slate-50/60"}`}>
      <div className="flex items-center gap-3 p-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
            acik ? "bg-slate-900 text-lime-300" : "bg-white text-slate-400 ring-1 ring-slate-200"
          }`}
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">{baslik}</p>
          <p className="truncate text-xs text-slate-500">{acik && ozet ? ozet : aciklama}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={acik}
          aria-label={baslik}
          onClick={() => onAc(!acik)}
          className="flex shrink-0 items-center gap-2 rounded-full py-1 pl-3 pr-1 text-xs font-semibold text-slate-500 hover:bg-slate-100"
        >
          <span className={acik ? "text-slate-900" : ""}>{acik ? "Evet" : "Hayır"}</span>
          <span className={`relative h-6 w-11 rounded-full transition-colors ${acik ? "bg-lime-400" : "bg-slate-300"}`}>
            <span className={`absolute left-0 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${acik ? "translate-x-5" : "translate-x-0.5"}`} />
          </span>
        </button>
      </div>
      {acik && <div className="border-t border-slate-100 p-3 sm:p-4">{children}</div>}
    </div>
  );
}

function AdimBasligi({ no, children }: { no: number; children: ReactNode }) {
  return (
    <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-700">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-lime-300">{no}</span>
      {children}
    </p>
  );
}

// ---- Blok tespiti ---------------------------------------------------------------

function BlokTespiti({ data, tapuKaydi, onChange }: { data: KonutOzellikleriData; tapuKaydi: TapuKaydiData; onChange: Degistir }) {
  const sayi = parseInt(data.blokSayisi, 10) || 0;
  const bloklar = Array.from({ length: sayi }, (_, i) => blokAdi(data, i));
  const tapuBlok = tapuKaydi.blok.trim();
  const secenekler = [...new Set([...bloklar, ...(tapuBlok ? [tapuBlok] : [])])];

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
      <div>
        <AdimBasligi no={1}>Bağımsız bölümün bulunduğu blok</AdimBasligi>
        {secenekler.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Konu blok">
            {secenekler.map((b) => {
              const aktif = data.konuBlok === b;
              return (
                <button
                  key={b}
                  type="button"
                  role="radio"
                  aria-checked={aktif}
                  onClick={() => onChange({ konuBlok: aktif ? "" : b })}
                  className={`relative flex h-12 min-w-12 flex-col items-center justify-center rounded-xl border-2 px-2 text-sm font-bold transition-all ${
                    aktif ? "border-slate-900 bg-slate-900 text-lime-300 shadow" : "border-slate-200 bg-white text-slate-600 hover:border-slate-400"
                  }`}
                >
                  {b}
                  {b === tapuBlok && <span className={`text-[9px] font-medium ${aktif ? "text-lime-200" : "text-sky-600"}`}>tapu</span>}
                </button>
              );
            })}
          </div>
        )}
        <input
          value={data.konuBlok}
          onChange={(e) => onChange({ konuBlok: e.target.value.slice(0, 12) })}
          placeholder={secenekler.length ? "Listede yoksa blok adını yazın" : "Blok adı (örn. A)"}
          aria-label="Konu blok adı"
          className={`${inputClass} max-w-xs`}
        />
        {sayi === 0 && (
          <p className="mt-2 text-[11px] text-slate-400">İpucu: İnşaat Nizamı&apos;nda blok sayısını girerseniz bloklar burada seçilebilir hale gelir.</p>
        )}
      </div>

      <div>
        <AdimBasligi no={2}>Bloğun parsel içindeki konumu</AdimBasligi>
        <div className="relative mx-auto mt-5 w-full max-w-[240px]">
          <span className="absolute -top-1 right-1 flex -translate-y-full items-center gap-0.5 text-[10px] font-bold text-slate-400">
            <Navigation className="h-3 w-3 fill-slate-400" /> K
          </span>
          <div
            className="grid aspect-square grid-cols-3 gap-1.5 rounded-2xl border-2 border-dashed border-lime-500/60 bg-lime-50/50 p-1.5"
            role="radiogroup"
            aria-label="Bloğun parsel içindeki konumu"
          >
            {PARSEL_KONUMLARI.map((k) => {
              const aktif = data.blokKonumu === k;
              return (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={aktif}
                  aria-label={k}
                  title={k}
                  onClick={() => onChange({ blokKonumu: aktif ? "" : k })}
                  className={`flex flex-col items-center justify-center rounded-lg text-[11px] font-semibold transition-all ${
                    aktif
                      ? "bg-slate-900 text-lime-300 shadow-md"
                      : "bg-white/70 text-slate-400 hover:bg-white hover:text-slate-700"
                  }`}
                >
                  {aktif ? (
                    <>
                      <Building2 className="mb-0.5 h-5 w-5" />
                      <span className="max-w-full truncate px-1">{data.konuBlok.trim() ? `${data.konuBlok.trim()} Blok` : KISA[k]}</span>
                    </>
                  ) : (
                    KISA[k]
                  )}
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 text-center text-[10px] text-slate-400">Parsel (kuzey yukarıda)</p>
        </div>
      </div>
    </div>
  );
}

// ---- Bina giriş tespiti ---------------------------------------------------------

// Door slots around the building footprint: edges and corners.
const KAPI_YERLERI: Record<string, { left: string; top: string }> = {
  Kuzey: { left: "50%", top: "0%" },
  Kuzeydoğu: { left: "100%", top: "0%" },
  Doğu: { left: "100%", top: "50%" },
  Güneydoğu: { left: "100%", top: "100%" },
  Güney: { left: "50%", top: "100%" },
  Güneybatı: { left: "0%", top: "100%" },
  Batı: { left: "0%", top: "50%" },
  Kuzeybatı: { left: "0%", top: "0%" },
};

function BinaGirisTespiti({ data, onChange }: { data: KonutOzellikleriData; onChange: Degistir }) {
  const girisler = data.binaGirisleri;

  function yonDegistir(yon: string) {
    const var_ = girisler.find((g) => g.yon === yon);
    if (var_) onChange({ binaGirisleri: girisler.filter((g) => g !== var_) });
    else
      onChange({
        binaGirisleri: [...girisler, { id: yeniId(), yon, yol: "", tur: girisler.some((g) => g.tur === "Ana giriş") ? "Yan giriş" : "Ana giriş" }],
      });
  }

  function guncelle(id: string, p: Partial<BinaGirisi>) {
    onChange({ binaGirisleri: girisler.map((g) => (g.id === id ? { ...g, ...p } : g)) });
  }

  // Entrances listed in compass order.
  const sirali = [...girisler].sort((a, b) => YONLER.indexOf(a.yon) - YONLER.indexOf(b.yon));

  return (
    <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
      <div>
        <AdimBasligi no={1}>Girişin olduğu cepheye kapı ekleyin</AdimBasligi>
        <div className="relative mx-auto aspect-square w-full max-w-[220px] p-5">
          <span className="absolute right-0 top-0 flex items-center gap-0.5 text-[10px] font-bold text-slate-400">
            <Navigation className="h-3 w-3 fill-slate-400" /> K
          </span>
          <div className="relative h-full w-full rounded-lg border-4 border-slate-800 bg-[repeating-linear-gradient(45deg,#f8fafc_0_8px,#f1f5f9_8px_16px)]">
            <span className="absolute inset-0 flex flex-col items-center justify-center text-[11px] font-bold text-slate-500">
              <Building className="mb-0.5 h-6 w-6 text-slate-400" />
              Bina
            </span>
            {YONLER.map((yon) => {
              const g = girisler.find((x) => x.yon === yon);
              const yer = KAPI_YERLERI[yon];
              return (
                <button
                  key={yon}
                  type="button"
                  aria-pressed={!!g}
                  aria-label={`${yon} cephesinde giriş`}
                  title={g ? `${yon}: ${g.tur || "Giriş"} (kaldırmak için tıklayın)` : `${yon} cephesine giriş ekle`}
                  onClick={() => yonDegistir(yon)}
                  style={{ left: yer.left, top: yer.top }}
                  className={`absolute flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-lg border-2 text-[10px] font-bold transition-all ${
                    g
                      ? "border-lime-500 bg-lime-400 text-slate-900 shadow-md"
                      : "border-dashed border-slate-300 bg-white text-slate-400 hover:border-slate-500 hover:text-slate-700"
                  }`}
                >
                  {g ? <DoorOpen className="h-4 w-4" /> : KISA[yon]}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div>
        <AdimBasligi no={2}>Giriş bilgileri</AdimBasligi>
        {sirali.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 px-3 py-6 text-center text-sm text-slate-500">
            Bina planında girişin bulunduğu cepheye tıklayın; her giriş için yol ve türü buradan girilir.
          </p>
        ) : (
          <ul className="space-y-2">
            {sirali.map((g) => (
              <li key={g.id} className="rounded-xl border border-slate-100 bg-slate-50/60 p-2.5">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-2 py-1 text-xs font-bold text-lime-300">
                    <DoorOpen className="h-3.5 w-3.5" />
                    {g.yon} cephesi
                  </span>
                  <button
                    type="button"
                    onClick={() => onChange({ binaGirisleri: girisler.filter((x) => x.id !== g.id) })}
                    aria-label={`${g.yon} girişini kaldır`}
                    className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_170px]">
                  <input
                    value={g.yol}
                    onChange={(e) => guncelle(g.id, { yol: e.target.value })}
                    placeholder="Cephe aldığı yol (örn. Atatürk Caddesi)"
                    aria-label={`${g.yon} girişinin yolu`}
                    className={inputClass}
                  />
                  <select
                    value={g.tur}
                    onChange={(e) => guncelle(g.id, { tur: e.target.value })}
                    aria-label={`${g.yon} girişinin türü`}
                    className={`${inputClass} appearance-none`}
                  >
                    <option value="">Giriş türü</option>
                    {GIRIS_TURLERI.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </li>
            ))}
          </ul>
        )}
        {sirali.length > 0 && sirali.length < YONLER.length && (
          <p className="mt-2 inline-flex items-center gap-1 text-[11px] text-slate-400">
            <Plus className="h-3 w-3" />
            Başka giriş için plandaki boş kapı yerlerine tıklayın.
          </p>
        )}
      </div>
    </div>
  );
}

export default function KonutTespitleri({
  data,
  tapuKaydi,
  bloklu,
  onChange,
}: {
  data: KonutOzellikleriData;
  tapuKaydi: TapuKaydiData;
  bloklu: boolean;
  onChange: Degistir;
}) {
  const blokOzet = [data.konuBlok.trim() && `${data.konuBlok.trim()} Blok`, data.blokKonumu && `parselin ${konumEki(data.blokKonumu)}`]
    .filter(Boolean)
    .join(" · ");
  const girisOzet = data.binaGirisleri
    .filter((g) => g.yon)
    .map((g) => `${g.yon}${g.tur ? ` (${g.tur.toLocaleLowerCase("tr-TR")})` : ""}`)
    .join(", ");

  return (
    <div className={`${sectionBodyClass} space-y-3`}>
      {bloklu && (
        <TespitKarti
          icon={<Building2 className="h-5 w-5" />}
          baslik="Blok Tespiti"
          aciklama="Bağımsız bölümün hangi blokta ve bloğun parselin neresinde olduğu"
          acik={data.blokTespiti === "Evet"}
          onAc={(a) => onChange({ blokTespiti: a ? "Evet" : "Hayır" })}
          ozet={blokOzet || "Blok ve konum seçin"}
        >
          <BlokTespiti data={data} tapuKaydi={tapuKaydi} onChange={onChange} />
        </TespitKarti>
      )}
      <TespitKarti
        icon={<DoorOpen className="h-5 w-5" />}
        baslik="Bina Giriş Tespiti"
        aciklama="Binaya hangi cepheden, hangi yoldan girildiği"
        acik={data.binaGirisTespiti === "Evet"}
        onAc={(a) => onChange({ binaGirisTespiti: a ? "Evet" : "Hayır" })}
        ozet={girisOzet || "Bina planında giriş cephesini seçin"}
      >
        <BinaGirisTespiti data={data} onChange={onChange} />
      </TespitKarti>
      <AkiciAlan etiket="Blok Tespiti" deger={blokTespitiCumlesi(data)} />
      <AkiciAlan etiket="Bina Giriş Tespiti" deger={binaGirisCumlesi(data)} />
    </div>
  );
}
