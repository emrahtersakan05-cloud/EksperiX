"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, MapPin, MapPinOff } from "lucide-react";
import Card from "@/components/card";
import { birimSeviyesi, degerNoktalari, medyan, seviyeEsikleri, SEVIYE_RENK, type DegerNoktasi } from "@/lib/deger-haritasi/noktalar";
import { tamSayi } from "@/lib/emsal/hesaplama";
import type { EmsalHaritaKaydi } from "@/lib/emsal-haritasi/types";
import { emsalleriGetir } from "@/lib/panel/veri-kaynagi";
import { YONTEM_ADLARI } from "@/lib/talep/deger-hesaplama";
import { listTalepler } from "@/lib/talep/service";
import type { Talep } from "@/lib/talep/types";
import { normalizeLabel } from "@/lib/text/normalize-tr";

const DegerHaritasiMap = dynamic(() => import("@/components/deger-haritasi/DegerHaritasiMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-slate-100" />,
});

const TUMU = "Tümü";

function secenekler(degerler: string[]): string[] {
  return [...new Set(degerler.filter(Boolean))].sort((a, b) => a.localeCompare(b, "tr"));
}

function talepAdresi(n: DegerNoktasi): string {
  return `/taleplerim/${encodeURIComponent(n.talep.id)}?bolum=degerHesaplamasi&tapu=${encodeURIComponent(n.tapu.id)}`;
}

function Nokta({ renk, className = "" }: { renk: string; className?: string }) {
  return <span className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${className}`} style={{ background: renk }} />;
}

export default function DegerHaritasiDetayPage() {
  const router = useRouter();
  const [talepler, setTalepler] = useState<Talep[] | null>(null);
  const [emsaller, setEmsaller] = useState<EmsalHaritaKaydi[] | null>(null);
  const [il, setIl] = useState(TUMU);
  const [ilce, setIlce] = useState(TUMU);
  const [nitelik, setNitelik] = useState(TUMU);
  const [sadeceDegerli, setSadeceDegerli] = useState(false);
  const [emsalGoster, setEmsalGoster] = useState(false);
  const [arama, setArama] = useState("");
  const [odakId, setOdakId] = useState<string | null>(null);

  useEffect(() => {
    listTalepler().then(setTalepler);
  }, []);

  // Emsal records are fetched only when the layer is first switched on.
  useEffect(() => {
    if (emsalGoster && emsaller === null) emsalleriGetir().then(setEmsaller);
  }, [emsalGoster, emsaller]);

  const { noktalar, konumsuz } = useMemo(() => degerNoktalari(talepler ?? []), [talepler]);

  const ilSecenekleri = useMemo(() => secenekler(noktalar.map((n) => n.il)), [noktalar]);
  const ilceSecenekleri = useMemo(
    () => secenekler(noktalar.filter((n) => il === TUMU || n.il === il).map((n) => n.ilce)),
    [noktalar, il],
  );
  const nitelikSecenekleri = useMemo(() => secenekler(noktalar.map((n) => n.nitelik)), [noktalar]);

  const gorunen = useMemo(() => {
    const q = normalizeLabel(arama);
    return noktalar
      .filter((n) => il === TUMU || n.il === il)
      .filter((n) => ilce === TUMU || n.ilce === ilce)
      .filter((n) => nitelik === TUMU || n.nitelik === nitelik)
      .filter((n) => !sadeceDegerli || n.deger !== null)
      .filter(
        (n) =>
          !q ||
          normalizeLabel([n.talep.talepNo, n.talep.musteriUnvani, n.tapu.ad, n.mahalle, n.ilce, n.il].join(" ")).includes(q),
      )
      .sort((a, b) => (b.birim ?? -1) - (a.birim ?? -1));
  }, [noktalar, il, ilce, nitelik, sadeceDegerli, arama]);

  const ozet = useMemo(() => {
    const birimler = gorunen.map((n) => n.birim).filter((b): b is number => b !== null);
    return {
      esikler: seviyeEsikleri(birimler),
      medyanBirim: medyan(birimler),
      toplam: gorunen.reduce((t, n) => t + (n.deger ?? 0), 0),
      degerli: gorunen.filter((n) => n.deger !== null).length,
    };
  }, [gorunen]);
  const { esikler } = ozet;

  const gorunenEmsaller = useMemo(() => {
    if (!emsalGoster || !emsaller) return [];
    const ilN = normalizeLabel(il);
    const ilceN = normalizeLabel(ilce);
    return emsaller.filter(
      (e) => (il === TUMU || normalizeLabel(e.il) === ilN) && (ilce === TUMU || normalizeLabel(e.ilce) === ilceN),
    );
  }, [emsalGoster, emsaller, il, ilce]);

  const sec = useCallback((n: DegerNoktasi) => router.push(talepAdresi(n)), [router]);

  const secimKutusu =
    "rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Değer Haritası</h1>
        <p className="mt-1 text-sm text-slate-500">
          Değerlemesi yapılan taşınmazlar, rapordaki birim değerleriyle harita üzerinde. Konum, talebin Adres / Konum
          bölümündeki enlem-boylamdan ya da KML dosyasından alınır.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { etiket: "Haritadaki taşınmaz", deger: String(gorunen.length) },
          { etiket: "Değeri hesaplanan", deger: String(ozet.degerli) },
          {
            etiket: "Medyan birim değer",
            deger: ozet.medyanBirim !== null ? `${tamSayi(ozet.medyanBirim)} ₺/m²` : "—",
          },
          { etiket: "Toplam değer", deger: ozet.toplam > 0 ? `${tamSayi(ozet.toplam)} ₺` : "—" },
        ].map((k) => (
          <div key={k.etiket} className="rounded-2xl border border-slate-100 bg-white p-4">
            <p className="truncate text-base font-semibold tabular-nums sm:text-lg text-slate-900">{k.deger}</p>
            <p className="mt-0.5 text-xs text-slate-500">{k.etiket}</p>
          </div>
        ))}
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <select
            value={il}
            onChange={(e) => {
              setIl(e.target.value);
              setIlce(TUMU);
            }}
            className={secimKutusu}
            aria-label="İl"
          >
            <option value={TUMU}>Tüm iller</option>
            {ilSecenekleri.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select value={ilce} onChange={(e) => setIlce(e.target.value)} className={secimKutusu} aria-label="İlçe">
            <option value={TUMU}>Tüm ilçeler</option>
            {ilceSecenekleri.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select value={nitelik} onChange={(e) => setNitelik(e.target.value)} className={secimKutusu} aria-label="Nitelik">
            <option value={TUMU}>Tüm nitelikler</option>
            {nitelikSecenekleri.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <input
            type="search"
            value={arama}
            onChange={(e) => setArama(e.target.value)}
            placeholder="Talep no, müşteri, mahalle…"
            className={`${secimKutusu} w-full sm:w-56`}
          />
          <label className="inline-flex items-center gap-1.5 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={sadeceDegerli}
              onChange={(e) => setSadeceDegerli(e.target.checked)}
              className="accent-slate-900"
            />
            Sadece değeri olanlar
          </label>
          <label className="inline-flex items-center gap-1.5 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={emsalGoster}
              onChange={(e) => setEmsalGoster(e.target.checked)}
              className="accent-slate-900"
            />
            Emsalleri göster
            {emsalGoster && emsaller !== null && <span className="text-xs text-slate-400">({gorunenEmsaller.length})</span>}
          </label>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="relative h-[460px] overflow-hidden rounded-2xl border border-slate-100 lg:h-[560px]">
            <DegerHaritasiMap noktalar={gorunen} esikler={esikler} emsaller={gorunenEmsaller} odakId={odakId} onSec={sec} />
            <div className="pointer-events-none absolute bottom-3 left-3 z-[400] space-y-0.5 rounded-xl bg-white/95 px-3 py-2 text-[11px] text-slate-600 shadow">
              <p className="mb-1 font-semibold text-slate-800">Birim değer</p>
              {esikler ? (
                <>
                  <p className="flex items-center gap-1.5">
                    <Nokta renk={SEVIYE_RENK.dusuk} />
                    {tamSayi(esikler[0])} ₺/m² altı
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Nokta renk={SEVIYE_RENK.orta} />
                    Orta
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Nokta renk={SEVIYE_RENK.yuksek} />
                    {tamSayi(esikler[1])} ₺/m² ve üstü
                  </p>
                </>
              ) : (
                <p className="flex items-center gap-1.5">
                  <Nokta renk={SEVIYE_RENK.orta} />
                  Hesaplanan
                </p>
              )}
              <p className="flex items-center gap-1.5">
                <Nokta renk={SEVIYE_RENK.yok} />
                Hesaplanmadı
              </p>
              {emsalGoster && (
                <p className="flex items-center gap-1.5">
                  <Nokta renk="#0f172a" />
                  Emsal
                </p>
              )}
            </div>
          </div>

          <div className="flex max-h-[560px] flex-col">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-400">Taşınmazlar · birim değere göre</p>
            {talepler === null ? (
              <div className="space-y-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />
                ))}
              </div>
            ) : gorunen.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-200 py-10 text-center">
                <MapPin className="h-6 w-6 text-slate-300" />
                <p className="px-4 text-sm text-slate-500">
                  {noktalar.length === 0 ? "Konumu girilmiş taşınmaz yok." : "Bu filtreye uyan taşınmaz yok."}
                </p>
              </div>
            ) : (
              <ul className="-mr-2 space-y-1.5 overflow-y-auto pr-2">
                {gorunen.map((n) => (
                  <li key={n.tapu.id}>
                    <Link
                      href={talepAdresi(n)}
                      onMouseEnter={() => setOdakId(n.tapu.id)}
                      onFocus={() => setOdakId(n.tapu.id)}
                      className={`flex items-start gap-2.5 rounded-xl border px-3 py-2 transition-colors ${
                        odakId === n.tapu.id ? "border-slate-300 bg-slate-50" : "border-slate-100 hover:bg-slate-50"
                      }`}
                    >
                      <Nokta renk={SEVIYE_RENK[birimSeviyesi(n.birim, esikler)]} className="mt-1.5" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="truncate text-sm font-medium text-slate-900">{n.talep.talepNo}</span>
                          <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-900">
                            {n.birim !== null ? `${tamSayi(n.birim)} ₺/m²` : "—"}
                          </span>
                        </span>
                        <span className="block truncate text-xs text-slate-500">
                          {[n.mahalle, n.ilce, n.il].filter(Boolean).join(", ") || n.tapu.ad}
                        </span>
                        <span className="block truncate text-xs text-slate-400">
                          {n.deger !== null
                            ? `${tamSayi(n.deger)} ₺${n.yontem ? ` · ${YONTEM_ADLARI[n.yontem]}` : ""}`
                            : "Değer hesaplanmadı"}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Card>

      {konumsuz.length > 0 && (
        <Card>
          <div className="mb-1 flex items-center gap-2">
            <MapPinOff className="h-4 w-4 text-amber-600" />
            <h2 className="text-sm font-semibold text-slate-900">Konumu eksik taşınmazlar ({konumsuz.length})</h2>
          </div>
          <p className="mb-3 text-xs text-slate-500">
            Haritada görünmeleri için Adres / Konum bölümüne enlem-boylam girin ya da KML yükleyin.
          </p>
          <div className="flex flex-wrap gap-2">
            {konumsuz.slice(0, 30).map(({ talep, tapu }) => (
              <Link
                key={tapu.id}
                href={`/taleplerim/${encodeURIComponent(talep.id)}?bolum=adresKonum&tapu=${encodeURIComponent(tapu.id)}`}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                {talep.talepNo} · {tapu.ad}
                <ArrowRight className="h-3 w-3" />
              </Link>
            ))}
            {konumsuz.length > 30 && <span className="px-2 py-1 text-xs text-slate-400">+{konumsuz.length - 30} daha</span>}
          </div>
        </Card>
      )}
    </div>
  );
}
