"use client";

import { useMemo } from "react";
import { AkiciMetinDeposuSaglayici, type AkiciMetinDeposu } from "@/components/akici-metin/baglam";

import AdresKonumSection from "@/components/talep/sections/AdresKonumSection";
import AnaGayrimenkulSection from "@/components/talep/sections/AnaGayrimenkulSection";
import AraziOzellikleriSection from "@/components/talep/sections/AraziOzellikleriSection";
import BagimsizBolumSection from "@/components/talep/sections/BagimsizBolumSection";
import KonutOzellikleriSection from "@/components/talep/sections/KonutOzellikleriSection";
import { konutMu } from "@/lib/talep/konut";
import DegerlemeSection from "@/components/talep/sections/DegerlemeSection";
import EmlakSitesiIlanlariSection from "@/components/talep/sections/EmlakSitesiIlanlariSection";
import EmsallerSection from "@/components/talep/sections/EmsallerSection";
import ImarDurumuSection from "@/components/talep/sections/ImarDurumuSection";
import KurumIncelemeleriSection from "@/components/talep/sections/KurumIncelemeleriSection";
import ProjeIncelemeleriSection from "@/components/talep/sections/ProjeIncelemeleriSection";
import RaporSonucuSection from "@/components/talep/sections/RaporSonucuSection";
import TalepDetayiSection from "@/components/talep/sections/TalepDetayiSection";
import TapuKaydiSection from "@/components/talep/sections/TapuKaydiSection";
import YakinRaporlarAdaParselSection from "@/components/talep/sections/YakinRaporlarAdaParselSection";
import YakinRaporlarHaritaSection from "@/components/talep/sections/YakinRaporlarHaritaSection";
import type { Talep, Tapu, TapuSectionKey } from "@/lib/talep/types";

interface SectionProps {
  talep: Talep;
  tapu: Tapu;
  sectionKey: TapuSectionKey;
  onUpdate: (updater: (tapu: Tapu) => Tapu) => void;
}

// Form cards save their Akıcı Metin into this tapu.
export default function TapuSectionContent(props: SectionProps) {
  const { tapu, onUpdate } = props;
  const metinler = tapu.akiciMetinler;
  const depo = useMemo<AkiciMetinDeposu>(
    () => ({
      getir: (baslik) => metinler?.[baslik] ?? "",
      kaydet: (baslik, metin) =>
        onUpdate((t) => {
          const yeni = { ...(t.akiciMetinler ?? {}) };
          if (metin.trim()) yeni[baslik] = metin;
          else delete yeni[baslik];
          return { ...t, akiciMetinler: yeni };
        }),
    }),
    [metinler, onUpdate],
  );
  return (
    <AkiciMetinDeposuSaglayici depo={depo}>
      <TapuSectionIcerik {...props} />
    </AkiciMetinDeposuSaglayici>
  );
}

function TapuSectionIcerik({ talep, tapu, sectionKey, onUpdate }: SectionProps) {
  // Each onChange merges its patch against the CURRENT tapu the update
  // ultimately runs against (passed in by onUpdate's functional updater),
  // not the `tapu` prop closure captured at render time — otherwise two
  // section edits fired before a re-render (e.g. two quick "add row"
  // clicks) each rebuild their section from the same stale snapshot and the
  // second write silently discards the first.
  switch (sectionKey) {
    case "talepDetayi":
      return (
        <TalepDetayiSection
          data={tapu.talepDetayi}
          onChange={(patch) => onUpdate((t) => ({ ...t, talepDetayi: { ...t.talepDetayi, ...patch } }))}
        />
      );
    case "adresKonum":
      return (
        <AdresKonumSection
          data={tapu.adresKonum}
          onChange={(patch) => onUpdate((t) => ({ ...t, adresKonum: { ...t.adresKonum, ...patch } }))}
          tapuKaydi={tapu.tapuKaydi}
          onTapuKaydiChange={(patch) => onUpdate((t) => ({ ...t, tapuKaydi: { ...t.tapuKaydi, ...patch } }))}
        />
      );
    case "tapuKaydi":
      return (
        <TapuKaydiSection
          data={tapu.tapuKaydi}
          onChange={(patch) => onUpdate((t) => ({ ...t, tapuKaydi: { ...t.tapuKaydi, ...patch } }))}
        />
      );
    case "kurumIncelemeleri":
      return <KurumIncelemeleriSection />;
    case "projeIncelemeleri":
      return (
        <ProjeIncelemeleriSection
          data={tapu.projeIncelemeleri}
          tapuKaydi={tapu.tapuKaydi}
          onChange={(patch) => onUpdate((t) => ({ ...t, projeIncelemeleri: { ...t.projeIncelemeleri, ...patch } }))}
        />
      );
    case "imarDurumu":
      return (
        <ImarDurumuSection
          data={tapu.imarDurumu}
          tapuKaydi={tapu.tapuKaydi}
          onChange={(patch) => onUpdate((t) => ({ ...t, imarDurumu: { ...t.imarDurumu, ...patch } }))}
        />
      );
    case "anaGayrimenkul":
      if (tapu.talepDetayi.tasinmazNiteligi === "TARLA, BAĞ, BAHÇE VB.") {
        return (
          <AraziOzellikleriSection
            data={tapu.araziOzellikleri}
            tapuKaydi={tapu.tapuKaydi}
            onChange={(patch) => onUpdate((t) => ({ ...t, araziOzellikleri: { ...t.araziOzellikleri, ...patch } }))}
            binaFormu={
              <AnaGayrimenkulSection
                baslik="Üzerindeki Yapı Bilgileri"
                data={tapu.anaGayrimenkul}
                onChange={(patch) => onUpdate((t) => ({ ...t, anaGayrimenkul: { ...t.anaGayrimenkul, ...patch } }))}
              />
            }
          />
        );
      }
      if (konutMu(tapu.talepDetayi.tasinmazNiteligi)) {
        return (
          <KonutOzellikleriSection
            data={tapu.konutOzellikleri}
            tapuKaydi={tapu.tapuKaydi}
            onChange={(patch) => onUpdate((t) => ({ ...t, konutOzellikleri: { ...t.konutOzellikleri, ...patch } }))}
          />
        );
      }
      return (
        <AnaGayrimenkulSection
          data={tapu.anaGayrimenkul}
          onChange={(patch) => onUpdate((t) => ({ ...t, anaGayrimenkul: { ...t.anaGayrimenkul, ...patch } }))}
        />
      );
    case "bagimsizBolum":
      return (
        <BagimsizBolumSection
          data={tapu.bagimsizBolum}
          onChange={(patch) => onUpdate((t) => ({ ...t, bagimsizBolum: { ...t.bagimsizBolum, ...patch } }))}
        />
      );
    case "satisKabiliyeti":
    case "degerlemeAciklamasi":
    case "degerHesaplamasi":
      return (
        <DegerlemeSection
          view={sectionKey}
          data={tapu.degerleme}
          emsaller={tapu.emsaller}
          mulkiyetKayitlari={tapu.tapuKaydi.mulkiyetKayitlari}
          onChange={(patch) => onUpdate((t) => ({ ...t, degerleme: { ...t.degerleme, ...patch } }))}
        />
      );
    case "emsaller":
      return (
        <EmsallerSection
          data={tapu.emsaller}
          konuKonumlari={tapu.adresKonum.kmlKonumlari}
          onChange={(patch) => onUpdate((t) => ({ ...t, emsaller: { ...t.emsaller, ...patch } }))}
        />
      );
    case "yakinRaporlarAdaParsel":
      return <YakinRaporlarAdaParselSection />;
    case "yakinRaporlarHarita":
      return <YakinRaporlarHaritaSection />;
    case "emlakSitesiIlanlari":
      return <EmlakSitesiIlanlariSection />;
    case "raporSonucu":
      return (
        <RaporSonucuSection
          data={tapu.raporSonucu}
          talep={talep}
          tapu={tapu}
          onChange={(patch) => onUpdate((t) => ({ ...t, raporSonucu: { ...t.raporSonucu, ...patch } }))}
        />
      );
    default:
      return null;
  }
}
