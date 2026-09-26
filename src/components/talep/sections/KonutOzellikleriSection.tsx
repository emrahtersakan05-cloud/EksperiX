"use client";

import { useRef, useState } from "react";
import {
  Building,
  Building2,
  Check,
  DoorOpen,
  FileText,
  Home,
  ImageUp,
  Layers,
  Loader2,
  MapPin,
  PencilLine,
  Plus,
  ScanText,
  Trash2,
  X,
} from "lucide-react";
import { AkiciAlan } from "@/components/akici-metin/baglam";
import SecenekListesiAlani from "@/components/talep/SecenekListesiAlani";
import { SectionCard, TextField, inputClass, sectionBodyClass, sectionCardClass } from "@/components/talep/form-fields";
import { AltBaslik, EvetHayir, NitelikKarti, TapuBilgisi, YonSecici, yeniId } from "@/components/talep/sections/ortak";
import {
  KONUT_MAHALLINDEKI_NITELIKLER,
  NIZAMLAR,
  blokAdi,
  insaatNizamiOzeti,
  projeKatlariMetni,
} from "@/lib/talep/konut";
import type { KonutOzellikleriData, NizamAtamasi, TapuKaydiData } from "@/lib/talep/types";
import type { SecenekListesiKey } from "@/lib/secenekler/varsayilan";

const FormGroup = SectionCard;
const AZAMI_BLOK = 26;

const BINA_LISTELERI: { key: SecenekListesiKey; alan: keyof KonutOzellikleriData }[] = [
  { key: "binaGirisKapisi", alan: "binaGirisKapisi" },
  { key: "katHoluSahanlik", alan: "katHoluSahanlik" },
  { key: "merdivenBasamaklari", alan: "merdivenBasamaklari" },
  { key: "merdivenKorkuluklari", alan: "merdivenKorkuluklari" },
  { key: "binaIciDuvarlar", alan: "binaIciDuvarlar" },
  { key: "binaDisCephesi", alan: "binaDisCephesi" },
  { key: "binaCatisi", alan: "binaCatisi" },
];

// Side-by-side nizam buttons (Bitişik / Ayrık / Blok / Diğer); "Diğer" asks
// for the wording.
function NizamSecici({
  nizam,
  diger,
  onChange,
}: {
  nizam: string;
  diger: string;
  onChange: (nizam: string, diger: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="İnşaat nizamı">
        {NIZAMLAR.map((n) => {
          const aktif = nizam === n;
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={aktif}
              onClick={() => onChange(aktif ? "" : n, n === "Diğer" ? diger : "")}
              className={`flex items-center justify-center gap-1.5 rounded-xl border-2 px-3 py-2.5 text-sm font-semibold transition-all ${
                aktif
                  ? "border-slate-900 bg-slate-900 text-lime-300 shadow-sm"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
              }`}
            >
              {aktif && <Check className="h-4 w-4" />}
              {n}
            </button>
          );
        })}
      </div>
      {nizam === "Diğer" && (
        <div className="relative">
          <PencilLine className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-lime-600" />
          <input
            value={diger}
            onChange={(e) => onChange(nizam, e.target.value)}
            placeholder="Nizamı yazınız"
            aria-label="İnşaat nizamı (Diğer)"
            className={`${inputClass} border-lime-300! bg-lime-50/60! pl-9`}
          />
        </div>
      )}
    </div>
  );
}

// Bloklu: name the blocks, then assign a nizam to one or more of them at a time.
function BlokNizamlari({ data, onChange }: { data: KonutOzellikleriData; onChange: (p: Partial<KonutOzellikleriData>) => void }) {
  const [secili, setSecili] = useState<number[]>([]);
  const [nizam, setNizam] = useState("");
  const [diger, setDiger] = useState("");
  const sayi = Math.min(AZAMI_BLOK, Math.max(0, parseInt(data.blokSayisi, 10) || 0));
  const atanan = new Map<number, NizamAtamasi>();
  for (const a of data.nizamAtamalari) for (const b of a.bloklar) atanan.set(b, a);

  function sayiDegistir(v: string) {
    const n = Math.min(AZAMI_BLOK, Math.max(0, parseInt(v, 10) || 0));
    const adlar = Array.from({ length: n }, (_, i) => data.blokAdlari[i] ?? "");
    // Drop assignments to blocks that no longer exist.
    const atamalar = data.nizamAtamalari
      .map((a) => ({ ...a, bloklar: a.bloklar.filter((b) => b < n) }))
      .filter((a) => a.bloklar.length);
    onChange({ blokSayisi: v.replace(/\D/g, "").slice(0, 2), blokAdlari: adlar, nizamAtamalari: atamalar });
    setSecili((s) => s.filter((b) => b < n));
  }

  function ekle() {
    if (!secili.length || !nizam || (nizam === "Diğer" && !diger.trim())) return;
    onChange({
      nizamAtamalari: [...data.nizamAtamalari, { id: yeniId(), bloklar: [...secili].sort((a, b) => a - b), nizam, nizamDiger: diger.trim() }],
    });
    setSecili([]);
    setNizam("");
    setDiger("");
  }

  const kalan = Array.from({ length: sayi }, (_, i) => i).filter((i) => !atanan.has(i));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <TextField label="Yapı Sınıfı" value={data.yapiSinifi} onChange={(v) => onChange({ yapiSinifi: v })} placeholder="Örn. 3B" />
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium text-slate-500">Blok Sayısı</span>
          <input
            type="number"
            min={0}
            max={AZAMI_BLOK}
            value={data.blokSayisi}
            onChange={(e) => sayiDegistir(e.target.value)}
            placeholder="Örn. 4"
            className={inputClass}
          />
        </label>
      </div>

      {sayi > 0 && (
        <>
          <div>
            <p className="mb-1.5 text-[11px] font-medium text-slate-500">Blok adları (en fazla 6 karakter)</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {Array.from({ length: sayi }, (_, i) => (
                <input
                  key={i}
                  value={data.blokAdlari[i] ?? ""}
                  maxLength={6}
                  onChange={(e) => onChange({ blokAdlari: Array.from({ length: sayi }, (_, j) => (j === i ? e.target.value : (data.blokAdlari[j] ?? ""))) })}
                  placeholder={String(i + 1)}
                  aria-label={`${i + 1}. blok adı`}
                  className={`${inputClass} text-center font-semibold uppercase`}
                />
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-sm font-semibold text-slate-900">Blokların nizamını belirleyin</p>
            <p className="mb-3 text-xs text-slate-500">Bir veya birden fazla blok seçin, nizamı seçip ekleyin; kalan bloklar için tekrarlayın.</p>

            <div className="mb-3 flex flex-wrap gap-1.5" role="group" aria-label="Bloklar">
              {Array.from({ length: sayi }, (_, i) => {
                const a = atanan.get(i);
                const aktif = secili.includes(i);
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={!!a}
                    aria-pressed={aktif}
                    onClick={() => setSecili(aktif ? secili.filter((x) => x !== i) : [...secili, i])}
                    title={a ? `${blokAdi(data, i)} bloğu atandı` : `${blokAdi(data, i)} bloğunu seç`}
                    className={`flex h-11 min-w-11 items-center justify-center rounded-xl border-2 px-2 text-sm font-bold transition-all ${
                      a
                        ? "cursor-not-allowed border-lime-200 bg-lime-50 text-lime-700"
                        : aktif
                          ? "border-slate-900 bg-slate-900 text-lime-300 shadow-sm"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-400"
                    }`}
                  >
                    {a && <Check className="mr-0.5 h-3.5 w-3.5" />}
                    {blokAdi(data, i)}
                  </button>
                );
              })}
            </div>

            {kalan.length > 0 ? (
              <>
                <NizamSecici
                  nizam={nizam}
                  diger={diger}
                  onChange={(n, d) => {
                    setNizam(n);
                    setDiger(d);
                  }}
                />
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-slate-500">
                    {secili.length ? `${secili.map((i) => blokAdi(data, i)).join(", ")} seçildi` : "Blok seçilmedi"}
                  </p>
                  <button
                    type="button"
                    onClick={ekle}
                    disabled={!secili.length || !nizam || (nizam === "Diğer" && !diger.trim())}
                    className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-lime-300 disabled:opacity-40"
                  >
                    <Plus className="h-4 w-4" />
                    Ekle
                  </button>
                </div>
              </>
            ) : (
              <p className="rounded-lg bg-lime-50 px-3 py-2 text-xs font-medium text-lime-800">Tüm blokların nizamı belirlendi.</p>
            )}

            {data.nizamAtamalari.length > 0 && (
              <ul className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">
                {data.nizamAtamalari.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2">
                    <span className="flex flex-wrap items-center gap-1.5 text-sm">
                      {a.bloklar.map((b) => (
                        <span key={b} className="rounded-md bg-slate-900 px-2 py-0.5 text-xs font-bold text-lime-300">
                          {blokAdi(data, b)}
                        </span>
                      ))}
                      <span className="text-slate-400">→</span>
                      <span className="font-semibold text-slate-900">{a.nizam === "Diğer" ? a.nizamDiger : a.nizam}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => onChange({ nizamAtamalari: data.nizamAtamalari.filter((x) => x.id !== a.id) })}
                      aria-label="Atamayı kaldır"
                      className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// Image of the approved project → OCR → floor rows.
function ProjeOzellikleri({ data, onChange }: { data: KonutOzellikleriData; onChange: (p: Partial<KonutOzellikleriData>) => void }) {
  const [gorsel, setGorsel] = useState<string | null>(null);
  const [okunuyor, setOkunuyor] = useState(false);
  const [ilerleme, setIlerleme] = useState(0);
  const [mesaj, setMesaj] = useState<{ tur: "basari" | "hata"; metin: string } | null>(null);
  const girdiRef = useRef<HTMLInputElement>(null);

  function dosya(f: File | undefined) {
    if (!f || !f.type.startsWith("image/")) return;
    const r = new FileReader();
    r.onload = () => {
      setGorsel(String(r.result));
      setMesaj(null);
    };
    r.readAsDataURL(f);
  }

  async function oku() {
    if (!gorsel) return;
    setOkunuyor(true);
    setIlerleme(0);
    setMesaj(null);
    try {
      const [{ recognizeText }, { projeKatlariniAyristir }] = await Promise.all([
        import("@/lib/ocr/uavt-extract"),
        import("@/lib/ocr/proje-katlari"),
      ]);
      const sonuc = await recognizeText(gorsel, (p) => p.status.includes("recogn") && setIlerleme(Math.round(p.progress * 100)));
      const katlar = projeKatlariniAyristir(sonuc.text);
      if (!katlar.length) {
        setMesaj({ tur: "hata", metin: "Görselde okunabilir metin bulunamadı. Daha net bir görsel deneyin veya elle girin." });
        return;
      }
      onChange({ projeKatlari: [...data.projeKatlari, ...katlar.map((k) => ({ id: yeniId(), ...k }))] });
      setMesaj({ tur: "basari", metin: `${katlar.length} kat satırı eklendi. Okunan metni kontrol edip düzeltebilirsiniz.` });
    } catch {
      setMesaj({ tur: "hata", metin: "Görsel okunamadı. Tekrar deneyin veya bilgileri elle girin." });
    } finally {
      setOkunuyor(false);
    }
  }

  function satirGuncelle(id: string, p: Partial<{ kat: string; aciklama: string }>) {
    onChange({ projeKatlari: data.projeKatlari.map((k) => (k.id === id ? { ...k, ...p } : k)) });
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          dosya(e.dataTransfer.files[0]);
        }}
        className="grid gap-3 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/60 p-3 sm:grid-cols-[160px_minmax(0,1fr)]"
      >
        <button
          type="button"
          onClick={() => girdiRef.current?.click()}
          className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white text-slate-400 hover:border-lime-400 hover:text-lime-700"
        >
          {gorsel ? (
            // eslint-disable-next-line @next/next/no-img-element -- local data URL preview
            <img src={gorsel} alt="Proje görseli" className="h-full w-full object-cover" />
          ) : (
            <ImageUp className="h-7 w-7" />
          )}
        </button>
        <div className="flex flex-col justify-center gap-2">
          <p className="text-sm font-semibold text-slate-800">Proje görselini ekleyin</p>
          <p className="text-xs text-slate-500">
            Onaylı projenin kat açıklamalarını içeren sayfanın görselini sürükleyin veya seçin; metin okunup kat satırlarına aktarılır.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => girdiRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <ImageUp className="h-3.5 w-3.5" />
              {gorsel ? "Görseli değiştir" : "Görsel seç"}
            </button>
            <button
              type="button"
              onClick={oku}
              disabled={!gorsel || okunuyor}
              className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-lime-300 disabled:opacity-40"
            >
              {okunuyor ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ScanText className="h-3.5 w-3.5" />}
              {okunuyor ? `Okunuyor… %${ilerleme}` : "Görselden Oku (OCR)"}
            </button>
          </div>
          {mesaj && (
            <p className={`rounded-lg px-2.5 py-1.5 text-xs ${mesaj.tur === "basari" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
              {mesaj.metin}
            </p>
          )}
        </div>
        <input
          ref={girdiRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            dosya(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>

      <div className="space-y-2">
        {data.projeKatlari.length === 0 && (
          <p className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-400">
            Henüz kat bilgisi yok. Görselden okuyun veya elle ekleyin.
          </p>
        )}
        {data.projeKatlari.map((k, i) => (
          <div key={k.id} className="grid gap-2 rounded-xl border border-slate-100 bg-white p-2 shadow-sm sm:grid-cols-[180px_minmax(0,1fr)_auto]">
            <input
              value={k.kat}
              onChange={(e) => satirGuncelle(k.id, { kat: e.target.value })}
              placeholder="Bulunduğu Kat"
              aria-label={`${i + 1}. satır bulunduğu kat`}
              className={`${inputClass} font-semibold`}
            />
            <textarea
              value={k.aciklama}
              onChange={(e) => satirGuncelle(k.id, { aciklama: e.target.value })}
              placeholder="Kat detay açıklaması"
              aria-label={`${i + 1}. satır kat detay açıklaması`}
              rows={2}
              className={`${inputClass} resize-y`}
            />
            <button
              type="button"
              onClick={() => onChange({ projeKatlari: data.projeKatlari.filter((x) => x.id !== k.id) })}
              aria-label={`${i + 1}. satırı sil`}
              className="self-start rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange({ projeKatlari: [...data.projeKatlari, { id: yeniId(), kat: "", aciklama: "" }] })}
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-lime-400 bg-lime-50 px-3 py-1.5 text-xs font-semibold text-lime-800 hover:bg-lime-100"
        >
          <Plus className="h-3.5 w-3.5" />
          Kat Ekle
        </button>
      </div>
    </div>
  );
}

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
            <div className="space-y-4">
              {bloklu && (
                <div className={sectionBodyClass}>
                  <AltBaslik
                    icon={<Building2 className="h-4 w-4" />}
                    baslik="Blok Tespiti Yapmak İstiyor musunuz?"
                    aciklama="Bağımsız bölümün bulunduğu bloğun parsel içindeki yönü"
                  />
                  <EvetHayir
                    etiket="Blok tespiti"
                    value={data.blokTespiti}
                    onChange={(v) => onChange({ blokTespiti: v, ...(v !== "Evet" ? { blokYonleri: [] } : {}) })}
                  />
                  {data.blokTespiti === "Evet" && (
                    <div className="mt-4">
                      <YonSecici
                        secili={data.blokYonleri}
                        onChange={(blokYonleri) => onChange({ blokYonleri })}
                        etiket="Blok yönleri"
                        merkez="Parsel"
                        seciliBaslik="Bloğun parseldeki yönü"
                        bosMetin="Pusulada bloğun parsel içindeki yönüne tıklayın."
                      />
                    </div>
                  )}
                </div>
              )}

              {!bloklu && (
                <div className={sectionBodyClass}>
                  <TextField label="Yapı Sınıfı" value={data.yapiSinifi} onChange={(v) => onChange({ yapiSinifi: v })} placeholder="Örn. 3B" />
                </div>
              )}

              <div className={sectionBodyClass}>
                <AltBaslik
                  icon={<DoorOpen className="h-4 w-4" />}
                  baslik="Bina Giriş Tespiti Yapmak İstiyor musunuz?"
                  aciklama="Bina girişinin hangi cepheden olduğu"
                />
                <EvetHayir
                  etiket="Bina giriş tespiti"
                  value={data.binaGirisTespiti}
                  onChange={(v) => onChange({ binaGirisTespiti: v, ...(v !== "Evet" ? { binaGirisYonleri: [] } : {}) })}
                />
                {data.binaGirisTespiti === "Evet" && (
                  <div className="mt-4">
                    <YonSecici
                      secili={data.binaGirisYonleri}
                      onChange={(binaGirisYonleri) => onChange({ binaGirisYonleri })}
                      etiket="Bina giriş yönleri"
                      merkez="Bina"
                      merkezIcon={<Building className="mb-0.5 h-4 w-4 text-lime-600" />}
                      seciliBaslik="Bina girişinin bulunduğu cephe"
                      bosMetin="Pusulada bina girişinin bulunduğu cepheye tıklayın."
                    />
                  </div>
                )}
              </div>

              <div className={sectionBodyClass}>
                <AltBaslik icon={<Layers className="h-4 w-4" />} baslik="İnşaat Nizamı" />
                {bloklu ? (
                  <BlokNizamlari data={data} onChange={onChange} />
                ) : (
                  <NizamSecici
                    nizam={data.insaatNizami}
                    diger={data.insaatNizamiDiger}
                    onChange={(insaatNizami, insaatNizamiDiger) => onChange({ insaatNizami, insaatNizamiDiger })}
                  />
                )}
              </div>
            </div>
            <AkiciAlan etiket="Blok Yönü" deger={data.blokTespiti === "Evet" ? data.blokYonleri.join(", ") : ""} />
            <AkiciAlan etiket="Bina Giriş Yönü" deger={data.binaGirisTespiti === "Evet" ? data.binaGirisYonleri.join(", ") : ""} />
            {bloklu && <AkiciAlan etiket="Blok Sayısı" deger={data.blokSayisi} />}
            {bloklu && (
              <AkiciAlan
                etiket="Blok Adları"
                deger={Array.from({ length: parseInt(data.blokSayisi, 10) || 0 }, (_, i) => blokAdi(data, i)).join(", ")}
              />
            )}
            <AkiciAlan etiket="İnşaat Nizamı" deger={insaatNizamiOzeti(data)} />
          </FormGroup>

          <FormGroup title="Proje Özellikleri">
            <ProjeOzellikleri data={data} onChange={onChange} />
            <AkiciAlan etiket="Proje Kat Bilgileri" deger={projeKatlariMetni(data)} />
          </FormGroup>

          <FormGroup title="Bina Özellikleri">
            <div className="space-y-3">
              <TextField
                label="Bina Girişi Tespit"
                value={data.binaGirisiTespit}
                onChange={(v) => onChange({ binaGirisiTespit: v })}
                placeholder="Örn. Bina girişi X Sokak cephesinden sağlanmaktadır."
              />
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {BINA_LISTELERI.map((l) => (
                  <SecenekListesiAlani
                    key={l.key}
                    listeKey={l.key}
                    value={data[l.alan] as string}
                    onChange={(v) => onChange({ [l.alan]: v } as Partial<KonutOzellikleriData>)}
                  />
                ))}
              </div>
            </div>
          </FormGroup>
        </>
      )}
    </div>
  );
}
