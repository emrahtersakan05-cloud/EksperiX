"use client";

import { konutMu } from "@/lib/talep/konut";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Building2, Landmark, Layers, RotateCcw, Tag, User } from "lucide-react";
import Card from "@/components/card";
import SectionNav from "@/components/talep/SectionNav";
import TapuSectionContent from "@/components/talep/TapuSectionContent";
import TapuSelector from "@/components/talep/TapuSelector";
import {
  getTalepCompletion,
  getTalepDurum,
  talepDurumBadgeStyles,
  talepDurumDotStyles,
} from "@/lib/talep/completion";
import { sectionMeta } from "@/lib/talep/sections-meta";
import { addTapu, getTalep, removeTapu, renameTapu, updateTapu } from "@/lib/talep/service";
import { createEmptyTapu, type Talep, type Tapu, type TapuSectionKey } from "@/lib/talep/types";

function MetaChip({ icon: Icon, label }: { icon: typeof User; label: string }) {
  return (
    <span
      className="inline-flex max-w-[280px] items-center gap-1.5 truncate rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-600"
      title={label}
    >
      <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
      <span className="truncate">{label}</span>
    </span>
  );
}

export default function TalepDetayPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const talepId = params.id;

  const [talep, setTalep] = useState<Talep | null | undefined>(undefined);
  const [activeTapuId, setActiveTapuId] = useState<string>("");
  const [activeSection, setActiveSection] = useState<TapuSectionKey>("talepDetayi");
  const [sectionResetVersion, setSectionResetVersion] = useState(0);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resettingSection, setResettingSection] = useState(false);
  // Set when a save to browser storage fails, so the loss is never silent.
  const [kayitHatasi, setKayitHatasi] = useState<string | null>(null);
  const sectionsWithoutData: TapuSectionKey[] = [
    "talepDetayi",
    "yakinRaporlarAdaParsel",
    "yakinRaporlarHarita",
    "emlakSitesiIlanlari",
  ];
  const canResetActiveSection = !sectionsWithoutData.includes(activeSection);
  const isSharedSection = activeSection === "kurumIncelemeleri";
  const arastirmaSectionKeys: TapuSectionKey[] = [
    "emsaller",
    "yakinRaporlarAdaParsel",
    "yakinRaporlarHarita",
    "emlakSitesiIlanlari",
  ];
  const isResearchSection = arastirmaSectionKeys.includes(activeSection);

  useEffect(() => {
    getTalep(talepId).then((t) => {
      setTalep(t ?? null);
      if (!t) return;
      // Deep links from the Ana Sayfa ("kaldığın yerden devam et"):
      // ?bolum=<section key>&tapu=<tapu id> open that section directly.
      const params = new URLSearchParams(window.location.search);
      const tapu = t.tapular.find((tp) => tp.id === params.get("tapu")) ?? t.tapular[0];
      setActiveTapuId(tapu?.id ?? "");
      const bolum = params.get("bolum");
      if (bolum && sectionMeta.some((s) => s.key === bolum)) setActiveSection(bolum as TapuSectionKey);
    });
  }, [talepId]);

  if (talep === undefined) {
    return <p className="py-10 text-center text-sm text-slate-400">Yükleniyor...</p>;
  }

  if (talep === null) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-600">Talep bulunamadı.</p>
        <Link href="/taleplerim" className="text-sm font-medium text-slate-900 underline">
          Taleplerim&apos;e dön
        </Link>
      </div>
    );
  }

  const activeTapu = talep.tapular.find((t) => t.id === activeTapuId) ?? talep.tapular[0];
  const sectionTapu = isSharedSection ? talep.tapular[0] : activeTapu;
  // Runs a save; on failure keeps the message on screen instead of losing the edit silently.
  async function kaydetVeyaBildir<T>(is: () => Promise<T>): Promise<T | undefined> {
    try {
      const sonuc = await is();
      setKayitHatasi(null);
      return sonuc;
    } catch (err) {
      const kota = err instanceof DOMException && err.name === "QuotaExceededError";
      setKayitHatasi(
        kota
          ? "Tarayıcı depolama alanı doldu; son değişiklik kaydedilemedi. Taleplerim sayfasından yedek alıp eski talepleri silin."
          : `Son değişiklik kaydedilemedi (${err instanceof Error ? err.message : "bilinmeyen hata"}).`,
      );
      return undefined;
    }
  }

  async function handleUpdateTapu(updater: (tapu: Tapu) => Tapu) {
    if (!sectionTapu) return;
    const updated = await kaydetVeyaBildir(() => updateTapu(talep!.id, sectionTapu.id, updater));
    if (updated) setTalep(updated);
  }

  async function handleAddTapu() {
    const updated = await kaydetVeyaBildir(() => addTapu(talep!.id));
    if (updated) {
      setTalep(updated);
      setActiveTapuId(updated.tapular[updated.tapular.length - 1].id);
    }
  }

  async function handleRemoveTapu(id: string) {
    const updated = await kaydetVeyaBildir(() => removeTapu(talep!.id, id));
    if (updated) {
      setTalep(updated);
      if (activeTapuId === id) setActiveTapuId(updated.tapular[0]?.id ?? "");
    }
  }

  async function handleRenameTapu(id: string, ad: string) {
    const updated = await kaydetVeyaBildir(() => renameTapu(talep!.id, id, ad));
    if (updated) setTalep(updated);
  }

  function handleResetSectionClick() {
    if (!canResetActiveSection) return;
    setResetModalOpen(true);
  }

  async function handleResetSectionConfirm() {
    if (!sectionTapu || !canResetActiveSection) return;
    setResettingSection(true);

    const emptyTapu = createEmptyTapu(0);
    const updated = await kaydetVeyaBildir(() => updateTapu(talep!.id, sectionTapu.id, (t) => {
      switch (activeSection) {
        case "adresKonum":
          return { ...t, adresKonum: emptyTapu.adresKonum };
        case "tapuKaydi":
          return { ...t, tapuKaydi: emptyTapu.tapuKaydi };
        case "kurumIncelemeleri":
          return { ...t, kurumIncelemeleri: emptyTapu.kurumIncelemeleri };
        case "projeIncelemeleri":
          return { ...t, projeIncelemeleri: emptyTapu.projeIncelemeleri };
        case "imarDurumu":
          return { ...t, imarDurumu: emptyTapu.imarDurumu };
        case "anaGayrimenkul":
          return t.talepDetayi.tasinmazNiteligi === "TARLA, BAĞ, BAHÇE VB."
            ? { ...t, araziOzellikleri: emptyTapu.araziOzellikleri, anaGayrimenkul: emptyTapu.anaGayrimenkul }
            : konutMu(t.talepDetayi.tasinmazNiteligi)
              ? { ...t, konutOzellikleri: emptyTapu.konutOzellikleri }
              : { ...t, anaGayrimenkul: emptyTapu.anaGayrimenkul };
        case "bagimsizBolum":
          return { ...t, bagimsizBolum: emptyTapu.bagimsizBolum };
        case "satisKabiliyeti":
          return { ...t, degerleme: { ...t.degerleme, satisKabiliyetiNotlari: [] } };
        case "degerlemeAciklamasi":
          return { ...t, degerleme: { ...t.degerleme, degerlemeAciklamaNotlari: [] } };
        case "degerHesaplamasi":
          return {
            ...t,
            degerleme: {
              ...emptyTapu.degerleme,
              satisKabiliyetiNotlari: t.degerleme.satisKabiliyetiNotlari,
              degerlemeAciklamaNotlari: t.degerleme.degerlemeAciklamaNotlari,
            },
          };
        case "emsaller":
          return { ...t, emsaller: emptyTapu.emsaller };
        case "raporSonucu":
          return { ...t, raporSonucu: emptyTapu.raporSonucu };
        default:
          return t;
      }
    }));
    if (updated) {
      setTalep(updated);
      setSectionResetVersion((v) => v + 1);
    }
    setResettingSection(false);
    setResetModalOpen(false);
  }

  const activeSectionLabel = sectionMeta.find((s) => s.key === activeSection)?.label ?? "";
  const completion = getTalepCompletion(talep);
  const durum = getTalepDurum(completion.pct);

  return (
    <div className="space-y-6">
      <div>
        <button
          type="button"
          onClick={() => router.push("/taleplerim")}
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Taleplerim
        </button>

        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-slate-900">{talep.talepNo}</h1>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${talepDurumBadgeStyles[durum]}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${talepDurumDotStyles[durum]}`} />
            {durum} &middot; %{completion.pct}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {talep.musteriUnvani && <MetaChip icon={User} label={talep.musteriUnvani} />}
          {talep.degerlemeFirmasi && <MetaChip icon={Building2} label={talep.degerlemeFirmasi} />}
          <MetaChip icon={Layers} label={`${talep.tapular.length} tapu`} />
          {talep.tasinmazNiteligi && <MetaChip icon={Tag} label={talep.tasinmazNiteligi} />}
          {talep.degerlemeKurumBanka && <MetaChip icon={Landmark} label={talep.degerlemeKurumBanka} />}
        </div>
      </div>

      {kayitHatasi && (
        <div
          role="alert"
          className="sticky top-16 z-10 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 shadow-sm"
        >
          <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-rose-500" />
          <span className="flex-1">{kayitHatasi}</span>
          <button type="button" onClick={() => setKayitHatasi(null)} className="text-xs font-medium underline">
            Kapat
          </button>
        </div>
      )}

      <div className="space-y-3">
        <SectionNav active={activeSection} onSelect={setActiveSection} className="w-full lg:w-full" />

        {!isSharedSection && !isResearchSection && (
          <TapuSelector
            tapular={talep.tapular}
            activeTapuId={activeTapu?.id ?? ""}
            onSelect={setActiveTapuId}
            onAdd={handleAddTapu}
            onRemove={handleRemoveTapu}
            onRename={handleRenameTapu}
          />
        )}
      </div>

      {sectionTapu && (
        <Card
          title={isSharedSection ? activeSectionLabel : `${sectionTapu.ad} — ${activeSectionLabel}`}
          action={canResetActiveSection ? (
            <button
              type="button"
              onClick={handleResetSectionClick}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Formu Temizle
            </button>
          ) : null}
          className="flex-1"
        >
          <TapuSectionContent
            key={`${sectionTapu.id}-${activeSection}-${sectionResetVersion}`}
            talep={talep}
            tapu={sectionTapu}
            sectionKey={activeSection}
            onUpdate={handleUpdateTapu}
          />
        </Card>
      )}

      {resetModalOpen && canResetActiveSection && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-8"
          onClick={() => !resettingSection && setResetModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-500">Onay Gerekli</p>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">{activeSectionLabel} içeriği temizlensin mi?</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Bu işlem yalnızca açık olan formu temizler. Kaydedilmiş alanlar, yüklenen belge bağlantıları ve ilgili tablo
                satırları kaldırılır.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              {isSharedSection ? (
                <>
                  <span className="font-medium text-slate-800">{activeSectionLabel}</span> bölümü varsayılan boş haline
                  dönecek.
                </>
              ) : (
                <>
                  {sectionTapu?.ad} içindeki <span className="font-medium text-slate-800">{activeSectionLabel}</span> bölümü
                  varsayılan boş haline dönecek.
                </>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setResetModalOpen(false)}
                disabled={resettingSection}
                className="rounded-full px-4 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleResetSectionConfirm}
                disabled={resettingSection}
                className="rounded-full bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {resettingSection ? "Temizleniyor..." : "Formu Temizle"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
