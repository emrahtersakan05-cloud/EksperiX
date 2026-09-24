"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Factory,
  House,
  Layers,
  Loader2,
  MapPin,
  Search,
  Store,
  Tractor,
  Trees,
} from "lucide-react";
import {
  ComboboxField,
  Field,
  TextField,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/talep/form-fields";
import { addIl, addIlce, addMahalle, getIlceler, getIller, getMahalleler } from "@/lib/talep/adres-referans";
import { formatTrNumber, parseTrNumber } from "@/lib/emsal/hesaplama";
import { createEmsalKaydiAction, updateEmsalKaydiAction, type EmsalFormState } from "@/lib/emsal-haritasi/actions";
import { mukerrerAdaylari } from "@/lib/emsal-haritasi/analiz";
import { bridgeVerisiniAyristir, type BridgePayload } from "@/lib/emsal-haritasi/bridge-ayristir";
import {
  KATEGORILER,
  KATEGORI_SIRASI,
  kategoriOf,
  type EmsalKategori,
  type KategoriAlani,
} from "@/lib/emsal-haritasi/kategoriler";
import type { EmsalDurum, EmsalHaritaKaydi } from "@/lib/emsal-haritasi/types";
import EmsalHaritaMap, { type HaritaHedefi, type HaritaKatmani } from "@/components/emsal-haritasi/EmsalHaritaMap";
import AdresArama from "@/components/emsal-haritasi/AdresArama";
import EksperixBridgePaneli from "@/components/emsal-haritasi/EksperixBridgePaneli";

const HARITA_SAYFASI = "/deger-haritasi/emsal-haritasi";

const KATEGORI_IKON: Record<EmsalKategori, ReactNode> = {
  konut: <House className="h-5 w-5" />,
  isyeri: <Store className="h-5 w-5" />,
  bina: <Building2 className="h-5 w-5" />,
  ciftlik: <Tractor className="h-5 w-5" />,
  fabrika: <Factory className="h-5 w-5" />,
  arsa: <Trees className="h-5 w-5" />,
};

interface OrtakAlanlar {
  durum: EmsalDurum;
  emlakTipi: string;
  il: string;
  ilce: string;
  mahalle: string;
  webAdresi: string;
  gorselUrl: string;
  ilanNo: string;
  ilanTelNo: string;
  ilanTarihi: string;
  istenenFiyat: string;
  pazarlikliFiyat: string;
}

const BOS_ORTAK: OrtakAlanlar = {
  durum: "satilik",
  emlakTipi: "",
  il: "",
  ilce: "",
  mahalle: "",
  webAdresi: "",
  gorselUrl: "",
  ilanNo: "",
  ilanTelNo: "",
  ilanTarihi: "",
  istenenFiyat: "",
  pazarlikliFiyat: "",
};

// Category field values keyed by field key. Keys shared between categories
// (tapuDurumu, kimden, isitma, binaYasi…) survive a category switch.
function degerlerFromKaydi(kaydi: EmsalHaritaKaydi): Record<string, string> {
  const degerler: Record<string, string> = { ...(kaydi.detaylar ?? {}) };
  for (const alan of KATEGORILER[kategoriOf(kaydi)].alanlar) {
    if (alan.ust) degerler[alan.key] = kaydi[alan.ust] ?? "";
  }
  return degerler;
}

const initialActionState: EmsalFormState = {};

function Bolum({ baslik, aciklama, children }: { baslik: string; aciklama?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-5">
      <h2 className="text-sm font-semibold text-slate-900">{baslik}</h2>
      {aciklama && <p className="mt-0.5 text-xs text-slate-500">{aciklama}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function SecimAlani({
  label,
  value,
  secenekler,
  onChange,
}: {
  label: string;
  value: string;
  secenekler: readonly string[];
  onChange: (v: string) => void;
}) {
  // A stored value that's no longer in the option list (older data, or a
  // value read from a listing page) is kept selectable rather than dropped.
  const liste = value && !secenekler.includes(value) ? [value, ...secenekler] : secenekler;
  return (
    <Field label={label}>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={`${inputClass} appearance-none`}>
        <option value="">Seçiniz</option>
        {liste.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </Field>
  );
}

// With `kaydi` the page edits that record; without it, it creates one.
export default function EmsalKayitFormu({
  records,
  kaydi,
}: {
  // Every stored record: shown on the location map and used for the duplicate warning.
  records: EmsalHaritaKaydi[];
  kaydi?: EmsalHaritaKaydi;
}) {
  const [kategori, setKategori] = useState<EmsalKategori>(kaydi ? kategoriOf(kaydi) : "konut");
  const [ortak, setOrtak] = useState<OrtakAlanlar>(() =>
    kaydi
      ? {
          durum: kaydi.durum === "kiralik" ? "kiralik" : "satilik",
          emlakTipi: kaydi.emlakTipi,
          il: kaydi.il,
          ilce: kaydi.ilce,
          mahalle: kaydi.mahalle,
          webAdresi: kaydi.webAdresi ?? "",
          gorselUrl: kaydi.gorselUrl ?? "",
          ilanNo: kaydi.ilanNo ?? "",
          ilanTelNo: kaydi.ilanTelNo ?? "",
          ilanTarihi: kaydi.ilanTarihi,
          istenenFiyat: kaydi.istenenFiyat,
          pazarlikliFiyat: kaydi.pazarlikliFiyat,
        }
      : BOS_ORTAK,
  );
  const [degerler, setDegerler] = useState<Record<string, string>>(() => (kaydi ? degerlerFromKaydi(kaydi) : {}));
  const [enlem, setEnlem] = useState(kaydi ? String(kaydi.lat) : "");
  const [boylam, setBoylam] = useState(kaydi ? String(kaydi.lng) : "");
  const [kaynak, setKaynak] = useState<"manuel" | "url-bridge" | "eklenti-bridge">("manuel");
  const [katman, setKatman] = useState<HaritaKatmani>("sokak");
  const [hedef, setHedef] = useState<HaritaHedefi | null>(null);

  const [ilOptions, setIlOptions] = useState<string[]>([]);
  const [ilceOptions, setIlceOptions] = useState<string[]>([]);
  const [mahalleOptions, setMahalleOptions] = useState<string[]>([]);
  const [fetching, setFetching] = useState(false);
  const [fetchMessage, setFetchMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [state, formAction, pending] = useActionState(
    kaydi ? updateEmsalKaydiAction : createEmsalKaydiAction,
    initialActionState,
  );

  const tanim = KATEGORILER[kategori];
  const patch = (next: Partial<OrtakAlanlar>) => setOrtak((prev) => ({ ...prev, ...next }));
  const setDeger = (key: string, value: string) => setDegerler((prev) => ({ ...prev, [key]: value }));
  // Value of whichever field of this category is stored in the given top-level column.
  const ustDeger = (ust: "m2Brut" | "m2Net") => {
    const alan = tanim.alanlar.find((a) => a.ust === ust);
    return alan ? (degerler[alan.key] ?? "") : "";
  };

  // Coordinates are typed or picked; the map pin follows whatever parses.
  const pickedPoint = useMemo(() => {
    const lat = Number(enlem.replace(",", "."));
    const lng = Number(boylam.replace(",", "."));
    if (!enlem.trim() || !boylam.trim() || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
    return { lat, lng };
  }, [enlem, boylam]);

  function konumSec(lat: number, lng: number) {
    setEnlem(lat.toFixed(6));
    setBoylam(lng.toFixed(6));
  }

  function kategoriDegistir(yeni: EmsalKategori) {
    setKategori(yeni);
    // Keep the emlak tipi only if the new category offers it.
    if (!KATEGORILER[yeni].tipSecenekleri.includes(ortak.emlakTipi)) patch({ emlakTipi: "" });
  }

  // A listing pushed in by the Eksperix Bridge extension. Only fields the page
  // actually had are written; everything else keeps what the user typed.
  function bridgeUygula(payload: BridgePayload): string[] {
    const s = bridgeVerisiniAyristir(payload, kategori);
    const kategoriDegisti = !!s.kategori && s.kategori !== kategori;
    if (s.kategori) setKategori(s.kategori);
    setOrtak((prev) => ({
      ...prev,
      durum: s.durum ?? prev.durum,
      // A different category's emlak tipi would be invalid there.
      emlakTipi: s.emlakTipi ?? (kategoriDegisti ? "" : prev.emlakTipi),
      il: s.il ?? prev.il,
      ilce: s.il ? (s.ilce ?? "") : (s.ilce ?? prev.ilce),
      mahalle: s.il || s.ilce ? (s.mahalle ?? "") : (s.mahalle ?? prev.mahalle),
      webAdresi: s.webAdresi ?? prev.webAdresi,
      gorselUrl: s.gorselUrl ?? prev.gorselUrl,
      ilanNo: s.ilanNo ?? prev.ilanNo,
      ilanTelNo: s.ilanTelNo ?? prev.ilanTelNo,
      ilanTarihi: s.ilanTarihi ?? prev.ilanTarihi,
      istenenFiyat: s.istenenFiyat ?? prev.istenenFiyat,
    }));
    setDegerler((prev) => ({ ...prev, ...s.degerler }));
    if (s.lat && s.lng) {
      const lat = Number(s.lat);
      const lng = Number(s.lng);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        konumSec(lat, lng);
        setHedef((prev) => ({ lat, lng, zoom: 17, key: (prev?.key ?? 0) + 1 }));
      }
    }
    if (s.doldurulanlar.length > 0) setKaynak("eklenti-bridge");
    return s.doldurulanlar;
  }

  useEffect(() => {
    getIller().then(setIlOptions);
  }, []);

  useEffect(() => {
    if (!ortak.il) {
      queueMicrotask(() => setIlceOptions([]));
      return;
    }
    getIlceler(ortak.il).then(setIlceOptions);
  }, [ortak.il]);

  useEffect(() => {
    if (!ortak.il || !ortak.ilce) {
      queueMicrotask(() => setMahalleOptions([]));
      return;
    }
    getMahalleler(ortak.il, ortak.ilce).then(setMahalleOptions);
  }, [ortak.il, ortak.ilce]);

  const mukerrer = useMemo(
    () =>
      mukerrerAdaylari(
        {
          id: kaydi?.id,
          webAdresi: ortak.webAdresi,
          ilanNo: ortak.ilanNo,
          durum: ortak.durum,
          lat: pickedPoint?.lat,
          lng: pickedPoint?.lng,
          m2Net: ustDeger("m2Net"),
          m2Brut: ustDeger("m2Brut"),
        },
        records,
      ),
    // ustDeger reads only tanim and degerler, both listed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [kaydi?.id, ortak.webAdresi, ortak.ilanNo, ortak.durum, pickedPoint, degerler, tanim, records],
  );

  // m² fiyatı / birim fiyat is derived, never typed — same rule as the map's birimFiyat().
  const fiyat = parseTrNumber(ortak.pazarlikliFiyat) ?? parseTrNumber(ortak.istenenFiyat);
  const alan = parseTrNumber(ustDeger("m2Net")) ?? parseTrNumber(ustDeger("m2Brut"));
  const m2Fiyati = fiyat !== null && alan !== null && alan > 0 ? fiyat / alan : null;

  async function handleUrlFetch() {
    const url = ortak.webAdresi.trim();
    if (!url) return;
    setFetching(true);
    setFetchMessage(null);
    try {
      const res = await fetch("/api/emsal-web-getir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const body = await res.json();
      if (!res.ok) {
        setFetchMessage({ tone: "error", text: body.error ?? "Sayfa okunamadı." });
        return;
      }
      const f = body.fields ?? {};
      const filledCount = Object.keys(f).length;
      setOrtak((prev) => ({
        ...prev,
        emlakTipi: f.emlakTipi ?? prev.emlakTipi,
        il: f.il ?? prev.il,
        ilanTarihi: f.ilanTarihi ?? prev.ilanTarihi,
        istenenFiyat: f.istenenFiyat ?? prev.istenenFiyat,
        pazarlikliFiyat: f.pazarlikliFiyat ?? prev.pazarlikliFiyat,
        ilanTelNo: f.telefonNo ?? prev.ilanTelNo,
        gorselUrl: body.gorselUrl ?? prev.gorselUrl,
      }));
      // Route extracted values to whichever field of this category stores them.
      setDegerler((prev) => {
        const next = { ...prev };
        for (const alan of tanim.alanlar) {
          const v = alan.ust ? f[alan.ust] : alan.key === "kimden" ? f.kimden : undefined;
          if (v) next[alan.key] = v;
        }
        return next;
      });
      if (filledCount > 0) setKaynak("url-bridge");
      setFetchMessage(
        filledCount > 0
          ? { tone: "success", text: `${filledCount} alan sayfadan dolduruldu. Konumu ve diğer bilgileri kontrol edin.` }
          : { tone: "error", text: "Sayfa okundu ancak eşleşen alan bulunamadı. Bilgileri elle girebilirsiniz." },
      );
    } catch {
      setFetchMessage({ tone: "error", text: "Sayfa alınırken bir hata oluştu." });
    } finally {
      setFetching(false);
    }
  }

  function alanGirdisi(alan: KategoriAlani) {
    const value = degerler[alan.key] ?? "";
    if (alan.tip === "secim" && alan.secenekler) {
      return (
        <SecimAlani
          key={alan.key}
          label={alan.label}
          value={value}
          secenekler={alan.secenekler}
          onChange={(v) => setDeger(alan.key, v)}
        />
      );
    }
    return (
      <Field key={alan.key} label={alan.label}>
        <input
          type="text"
          inputMode={alan.tip === "sayi" ? "decimal" : undefined}
          value={value}
          placeholder={alan.ipucu}
          onChange={(e) => setDeger(alan.key, e.target.value)}
          className={inputClass}
        />
      </Field>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href={HARITA_SAYFASI}
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Emsal Haritası
          </Link>
          <h1 className="mt-1 text-xl font-semibold text-slate-900">{kaydi ? "Emsali Düzenle" : "Yeni Emsal Ekle"}</h1>
        </div>
      </div>

      <div className="mb-4">
        <EksperixBridgePaneli onVeri={bridgeUygula} />
      </div>

      <form id="emsal-kayit-formu" action={formAction} className="space-y-4">
        <input type="hidden" name="kategori" value={kategori} />
        <input type="hidden" name="kaynak" value={kaynak} />
        <input type="hidden" name="lat" value={enlem} />
        <input type="hidden" name="lng" value={boylam} />
        {kaydi && <input type="hidden" name="id" value={kaydi.id} />}
        {(Object.keys(ortak) as (keyof OrtakAlanlar)[]).map((key) => (
          <input key={key} type="hidden" name={key} value={ortak[key]} />
        ))}
        {/* Only the current category's fields are posted; the server ignores any others. */}
        {tanim.alanlar.map((alan) => (
          <input key={alan.key} type="hidden" name={alan.ust ?? `d_${alan.key}`} value={degerler[alan.key] ?? ""} />
        ))}

        <Bolum baslik="Kategori ve Durum">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {KATEGORI_SIRASI.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => kategoriDegistir(id)}
                aria-pressed={kategori === id}
                className={`flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-xs font-medium transition-colors ${
                  kategori === id
                    ? "border-slate-900 bg-slate-900 text-lime-300"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                {KATEGORI_IKON[id]}
                {KATEGORILER[id].label}
              </button>
            ))}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Durumu">
              <div className="flex gap-1.5">
                {(["satilik", "kiralik"] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => patch({ durum: opt })}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                      ortak.durum === opt
                        ? "border-slate-900 bg-slate-900 text-lime-300"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    {opt === "satilik" ? "Satılık" : "Kiralık"}
                  </button>
                ))}
              </div>
            </Field>
            <ComboboxField
              label={`${tanim.tipEtiketi} *`}
              value={ortak.emlakTipi}
              options={tanim.tipSecenekleri}
              onChange={(v) => patch({ emlakTipi: v })}
              onAddNew={(v) => patch({ emlakTipi: v })}
            />
          </div>
        </Bolum>

        <Bolum baslik="İlan Bilgileri" aciklama="İlan linkini girip Getir'e basarsanız okunabilen alanlar otomatik doldurulur.">
          <div className="space-y-3">
            <Field label="İlan Linki">
              <div className="flex gap-2">
                <input
                  type="url"
                  value={ortak.webAdresi}
                  onChange={(e) => patch({ webAdresi: e.target.value })}
                  placeholder="https://..."
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={handleUrlFetch}
                  disabled={!ortak.webAdresi.trim() || fetching}
                  className={`${secondaryButtonClass} inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap`}
                >
                  {fetching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                  Getir
                </button>
              </div>
              {fetchMessage && (
                <p className={`mt-1.5 text-xs ${fetchMessage.tone === "success" ? "text-emerald-600" : "text-rose-600"}`}>
                  {fetchMessage.text}
                </p>
              )}
            </Field>
            <div className="grid gap-3 sm:grid-cols-3">
              <TextField label="İlan No" value={ortak.ilanNo} onChange={(v) => patch({ ilanNo: v })} />
              <TextField
                label="İlan Tel No"
                type="tel"
                value={ortak.ilanTelNo}
                onChange={(v) => patch({ ilanTelNo: v })}
                placeholder="0 5xx xxx xx xx"
              />
              <TextField label="İlan Tarihi" type="date" value={ortak.ilanTarihi} onChange={(v) => patch({ ilanTarihi: v })} />
            </div>
          </div>
        </Bolum>

        <Bolum baslik="Konum" aciklama="Haritaya tıklayın, adres arayın ya da enlem/boylamı elle girin.">
          <div className="grid gap-3 sm:grid-cols-3">
            <ComboboxField
              label="İl *"
              value={ortak.il}
              options={ilOptions}
              onChange={(v) => patch({ il: v, ilce: "", mahalle: "" })}
              onAddNew={async (v) => setIlOptions(await addIl(v))}
            />
            <ComboboxField
              label="İlçe"
              value={ortak.ilce}
              options={ilceOptions}
              placeholder={ortak.il ? "Ara veya seçin..." : "Önce il seçin"}
              onChange={(v) => patch({ ilce: v, mahalle: "" })}
              onAddNew={ortak.il ? async (v) => setIlceOptions(await addIlce(ortak.il, v)) : undefined}
            />
            <ComboboxField
              label="Mahalle"
              value={ortak.mahalle}
              options={mahalleOptions}
              placeholder={ortak.ilce ? "Ara veya seçin..." : "Önce ilçe seçin"}
              onChange={(v) => patch({ mahalle: v })}
              onAddNew={
                ortak.il && ortak.ilce ? async (v) => setMahalleOptions(await addMahalle(ortak.il, ortak.ilce, v)) : undefined
              }
            />
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <TextField label="İlan Enlem *" value={enlem} onChange={setEnlem} placeholder="örn. 39,920770" />
            <TextField label="İlan Boylam *" value={boylam} onChange={setBoylam} placeholder="örn. 32,854110" />
          </div>
          {(enlem || boylam) && !pickedPoint && (
            <p className="mt-1.5 text-xs text-rose-600">Enlem/boylam geçerli bir koordinat değil.</p>
          )}

          <div className="relative mt-3 h-80 overflow-hidden rounded-xl border border-slate-200 lg:h-[420px]">
            <EmsalHaritaMap
              records={records.filter((r) => r.id !== kaydi?.id)}
              picking
              pickedPoint={pickedPoint}
              onPick={konumSec}
              katman={katman}
              kumele
              hedef={hedef}
            />
            <div className="absolute left-3 top-3 z-[600] w-[min(20rem,calc(100%-7rem))]">
              <AdresArama
                ipucu="Seçtiğiniz sonuç emsalin konumu olarak işaretlenir."
                onSelect={({ lat, lng }) => {
                  konumSec(lat, lng);
                  setHedef((prev) => ({ lat, lng, zoom: 17, key: (prev?.key ?? 0) + 1 }));
                }}
              />
            </div>
            <button
              type="button"
              onClick={() => setKatman((k) => (k === "sokak" ? "uydu" : "sokak"))}
              className={`absolute right-3 top-3 z-[500] inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium shadow-sm ${
                katman === "uydu"
                  ? "border-slate-900 bg-slate-900 text-lime-300"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              Uydu
            </button>
          </div>
          <p className="mt-1.5 flex items-center gap-1 text-[11px] text-slate-400">
            <MapPin className="h-3 w-3" />
            Mor pin seçtiğiniz konumdur; diğer pinler kayıtlı emsallerdir.
          </p>
        </Bolum>

        <Bolum baslik="Fiyat">
          <div className="grid gap-3 sm:grid-cols-3">
            <TextField
              label={ortak.durum === "kiralik" ? "Aylık Kira (₺)" : "İlan Fiyatı (₺)"}
              value={ortak.istenenFiyat}
              onChange={(v) => patch({ istenenFiyat: v })}
            />
            <TextField
              label="Pazarlıklı Fiyat (₺)"
              value={ortak.pazarlikliFiyat}
              onChange={(v) => patch({ pazarlikliFiyat: v })}
            />
            <TextField
              label={kategori === "arsa" ? "m² Fiyatı (₺)" : "Birim Fiyat (₺/m²)"}
              value={m2Fiyati === null ? "" : formatTrNumber(m2Fiyati)}
              onChange={() => {}}
              placeholder="Fiyat ve m² girilince hesaplanır"
              readOnly
            />
          </div>
        </Bolum>

        <Bolum baslik={`${tanim.label} Özellikleri`} aciklama={tanim.alanAciklamasi}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{tanim.alanlar.map(alanGirdisi)}</div>
        </Bolum>

        <Bolum baslik="Görsel">
          <TextField
            label="Görsel Adresi (opsiyonel)"
            value={ortak.gorselUrl}
            onChange={(v) => patch({ gorselUrl: v })}
            placeholder="https://... (ilan linkinden otomatik gelebilir)"
          />
        </Bolum>

        {mukerrer.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
            <p className="flex items-center gap-1.5 font-semibold">
              <AlertTriangle className="h-3.5 w-3.5" />
              Bu emsal daha önce eklenmiş olabilir
            </p>
            <ul className="mt-1 space-y-0.5">
              {mukerrer.slice(0, 3).map(({ kaydi: k, neden }) => (
                <li key={k.id}>
                  {neden} · {k.emlakTipi || "Emsal"}, {[k.mahalle, k.ilce].filter(Boolean).join(", ") || k.il} ·{" "}
                  {k.ekleyenAdSoyad}, {new Date(k.olusturmaTarihi).toLocaleDateString("tr-TR")}
                </li>
              ))}
            </ul>
            <p className="mt-1 text-[11px] text-amber-700">Farklı bir ilansa yine de kaydedebilirsiniz.</p>
          </div>
        )}
      </form>

      {/* Sticky action bar so Kaydet is reachable from anywhere on the long form. */}
      <div className="sticky bottom-0 z-[700] mt-4 rounded-t-2xl border border-b-0 border-slate-200 bg-white/95 backdrop-blur">
        <div className="flex flex-wrap items-center justify-end gap-2 px-4 py-3">
          {state.error && <p className="mr-auto text-xs font-medium text-rose-600">{state.error}</p>}
          <Link href={HARITA_SAYFASI} className={secondaryButtonClass}>
            Vazgeç
          </Link>
          <button type="submit" form="emsal-kayit-formu" disabled={pending} className={primaryButtonClass}>
            {pending ? "Kaydediliyor..." : kaydi ? "Güncelle" : "Kaydet"}
          </button>
        </div>
      </div>
    </div>
  );
}
