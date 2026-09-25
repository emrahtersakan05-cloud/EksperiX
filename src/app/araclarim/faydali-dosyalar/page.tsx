"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Eye, FileArchive, FileImage, FileSpreadsheet, FileText, FolderOpen, Loader2, Search, Trash2, Upload } from "lucide-react";
import Card from "@/components/card";
import {
  AZAMI_BOYUT,
  KATEGORILER,
  boyutYaz,
  dosyaEkle,
  dosyaGetir,
  dosyaGuncelle,
  dosyaSil,
  dosyalariListele,
  type DosyaOzeti,
} from "@/lib/dosyalar/depo";
import { normalizeLabel } from "@/lib/text/normalize-tr";

function DosyaSimgesi({ d }: { d: DosyaOzeti }) {
  const uzanti = d.ad.split(".").pop()?.toLowerCase() ?? "";
  const Simge = d.tur.startsWith("image/")
    ? FileImage
    : ["xls", "xlsx", "csv", "ods"].includes(uzanti)
      ? FileSpreadsheet
      : ["zip", "rar", "7z"].includes(uzanti)
        ? FileArchive
        : FileText;
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
      <Simge className="h-5 w-5" />
    </span>
  );
}

// Types the browser can show in a tab without downloading.
function onizlenebilir(d: DosyaOzeti): boolean {
  return d.tur === "application/pdf" || d.tur.startsWith("image/") || d.tur.startsWith("text/");
}

export default function FaydaliDosyalarPage() {
  const [dosyalar, setDosyalar] = useState<DosyaOzeti[] | null>(null);
  const [kategori, setKategori] = useState<string>("Tümü");
  const [yeniKategori, setYeniKategori] = useState<string>(KATEGORILER[0]);
  const [arama, setArama] = useState("");
  const [yukleniyor, setYukleniyor] = useState(false);
  const [surukle, setSurukle] = useState(false);
  const [mesaj, setMesaj] = useState<{ tur: "basari" | "hata"; metin: string } | null>(null);
  const [silinecek, setSilinecek] = useState<DosyaOzeti | null>(null);
  const girdiRef = useRef<HTMLInputElement>(null);

  function yenile() {
    dosyalariListele()
      .then(setDosyalar)
      .catch(() => {
        setDosyalar([]);
        setMesaj({ tur: "hata", metin: "Dosya kütüphanesi açılamadı (tarayıcı depolaması kapalı olabilir)." });
      });
  }

  useEffect(yenile, []);

  async function yukle(liste: FileList | File[]) {
    const secilen = [...liste];
    if (secilen.length === 0) return;
    setYukleniyor(true);
    setMesaj(null);
    const hatalar: string[] = [];
    let adet = 0;
    for (const f of secilen) {
      try {
        await dosyaEkle(f, yeniKategori);
        adet++;
      } catch (err) {
        hatalar.push((err as Error).message || f.name);
      }
    }
    setYukleniyor(false);
    yenile();
    setMesaj(
      hatalar.length
        ? { tur: "hata", metin: `${adet} dosya eklendi. ${hatalar.join(" ")}` }
        : { tur: "basari", metin: `${adet} dosya eklendi.` },
    );
  }

  async function ac(d: DosyaOzeti, indir: boolean) {
    const kayit = await dosyaGetir(d.id);
    if (!kayit) return;
    const url = URL.createObjectURL(kayit.veri);
    if (indir) {
      const a = document.createElement("a");
      a.href = url;
      a.download = kayit.ad;
      a.click();
    } else {
      window.open(url, "_blank", "noopener");
    }
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  async function kategoriDegistir(d: DosyaOzeti, yeni: string) {
    await dosyaGuncelle(d.id, { kategori: yeni });
    yenile();
  }

  async function sil() {
    if (!silinecek) return;
    await dosyaSil(silinecek.id);
    setSilinecek(null);
    yenile();
  }

  const q = normalizeLabel(arama);
  const gorunen = (dosyalar ?? []).filter(
    (d) => (kategori === "Tümü" || d.kategori === kategori) && (!q || normalizeLabel(`${d.ad} ${d.aciklama} ${d.kategori}`).includes(q)),
  );
  const toplamBoyut = (dosyalar ?? []).reduce((t, d) => t + d.boyut, 0);
  const sayac = (k: string) => (dosyalar ?? []).filter((d) => k === "Tümü" || d.kategori === k).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Faydalı Dosyalar</h1>
        <p className="mt-1 text-sm text-slate-500">
          Rapor şablonları, yönetmelikler, birim maliyet listeleri gibi sık kullandığınız dosyalar. Dosyalar bu tarayıcıda
          saklanır; başka bir bilgisayarda görünmez.
        </p>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setSurukle(true);
        }}
        onDragLeave={() => setSurukle(false)}
        onDrop={(e) => {
          e.preventDefault();
          setSurukle(false);
          yukle(e.dataTransfer.files);
        }}
        className={`flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-colors ${
          surukle ? "border-lime-400 bg-lime-50" : "border-slate-200 bg-white/70"
        }`}
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-lime-300">
          {yukleniyor ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
        </span>
        <div>
          <p className="text-sm font-semibold text-slate-800">Dosyaları buraya sürükleyin</p>
          <p className="text-xs text-slate-500">PDF, Word, Excel, görsel… Dosya başına en fazla {boyutYaz(AZAMI_BOYUT)}.</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <select
            value={yeniKategori}
            onChange={(e) => setYeniKategori(e.target.value)}
            aria-label="Yüklenecek dosyaların kategorisi"
            className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
          >
            {KATEGORILER.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => girdiRef.current?.click()}
            disabled={yukleniyor}
            className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-lime-300 disabled:opacity-50"
          >
            <Upload className="h-4 w-4" />
            Dosya Seç
          </button>
        </div>
        <input
          ref={girdiRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) yukle(e.target.files);
            e.target.value = "";
          }}
        />
        {mesaj && (
          <p className={`text-xs font-medium ${mesaj.tur === "basari" ? "text-emerald-700" : "text-rose-600"}`}>{mesaj.metin}</p>
        )}
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {["Tümü", ...KATEGORILER].map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKategori(k)}
              aria-pressed={kategori === k}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                kategori === k ? "bg-slate-900 text-lime-300" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {k} <span className="text-xs opacity-60">{sayac(k)}</span>
            </button>
          ))}
          <div className="relative ml-auto w-full sm:w-60">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={arama}
              onChange={(e) => setArama(e.target.value)}
              placeholder="Dosya ara…"
              className="w-full rounded-full border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </div>
        </div>

        {dosyalar === null ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : gorunen.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <FolderOpen className="h-7 w-7 text-slate-300" />
            <p className="text-sm text-slate-500">{dosyalar.length === 0 ? "Henüz dosya eklenmedi." : "Bu filtreye uyan dosya yok."}</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {gorunen.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-3 py-2.5 sm:flex-nowrap">
                <DosyaSimgesi d={d} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900" title={d.ad}>
                    {d.ad}
                  </p>
                  <p className="text-xs text-slate-500">
                    {boyutYaz(d.boyut)} · {new Date(d.eklenme).toLocaleDateString("tr-TR")}
                  </p>
                </div>
                <select
                  value={d.kategori}
                  onChange={(e) => kategoriDegistir(d, e.target.value)}
                  aria-label={`${d.ad} kategorisi`}
                  className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600"
                >
                  {KATEGORILER.map((k) => (
                    <option key={k}>{k}</option>
                  ))}
                </select>
                <div className="flex items-center gap-1">
                  {onizlenebilir(d) && (
                    <button type="button" onClick={() => ac(d, false)} title="Yeni sekmede aç" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900">
                      <Eye className="h-4 w-4" />
                    </button>
                  )}
                  <button type="button" onClick={() => ac(d, true)} title="İndir" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900">
                    <Download className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => setSilinecek(d)} title="Sil" className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {dosyalar && dosyalar.length > 0 && (
          <p className="mt-3 text-right text-xs text-slate-400">
            {dosyalar.length} dosya · {boyutYaz(toplamBoyut)}
          </p>
        )}
      </Card>

      {silinecek && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4" onClick={() => setSilinecek(null)}>
          <div role="dialog" aria-modal="true" className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-semibold text-slate-900">Dosya silinsin mi?</h2>
            <p className="mt-1 break-all text-sm text-slate-500">{silinecek.ad}</p>
            <p className="mt-2 text-xs text-slate-400">Bu işlem geri alınamaz.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setSilinecek(null)} className="rounded-full px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
                Vazgeç
              </button>
              <button type="button" onClick={sil} className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700">
                Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
