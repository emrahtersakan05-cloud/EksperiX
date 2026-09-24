"use client";

import { useState } from "react";
import { Loader2, MapPin, Search, X } from "lucide-react";
import type { KonumSonucu } from "@/app/api/konum-ara/route";

// Address / place search over the map. Searches only on submit (Enter or the
// button) — Nominatim's usage policy forbids search-as-you-type.
export default function AdresArama({
  onSelect,
  ipucu,
}: {
  onSelect: (sonuc: KonumSonucu) => void;
  // What picking a result will do right now (e.g. "konum olarak seçilir").
  ipucu?: string;
}) {
  const [q, setQ] = useState("");
  const [yukleniyor, setYukleniyor] = useState(false);
  const [sonuclar, setSonuclar] = useState<KonumSonucu[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  async function ara(e: React.FormEvent) {
    e.preventDefault();
    const metin = q.trim();
    if (metin.length < 3) {
      setHata("En az 3 karakter girin.");
      setSonuclar(null);
      return;
    }
    setYukleniyor(true);
    setHata(null);
    try {
      const res = await fetch(`/api/konum-ara?q=${encodeURIComponent(metin)}`);
      const body = await res.json();
      if (!res.ok) {
        setHata(body.error ?? "Arama yapılamadı.");
        setSonuclar(null);
        return;
      }
      setSonuclar(body.sonuclar ?? []);
    } catch {
      setHata("Arama yapılamadı.");
      setSonuclar(null);
    } finally {
      setYukleniyor(false);
    }
  }

  function temizle() {
    setQ("");
    setSonuclar(null);
    setHata(null);
  }

  return (
    <div className="w-full">
      <form onSubmit={ara} className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Adres veya yer ara"
          aria-label="Adres ara"
          className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-16 text-xs text-slate-800 shadow-sm placeholder:text-slate-400 focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
        />
        <div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center">
          {(q || sonuclar || hata) && (
            <button
              type="button"
              onClick={temizle}
              className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Aramayı temizle"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="submit"
            disabled={yukleniyor}
            className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            aria-label="Ara"
          >
            {yukleniyor ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
          </button>
        </div>
      </form>

      {(hata || sonuclar) && (
        <div className="mt-1 max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white text-xs shadow-lg">
          {hata && <p className="px-3 py-2 text-rose-600">{hata}</p>}
          {sonuclar?.length === 0 && <p className="px-3 py-2 text-slate-500">Sonuç bulunamadı.</p>}
          {sonuclar && sonuclar.length > 0 && ipucu && (
            <p className="border-b border-slate-100 px-3 py-1.5 text-[10px] text-slate-400">{ipucu}</p>
          )}
          {sonuclar?.map((s) => (
            <button
              key={`${s.lat},${s.lng},${s.ad}`}
              type="button"
              onClick={() => {
                onSelect(s);
                setSonuclar(null);
              }}
              className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-slate-50"
            >
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span className="line-clamp-2 text-slate-700">{s.ad}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
