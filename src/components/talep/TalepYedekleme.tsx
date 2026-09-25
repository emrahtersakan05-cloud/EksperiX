"use client";

import { useEffect, useRef, useState } from "react";
import { DatabaseBackup, Download, Loader2, Upload } from "lucide-react";
import { yedekOlustur, yedekOzeti, yedektenYukle, type YedekOzeti } from "@/lib/talep/service";

// Talepler live only in this browser; this is how they move to another
// computer or survive clearing the browser: a JSON backup file.
export default function TalepYedekleme({ onYuklendi }: { onYuklendi: () => void }) {
  const dosyaRef = useRef<HTMLInputElement>(null);
  const [bekleyen, setBekleyen] = useState<{ ad: string; veri: unknown; ozet: YedekOzeti } | null>(null);
  const [mesaj, setMesaj] = useState<{ tur: "basari" | "hata"; metin: string } | null>(null);
  const [calisiyor, setCalisiyor] = useState(false);

  // The note floats over the page, so it clears itself.
  useEffect(() => {
    if (!mesaj) return;
    const t = setTimeout(() => setMesaj(null), 5000);
    return () => clearTimeout(t);
  }, [mesaj]);

  async function yedekAl() {
    setMesaj(null);
    try {
      const yedek = await yedekOlustur();
      const blob = new Blob([JSON.stringify(yedek)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `eksperix-talepler-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMesaj({ tur: "basari", metin: `${yedek.talepler.length} talep yedeklendi.` });
    } catch {
      setMesaj({ tur: "hata", metin: "Yedek oluşturulamadı." });
    }
  }

  async function dosyaSecildi(e: React.ChangeEvent<HTMLInputElement>) {
    const dosya = e.target.files?.[0];
    e.target.value = "";
    if (!dosya) return;
    setMesaj(null);
    try {
      const veri: unknown = JSON.parse(await dosya.text());
      setBekleyen({ ad: dosya.name, veri, ozet: await yedekOzeti(veri) });
    } catch (err) {
      setMesaj({ tur: "hata", metin: err instanceof SyntaxError ? "Dosya okunamadı (geçerli JSON değil)." : (err as Error).message });
    }
  }

  async function onayla() {
    if (!bekleyen) return;
    setCalisiyor(true);
    try {
      const adet = await yedektenYukle(bekleyen.veri);
      setMesaj({ tur: "basari", metin: `${adet} talep yedekten yüklendi.` });
      onYuklendi();
    } catch (err) {
      setMesaj({ tur: "hata", metin: (err as Error).message || "Yedek yüklenemedi." });
    } finally {
      setCalisiyor(false);
      setBekleyen(null);
    }
  }

  const dugme =
    "inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900";

  return (
    <div className="relative">
      <div className="inline-flex divide-x divide-slate-200 overflow-hidden rounded-full border border-slate-200 bg-white shadow-sm">
        <button type="button" onClick={yedekAl} className={dugme} title="Tüm talepleri bir JSON dosyasına indir">
          <Download className="h-4 w-4 text-slate-500" />
          Yedek Al
        </button>
        <button type="button" onClick={() => dosyaRef.current?.click()} className={dugme} title="Daha önce alınmış bir yedeği yükle">
          <Upload className="h-4 w-4 text-slate-500" />
          Yükle
        </button>
      </div>
      <input ref={dosyaRef} type="file" accept="application/json,.json" className="hidden" onChange={dosyaSecildi} />
      {mesaj && (
        <p
          role="status"
          className={`absolute right-0 top-full z-10 mt-2 whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-medium shadow-sm ${
            mesaj.tur === "basari" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
          }`}
        >
          {mesaj.metin}
        </p>
      )}

      {bekleyen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4" onClick={() => setBekleyen(null)}>
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-lime-100 text-lime-800">
                <DatabaseBackup className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-slate-900">Yedek yüklensin mi?</h2>
                <p className="truncate text-xs text-slate-500">{bekleyen.ad}</p>
              </div>
            </div>
            <ul className="mt-4 space-y-1 text-sm text-slate-700">
              <li>
                <strong>{bekleyen.ozet.yeni}</strong> yeni talep eklenecek
              </li>
              <li>
                <strong>{bekleyen.ozet.guncellenecek}</strong> mevcut talep yedekteki haliyle değiştirilecek
              </li>
            </ul>
            <p className="mt-2 text-xs text-slate-500">Yedekte olmayan talepleriniz olduğu gibi kalır.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setBekleyen(null)} className="rounded-full px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
                Vazgeç
              </button>
              <button
                type="button"
                onClick={onayla}
                disabled={calisiyor}
                className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-lime-300 disabled:opacity-50"
              >
                {calisiyor && <Loader2 className="h-4 w-4 animate-spin" />}
                Yükle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
