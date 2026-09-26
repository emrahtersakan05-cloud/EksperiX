"use client";

import { useRef, useState } from "react";
import { Loader2, Plus, ScanText, X } from "lucide-react";
import { AkiciAlan } from "@/components/akici-metin/baglam";
import SecenekListesiAlani from "@/components/talep/SecenekListesiAlani";
import { yeniId } from "@/components/talep/sections/ortak";
import { EVET_HAYIR, Etiket, Segment, alan, girdi } from "@/components/talep/sections/sade";
import { KATLAR, KAT_DAGILIM_TURLERI, aykirilikCumlesi, katDagilimiMetni } from "@/lib/talep/konut";
import type { SecenekListesiKey } from "@/lib/secenekler/varsayilan";
import type { KatDagilimi, KonutOzellikleriData } from "@/lib/talep/types";

type Degistir = (p: Partial<KonutOzellikleriData>) => void;

// ---- Kat dağılımı ---------------------------------------------------------------

// Rooms / spaces of a floor as removable chips; type and press Enter (or +).
function IcHacimler({ degerler, onChange, etiket }: { degerler: string[]; onChange: (v: string[]) => void; etiket: string }) {
  const [yeni, setYeni] = useState("");
  function ekle() {
    const v = yeni.trim();
    if (!v) return;
    onChange([...degerler, v]);
    setYeni("");
  }
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1">
      {degerler.map((h, i) => (
        <span key={`${h}-${i}`} className="inline-flex items-center gap-0.5 rounded-full bg-slate-100 py-0.5 pl-2 pr-0.5 text-[11px] text-slate-700">
          {h}
          <button
            type="button"
            onClick={() => onChange(degerler.filter((_, j) => j !== i))}
            aria-label={`${h} kaldır`}
            className="rounded-full p-0.5 text-slate-400 hover:bg-white hover:text-rose-600"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <span className="inline-flex items-center">
        <input
          value={yeni}
          onChange={(e) => setYeni(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              ekle();
            }
          }}
          onBlur={ekle}
          placeholder="İç hacim ekle"
          aria-label={etiket}
          className={`${girdi} h-7 w-32`}
        />
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={ekle}
          className="ml-0.5 flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </span>
    </div>
  );
}

function KatSatirlari({ data, onChange, kisimli }: { data: KonutOzellikleriData; onChange: Degistir; kisimli: boolean }) {
  const satirlar = data.katDagilimlari;
  function guncelle(id: string, p: Partial<KatDagilimi>) {
    onChange({ katDagilimlari: satirlar.map((d) => (d.id === id ? { ...d, ...p } : d)) });
  }
  return (
    <div>
      {satirlar.length > 0 && (
        <ul className="divide-y divide-slate-100 rounded-md border border-slate-100">
          {satirlar.map((d, i) => (
            <li key={d.id} className="flex flex-wrap items-start gap-1.5 px-2 py-1.5">
              {kisimli && (
                <input
                  value={d.kisim}
                  onChange={(e) => guncelle(d.id, { kisim: e.target.value })}
                  placeholder="Kısım"
                  aria-label={`${i + 1}. satır kısım`}
                  className={`${girdi} w-24`}
                />
              )}
              <select
                value={d.kat}
                onChange={(e) => guncelle(d.id, { kat: e.target.value })}
                aria-label={`${i + 1}. satır bulunduğu kat`}
                className={`${girdi} w-32 appearance-none`}
              >
                <option value="">Bulunduğu kat</option>
                {(d.kat && !KATLAR.includes(d.kat) ? [d.kat, ...KATLAR] : KATLAR).map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
              <div className="min-w-[10rem] flex-1">
                <IcHacimler degerler={d.icHacimler} onChange={(icHacimler) => guncelle(d.id, { icHacimler })} etiket={`${i + 1}. satır iç hacim`} />
              </div>
              <button
                type="button"
                onClick={() => onChange({ katDagilimlari: satirlar.filter((x) => x.id !== d.id) })}
                aria-label={`${i + 1}. satırı kaldır`}
                className="flex h-7 w-7 items-center justify-center rounded text-slate-300 hover:bg-rose-50 hover:text-rose-600"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={() => {
          // A new row continues the previous row's kısım.
          const onceki = satirlar[satirlar.length - 1];
          onChange({ katDagilimlari: [...satirlar, { id: yeniId(), kisim: kisimli ? (onceki?.kisim ?? "") : "", kat: "", icHacimler: [] }] });
        }}
        className="mt-1.5 inline-flex h-7 items-center gap-1 rounded-full px-2 text-[11px] font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-900"
      >
        <Plus className="h-3.5 w-3.5" />
        Kat ekle
      </button>
    </div>
  );
}

function ManuelKatDagilimi({ data, onChange }: { data: KonutOzellikleriData; onChange: Degistir }) {
  const [okunuyor, setOkunuyor] = useState(false);
  const [ilerleme, setIlerleme] = useState(0);
  const [hata, setHata] = useState<string | null>(null);
  const girdiRef = useRef<HTMLInputElement>(null);

  // A project page image → OCR → appended to the text.
  async function gorselOku(f: File | undefined) {
    if (!f || !f.type.startsWith("image/")) return;
    setOkunuyor(true);
    setIlerleme(0);
    setHata(null);
    try {
      const url = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = () => reject(r.error);
        r.readAsDataURL(f);
      });
      const [{ recognizeText }, { projeKatlariniAyristir }] = await Promise.all([import("@/lib/ocr/uavt-extract"), import("@/lib/ocr/proje-katlari")]);
      const sonuc = await recognizeText(url, (p) => p.status.includes("recogn") && setIlerleme(Math.round(p.progress * 100)));
      const metin = projeKatlariniAyristir(sonuc.text)
        .map((k) => (k.kat ? `${k.kat}: ${k.aciklama}` : k.aciklama))
        .join("\n");
      if (!metin) setHata("Görselde okunabilir metin bulunamadı.");
      else onChange({ manuelKatDagilimi: [data.manuelKatDagilimi.trim(), metin].filter(Boolean).join("\n") });
    } catch {
      setHata("Görsel okunamadı.");
    } finally {
      setOkunuyor(false);
    }
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <Etiket>Manuel kat dağılımı</Etiket>
        <button
          type="button"
          onClick={() => girdiRef.current?.click()}
          disabled={okunuyor}
          className="inline-flex h-6 items-center gap-1 rounded-full px-2 text-[11px] font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
          title="Onaylı proje sayfasının görselinden metni oku"
        >
          {okunuyor ? <Loader2 className="h-3 w-3 animate-spin" /> : <ScanText className="h-3 w-3" />}
          {okunuyor ? `Okunuyor %${ilerleme}` : "Görselden oku"}
        </button>
        <input
          ref={girdiRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            gorselOku(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
      <textarea
        value={data.manuelKatDagilimi}
        onChange={(e) => onChange({ manuelKatDagilimi: e.target.value })}
        rows={4}
        placeholder="Örn. Ana gayrimenkul 2 bodrum, zemin ve 5 normal kattan oluşmaktadır; zemin katta 2 adet dükkan…"
        aria-label="Manuel kat dağılımı"
        className={`${alan} resize-y`}
      />
      {hata && <p className="mt-1 text-[11px] text-rose-600">{hata}</p>}
    </div>
  );
}

export function KatDagilimBilgisi({ data, onChange }: { data: KonutOzellikleriData; onChange: Degistir }) {
  return (
    <div className="space-y-3">
      <div>
        <Etiket>Kat dağılım detayı</Etiket>
        <Segment
          secenekler={KAT_DAGILIM_TURLERI}
          deger={data.katDagilimTuru}
          onChange={(katDagilimTuru) => onChange({ katDagilimTuru })}
          etiket="Kat dağılım detayı"
        />
      </div>
      {data.katDagilimTuru === "tekDuzen" && <KatSatirlari data={data} onChange={onChange} kisimli={false} />}
      {data.katDagilimTuru === "kisimli" && <KatSatirlari data={data} onChange={onChange} kisimli />}
      {data.katDagilimTuru === "manuel" && <ManuelKatDagilimi data={data} onChange={onChange} />}
      <AkiciAlan etiket="Kat Dağılımı" deger={katDagilimiMetni(data)} />
    </div>
  );
}

// ---- Evet/Hayır + açıklama --------------------------------------------------------

function EvetHayirAciklama({
  soru,
  deger,
  aciklama,
  yerTutucu,
  onChange,
}: {
  soru: string;
  deger: KonutOzellikleriData["aykirilik"];
  aciklama: string;
  yerTutucu: string;
  onChange: (deger: KonutOzellikleriData["aykirilik"], aciklama: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium text-slate-700">{soru}</p>
        <Segment secenekler={EVET_HAYIR} deger={deger} onChange={(v) => onChange(v, v === "Evet" ? aciklama : "")} etiket={soru} />
      </div>
      {deger === "Evet" && (
        <textarea
          value={aciklama}
          onChange={(e) => onChange(deger, e.target.value)}
          rows={3}
          placeholder={yerTutucu}
          aria-label={soru}
          className={`${alan} resize-y`}
        />
      )}
    </div>
  );
}

export function MimariAykirilik({ data, onChange }: { data: KonutOzellikleriData; onChange: Degistir }) {
  return (
    <>
      <EvetHayirAciklama
        soru="Mimari projesine göre aykırılık var mı?"
        deger={data.aykirilik}
        aciklama={data.aykirilikAciklama}
        yerTutucu="Aykırılığı açıklayın (örn. zemin katta projede dükkan olarak görünen alan konut olarak kullanılmaktadır)."
        onChange={(aykirilik, aykirilikAciklama) => onChange({ aykirilik, aykirilikAciklama })}
      />
      <AkiciAlan etiket="Mimari Projeye Aykırılık" deger={aykirilikCumlesi(data)} />
    </>
  );
}

// ---- Bina özellikleri -----------------------------------------------------------

export const BINA_LISTELERI: { key: SecenekListesiKey; alan: keyof KonutOzellikleriData }[] = [
  { key: "katHolu", alan: "katHoluSahanlik" },
  { key: "merdivenBasamak", alan: "merdivenBasamaklari" },
  { key: "merdivenKorkuluk", alan: "merdivenKorkuluklari" },
  { key: "icDuvar", alan: "binaIciDuvarlar" },
  { key: "disCephe", alan: "binaDisCephesi" },
  { key: "cati", alan: "binaCatisi" },
  { key: "cevreDuzenlemesi", alan: "cevreDuzenlemesi" },
  { key: "asansor", alan: "asansor" },
];

export function BinaOzellikleri({ data, onChange }: { data: KonutOzellikleriData; onChange: Degistir }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-x-4 gap-y-2.5 md:grid-cols-2">
        {BINA_LISTELERI.map((l) => (
          <div key={l.key}>
            <SecenekListesiAlani
              kompakt
              listeKey={l.key}
              value={data[l.alan] as string}
              onChange={(v) => onChange({ [l.alan]: v } as Partial<KonutOzellikleriData>)}
              bosMetin="Seçiniz"
              etiketGoster
            />
          </div>
        ))}
      </div>
      <div className="border-t border-slate-100 pt-3">
        <EvetHayirAciklama
          soru="Bunların dışında ilave anlatım yapmak istiyor musunuz?"
          deger={data.ilaveAnlatim}
          aciklama={data.ilaveAnlatimMetni}
          yerTutucu="İlave anlatım"
          onChange={(ilaveAnlatim, ilaveAnlatimMetni) => onChange({ ilaveAnlatim, ilaveAnlatimMetni })}
        />
        <AkiciAlan etiket="İlave Anlatım" deger={data.ilaveAnlatim === "Evet" ? data.ilaveAnlatimMetni : ""} />
      </div>
    </div>
  );
}
