"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { AlarmClock, ClipboardList, Clock3, ListChecks, Map, MapPinPlus } from "lucide-react";
import StatCard from "@/components/stat-card";
import RecentTaleplerCard from "@/components/talep/RecentTaleplerCard";
import YeniTalepButton from "@/components/talep/YeniTalepButton";
import DevamEtKarti from "@/components/panel/DevamEtKarti";
import TeslimlerKarti from "@/components/panel/TeslimlerKarti";
import RaporDurumKarti from "@/components/panel/RaporDurumKarti";
import PanelGrafikleri from "@/components/panel/PanelGrafikleri";
import TeslimTakvimi from "@/components/panel/TeslimTakvimi";
import {
  degisimYuzdesi,
  devamEdilecekler,
  istatistikler,
  raporDurumSayilari,
  talepSatirlari,
  yaklasanTeslimler,
} from "@/lib/panel/ozet";
import { listTalepler } from "@/lib/talep/service";
import type { Talep } from "@/lib/talep/types";

function selam(saat: number): string {
  if (saat < 6) return "İyi geceler";
  if (saat < 12) return "Günaydın";
  if (saat < 18) return "İyi günler";
  return "İyi akşamlar";
}

// The Ana Sayfa's live part. Talepler live in the browser (localStorage), so
// everything talep-based is computed here; the Emsal Haritası card comes in
// ready-made from the server.
export default function PanelIcerik({ ad, emsalKarti }: { ad: string; emsalKarti: ReactNode }) {
  const [talepler, setTalepler] = useState<Talep[] | null>(null);
  // Set after mount: the greeting and "days left" must use the viewer's clock,
  // and rendering them on the server would mismatch on hydration.
  const [simdi, setSimdi] = useState<Date | null>(null);

  const yukle = useCallback(() => {
    listTalepler().then(setTalepler);
  }, []);

  useEffect(() => {
    queueMicrotask(() => setSimdi(new Date()));
    yukle();
  }, [yukle]);

  const hazir = talepler !== null && simdi !== null;
  const satirlar = useMemo(() => (hazir ? talepSatirlari(talepler, simdi) : []), [hazir, talepler, simdi]);
  const ist = useMemo(() => (simdi ? istatistikler(satirlar, simdi) : null), [satirlar, simdi]);
  const teslimler = useMemo(() => yaklasanTeslimler(satirlar), [satirlar]);
  const devam = useMemo(() => devamEdilecekler(satirlar), [satirlar]);
  const raporlar = useMemo(() => raporDurumSayilari(talepler ?? []), [talepler]);
  const tarihsizAcik = satirlar.filter((s) => s.durum !== "Tamamlandı" && s.hedef === null).length;

  const ozetCumlesi = !ist
    ? "Talepleriniz yükleniyor…"
    : ist.toplam === 0
      ? "Henüz talep yok. İlk değerleme talebinizi oluşturarak başlayın."
      : [
          `${ist.devamEden + ist.baslanmadi} açık talep`,
          ist.geciken > 0 ? `${ist.geciken} teslim gecikmiş` : null,
          ist.buHafta > 0 ? `${ist.buHafta} teslim bu hafta` : null,
          ist.buAy > 0 ? `bu ay ${ist.buAy} yeni talep` : null,
        ]
          .filter(Boolean)
          .join(" · ") + ".";

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-slate-900 px-6 py-8 sm:px-8">
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-lime-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-lime-400/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-medium text-lime-300/80">
              {simdi ? simdi.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : " "}
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">
              {simdi ? selam(simdi.getHours()) : "Hoş geldiniz"}
              {ad ? `, ${ad}` : ""}
            </h1>
            <p className="mt-1.5 max-w-xl text-sm text-slate-400">{ozetCumlesi}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <YeniTalepButton />
            <Link
              href="/deger-haritasi/emsal-haritasi/yeni"
              className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-white/15 transition-colors hover:bg-white/15"
            >
              <MapPinPlus className="h-4 w-4" />
              Yeni Emsal
            </Link>
            <Link
              href="/deger-haritasi/emsal-haritasi"
              className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-white/15 transition-colors hover:bg-white/15"
            >
              <Map className="h-4 w-4" />
              Emsal Haritası
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Toplam Talep"
          value={ist ? String(ist.toplam) : "—"}
          deltaPct={ist ? degisimYuzdesi(ist.buAy, ist.gecenAy) : null}
          hint={ist ? `Bu ay ${ist.buAy}, geçen ay ${ist.gecenAy} yeni talep` : undefined}
          href="/taleplerim"
          icon={ClipboardList}
          accent="blue"
        />
        <StatCard
          label="Devam Eden"
          value={ist ? String(ist.devamEden) : "—"}
          hint={ist && ist.baslanmadi > 0 ? `${ist.baslanmadi} talep henüz başlanmadı` : "Bölümleri kısmen doldurulmuş"}
          icon={Clock3}
          accent="amber"
        />
        <StatCard
          label="Tamamlanan"
          value={ist ? String(ist.tamamlanan) : "—"}
          hint={ist && ist.toplam > 0 ? `Toplamın %${Math.round((ist.tamamlanan / ist.toplam) * 100)}` : "Tüm bölümleri dolu talepler"}
          icon={ListChecks}
          accent="emerald"
        />
        <StatCard
          label={ist && ist.geciken > 0 ? "Geciken Teslim" : "Bu Hafta Teslim"}
          value={ist ? String(ist.geciken > 0 ? ist.geciken : ist.buHafta) : "—"}
          hint={
            ist
              ? ist.geciken > 0
                ? `Ayrıca ${ist.buHafta} teslim bu hafta`
                : "Hedef teslim tarihi 7 gün içinde"
              : undefined
          }
          icon={AlarmClock}
          accent={ist && ist.geciken > 0 ? "rose" : "violet"}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DevamEtKarti ogeler={devam} />
        </div>
        <TeslimlerKarti satirlar={teslimler} tarihsizAcik={tarihsizAcik} />
      </div>

      {simdi && <PanelGrafikleri satirlar={satirlar} simdi={simdi} />}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="min-w-0 xl:col-span-2">
          {simdi && <TeslimTakvimi satirlar={satirlar} simdi={simdi} />}
        </div>
        <RaporDurumKarti sayilar={raporlar} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="min-w-0 xl:col-span-2">
          <RecentTaleplerCard limit={10} onDegisti={yukle} />
        </div>
        {emsalKarti}
      </div>
    </div>
  );
}
