import type { EmsalHaritaKaydi } from "./types";

// Category-specific field sets for the "Yeni Emsal" page. Each category lists
// the fields shown for it, in order. Fields with `ust` are stored on the
// record's top-level columns (the ones the map, filters and ₺/m² analysis
// read); every other field lands in `detaylar` under its key.

export type EmsalKategori = "konut" | "isyeri" | "bina" | "ciftlik" | "fabrika" | "arsa";

export type UstAlan = "m2Brut" | "m2Net" | "odaSayisi" | "binaYasi" | "kat";

export interface KategoriAlani {
  key: string;
  label: string;
  tip: "metin" | "sayi" | "secim";
  secenekler?: readonly string[];
  ust?: UstAlan;
  ipucu?: string;
}

export interface KategoriTanimi {
  id: EmsalKategori;
  label: string;
  // Label of the emlak tipi field for this category ("Emlak Tipi" / "Türü").
  tipEtiketi: string;
  tipSecenekleri: readonly string[];
  alanlar: readonly KategoriAlani[];
  // Which area the ₺/m² figure is based on — shown under the fields.
  alanAciklamasi: string;
}

const EVET_HAYIR = ["Evet", "Hayır"] as const;
const VAR_YOK = ["Var", "Yok"] as const;
const KREDI = ["Evet", "Hayır", "Bilinmiyor"] as const;
const TAPU = [
  "Kat Mülkiyetli",
  "Kat İrtifaklı",
  "Hisseli Tapu",
  "Müstakil Tapulu",
  "Arsa Tapulu",
  "Kooperatif Hisseli Tapu",
  "Tahsis",
  "Zilliyet",
  "Bilinmiyor",
] as const;
const KIMDEN = ["Sahibinden", "Emlak Ofisinden", "İnşaat Firmasından", "Bankadan"] as const;
const ISITMA = [
  "Yok",
  "Soba",
  "Doğalgaz Sobası",
  "Kat Kaloriferi",
  "Merkezi",
  "Merkezi (Pay Ölçer)",
  "Kombi (Doğalgaz)",
  "Kombi (Elektrik)",
  "Yerden Isıtma",
  "Klima",
  "Fancoil Ünitesi",
  "Güneş Enerjisi",
  "Jeotermal",
  "Şömine",
  "VRV",
  "Isı Pompası",
] as const;
const KULLANIM = ["Boş", "Kiracılı", "Mülk Sahibi"] as const;
const ODA = ["Stüdyo (1+0)", "1+1", "1.5+1", "2+0", "2+1", "2.5+1", "2+2", "3+1", "3.5+1", "3+2", "4+1", "4.5+1", "4+2", "5+1", "5+2", "6+1", "6+2", "7+ üzeri"] as const;
const OTOPARK = ["Açık Otopark", "Kapalı Otopark", "Açık & Kapalı Otopark", "Yok"] as const;

const tapu: KategoriAlani = { key: "tapuDurumu", label: "Tapu Durumu", tip: "secim", secenekler: TAPU };
const kimden: KategoriAlani = { key: "kimden", label: "Kimden", tip: "secim", secenekler: KIMDEN };
const kredi: KategoriAlani = { key: "krediyeUygun", label: "Krediye Uygunluk", tip: "secim", secenekler: KREDI };
const binaYasi: KategoriAlani = { key: "binaYasi", label: "Bina Yaşı", tip: "sayi", ust: "binaYasi" };
const isitma: KategoriAlani = { key: "isitma", label: "Isıtma", tip: "secim", secenekler: ISITMA };
const kiracili: KategoriAlani = { key: "kiracili", label: "Kiracılı", tip: "secim", secenekler: EVET_HAYIR };

export const KATEGORILER: Record<EmsalKategori, KategoriTanimi> = {
  konut: {
    id: "konut",
    label: "Konut",
    tipEtiketi: "Emlak Tipi",
    tipSecenekleri: ["Daire", "Rezidans", "Villa", "Müstakil Ev", "Yazlık", "Çiftlik Evi", "Köşk & Konak", "Yalı", "Prefabrik"],
    alanAciklamasi: "Birim fiyat net m² üzerinden, net m² yoksa brüt m² üzerinden hesaplanır.",
    alanlar: [
      { key: "m2Brut", label: "m² (Brüt)", tip: "sayi", ust: "m2Brut" },
      { key: "m2Net", label: "m² (Net)", tip: "sayi", ust: "m2Net" },
      { key: "odaSayisi", label: "Oda Sayısı", tip: "secim", secenekler: ODA, ust: "odaSayisi" },
      binaYasi,
      { key: "katSayisi", label: "Kat Sayısı", tip: "sayi" },
      { key: "kat", label: "Bulunduğu Kat", tip: "metin", ust: "kat", ipucu: "örn. 3, Zemin, Bahçe Katı" },
      isitma,
      { key: "banyoSayisi", label: "Banyo Sayısı", tip: "sayi" },
      { key: "mutfak", label: "Mutfak", tip: "secim", secenekler: ["Açık (Amerikan)", "Kapalı"] },
      { key: "balkon", label: "Balkon", tip: "secim", secenekler: VAR_YOK },
      { key: "asansor", label: "Asansör", tip: "secim", secenekler: VAR_YOK },
      { key: "otopark", label: "Otopark", tip: "secim", secenekler: OTOPARK },
      { key: "esyali", label: "Eşyalı", tip: "secim", secenekler: EVET_HAYIR },
      { key: "kullanimDurumu", label: "Kullanım Durumu", tip: "secim", secenekler: KULLANIM },
      { key: "siteIcerisinde", label: "Site İçerisinde", tip: "secim", secenekler: EVET_HAYIR },
      { key: "siteAdi", label: "Site Adı", tip: "metin" },
      {
        key: "enerjiKimlik",
        label: "Enerji Kimlik Belgesi",
        tip: "secim",
        secenekler: ["A", "B", "C", "D", "E", "F", "G", "Yok"],
      },
      tapu,
      kimden,
    ],
  },
  isyeri: {
    id: "isyeri",
    label: "İşyeri",
    tipEtiketi: "Türü",
    tipSecenekleri: [
      "Dükkan & Mağaza",
      "Ofis",
      "Büro",
      "Plaza Katı",
      "Depo & Antrepo",
      "Atölye",
      "İmalathane",
      "Showroom",
      "Kafe & Bar",
      "Restoran & Lokanta",
      "Otopark & Garaj",
      "Akaryakıt İstasyonu",
    ],
    alanAciklamasi: "Birim fiyat girilen m² üzerinden hesaplanır.",
    alanlar: [
      { key: "m2", label: "m²", tip: "sayi", ust: "m2Brut" },
      { key: "bolumOdaSayisi", label: "Bölüm & Oda Sayısı", tip: "sayi" },
      { key: "aidat", label: "Aidat (TL)", tip: "sayi" },
      isitma,
      binaYasi,
      kredi,
      tapu,
      kimden,
    ],
  },
  bina: {
    id: "bina",
    label: "Bina",
    tipEtiketi: "Emlak Tipi",
    tipSecenekleri: ["Komple Bina", "Apartman", "İş Hanı", "Plaza", "Otel Binası", "Müstakil Bina"],
    alanAciklamasi: "Birim fiyat girilen m² üzerinden hesaplanır.",
    alanlar: [
      { key: "katSayisi", label: "Kat Sayısı", tip: "sayi" },
      { key: "birKattakiDaire", label: "Bir Kattaki Daire", tip: "sayi" },
      { ...isitma, label: "Isıtma Tipi" },
      { key: "m2", label: "m²", tip: "sayi", ust: "m2Brut" },
      binaYasi,
      { key: "asansor", label: "Asansör", tip: "secim", secenekler: VAR_YOK },
      { key: "otopark", label: "Otopark", tip: "secim", secenekler: OTOPARK },
      { ...kredi, label: "Krediye Uygun" },
      tapu,
      kimden,
    ],
  },
  ciftlik: {
    id: "ciftlik",
    label: "Çiftlik",
    tipEtiketi: "Türü",
    tipSecenekleri: ["Çiftlik", "Hayvancılık Çiftliği", "Tarım Çiftliği", "At Çiftliği", "Tavuk Çiftliği", "Balık Çiftliği"],
    alanAciklamasi: "Birim fiyat açık alan (arazi) m² üzerinden hesaplanır.",
    alanlar: [
      { key: "acikAlan", label: "Açık Alan (m²)", tip: "sayi", ust: "m2Brut" },
      { key: "kapaliAlan", label: "Kapalı Alan (m²)", tip: "sayi" },
      kiracili,
      kredi,
      tapu,
      kimden,
    ],
  },
  fabrika: {
    id: "fabrika",
    label: "Fabrika",
    tipEtiketi: "Türü",
    tipSecenekleri: ["Fabrika", "Üretim Tesisi", "İmalathane", "Depo & Antrepo", "Atölye", "Soğuk Hava Deposu"],
    alanAciklamasi: "Birim fiyat kapalı alan m² üzerinden hesaplanır.",
    alanlar: [
      { key: "acikAlan", label: "Açık Alan (m²)", tip: "sayi" },
      { key: "kapaliAlan", label: "Kapalı Alan (m²)", tip: "sayi", ust: "m2Brut" },
      { key: "binaAdedi", label: "Bina Adedi", tip: "sayi" },
      { key: "bolumOdaSayisi", label: "Bölüm & Oda Sayısı", tip: "sayi" },
      { key: "katSayisi", label: "Kat Sayısı", tip: "sayi" },
      { key: "girisYuksekligi", label: "Giriş Yüksekliği (m)", tip: "sayi" },
      kiracili,
      binaYasi,
      isitma,
      { key: "yapininDurumu", label: "Yapının Durumu", tip: "secim", secenekler: ["Sıfır", "İkinci El", "Yapım Aşamasında"] },
      { key: "kullanimDurumu", label: "Kullanım Durumu", tip: "secim", secenekler: KULLANIM },
      kredi,
      { key: "zeminEtudu", label: "Zemin Etüdü", tip: "secim", secenekler: VAR_YOK },
      tapu,
      kimden,
    ],
  },
  arsa: {
    id: "arsa",
    label: "Arsa / Tarla",
    tipEtiketi: "Emlak Tipi",
    tipSecenekleri: ["Arsa", "Tarla", "Bağ", "Bahçe", "Zeytinlik", "Çayır & Mera"],
    alanAciklamasi: "m² fiyatı, ilan fiyatı (varsa pazarlıklı fiyat) ÷ m² olarak hesaplanır.",
    alanlar: [
      {
        key: "imarDurumu",
        label: "İmar Durumu",
        tip: "secim",
        secenekler: [
          "Konut",
          "Ticari",
          "Ticari + Konut",
          "Sanayi",
          "Turizm",
          "Depo & Antrepo",
          "Eğitim",
          "Sağlık",
          "Enerji",
          "Tarla",
          "Bağ & Bahçe",
          "Zeytinlik",
          "Sit Alanı",
          "İmarsız",
          "Diğer",
        ],
      },
      { key: "m2", label: "m²", tip: "sayi", ust: "m2Brut" },
      { key: "adaNo", label: "Ada No", tip: "metin" },
      { key: "parselNo", label: "Parsel No", tip: "metin" },
      { key: "paftaNo", label: "Pafta No", tip: "metin" },
      { key: "kaks", label: "Kaks (Emsal)", tip: "sayi", ipucu: "örn. 1,50" },
      { key: "gabari", label: "Gabari", tip: "metin", ipucu: "örn. 12,50 m / Serbest" },
      kredi,
      tapu,
      kimden,
    ],
  },
};

export const KATEGORI_SIRASI: readonly EmsalKategori[] = ["konut", "isyeri", "bina", "ciftlik", "fabrika", "arsa"];

export function kategoriMi(value: string): value is EmsalKategori {
  return (KATEGORI_SIRASI as readonly string[]).includes(value);
}

// Records saved before categories existed carry only an emlak tipi; infer the
// category from it so old pins still group and filter sensibly.
export function kategoriOf(kaydi: Pick<EmsalHaritaKaydi, "kategori" | "emlakTipi">): EmsalKategori {
  if (kaydi.kategori && kategoriMi(kaydi.kategori)) return kaydi.kategori;
  const tip = kaydi.emlakTipi.toLocaleLowerCase("tr-TR");
  if (/arsa|tarla|bağ|bahçe|zeytin/.test(tip)) return "arsa";
  if (/fabrika|üretim|imalat/.test(tip)) return "fabrika";
  if (/çiftlik/.test(tip) && !/ev/.test(tip)) return "ciftlik";
  if (/bina|apartman|iş hanı/.test(tip)) return "bina";
  if (/dükkan|mağaza|işyeri|ofis|büro|depo|atölye|plaza/.test(tip)) return "isyeri";
  return "konut";
}

// Human-readable detail rows (label → value) for a record's category fields,
// skipping the ones already shown elsewhere (top-level area/room/age/floor).
export function detaySatirlari(kaydi: EmsalHaritaKaydi): [string, string][] {
  const tanim = KATEGORILER[kategoriOf(kaydi)];
  const d = kaydi.detaylar ?? {};
  return tanim.alanlar
    .filter((a) => !a.ust && d[a.key])
    .map((a) => [a.label, d[a.key]] as [string, string]);
}
