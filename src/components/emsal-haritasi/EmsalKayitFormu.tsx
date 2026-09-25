"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  Building2,
  CircleCheck,
  Factory,
  History,
  House,
  Layers,
  Loader2,
  LocateFixed,
  MapPin,
  Search,
  Store,
  Tractor,
  Trees,
  X,
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
import { birimFiyat, istatistik, mesafeMetre, mukerrerAdaylari } from "@/lib/emsal-haritasi/analiz";
import { bridgeVerisiniAyristir, type BridgePayload } from "@/lib/emsal-haritasi/bridge-ayristir";
import {
  KATEGORILER,
  KATEGORI_SIRASI,
  kategoriOf,
  type EmsalKategori,
  type KategoriAlani,
} from "@/lib/emsal-haritasi/kategoriler";
import type { EmsalDurum, EmsalHaritaKaydi } from "@/lib/emsal-haritasi/types";
import type { AdresSonucu } from "@/app/api/konum-ara/route";
import EmsalHaritaMap, { type HaritaHedefi, type HaritaKatmani } from "@/components/emsal-haritasi/EmsalHaritaMap";
import AdresArama from "@/components/emsal-haritasi/AdresArama";
import EksperixBridgePaneli from "@/components/emsal-haritasi/EksperixBridgePaneli";
import EmsalOzetKarti, { type BolgeKarsilastirmasi, type BolumDurumu } from "@/components/emsal-haritasi/EmsalOzetKarti";

const HARITA_SAYFASI = "/deger-haritasi/emsal-haritasi";
const TASLAK_ANAHTARI = "eksperix:yeni-emsal-taslak:v1";
// Radius of the "Bölge karşılaştırması" in the summary card.
const BOLGE_YARICAPI = 1000;

const KATEGORI_IKON: Record<EmsalKategori, ReactNode> = {
  konut: <House className="h-5 w-5" />,
  isyeri: <Store className="h-5 w-5" />,
  bina: <Building2 className="h-5 w-5" />,
  ciftlik: <Tractor className="h-5 w-5" />,
  fabrika: <Factory className="h-5 w-5" />,
  arsa: <Trees className="h-5 w-5" />,
};

const BOLUM = {
  kategori: "bolum-kategori",
  ilan: "bolum-ilan",
  konum: "bolum-konum",
  fiyat: "bolum-fiyat",
  ozellik: "bolum-ozellik",
  gorsel: "bolum-gorsel",
} as const;

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

interface Taslak {
  kategori: EmsalKategori;
  ortak: OrtakAlanlar;
  degerler: Record<string, string>;
  enlem: string;
  boylam: string;
  zaman: string;
}

// Category field values keyed by field key. Keys shared between categories
// (tapuDurumu, kimden, isitma, binaYasi…) survive a category switch.
function degerlerFromKaydi(kaydi: EmsalHaritaKaydi): Record<string, string> {
  const degerler: Record<string, string> = { ...(kaydi.detaylar ?? {}) };
  for (const alan of KATEGORILER[kategoriOf(kaydi)].alanlar) {
    if (alan.ust) degerler[alan.key] = kaydi[alan.ust] ?? "";
  }
  return degerler;
}

function taslakOku(): Taslak | null {
  try {
    const raw = window.localStorage.getItem(TASLAK_ANAHTARI);
    return raw ? (JSON.parse(raw) as Taslak) : null;
  } catch {
    return null;
  }
}

function taslakSil() {
  try {
    window.localStorage.removeItem(TASLAK_ANAHTARI);
  } catch {
    // Storage unavailable: nothing was saved either.
  }
}

// "4500000" / "4.500.000,5" → "4.500.000" / "4.500.000,5" on blur.
function fiyatBicimle(v: string): string {
  const n = parseTrNumber(v);
  return n === null ? v : n.toLocaleString("tr-TR", { maximumFractionDigits: 2 });
}

const initialActionState: EmsalFormState = {};

function Bolum({
  id,
  numara,
  baslik,
  aciklama,
  durum,
  sag,
  children,
}: {
  id: string;
  numara: number;
  baslik: string;
  aciklama?: string;
  durum: BolumDurumu;
  sag?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className={`scroll-mt-20 rounded-2xl border bg-white p-5 transition-colors ${
        durum === "eksik" ? "border-rose-300 ring-2 ring-rose-100" : "border-slate-100"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
              durum === "tamam"
                ? "bg-emerald-500 text-white"
                : durum === "eksik"
                  ? "bg-rose-500 text-white"
                  : "bg-slate-100 text-slate-500"
            }`}
          >
            {durum === "tamam" ? "✓" : numara}
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-900">{baslik}</h2>
            {aciklama && <p className="mt-0.5 text-xs text-slate-500">{aciklama}</p>}
          </div>
        </div>
        {sag}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function HataMetni({ children }: { children: ReactNode }) {
  return <p className="mt-1 text-xs font-medium text-rose-600">{children}</p>;
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
  eklenen,
}: {
  // Every stored record: shown on the location map and used for the duplicate
  // warning and the area comparison.
  records: EmsalHaritaKaydi[];
  kaydi?: EmsalHaritaKaydi;
  // The record just saved via "Kaydet ve yeni ekle", confirmed at the top.
  eklenen?: EmsalHaritaKaydi;
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
  // Validation messages show only after a save attempt, not while typing.
  const [denendi, setDenendi] = useState(false);
  const [bulunanTaslak, setBulunanTaslak] = useState<Taslak | null>(null);
  const [adresBulunuyor, setAdresBulunuyor] = useState(false);
  const [adresMesaji, setAdresMesaji] = useState<string | null>(null);

  const [ilOptions, setIlOptions] = useState<string[]>([]);
  const [ilceOptions, setIlceOptions] = useState<string[]>([]);
  const [mahalleOptions, setMahalleOptions] = useState<string[]>([]);
  const [fetching, setFetching] = useState(false);
  const [fetchMessage, setFetchMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [state, formAction, pending] = useActionState(
    kaydi ? updateEmsalKaydiAction : createEmsalKaydiAction,
    initialActionState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const sonrakiRef = useRef<HTMLInputElement>(null);

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
    setAdresMesaji(null);
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

  // ---- Draft autosave (new records only) -----------------------------------
  const bosMu = !ortak.emlakTipi && !ortak.il && !ortak.webAdresi && !ortak.istenenFiyat && !enlem && Object.values(degerler).every((v) => !v);

  useEffect(() => {
    if (kaydi) return;
    const t = taslakOku();
    if (t) queueMicrotask(() => setBulunanTaslak(t));
  }, [kaydi]);

  useEffect(() => {
    // Not while a found draft is still waiting for "geri yükle / sil", or the
    // empty form would overwrite it.
    if (kaydi || bulunanTaslak || bosMu) return;
    const timer = setTimeout(() => {
      try {
        const taslak: Taslak = { kategori, ortak, degerler, enlem, boylam, zaman: new Date().toISOString() };
        window.localStorage.setItem(TASLAK_ANAHTARI, JSON.stringify(taslak));
      } catch {
        // Storage full or blocked: drafts are a convenience only.
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [kaydi, bulunanTaslak, bosMu, kategori, ortak, degerler, enlem, boylam]);

  function taslagiYukle() {
    if (!bulunanTaslak) return;
    setKategori(bulunanTaslak.kategori);
    setOrtak({ ...BOS_ORTAK, ...bulunanTaslak.ortak });
    setDegerler(bulunanTaslak.degerler ?? {});
    setEnlem(bulunanTaslak.enlem ?? "");
    setBoylam(bulunanTaslak.boylam ?? "");
    setBulunanTaslak(null);
  }

  function taslagiAt() {
    taslakSil();
    setBulunanTaslak(null);
  }

  // ---- Derived values ------------------------------------------------------
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
  const istenen = parseTrNumber(ortak.istenenFiyat);
  const pazarlikli = parseTrNumber(ortak.pazarlikliFiyat);
  const fiyat = pazarlikli ?? istenen;
  const alan = parseTrNumber(ustDeger("m2Net")) ?? parseTrNumber(ustDeger("m2Brut"));
  const m2Fiyati = fiyat !== null && alan !== null && alan > 0 ? fiyat / alan : null;
  const pazarlikOrani = istenen && pazarlikli && istenen > 0 ? (istenen - pazarlikli) / istenen : null;

  // Same durum + kategori within BOLGE_YARICAPI of the picked point.
  const bolge = useMemo<BolgeKarsilastirmasi | null>(() => {
    if (!pickedPoint) return null;
    const benzerler = records.filter(
      (r) =>
        r.id !== kaydi?.id &&
        (r.durum === "kiralik" ? "kiralik" : "satilik") === ortak.durum &&
        kategoriOf(r) === kategori &&
        birimFiyat(r) !== null &&
        mesafeMetre(pickedPoint.lat, pickedPoint.lng, r.lat, r.lng) <= BOLGE_YARICAPI,
    );
    const { medyan } = istatistik(benzerler);
    return {
      yaricap: BOLGE_YARICAPI,
      adet: benzerler.length,
      medyan,
      fark: medyan && m2Fiyati !== null ? (m2Fiyati - medyan) / medyan : null,
    };
  }, [pickedPoint, records, kaydi?.id, ortak.durum, kategori, m2Fiyati]);

  // ---- Validation & section status ----------------------------------------
  const hatalar = {
    emlakTipi: !ortak.emlakTipi ? `${tanim.tipEtiketi} seçin.` : null,
    il: !ortak.il ? "İl seçin." : null,
    konum: !pickedPoint ? "Haritadan bir nokta seçin ya da enlem/boylam girin." : null,
  };
  const ozellikDolu = tanim.alanlar.filter((a) => degerler[a.key]?.trim()).length;
  const bolumDurumu = {
    kategori: (hatalar.emlakTipi ? (denendi ? "eksik" : "bos") : "tamam") as BolumDurumu,
    ilan: (ortak.webAdresi || ortak.ilanNo || ortak.ilanTarihi ? "tamam" : "bos") as BolumDurumu,
    konum: (hatalar.il || hatalar.konum ? (denendi ? "eksik" : "bos") : "tamam") as BolumDurumu,
    fiyat: (istenen !== null ? "tamam" : "bos") as BolumDurumu,
    ozellik: (ozellikDolu >= Math.ceil(tanim.alanlar.length / 2) ? "tamam" : "bos") as BolumDurumu,
    gorsel: (ortak.gorselUrl ? "tamam" : "bos") as BolumDurumu,
  };

  // How much of what an appraiser would want is filled: the core fields plus
  // this category's own fields.
  const temelDolu = [
    ortak.emlakTipi,
    ortak.il,
    ortak.ilce,
    ortak.mahalle,
    pickedPoint ? "x" : "",
    ortak.istenenFiyat,
    ortak.pazarlikliFiyat,
    ortak.ilanTarihi,
    ortak.webAdresi,
  ];
  const doluluk = Math.round(
    ((temelDolu.filter(Boolean).length + ozellikDolu) / (temelDolu.length + tanim.alanlar.length)) * 100,
  );

  // ---- Save ----------------------------------------------------------------
  function kaydet(sonraki: "" | "yeni") {
    if (sonrakiRef.current) sonrakiRef.current.value = sonraki;
    formRef.current?.requestSubmit();
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    const ilkHata = hatalar.emlakTipi ? BOLUM.kategori : hatalar.il || hatalar.konum ? BOLUM.konum : null;
    if (ilkHata) {
      e.preventDefault();
      setDenendi(true);
      document.getElementById(ilkHata)?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    // Valid and on its way; a server error keeps the form filled regardless.
    if (!kaydi) taslakSil();
  }

  // Ctrl/Cmd + S saves from anywhere on the page.
  useEffect(() => {
    function tus(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (sonrakiRef.current) sonrakiRef.current.value = "";
        formRef.current?.requestSubmit();
      }
    }
    window.addEventListener("keydown", tus);
    return () => window.removeEventListener("keydown", tus);
  }, []);

  // ---- Address from the picked point (reverse geocoding) ------------------
  async function konumdanAdresDoldur() {
    if (!pickedPoint) return;
    setAdresBulunuyor(true);
    setAdresMesaji(null);
    try {
      const res = await fetch(`/api/konum-ara?lat=${pickedPoint.lat}&lng=${pickedPoint.lng}`);
      const body = (await res.json()) as { adres?: AdresSonucu; error?: string };
      if (!res.ok || !body.adres) {
        setAdresMesaji(body.error ?? "Adres bulunamadı.");
        return;
      }
      const { il, ilce, mahalle } = body.adres;
      if (!il) {
        setAdresMesaji("Bu nokta için il bilgisi bulunamadı.");
        return;
      }
      // Grow the local il / ilçe / mahalle lists so the values show up as options.
      setIlOptions(await addIl(il));
      if (ilce) setIlceOptions(await addIlce(il, ilce));
      if (ilce && mahalle) setMahalleOptions(await addMahalle(il, ilce, mahalle));
      patch({ il, ilce, mahalle: ilce ? mahalle : "" });
      setAdresMesaji([mahalle, ilce, il].filter(Boolean).join(", ") + " dolduruldu.");
    } catch {
      setAdresMesaji("Konum servisine ulaşılamadı.");
    } finally {
      setAdresBulunuyor(false);
    }
  }

  // ---- Listing page fetch (server-side scrape) ----------------------------
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
        for (const a of tanim.alanlar) {
          const v = a.ust ? f[a.ust] : a.key === "kimden" ? f.kimden : undefined;
          if (v) next[a.key] = v;
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

  function pazarlikUygula(oran: number) {
    if (istenen === null) return;
    // Round to a sensible step: sale prices to 1.000 ₺, rents to 10 ₺.
    const adim = ortak.durum === "kiralik" ? 10 : 1000;
    patch({ pazarlikliFiyat: fiyatBicimle(String(Math.round((istenen * (1 - oran)) / adim) * adim)) });
  }

  function alanGirdisi(a: KategoriAlani) {
    const value = degerler[a.key] ?? "";
    if (a.tip === "secim" && a.secenekler) {
      return (
        <SecimAlani key={a.key} label={a.label} value={value} secenekler={a.secenekler} onChange={(v) => setDeger(a.key, v)} />
      );
    }
    return (
      <Field key={a.key} label={a.label}>
        <input
          type="text"
          inputMode={a.tip === "sayi" ? "decimal" : undefined}
          value={value}
          placeholder={a.ipucu}
          onChange={(e) => setDeger(a.key, e.target.value)}
          className={inputClass}
        />
      </Field>
    );
  }

  const konumMetni = [ortak.mahalle, ortak.ilce, ortak.il].filter(Boolean).join(", ");
  const baslik = ortak.emlakTipi ? `${ortak.emlakTipi}${degerler.odaSayisi && kategori === "konut" ? ` · ${degerler.odaSayisi}` : ""}` : "Yeni emsal";

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link
            href={HARITA_SAYFASI}
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Emsal Haritası
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
            {kaydi ? "Emsali Düzenle" : "Yeni Emsal Ekle"}
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {kaydi
              ? `${kaydi.ekleyenAdSoyad} tarafından ${new Date(kaydi.olusturmaTarihi).toLocaleDateString("tr-TR")} tarihinde eklendi.`
              : "İlanı eklentiyle aktarın ya da bilgileri adım adım girin."}
          </p>
        </div>
      </div>

      {eklenen && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CircleCheck className="h-4 w-4 shrink-0" />
          <span>
            <strong>Emsal kaydedildi:</strong> {eklenen.emlakTipi}
            {[eklenen.mahalle, eklenen.ilce].filter(Boolean).length > 0 &&
              ` · ${[eklenen.mahalle, eklenen.ilce].filter(Boolean).join(", ")}`}
            . Sıradaki emsali girebilirsiniz.
          </span>
          <Link
            href={`${HARITA_SAYFASI}?odak=${encodeURIComponent(eklenen.id)}`}
            className="ml-auto text-xs font-semibold text-emerald-700 hover:underline"
          >
            Haritada gör →
          </Link>
        </div>
      )}

      {bulunanTaslak && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          <History className="h-4 w-4 shrink-0" />
          <span>
            Kaydedilmemiş bir taslak var
            {bulunanTaslak.ortak?.emlakTipi ? ` (${bulunanTaslak.ortak.emlakTipi}` : " ("}
            {new Date(bulunanTaslak.zaman).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" })}).
          </span>
          <div className="ml-auto flex gap-2">
            <button type="button" onClick={taslagiYukle} className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700">
              Geri yükle
            </button>
            <button type="button" onClick={taslagiAt} className="rounded-lg px-3 py-1.5 text-xs font-medium text-sky-800 hover:bg-sky-100">
              Sil
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          <EksperixBridgePaneli onVeri={bridgeUygula} />

          <form id="emsal-kayit-formu" ref={formRef} action={formAction} onSubmit={onSubmit} noValidate className="space-y-4">
            <input type="hidden" name="kategori" value={kategori} />
            <input type="hidden" name="kaynak" value={kaynak} />
            <input type="hidden" name="lat" value={enlem} />
            <input type="hidden" name="lng" value={boylam} />
            <input ref={sonrakiRef} type="hidden" name="sonraki" defaultValue="" />
            {kaydi && <input type="hidden" name="id" value={kaydi.id} />}
            {(Object.keys(ortak) as (keyof OrtakAlanlar)[]).map((key) => (
              <input key={key} type="hidden" name={key} value={ortak[key]} />
            ))}
            {/* Only the current category's fields are posted; the server ignores any others. */}
            {tanim.alanlar.map((a) => (
              <input key={a.key} type="hidden" name={a.ust ?? `d_${a.key}`} value={degerler[a.key] ?? ""} />
            ))}

            <Bolum id={BOLUM.kategori} numara={1} baslik="Kategori ve Durum" durum={bolumDurumu.kategori}>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {KATEGORI_SIRASI.map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => kategoriDegistir(id)}
                    aria-pressed={kategori === id}
                    className={`group flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-medium transition-all ${
                      kategori === id
                        ? "border-slate-900 bg-slate-900 text-lime-300 shadow-md shadow-slate-900/10"
                        : "border-slate-200 bg-white text-slate-600 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm"
                    }`}
                  >
                    {KATEGORI_IKON[id]}
                    {KATEGORILER[id].label}
                  </button>
                ))}
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Field label="Durumu">
                  <div className="flex rounded-lg bg-slate-100 p-1">
                    {(["satilik", "kiralik"] as const).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => patch({ durum: opt })}
                        className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                          ortak.durum === opt ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        {opt === "satilik" ? "Satılık" : "Kiralık"}
                      </button>
                    ))}
                  </div>
                </Field>
                <div>
                  <ComboboxField
                    label={`${tanim.tipEtiketi} *`}
                    value={ortak.emlakTipi}
                    options={tanim.tipSecenekleri}
                    onChange={(v) => patch({ emlakTipi: v })}
                    onAddNew={(v) => patch({ emlakTipi: v })}
                  />
                  {denendi && hatalar.emlakTipi && <HataMetni>{hatalar.emlakTipi}</HataMetni>}
                </div>
              </div>
            </Bolum>

            <Bolum
              id={BOLUM.ilan}
              numara={2}
              baslik="İlan Bilgileri"
              aciklama="İlan linkini girip Getir'e basarsanız okunabilen alanlar otomatik doldurulur."
              durum={bolumDurumu.ilan}
            >
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

            <Bolum
              id={BOLUM.konum}
              numara={3}
              baslik="Konum"
              aciklama="Haritaya tıklayın, adres arayın ya da enlem/boylamı elle girin."
              durum={bolumDurumu.konum}
              sag={
                pickedPoint && (
                  <button
                    type="button"
                    onClick={konumdanAdresDoldur}
                    disabled={adresBulunuyor}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    title="Seçilen noktanın il / ilçe / mahallesini doldur"
                  >
                    {adresBulunuyor ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LocateFixed className="h-3.5 w-3.5" />}
                    Konumdan adres doldur
                  </button>
                )
              }
            >
              {adresMesaji && <p className="-mt-2 mb-3 text-xs text-slate-500">{adresMesaji}</p>}
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <ComboboxField
                    label="İl *"
                    value={ortak.il}
                    options={ilOptions}
                    onChange={(v) => patch({ il: v, ilce: "", mahalle: "" })}
                    onAddNew={async (v) => setIlOptions(await addIl(v))}
                  />
                  {denendi && hatalar.il && <HataMetni>{hatalar.il}</HataMetni>}
                </div>
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
              {(enlem || boylam) && !pickedPoint ? (
                <HataMetni>Enlem/boylam geçerli bir koordinat değil.</HataMetni>
              ) : (
                denendi && hatalar.konum && <HataMetni>{hatalar.konum}</HataMetni>
              )}

              <div
                className={`relative mt-3 h-80 overflow-hidden rounded-xl border lg:h-[420px] ${
                  denendi && hatalar.konum ? "border-rose-300" : "border-slate-200"
                }`}
              >
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

            <Bolum id={BOLUM.fiyat} numara={4} baslik="Fiyat" durum={bolumDurumu.fiyat}>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label={ortak.durum === "kiralik" ? "Aylık Kira (₺)" : "İlan Fiyatı (₺)"}>
                  <input
                    inputMode="decimal"
                    value={ortak.istenenFiyat}
                    onChange={(e) => patch({ istenenFiyat: e.target.value })}
                    onBlur={(e) => patch({ istenenFiyat: fiyatBicimle(e.target.value) })}
                    className={inputClass}
                  />
                </Field>
                <div>
                  <Field label="Pazarlıklı Fiyat (₺)">
                    <input
                      inputMode="decimal"
                      value={ortak.pazarlikliFiyat}
                      onChange={(e) => patch({ pazarlikliFiyat: e.target.value })}
                      onBlur={(e) => patch({ pazarlikliFiyat: fiyatBicimle(e.target.value) })}
                      className={inputClass}
                    />
                  </Field>
                  {istenen !== null && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-1">
                      {[0.05, 0.1, 0.15].map((oran) => (
                        <button
                          key={oran}
                          type="button"
                          onClick={() => pazarlikUygula(oran)}
                          className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:bg-slate-200"
                        >
                          −%{oran * 100}
                        </button>
                      ))}
                      {pazarlikOrani !== null && (
                        <span className="ml-1 text-[11px] text-slate-500">
                          İlan fiyatının %{formatTrNumber(pazarlikOrani * 100).replace(/,00$/, "")} altında
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <TextField
                  label={kategori === "arsa" ? "m² Fiyatı (₺)" : "Birim Fiyat (₺/m²)"}
                  value={m2Fiyati === null ? "" : formatTrNumber(m2Fiyati)}
                  onChange={() => {}}
                  placeholder="Fiyat ve m² girilince hesaplanır"
                  readOnly
                />
              </div>
            </Bolum>

            <Bolum
              id={BOLUM.ozellik}
              numara={5}
              baslik={`${tanim.label} Özellikleri`}
              aciklama={tanim.alanAciklamasi}
              durum={bolumDurumu.ozellik}
              sag={
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium tabular-nums text-slate-600">
                  {ozellikDolu}/{tanim.alanlar.length}
                </span>
              }
            >
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{tanim.alanlar.map(alanGirdisi)}</div>
            </Bolum>

            <Bolum id={BOLUM.gorsel} numara={6} baslik="Görsel" durum={bolumDurumu.gorsel}>
              <TextField
                label="Görsel Adresi (opsiyonel)"
                value={ortak.gorselUrl}
                onChange={(v) => patch({ gorselUrl: v })}
                placeholder="https://... (ilan linkinden ya da eklentiden otomatik gelebilir)"
              />
            </Bolum>
          </form>
        </div>

        <aside className="lg:sticky lg:top-4 lg:self-start">
          <EmsalOzetKarti
            baslik={baslik}
            durumEtiketi={ortak.durum === "kiralik" ? "Kiralık" : "Satılık"}
            kategoriEtiketi={tanim.label}
            konumMetni={konumMetni}
            gorselUrl={ortak.gorselUrl}
            alanM2={alan}
            fiyat={fiyat}
            birim={m2Fiyati}
            birimEtiketi={ortak.durum === "kiralik" ? "₺/m² (ay)" : "₺/m²"}
            bolge={bolge}
            doluluk={doluluk}
            bolumler={[
              { id: BOLUM.kategori, label: "Kategori ve Durum", durum: bolumDurumu.kategori },
              { id: BOLUM.ilan, label: "İlan Bilgileri", durum: bolumDurumu.ilan },
              { id: BOLUM.konum, label: "Konum", durum: bolumDurumu.konum },
              { id: BOLUM.fiyat, label: "Fiyat", durum: bolumDurumu.fiyat },
              {
                id: BOLUM.ozellik,
                label: "Özellikler",
                durum: bolumDurumu.ozellik,
                not: `${ozellikDolu}/${tanim.alanlar.length}`,
              },
              { id: BOLUM.gorsel, label: "Görsel", durum: bolumDurumu.gorsel },
            ]}
            mukerrer={mukerrer}
            hata={state.error}
            pending={pending}
            duzenleme={!!kaydi}
            iptalHref={HARITA_SAYFASI}
            onKaydet={() => kaydet("")}
            onKaydetVeYeni={() => kaydet("yeni")}
          />
        </aside>
      </div>

      {/* Phones: the summary card sits below the form, so keep saving at hand. */}
      <div className="sticky bottom-0 z-[700] mt-4 rounded-t-2xl border border-b-0 border-slate-200 bg-white/95 backdrop-blur lg:hidden">
        <div className="flex flex-wrap items-center justify-end gap-2 px-4 py-3">
          {state.error && <p className="mr-auto text-xs font-medium text-rose-600">{state.error}</p>}
          <Link href={HARITA_SAYFASI} className={secondaryButtonClass}>
            <X className="h-4 w-4 sm:hidden" />
            <span className="hidden sm:inline">Vazgeç</span>
          </Link>
          {!kaydi && (
            <button type="button" onClick={() => kaydet("yeni")} disabled={pending} className={secondaryButtonClass}>
              Kaydet ve yeni
            </button>
          )}
          <button type="button" onClick={() => kaydet("")} disabled={pending} className={primaryButtonClass}>
            {pending ? "Kaydediliyor..." : kaydi ? "Güncelle" : "Kaydet"}
          </button>
        </div>
      </div>
    </div>
  );
}
