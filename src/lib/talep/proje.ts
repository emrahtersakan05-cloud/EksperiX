import type { ProjeIncelemeData } from "./types";

type UyumAlani = "blokKonumUyumu" | "blokAlanUyumu" | "bbKonumUyumu" | "bbAlanUyumu";
type AciklamaAlani = "blokKonumAciklama" | "blokAlanAciklama" | "bbKonumAciklama" | "bbAlanAciklama";

export interface ProjeUyumu {
  alan: UyumAlani;
  aciklama: AciklamaAlani;
  soru: string;
  etiket: string;
  // Subject of the report sentence ("Blok/bina konum açısından …").
  ozne: string;
}

// Each "Hayır" opens a note explaining the difference.
export const PROJE_UYUMLARI: ProjeUyumu[] = [
  {
    alan: "blokKonumUyumu",
    aciklama: "blokKonumAciklama",
    soru: "Blok/bina konum açısından uyumlu mu?",
    etiket: "Blok/Bina Konum Uyumu",
    ozne: "Blok/bina konum açısından",
  },
  {
    alan: "blokAlanUyumu",
    aciklama: "blokAlanAciklama",
    soru: "Blok/bina alan açısından uyumlu mu?",
    etiket: "Blok/Bina Alan Uyumu",
    ozne: "Blok/bina alan açısından",
  },
  {
    alan: "bbKonumUyumu",
    aciklama: "bbKonumAciklama",
    soru: "Bağımsız bölüm konum açısından uyumlu mu?",
    etiket: "Bağımsız Bölüm Konum Uyumu",
    ozne: "Bağımsız bölüm konum açısından",
  },
  {
    alan: "bbAlanUyumu",
    aciklama: "bbAlanAciklama",
    soru: "Bağımsız bölüm alan açısından uyumlu mu?",
    etiket: "Bağımsız Bölüm Alan Uyumu",
    ozne: "Bağımsız bölüm alan açısından",
  },
];

const noktali = (s: string) => (/[.!?]$/.test(s) ? s : `${s}.`);

function tarihYaz(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : iso;
}

export function projeKurumCumlesi(p: ProjeIncelemeData): string {
  const k = p.incelenenKurum.trim();
  return k ? `Proje incelemesi ${k} nezdinde yapılmıştır.` : "";
}

export function projeTarihSayiCumlesi(p: ProjeIncelemeData): string {
  if (p.tarihSayiVarMi === "Hayır") return "Projenin tarih ve sayı bilgisi bulunmamaktadır.";
  if (p.tarihSayiVarMi !== "Evet") return "";
  const tarih = p.projeTarihi ? `${tarihYaz(p.projeTarihi)} tarihli` : "";
  const sayi = p.projeSayisi.trim() ? `${p.projeSayisi.trim()} sayılı` : "";
  const nitelik = [tarih, sayi].filter(Boolean).join(", ");
  return nitelik ? `İncelenen proje ${nitelik} onaylı projedir.` : "";
}

export function projeUyumCumlesi(p: ProjeIncelemeData, u: ProjeUyumu): string {
  const deger = p[u.alan];
  if (deger === "Evet") return `${u.ozne} projesine uyumludur.`;
  if (deger !== "Hayır") return "";
  const a = p[u.aciklama].trim();
  return a ? `${u.ozne} projesine uyumlu değildir: ${noktali(a)}` : `${u.ozne} projesine uyumlu değildir.`;
}
