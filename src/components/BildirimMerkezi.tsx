"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AlarmClock, Bell, BellOff, CalendarClock, CheckCheck, Hourglass, MapPinned } from "lucide-react";
import {
  bildirimleriOlustur,
  okunanlariOku,
  okunanlariYaz,
  type Bildirim,
  type BildirimTuru,
} from "@/lib/panel/bildirimler";
import { emsalleriGetir } from "@/lib/panel/veri-kaynagi";
import { listTalepler } from "@/lib/talep/service";

const TUR: Record<BildirimTuru, { ikon: ReactNode; sinif: string }> = {
  gecikme: { ikon: <AlarmClock className="h-4 w-4" />, sinif: "bg-rose-100 text-rose-600" },
  yaklasan: { ikon: <CalendarClock className="h-4 w-4" />, sinif: "bg-amber-100 text-amber-700" },
  durgun: { ikon: <Hourglass className="h-4 w-4" />, sinif: "bg-slate-100 text-slate-600" },
  emsal: { ikon: <MapPinned className="h-4 w-4" />, sinif: "bg-lime-100 text-lime-800" },
};

// The topbar bell: live alerts computed from the user's talepler and the
// Emsal Haritası, with per-browser read state.
export default function BildirimMerkezi({ kullaniciId }: { kullaniciId?: string }) {
  const pathname = usePathname();
  const [acik, setAcik] = useState(false);
  const [bildirimler, setBildirimler] = useState<Bildirim[]>([]);
  const [okunan, setOkunan] = useState<Set<string>>(new Set());
  const kutuRef = useRef<HTMLDivElement>(null);

  const yenile = useCallback(async () => {
    const [talepler, emsaller] = await Promise.all([listTalepler(), emsalleriGetir()]);
    setBildirimler(bildirimleriOlustur(talepler, new Date(), emsaller, kullaniciId));
    setOkunan(okunanlariOku());
  }, [kullaniciId]);

  // Recompute on navigation (a talep may just have been edited) and on open.
  useEffect(() => {
    queueMicrotask(() => {
      yenile();
    });
  }, [yenile, pathname]);

  useEffect(() => {
    if (!acik) return;
    function disari(e: MouseEvent) {
      if (!kutuRef.current?.contains(e.target as Node)) setAcik(false);
    }
    function esc(e: KeyboardEvent) {
      if (e.key === "Escape") setAcik(false);
    }
    document.addEventListener("mousedown", disari);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", disari);
      document.removeEventListener("keydown", esc);
    };
  }, [acik]);

  const okunmamis = useMemo(() => bildirimler.filter((b) => !okunan.has(b.id)), [bildirimler, okunan]);

  function okunduYap(ids: string[]) {
    const yeni = new Set(okunan);
    ids.forEach((id) => yeni.add(id));
    setOkunan(yeni);
    okunanlariYaz(yeni, bildirimler.map((b) => b.id));
  }

  return (
    <div ref={kutuRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setAcik((v) => !v);
          if (!acik) yenile();
        }}
        className="relative rounded-full p-2 text-slate-500 hover:bg-white hover:text-slate-900"
        aria-label={okunmamis.length > 0 ? `Bildirimler, ${okunmamis.length} okunmamış` : "Bildirimler"}
        aria-expanded={acik}
      >
        <Bell className="h-5 w-5" />
        {okunmamis.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-slate-50">
            {okunmamis.length > 9 ? "9+" : okunmamis.length}
          </span>
        )}
      </button>

      {acik && (
        // Phones: pinned to the viewport (the bell isn't at the screen edge, so a
        // right-aligned dropdown would spill off the left). Wider: under the bell.
        <div className="fixed inset-x-4 top-16 z-[900] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[22rem]">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">
              Bildirimler
              {okunmamis.length > 0 && <span className="ml-1.5 text-xs font-medium text-rose-600">{okunmamis.length} yeni</span>}
            </p>
            {okunmamis.length > 0 && (
              <button
                type="button"
                onClick={() => okunduYap(okunmamis.map((b) => b.id))}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Tümünü okundu say
              </button>
            )}
          </div>
          {bildirimler.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <BellOff className="h-6 w-6 text-slate-300" />
              <p className="text-sm text-slate-500">Şu an bildirim yok.</p>
              <p className="text-xs text-slate-400">Geciken ya da yaklaşan teslimler ve yeni emsaller burada görünür.</p>
            </div>
          ) : (
            <ul className="max-h-[60vh] divide-y divide-slate-100 overflow-y-auto">
              {bildirimler.map((b) => {
                const yeni = !okunan.has(b.id);
                return (
                  <li key={b.id}>
                    <Link
                      href={b.href}
                      onClick={() => {
                        okunduYap([b.id]);
                        setAcik(false);
                      }}
                      className={`flex gap-3 px-4 py-3 hover:bg-slate-50 ${yeni ? "bg-lime-50/40" : ""}`}
                    >
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${TUR[b.tur].sinif}`}>
                        {TUR[b.tur].ikon}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={`block text-sm ${yeni ? "font-semibold text-slate-900" : "text-slate-700"}`}>{b.baslik}</span>
                        <span className="mt-0.5 block truncate text-xs text-slate-500">{b.aciklama}</span>
                      </span>
                      {yeni && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-rose-500" aria-label="Okunmamış" />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
