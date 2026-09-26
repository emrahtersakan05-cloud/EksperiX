// Option lists the Sistem Yöneticisi maintains (add / edit / remove) and
// every eksper picks from. Keyed by a stable id; the texts below are the
// starting lists until an admin changes them.
//
// Options are sentence endings; `ozne` is the subject the report puts in
// front ("Binanın çatısı" + "ahşap üzeri kiremit örtülüdür."), and
// `ozneTamlayan` the genitive used before "montajı …" ("Binanın çatısının
// montajı yapılmamıştır.").

export type SecenekListesiKey =
  | "girisKapisi"
  | "katHolu"
  | "merdivenBasamak"
  | "merdivenKorkuluk"
  | "icDuvar"
  | "disCephe"
  | "cati"
  | "cevreDuzenlemesi";

export interface SecenekListesiTanimi {
  key: SecenekListesiKey;
  ad: string;
  ozne: string;
  ozneTamlayan: string;
  varsayilan: string[];
}

export const SECENEK_LISTELERI: SecenekListesiTanimi[] = [
  {
    // Per entrance in Bina Giriş Tespiti.
    key: "girisKapisi",
    ad: "Bina Giriş Kapısı (Giriş Tespiti)",
    ozne: "Bina giriş kapısı",
    ozneTamlayan: "Bina giriş kapısının",
    varsayilan: [
      "montajı yapılmamıştır.",
      "camlı demir doğramadır.",
      "demir doğramadır.",
      "camlı demir doğrama, otomatik kapıdır.",
      "demir doğrama, otomatik kapıdır.",
      "alüminyum doğramadır.",
      "camlı alüminyum doğramadır.",
      "camlı alüminyum doğrama, otomatik kapıdır.",
    ],
  },
  {
    key: "katHolu",
    ad: "Kat Holü ve Sahanlıkları",
    ozne: "Binada kat holü ve sahanlıkları",
    ozneTamlayan: "Binada kat holü ve sahanlıklarının",
    varsayilan: ["mermer kaplamadır.", "seramik kaplamadır.", "brüt beton kaplama olup, zemin döşemesi yapılmamıştır."],
  },
  {
    key: "merdivenBasamak",
    ad: "Merdiven Basamakları",
    ozne: "Binanın merdiven basamakları",
    ozneTamlayan: "Binanın merdiven basamaklarının",
    varsayilan: ["mermer kaplamadır.", "seramik kaplamadır.", "brüt beton kaplama olup, zemin döşemesi yapılmamıştır."],
  },
  {
    key: "merdivenKorkuluk",
    ad: "Merdiven Korkulukları",
    ozne: "Binada merdiven korkulukları",
    ozneTamlayan: "Binada merdiven korkuluklarının",
    varsayilan: ["demir doğramadır.", "alüminyum doğramadır.", "bulunmaktadır.", "montajı yapılmamıştır."],
  },
  {
    key: "icDuvar",
    ad: "Bina İçi Duvarlar",
    ozne: "Bina içi duvarlar",
    ozneTamlayan: "Bina içi duvarların",
    varsayilan: ["alçılı durumda olup, boyanmamıştır.", "alçı üzeri plastik boya ile boyanmıştır."],
  },
  {
    key: "disCephe",
    ad: "Bina Dış Cephesi",
    ozne: "Bina dış cephesi",
    ozneTamlayan: "Bina dış cephesinin",
    varsayilan: [
      "sıvasız durumda olup, mantolama yapılmamıştır.",
      "sıvalı durumda olup, mantolama yapılmamıştır.",
      "mantolama üzeri dış cephe boyası ile boyalıdır.",
    ],
  },
  {
    key: "cati",
    ad: "Bina Çatısı",
    ozne: "Binanın çatısı",
    ozneTamlayan: "Binanın çatısının",
    varsayilan: ["montajı yapılmamıştır.", "ahşap üzeri kiremit örtülüdür."],
  },
  {
    key: "cevreDuzenlemesi",
    ad: "Çevre Düzenlemesi",
    ozne: "Binanın çevre düzenlemesi",
    ozneTamlayan: "Binanın çevre düzenlemesinin",
    varsayilan: ["tamamlanmamıştır.", "tamamlanmıştır."],
  },
];

export function secenekListesiTanimi(key: SecenekListesiKey): SecenekListesiTanimi {
  return SECENEK_LISTELERI.find((l) => l.key === key)!;
}

// "Binanın çatısı" + "ahşap üzeri kiremit örtülüdür." → a full sentence.
// A value saved as a whole sentence by the earlier lists is kept as is.
export function secenekCumlesi(key: SecenekListesiKey, deger: string): string {
  const d = deger.trim();
  if (!d) return "";
  if (/^[A-ZÇĞİÖŞÜ]/.test(d)) return /[.!?]$/.test(d) ? d : `${d}.`;
  const t = secenekListesiTanimi(key);
  const cumle = `${/^montaj/i.test(d) ? t.ozneTamlayan : t.ozne} ${d}`;
  return /[.!?]$/.test(cumle) ? cumle : `${cumle}.`;
}
