import { isNavGroup, navItems } from "@/lib/nav";
import type { EmsalHaritaKaydi } from "@/lib/emsal-haritasi/types";
import type { Talep } from "@/lib/talep/types";
import { normalizeLabel } from "@/lib/text/normalize-tr";

// The global search (Ctrl+K): talepler, Emsal Haritası records, pages and
// quick actions. Matching is accent- and case-insensitive (normalizeLabel)
// and every word typed must appear somewhere in the item.

export type SonucTuru = "islem" | "sayfa" | "talep" | "emsal";

export interface AramaSonucu {
  id: string;
  tur: SonucTuru;
  baslik: string;
  alt: string;
  href: string;
}

interface Aday extends AramaSonucu {
  metin: string;
}

const ISLEMLER: AramaSonucu[] = [
  { id: "islem:yeni-emsal", tur: "islem", baslik: "Yeni emsal ekle", alt: "Emsal Haritası", href: "/deger-haritasi/emsal-haritasi/yeni" },
  { id: "islem:emsal-haritasi", tur: "islem", baslik: "Emsal Haritası'nı aç", alt: "Harita, filtreler, değer tahmini", href: "/deger-haritasi/emsal-haritasi" },
  { id: "islem:talepler", tur: "islem", baslik: "Taleplerime git", alt: "Tüm değerleme talepleri", href: "/taleplerim" },
];

function sayfalar(admin: boolean): AramaSonucu[] {
  return navItems.flatMap((item) => {
    const yapraklar = isNavGroup(item) ? item.children.map((c) => ({ ...c, grup: item.label })) : [{ ...item, grup: "" }];
    return yapraklar
      .filter((y) => admin || !("adminOnly" in y && y.adminOnly))
      .map((y) => ({ id: `sayfa:${y.href}`, tur: "sayfa" as const, baslik: y.label, alt: y.grup || "Sayfa", href: y.href }));
  });
}

function talepAdaylari(talepler: Talep[]): Aday[] {
  return talepler.map((t) => {
    const tapuMetni = t.tapular.flatMap((tp) => [
      tp.ad,
      tp.adresKonum.il,
      tp.adresKonum.ilce,
      tp.adresKonum.mahalle,
      tp.adresKonum.ada,
      tp.adresKonum.parsel,
      tp.tapuKaydi.il,
      tp.tapuKaydi.ilce,
      tp.tapuKaydi.mahalleKoyAdi,
      tp.tapuKaydi.ada,
      tp.tapuKaydi.parsel,
      tp.talepDetayi.atananEksper,
    ]);
    const adres = t.tapular
      .map((tp) => [tp.adresKonum.mahalle, tp.adresKonum.ilce, tp.adresKonum.il].filter(Boolean).join(", "))
      .find(Boolean);
    return {
      id: `talep:${t.id}`,
      tur: "talep",
      baslik: `${t.talepNo} · ${t.musteriUnvani}`,
      alt: [t.tasinmazNiteligi, t.degerlemeKurumBanka, adres].filter(Boolean).join(" · ") || t.degerlemeFirmasi,
      href: `/taleplerim/${encodeURIComponent(t.id)}`,
      metin: normalizeLabel(
        [t.talepNo, t.musteriUnvani, t.degerlemeFirmasi, t.degerlemeKurumBanka, t.tasinmazNiteligi, ...tapuMetni].join(" "),
      ),
    };
  });
}

function emsalAdaylari(emsaller: EmsalHaritaKaydi[]): Aday[] {
  return emsaller.map((e) => ({
    id: `emsal:${e.id}`,
    tur: "emsal",
    baslik: `${e.emlakTipi || "Emsal"} · ${e.durum === "kiralik" ? "Kiralık" : "Satılık"}`,
    alt: [[e.mahalle, e.ilce, e.il].filter(Boolean).join(", "), e.m2Net || e.m2Brut ? `${e.m2Net || e.m2Brut} m²` : "", e.ekleyenAdSoyad]
      .filter(Boolean)
      .join(" · "),
    href: `/deger-haritasi/emsal-haritasi?odak=${encodeURIComponent(e.id)}`,
    metin: normalizeLabel(
      [e.emlakTipi, e.il, e.ilce, e.mahalle, e.odaSayisi, e.ilanNo, e.ekleyenAdSoyad, e.durum === "kiralik" ? "kiralik" : "satilik"].join(" "),
    ),
  }));
}

export interface AramaGruplari {
  islemler: AramaSonucu[];
  sayfalar: AramaSonucu[];
  talepler: AramaSonucu[];
  emsaller: AramaSonucu[];
}

export function ara(
  sorgu: string,
  veri: { talepler: Talep[]; emsaller: EmsalHaritaKaydi[]; admin: boolean },
  grupBasina = 6,
): AramaGruplari {
  const kelimeler = normalizeLabel(sorgu).split(" ").filter(Boolean);
  const uyar = (metin: string) => kelimeler.every((k) => metin.includes(k));
  const temiz = ({ metin: _m, ...s }: Aday): AramaSonucu => {
    void _m;
    return s;
  };

  if (kelimeler.length === 0) {
    // Empty query: quick actions and the most recent talepler.
    const sonTalepler = [...veri.talepler]
      .sort((a, b) => b.olusturmaTarihi.localeCompare(a.olusturmaTarihi))
      .slice(0, 4);
    return { islemler: ISLEMLER, sayfalar: [], talepler: talepAdaylari(sonTalepler).map(temiz), emsaller: [] };
  }

  const sayfaAdaylari: Aday[] = [...ISLEMLER, ...sayfalar(veri.admin)].map((s) => ({
    ...s,
    metin: normalizeLabel(`${s.baslik} ${s.alt}`),
  }));
  const eslesen = sayfaAdaylari.filter((s) => uyar(s.metin)).map(temiz);
  return {
    islemler: eslesen.filter((s) => s.tur === "islem"),
    sayfalar: eslesen.filter((s) => s.tur === "sayfa").slice(0, grupBasina),
    talepler: talepAdaylari(veri.talepler).filter((a) => uyar(a.metin)).slice(0, grupBasina).map(temiz),
    emsaller: emsalAdaylari(veri.emsaller).filter((a) => uyar(a.metin)).slice(0, grupBasina).map(temiz),
  };
}
