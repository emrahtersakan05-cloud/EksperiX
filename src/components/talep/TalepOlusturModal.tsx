"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ClipboardList, X } from "lucide-react";
import { ComboboxField, Field, inputClass } from "@/components/talep/form-fields";
import { degerlemeFirmasiOptions, degerlemeKurumBankaGroups, tasinmazNiteligiOptions } from "@/lib/talep/reference-lists";
import { createTalep } from "@/lib/talep/service";

export default function TalepOlusturModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [musteriUnvani, setMusteriUnvani] = useState("");
  const [degerlemeFirmasi, setDegerlemeFirmasi] = useState("");
  const [degerlemeKurumBanka, setDegerlemeKurumBanka] = useState("");
  const [tasinmazNiteligi, setTasinmazNiteligi] = useState("");
  const [tapuSayisi, setTapuSayisi] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit =
    musteriUnvani.trim().length > 0 &&
    degerlemeFirmasi.length > 0 &&
    tasinmazNiteligi.length > 0 &&
    tapuSayisi >= 1;

  async function handleSubmit() {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    const talep = await createTalep({
      musteriUnvani: musteriUnvani.trim(),
      degerlemeFirmasi,
      degerlemeKurumBanka,
      tasinmazNiteligi,
      tapuSayisi,
    });
    router.push(`/taleplerim/${talep.id}`);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-8 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative overflow-hidden bg-slate-900 px-6 py-6 sm:px-8">
          <div className="pointer-events-none absolute -top-16 -right-10 h-40 w-40 rounded-full bg-lime-400/20 blur-3xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-lime-300 shadow-[0_0_24px_-4px] shadow-lime-400/70">
                <ClipboardList className="h-5 w-5 text-slate-900" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Yeni Talep Oluştur</h2>
                <p className="text-xs text-slate-400">Talep bilgilerini eksiksiz girin</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
              aria-label="Kapat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="max-h-[65vh] overflow-y-auto px-6 py-6 sm:px-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Müşteri Unvanı *" className="sm:col-span-2">
              <input
                autoFocus
                value={musteriUnvani}
                onChange={(e) => setMusteriUnvani(e.target.value)}
                placeholder="Ad Soyad / Firma Unvanı"
                className={inputClass}
              />
            </Field>

            <ComboboxField
              label="Değerleme Firması *"
              value={degerlemeFirmasi}
              options={degerlemeFirmasiOptions}
              onChange={setDegerlemeFirmasi}
            />

            <ComboboxField
              label="Değerleme Kurum / Banka"
              value={degerlemeKurumBanka}
              groups={degerlemeKurumBankaGroups}
              onChange={setDegerlemeKurumBanka}
            />

            <ComboboxField
              label="Taşınmaz Niteliği *"
              value={tasinmazNiteligi}
              options={tasinmazNiteligiOptions}
              onChange={setTasinmazNiteligi}
            />

            <Field label="Kaç tapu için değerleme yapılacak? *">
              <input
                type="number"
                min={1}
                value={tapuSayisi}
                onChange={(e) => setTapuSayisi(Math.max(1, Number(e.target.value) || 1))}
                className={inputClass}
              />
            </Field>
          </div>

          <p className="mt-4 rounded-xl bg-lime-50 px-3.5 py-2.5 text-xs leading-relaxed text-lime-800">
            Talebi oluşturduktan sonra tapu sayısını istediğiniz zaman artırıp azaltabilirsiniz.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4 sm:px-8">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-100"
          >
            Vazgeç
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="flex items-center gap-2 rounded-xl bg-lime-300 px-5 py-2.5 text-sm font-semibold text-slate-900 shadow-[0_0_24px_-4px] shadow-lime-400/60 transition hover:bg-lime-200 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
          >
            {submitting ? "Oluşturuluyor..." : "Talebi Oluştur"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
