// Akıcı metin şablonları: each form (keyed by its title) has six numbered
// templates. A template is free text with {Alan Adı} tokens; filling it
// swaps every token for that field's current value, so the user decides
// where each piece of data sits in the sentence.

export const SABLON_SAYISI = 6;
export const BOS_DEGER = "…";

export interface Sablon {
  ad: string;
  metin: string;
}

export interface FormAlani {
  etiket: string;
  deger: string;
}

export function jeton(etiket: string): string {
  return `{${etiket}}`;
}

// Built from the fields that have a value (all fields while the form is
// still empty), so a fresh template reads without a row of gaps.
export function varsayilanSablonlar(baslik: string, alanlar: FormAlani[]): Sablon[] {
  const dolu = alanlar.filter((a) => a.deger.trim());
  const etiketler = [...new Set((dolu.length ? dolu : alanlar).map((a) => a.etiket))];
  const kucukBaslik = baslik
    .replace(/\s*(Formu|Sekmesi)$/i, "")
    .replace(/\s*Bilgi(leri)?$/i, "")
    .trim();
  return [
    {
      ad: "Paragraf",
      metin: etiketler.length ? `${etiketler.map((e) => `${e} ${jeton(e)}`).join(", ")} olarak tespit edilmiştir.` : "",
    },
    { ad: "Satır satır liste", metin: etiketler.map((e) => `${e}: ${jeton(e)}`).join("\n") },
    { ad: "Madde işaretli", metin: etiketler.map((e) => `• ${e}: ${jeton(e)}`).join("\n") },
    { ad: "Kısa özet", metin: etiketler.slice(0, 4).map(jeton).join(" / ") },
    {
      ad: "Rapor dili",
      metin: etiketler.length
        ? `Taşınmaza ilişkin ${kucukBaslik.toLocaleLowerCase("tr-TR")} bilgileri incelenmiş olup ${etiketler
            .map((e) => `${e.toLocaleLowerCase("tr-TR")} ${jeton(e)}`)
            .join("; ")} olarak belirlenmiştir.`
        : "",
    },
    { ad: "Özel şablon", metin: "" },
  ];
}

// Fills a template. Unknown or empty fields become "…" so gaps stand out.
export function sablonuDoldur(metin: string, alanlar: FormAlani[]): string {
  const degerler = new Map<string, string>();
  for (const a of alanlar) if (!degerler.has(a.etiket)) degerler.set(a.etiket, a.deger);
  return metin.replace(/\{([^{}\n]+)\}/g, (_, etiket: string) => {
    const d = degerler.get(etiket.trim());
    return d && d.trim() ? d.trim() : BOS_DEGER;
  });
}

// ---- Storage (per browser; the six templates are shared by every talep) ----

const DEPO_ANAHTARI = "eksperix_akici_metin_sablonlari_v1";

// Only templates the user changed are stored; null = use the default.
type Kayitli = Record<string, (Sablon | null)[]>;

function oku(): Kayitli {
  try {
    const ham = localStorage.getItem(DEPO_ANAHTARI);
    return ham ? (JSON.parse(ham) as Kayitli) : {};
  } catch {
    return {};
  }
}

export function sablonlariGetir(baslik: string, alanlar: FormAlani[]): { sablonlar: Sablon[]; ozel: boolean[] } {
  const kayitli = oku()[baslik] ?? [];
  const varsayilan = varsayilanSablonlar(baslik, alanlar);
  return {
    sablonlar: varsayilan.map((v, i) => kayitli[i] ?? v),
    ozel: varsayilan.map((_, i) => !!kayitli[i]),
  };
}

export function sablonKaydet(baslik: string, sira: number, sablon: Sablon | null): void {
  try {
    const hepsi = oku();
    const liste = [...(hepsi[baslik] ?? [])];
    while (liste.length < SABLON_SAYISI) liste.push(null);
    liste[sira] = sablon;
    hepsi[baslik] = liste;
    localStorage.setItem(DEPO_ANAHTARI, JSON.stringify(hepsi));
  } catch {
    // Storage unavailable: the edit lasts until the page is closed.
  }
}
