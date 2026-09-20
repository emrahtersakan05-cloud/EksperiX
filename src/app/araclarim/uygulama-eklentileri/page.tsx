"use client";

import { useMemo, useState } from "react";
import { AppWindow, CheckCircle2, Copy, ExternalLink, Puzzle, ShieldCheck, X } from "lucide-react";

const EXTENSION_PATH = String.raw`c:\Users\Lenovo\Documents\Web Dizayn\extension\uavt-bridge`;

function StepCard({ index, title, description }: { index: string; title: string; description: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-lime-300">
          {index}
        </span>
        <div>
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
        </div>
      </div>
    </div>
  );
}

function InstallModal({
  onClose,
  onCopyPath,
  copied,
}: {
  onClose: () => void;
  onCopyPath: () => void;
  copied: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-8" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-2xl border border-slate-100 bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-500">Chrome Kurulumu</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">Eksperix UAVT Bridge eklentisini ekle</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Chrome politikaları nedeniyle mağaza dışı eklentiler doğrudan tek tıkla kurulamaz. Aşağıdaki adımlarla
              hızlıca ekleyebilirsiniz.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="Kapat"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 grid gap-3">
          <StepCard index="1" title="Chrome Extensions sayfasını aç" description="Chrome adres çubuğuna `chrome://extensions` yazın." />
          <StepCard index="2" title="Geliştirici modunu aç" description="Sayfanın sağ üst bölümündeki `Geliştirici modu` anahtarını aktif edin." />
          <StepCard
            index="3"
            title="Paketlenmemiş öğe yükle"
            description="`Paketlenmemiş öğe yükle` butonuna tıklayıp aşağıdaki klasörü seçin."
          />
        </div>

        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Eklenti Klasörü</p>
          <div className="mt-2 rounded-lg bg-white px-3 py-3 font-mono text-xs text-slate-700">{EXTENSION_PATH}</div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onCopyPath}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              <Copy className="h-4 w-4" />
              {copied ? "Kopyalandı" : "Klasör Yolunu Kopyala"}
            </button>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-lime-300"
          >
            Tamam
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UygulamaEklentileriPage() {
  const [installOpen, setInstallOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const features = useMemo(
    () => [
      "UAVT sonucunu okuyup Adres / Konum formuna otomatik aktarır",
      "Aktif veya son kullanılan UAVT sekmesini bularak veri çeker",
      "Mevcut yapıştırma yedeği akışı ile birlikte çalışır",
    ],
    [],
  );

  async function handleCopyPath() {
    await navigator.clipboard.writeText(EXTENSION_PATH);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Uygulama Eklentileri</h1>
        <p className="mt-1 text-sm text-slate-500">Eksperix ile birlikte calisan yardimci tarayici eklentilerini yonetin.</p>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-lime-50/40 p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-lime-200 bg-lime-50 px-3 py-1 text-xs font-semibold text-lime-700">
              <ShieldCheck className="h-3.5 w-3.5" />
              Hazir Kurulum
            </div>
            <div className="mt-4 flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-lime-300 shadow-[0_0_32px_-8px] shadow-lime-400/30">
                <Puzzle className="h-7 w-7" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Eksperix UAVT Bridge</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  UAVT sonuc sayfasindaki verileri okuyup `Adres / Konum` formuna otomatik aktarir.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-2">
              {features.map((feature) => (
                <div key={feature} className="inline-flex items-center gap-2 text-sm text-slate-600">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  {feature}
                </div>
              ))}
            </div>
          </div>

          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Kurulum</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Chrome icin hizli kurulum akisini baslatin. Eklenti magazadan degil, yerel klasorden yuklenir.
            </p>
            <div className="mt-4 space-y-2">
              <button
                type="button"
                onClick={() => setInstallOpen(true)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-lime-300"
              >
                <AppWindow className="h-4 w-4" />
                Google Chrome&apos;a Ekle
              </button>
              <button
                type="button"
                onClick={handleCopyPath}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <Copy className="h-4 w-4" />
                {copied ? "Klasör Yolu Kopyalandı" : "Eklenti Klasör Yolunu Kopyala"}
              </button>
              <a
                href="https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world"
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                <ExternalLink className="h-4 w-4" />
                Chrome Kurulum Rehberi
              </a>
            </div>
          </div>
        </div>
      </div>

      {installOpen && <InstallModal onClose={() => setInstallOpen(false)} onCopyPath={handleCopyPath} copied={copied} />}
    </div>
  );
}
