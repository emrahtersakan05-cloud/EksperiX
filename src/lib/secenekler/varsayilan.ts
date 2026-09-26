// Option lists the Sistem Yöneticisi maintains (add / edit / remove) and
// every eksper picks from. Keyed by a stable id; the texts below are the
// starting lists until an admin changes them.

export type SecenekListesiKey =
  | "binaGirisKapisi"
  | "katHoluSahanlik"
  | "merdivenBasamaklari"
  | "merdivenKorkuluklari"
  | "binaIciDuvarlar"
  | "binaDisCephesi"
  | "binaCatisi";

export const SECENEK_LISTELERI: { key: SecenekListesiKey; ad: string; varsayilan: string[] }[] = [
  {
    key: "binaGirisKapisi",
    ad: "Bina Giriş Kapısı",
    varsayilan: [
      "Bina giriş kapı montajı yapılmamıştır.",
      "Bina giriş kapısı camlı demir doğramadır.",
      "Bina giriş kapısı demir doğramadır.",
      "Bina giriş kapısı camlı demir doğrama, otomatik kapıdır.",
      "Bina giriş kapısı demir doğrama, otomatik kapıdır.",
      "Bina giriş kapısı alüminyum doğramadır.",
      "Bina giriş kapısı camlı alüminyum doğramadır.",
      "Bina giriş kapısı camlı alüminyum doğrama, otomatik kapıdır.",
    ],
  },
  {
    key: "katHoluSahanlik",
    ad: "Kat Holü ve Sahanlıkları",
    varsayilan: [
      "Binada kat sahanlıkları mermer kaplamadır.",
      "Binada kat sahanlıkları seramik kaplamadır.",
      "Binada kat sahanlıkları brüt beton kaplama olup, zemin döşemesi yapılmamıştır.",
    ],
  },
  {
    key: "merdivenBasamaklari",
    ad: "Merdiven Basamakları",
    varsayilan: [
      "Binanın merdiven basamakları mermer kaplamadır.",
      "Binanın merdiven basamakları seramik kaplamadır.",
      "Binada merdiven basamakları brüt beton kaplama olup, zemin döşemesi yapılmamıştır.",
    ],
  },
  {
    key: "merdivenKorkuluklari",
    ad: "Merdiven Korkulukları",
    varsayilan: [
      "Binada merdiven korkulukları demir doğramadır.",
      "Binada merdiven korkulukları alüminyum doğramadır.",
      "Binada merdiven korkulukları bulunmaktadır.",
      "Binada merdiven korkulukları montajı yapılmamıştır.",
    ],
  },
  {
    key: "binaIciDuvarlar",
    ad: "Bina İçi Duvarlar",
    varsayilan: ["Bina içi duvarlar alçı üzeri plastik boya ile boyanmıştır."],
  },
  {
    key: "binaDisCephesi",
    ad: "Bina Dış Cephesi",
    varsayilan: ["Bina dış cephesi mantolama üzeri dış cephe boyası ile boyalıdır."],
  },
  {
    key: "binaCatisi",
    ad: "Bina Çatısı",
    varsayilan: ["Binanın çatısı ahşap üzeri kiremit örtülüdür."],
  },
];

export function secenekListesiTanimi(key: SecenekListesiKey) {
  return SECENEK_LISTELERI.find((l) => l.key === key)!;
}
