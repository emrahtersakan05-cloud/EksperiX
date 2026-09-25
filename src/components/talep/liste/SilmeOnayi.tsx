"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { normalizeLabel } from "@/lib/text/normalize-tr";
import { AlertTriangle, Loader2, Trash2, X } from "lucide-react";

// A deliberate delete: the user has to type the confirmation text (the
// talep no) before the red button unlocks. Escape / backdrop cancel.
export default function SilmeOnayi({
  baslik,
  onayMetni,
  ozet,
  uyari,
  onVazgec,
  onSil,
}: {
  baslik: string;
  onayMetni: string;
  ozet: { etiket: string; deger: string }[];
  uyari: string;
  onVazgec: () => void;
  onSil: () => Promise<void>;
}) {
  const [girdi, setGirdi] = useState("");
  const [siliniyor, setSiliniyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const girdiRef = useRef<HTMLInputElement>(null);
  // Case- and Turkish-letter-insensitive, so "test-sil-01" matches "TEST-SIL-01".
  const uygun = normalizeLabel(girdi) !== "" && normalizeLabel(girdi) === normalizeLabel(onayMetni);

  useEffect(() => {
    girdiRef.current?.focus();
    function tus(e: KeyboardEvent) {
      if (e.key === "Escape" && !siliniyor) onVazgec();
    }
    window.addEventListener("keydown", tus);
    return () => window.removeEventListener("keydown", tus);
  }, [onVazgec, siliniyor]);

  async function sil() {
    if (!uygun) return;
    setSiliniyor(true);
    setHata(null);
    try {
      await onSil();
    } catch {
      setHata("Silinemedi. Lütfen tekrar deneyin.");
      setSiliniyor(false);
    }
  }

  // Portalled to <body>: a transformed / blurred ancestor (cards) would
  // otherwise become the containing block of this fixed overlay.
  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center overflow-y-auto bg-slate-950/50 px-4 py-6 backdrop-blur-sm"
      onClick={(e) => {
        // React events still bubble through the portal to clickable rows.
        e.stopPropagation();
        if (!siliniyor) onVazgec();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="silme-baslik"
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative bg-gradient-to-br from-rose-600 to-rose-700 px-6 py-5 text-white">
          <button
            type="button"
            onClick={onVazgec}
            disabled={siliniyor}
            aria-label="Kapat"
            className="absolute right-3 top-3 rounded-full p-1.5 text-rose-100 hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/30">
              <AlertTriangle className="h-6 w-6" />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-100">Kalıcı silme</p>
              <h2 id="silme-baslik" className="text-lg font-semibold">
                {baslik}
              </h2>
            </div>
          </div>
        </div>

        <div className="space-y-4 p-6">
          <dl className="divide-y divide-slate-100 rounded-xl border border-slate-100 bg-slate-50/60 text-sm">
            {ozet.map((o) => (
              <div key={o.etiket} className="flex justify-between gap-4 px-3.5 py-2">
                <dt className="text-slate-500">{o.etiket}</dt>
                <dd className="truncate text-right font-medium text-slate-900">{o.deger || "—"}</dd>
              </div>
            ))}
          </dl>

          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-800">
            <strong>Bu işlem geri alınamaz.</strong> {uyari}
          </p>

          <label className="block text-sm text-slate-700">
            Onaylamak için <strong className="font-mono text-rose-700">{onayMetni}</strong> yazın
            <input
              ref={girdiRef}
              value={girdi}
              onChange={(e) => setGirdi(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sil()}
              autoComplete="off"
              spellCheck={false}
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 font-mono text-sm text-slate-900 focus:border-rose-300 focus:outline-none focus:ring-4 focus:ring-rose-100"
            />
          </label>
          {hata && <p className="text-sm font-medium text-rose-600">{hata}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onVazgec}
              disabled={siliniyor}
              className="rounded-full px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Vazgeç
            </button>
            <button
              type="button"
              onClick={sil}
              disabled={!uygun || siliniyor}
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-rose-300"
            >
              {siliniyor ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Kalıcı Olarak Sil
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
