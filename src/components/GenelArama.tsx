"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ClipboardList, CornerDownLeft, FileText, Loader2, MapPinned, Search, Zap } from "lucide-react";
import { ara, type AramaSonucu, type SonucTuru } from "@/lib/panel/arama";
import { emsalleriGetir } from "@/lib/panel/veri-kaynagi";
import { listTalepler } from "@/lib/talep/service";
import type { EmsalHaritaKaydi } from "@/lib/emsal-haritasi/types";
import type { Talep } from "@/lib/talep/types";

const GRUP: { key: "islemler" | "sayfalar" | "talepler" | "emsaller"; baslik: string }[] = [
  { key: "islemler", baslik: "Hızlı işlemler" },
  { key: "talepler", baslik: "Talepler" },
  { key: "emsaller", baslik: "Emsaller" },
  { key: "sayfalar", baslik: "Sayfalar" },
];

const IKON: Record<SonucTuru, ReactNode> = {
  islem: <Zap className="h-4 w-4" />,
  sayfa: <FileText className="h-4 w-4" />,
  talep: <ClipboardList className="h-4 w-4" />,
  emsal: <MapPinned className="h-4 w-4" />,
};

// Ctrl/Cmd+K search across talepler, emsaller and pages. The topbar's search
// box is the visible trigger; the dialog itself renders here.
export default function GenelArama({ admin }: { admin: boolean }) {
  const router = useRouter();
  const [acik, setAcik] = useState(false);
  const [sorgu, setSorgu] = useState("");
  const [secili, setSecili] = useState(0);
  const [talepler, setTalepler] = useState<Talep[]>([]);
  const [emsaller, setEmsaller] = useState<EmsalHaritaKaydi[]>([]);
  const [emsalYukleniyor, setEmsalYukleniyor] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listeRef = useRef<HTMLDivElement>(null);

  // Global shortcut.
  useEffect(() => {
    function tus(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setAcik((v) => !v);
      }
    }
    window.addEventListener("keydown", tus);
    return () => window.removeEventListener("keydown", tus);
  }, []);

  // Fresh data on every open (talepler are local and cheap; emsaller cached).
  useEffect(() => {
    if (!acik) return;
    queueMicrotask(() => {
      setSorgu("");
      setSecili(0);
      setEmsalYukleniyor(true);
    });
    listTalepler().then(setTalepler);
    emsalleriGetir()
      .then(setEmsaller)
      .finally(() => setEmsalYukleniyor(false));
    const t = setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [acik]);

  const gruplar = useMemo(() => ara(sorgu, { talepler, emsaller, admin }), [sorgu, talepler, emsaller, admin]);
  const duz: AramaSonucu[] = useMemo(() => GRUP.flatMap((g) => gruplar[g.key]), [gruplar]);
  const aktif = Math.min(secili, Math.max(0, duz.length - 1));

  function git(s: AramaSonucu) {
    setAcik(false);
    router.push(s.href);
  }

  function tusla(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSecili((i) => Math.min(i + 1, duz.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSecili((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && duz[aktif]) {
      e.preventDefault();
      git(duz[aktif]);
    } else if (e.key === "Escape") {
      setAcik(false);
    }
  }

  // Keep the highlighted row visible while arrowing through.
  useEffect(() => {
    listeRef.current?.querySelector(`[data-index="${aktif}"]`)?.scrollIntoView({ block: "nearest" });
  }, [aktif]);

  let sayac = -1;

  return (
    <>
      <button
        type="button"
        onClick={() => setAcik(true)}
        className="hidden w-56 items-center gap-2 rounded-full border border-slate-200/80 bg-white py-2 pl-3.5 pr-2 text-sm text-slate-400 shadow-sm transition-colors hover:border-slate-300 sm:flex"
        aria-label="Ara (Ctrl+K)"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Ara...</span>
        <kbd className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-sans text-[10px] font-medium text-slate-500">
          Ctrl K
        </kbd>
      </button>
      <button
        type="button"
        onClick={() => setAcik(true)}
        className="rounded-full p-2 text-slate-500 hover:bg-white hover:text-slate-900 sm:hidden"
        aria-label="Ara"
      >
        <Search className="h-5 w-5" />
      </button>

      {acik && (
        <div
          className="fixed inset-0 z-[1000] flex items-start justify-center bg-slate-950/40 px-4 pt-[10vh] backdrop-blur-sm"
          onMouseDown={() => setAcik(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Genel arama"
            className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-slate-100 px-4">
              <Search className="h-4 w-4 shrink-0 text-slate-400" />
              <input
                ref={inputRef}
                value={sorgu}
                onChange={(e) => {
                  setSorgu(e.target.value);
                  setSecili(0);
                }}
                onKeyDown={tusla}
                placeholder="Talep no, müşteri, mahalle, ada/parsel, emsal ara…"
                className="h-12 flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
                aria-label="Arama"
              />
              {emsalYukleniyor && <Loader2 className="h-4 w-4 animate-spin text-slate-300" />}
              <kbd className="rounded-md border border-slate-200 px-1.5 py-0.5 text-[10px] text-slate-400">Esc</kbd>
            </div>

            <div ref={listeRef} className="max-h-[60vh] overflow-y-auto p-2">
              {duz.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-slate-400">&quot;{sorgu}&quot; için sonuç yok.</p>
              ) : (
                GRUP.map((g) =>
                  gruplar[g.key].length === 0 ? null : (
                    <div key={g.key} className="mb-1">
                      <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        {sorgu.trim() === "" && g.key === "talepler" ? "Son talepler" : g.baslik}
                      </p>
                      {gruplar[g.key].map((s) => {
                        sayac += 1;
                        const i = sayac;
                        const vurgu = i === aktif;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            data-index={i}
                            onMouseEnter={() => setSecili(i)}
                            onClick={() => git(s)}
                            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left ${
                              vurgu ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            <span
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                                vurgu ? "bg-white/10 text-lime-300" : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {IKON[s.tur]}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium">{s.baslik}</span>
                              <span className={`block truncate text-xs ${vurgu ? "text-slate-400" : "text-slate-400"}`}>{s.alt}</span>
                            </span>
                            {vurgu && <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-slate-400" />}
                          </button>
                        );
                      })}
                    </div>
                  ),
                )
              )}
            </div>

            <div className="flex items-center gap-3 border-t border-slate-100 px-4 py-2 text-[11px] text-slate-400">
              <span>↑↓ gezin</span>
              <span>Enter aç</span>
              <span className="ml-auto">Türkçe karakter gerekmez: &quot;cankaya&quot; → Çankaya</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
