"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Link2, Plus, Search, Star, Trash2 } from "lucide-react";
import Card from "@/components/card";
import { normalizeLabel } from "@/lib/text/normalize-tr";

interface Baglanti {
  ad: string;
  url: string;
  aciklama: string;
  grup: string;
}

// Kurum ve kaynaklar that come up in almost every SPK appraisal.
const HAZIR: Baglanti[] = [
  { grup: "Tapu ve Kadastro", ad: "TKGM Parsel Sorgu", url: "https://parselsorgu.tkgm.gov.tr/", aciklama: "Ada / parsel sorgusu, parsel sınırları ve KML indirme" },
  { grup: "Tapu ve Kadastro", ad: "Web Tapu", url: "https://webtapu.tkgm.gov.tr/", aciklama: "Tapu kaydı, takyidat ve başvuru işlemleri" },
  { grup: "Tapu ve Kadastro", ad: "MEGSİS", url: "https://megsis.tkgm.gov.tr/", aciklama: "Mekânsal gayrimenkul sistemi, kadastro paftaları" },
  { grup: "Adres ve Konum", ad: "UAVT Adres Sorgu", url: "https://adres.nvi.gov.tr/VatandasIslemleri/AdresSorgu", aciklama: "Ulusal adres veri tabanı, bağımsız bölüm numarası" },
  { grup: "Adres ve Konum", ad: "Google Earth", url: "https://earth.google.com/web/", aciklama: "Uydu görüntüsü, geçmiş görüntüler, mesafe ölçümü" },
  { grup: "Adres ve Konum", ad: "AFAD Deprem Tehlike Haritası", url: "https://tdth.afad.gov.tr/", aciklama: "Türkiye deprem tehlike haritası ve parametreler" },
  { grup: "Mevzuat", ad: "SPK", url: "https://spk.gov.tr/", aciklama: "Sermaye Piyasası Kurulu, değerleme düzenlemeleri" },
  { grup: "Mevzuat", ad: "Mevzuat Bilgi Sistemi", url: "https://www.mevzuat.gov.tr/", aciklama: "Kanun, yönetmelik ve tebliğler" },
  { grup: "Mevzuat", ad: "Resmî Gazete", url: "https://www.resmigazete.gov.tr/", aciklama: "Günlük yayımlanan düzenlemeler" },
  { grup: "Mevzuat", ad: "TDUB", url: "https://www.tdub.org.tr/", aciklama: "Türkiye Değerleme Uzmanları Birliği" },
  { grup: "Mevzuat", ad: "BDDK", url: "https://www.bddk.org.tr/", aciklama: "Bankacılık Düzenleme ve Denetleme Kurumu" },
  { grup: "Kurumlar", ad: "e-Devlet", url: "https://www.turkiye.gov.tr/", aciklama: "Belediye ve kurum e-hizmetleri" },
  { grup: "Kurumlar", ad: "Çevre, Şehircilik ve İklim Değişikliği Bakanlığı", url: "https://www.csb.gov.tr/", aciklama: "Yapı yaklaşık birim maliyetleri, imar mevzuatı" },
  { grup: "Piyasa Verisi", ad: "TCMB EVDS", url: "https://evds2.tcmb.gov.tr/", aciklama: "Konut fiyat endeksi, faiz ve kur serileri" },
  { grup: "Piyasa Verisi", ad: "TÜİK Veri Portalı", url: "https://data.tuik.gov.tr/", aciklama: "Konut satış istatistikleri, enflasyon" },
  { grup: "İlan Siteleri", ad: "sahibinden.com", url: "https://www.sahibinden.com/", aciklama: "Emsal ilan araştırması" },
  { grup: "İlan Siteleri", ad: "Hepsiemlak", url: "https://www.hepsiemlak.com/", aciklama: "Emsal ilan araştırması" },
  { grup: "İlan Siteleri", ad: "Emlakjet", url: "https://www.emlakjet.com/", aciklama: "Emsal ilan araştırması" },
];

const OZEL_ANAHTAR = "eksperix_baglantilar_v1";
const FAVORI_ANAHTAR = "eksperix_baglanti_favori_v1";

// Personal links and favourites are a per-browser convenience.
function oku<T>(anahtar: string, varsayilan: T): T {
  try {
    const ham = localStorage.getItem(anahtar);
    return ham ? (JSON.parse(ham) as T) : varsayilan;
  } catch {
    return varsayilan;
  }
}

function yaz(anahtar: string, deger: unknown) {
  try {
    localStorage.setItem(anahtar, JSON.stringify(deger));
  } catch {
    // Storage unavailable (private mode): the change lasts for this visit.
  }
}

function adresiDuzelt(girdi: string): string | null {
  const s = girdi.trim();
  if (!s) return null;
  try {
    const u = new URL(/^[a-z][a-z0-9+.-]*:/i.test(s) ? s : `https://${s}`);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

function alanAdi(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function BaglantiKarti({
  b,
  favori,
  onFavori,
  onSil,
}: {
  b: Baglanti;
  favori: boolean;
  onFavori: () => void;
  onSil?: () => void;
}) {
  return (
    <div className="group flex items-start gap-3 rounded-xl border border-slate-100 bg-white p-3 transition-colors hover:border-slate-200">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-lime-300">
        <Link2 className="h-4 w-4" />
      </span>
      <a href={b.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1">
        <span className="flex items-center gap-1 text-sm font-medium text-slate-900 group-hover:underline">
          <span className="truncate">{b.ad}</span>
          <ExternalLink className="h-3 w-3 shrink-0 text-slate-400" />
        </span>
        <span className="block truncate text-xs text-slate-500">{b.aciklama || alanAdi(b.url)}</span>
        {b.aciklama && <span className="block truncate text-[11px] text-slate-400">{alanAdi(b.url)}</span>}
      </a>
      <div className="flex shrink-0 items-center">
        <button
          type="button"
          onClick={onFavori}
          aria-pressed={favori}
          title={favori ? "Favorilerden çıkar" : "Favorilere ekle"}
          className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-100 hover:text-amber-500"
        >
          <Star className={`h-4 w-4 ${favori ? "fill-amber-400 text-amber-400" : ""}`} />
        </button>
        {onSil && (
          <button
            type="button"
            onClick={onSil}
            title="Bağlantıyı sil"
            className="rounded-lg p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export default function OnemliBaglantilarPage() {
  const [ozel, setOzel] = useState<Baglanti[]>([]);
  const [favoriler, setFavoriler] = useState<string[]>([]);
  const [arama, setArama] = useState("");
  const [form, setForm] = useState({ ad: "", url: "", aciklama: "" });
  const [hata, setHata] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read browser storage after hydration
    setOzel(oku<Baglanti[]>(OZEL_ANAHTAR, []));
    setFavoriler(oku<string[]>(FAVORI_ANAHTAR, []));
  }, []);

  function ozelGuncelle(yeni: Baglanti[]) {
    setOzel(yeni);
    yaz(OZEL_ANAHTAR, yeni);
  }

  function favoriDegistir(url: string) {
    const yeni = favoriler.includes(url) ? favoriler.filter((u) => u !== url) : [...favoriler, url];
    setFavoriler(yeni);
    yaz(FAVORI_ANAHTAR, yeni);
  }

  function ekle(e: React.FormEvent) {
    e.preventDefault();
    const url = adresiDuzelt(form.url);
    if (!url) {
      setHata("Geçerli bir web adresi girin (ör. belediye.gov.tr/e-imar).");
      return;
    }
    if ([...HAZIR, ...ozel].some((b) => b.url === url)) {
      setHata("Bu bağlantı listede zaten var.");
      return;
    }
    ozelGuncelle([...ozel, { ad: form.ad.trim() || alanAdi(url), url, aciklama: form.aciklama.trim(), grup: "Bağlantılarım" }]);
    setForm({ ad: "", url: "", aciklama: "" });
    setHata(null);
  }

  const q = normalizeLabel(arama);
  const eslesir = (b: Baglanti) => !q || normalizeLabel(`${b.ad} ${b.aciklama} ${b.url} ${b.grup}`).includes(q);

  const gruplar = useMemo(() => {
    const m = new Map<string, Baglanti[]>();
    for (const b of HAZIR) m.set(b.grup, [...(m.get(b.grup) ?? []), b]);
    return [...m.entries()];
  }, []);
  const favoriListesi = [...ozel, ...HAZIR].filter((b) => favoriler.includes(b.url) && eslesir(b));
  const hicYok = [...ozel, ...HAZIR].every((b) => !eslesir(b));

  const girdi =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Önemli Bağlantılar</h1>
          <p className="mt-1 text-sm text-slate-500">
            Değerleme çalışmasında sık kullanılan kurum ve kaynaklar. Kendi bağlantılarınızı da ekleyebilirsiniz.
          </p>
        </div>
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={arama}
            onChange={(e) => setArama(e.target.value)}
            placeholder="Bağlantı ara…"
            className="w-full rounded-full border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
          />
        </div>
      </div>

      {favoriListesi.length > 0 && (
        <section>
          <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-600">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            Favoriler
          </h2>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {favoriListesi.map((b) => (
              <BaglantiKarti key={b.url} b={b} favori onFavori={() => favoriDegistir(b.url)} />
            ))}
          </div>
        </section>
      )}

      <Card>
        <h2 className="text-sm font-semibold text-slate-900">Bağlantılarım</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Çalıştığınız belediyelerin e-imar sayfaları, banka portalları vb. Bu tarayıcıda saklanır.
        </p>
        <form onSubmit={ekle} className="mt-3 grid gap-2 sm:grid-cols-[1fr_1.4fr_1.4fr_auto]">
          <input value={form.ad} onChange={(e) => setForm({ ...form, ad: e.target.value })} placeholder="Ad (ör. Kadıköy e-İmar)" className={girdi} />
          <input
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            placeholder="Web adresi"
            className={girdi}
            required
            inputMode="url"
          />
          <input
            value={form.aciklama}
            onChange={(e) => setForm({ ...form, aciklama: e.target.value })}
            placeholder="Açıklama (isteğe bağlı)"
            className={girdi}
          />
          <button type="submit" className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-lime-300">
            <Plus className="h-4 w-4" />
            Ekle
          </button>
        </form>
        {hata && <p className="mt-2 text-xs font-medium text-rose-600">{hata}</p>}
        {ozel.filter(eslesir).length > 0 && (
          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {ozel.filter(eslesir).map((b) => (
              <BaglantiKarti
                key={b.url}
                b={b}
                favori={favoriler.includes(b.url)}
                onFavori={() => favoriDegistir(b.url)}
                onSil={() => ozelGuncelle(ozel.filter((x) => x.url !== b.url))}
              />
            ))}
          </div>
        )}
      </Card>

      {gruplar.map(([grup, liste]) => {
        const gorunen = liste.filter(eslesir);
        if (gorunen.length === 0) return null;
        return (
          <section key={grup}>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">{grup}</h2>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {gorunen.map((b) => (
                <BaglantiKarti key={b.url} b={b} favori={favoriler.includes(b.url)} onFavori={() => favoriDegistir(b.url)} />
              ))}
            </div>
          </section>
        );
      })}

      {hicYok && <p className="py-8 text-center text-sm text-slate-500">“{arama}” ile eşleşen bağlantı yok.</p>}
    </div>
  );
}
