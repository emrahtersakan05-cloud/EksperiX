// Akıcı metin şablonları: each form (keyed by its title) has a numbered
// list of templates ("Şablon – 1", "Şablon – 2", …). A template is free text
// with {Alan Adı} tokens; filling it swaps every token for that field's
// current value, so the author decides where each piece of data sits.
// Templates are stored on the server and edited only by the Sistem Yöneticisi.

export const VARSAYILAN_SABLON_SAYISI = 6;
export const BOS_DEGER = "…";

export interface FormAlani {
  etiket: string;
  deger: string;
}

export function jeton(etiket: string): string {
  return `{${etiket}}`;
}

export function sablonAdi(sira: number): string {
  return `Şablon – ${sira + 1}`;
}

// Starting templates for a form nobody has customised yet, built from the
// fields that have a value (all fields while the form is still empty).
export function varsayilanSablonlar(baslik: string, alanlar: FormAlani[]): string[] {
  const dolu = alanlar.filter((a) => a.deger.trim());
  const etiketler = [...new Set((dolu.length ? dolu : alanlar).map((a) => a.etiket))];
  if (etiketler.length === 0) return Array(VARSAYILAN_SABLON_SAYISI).fill("");
  const kucukBaslik = baslik
    .replace(/\s*(Formu|Sekmesi)$/i, "")
    .replace(/\s*Bilgi(leri)?$/i, "")
    .trim()
    .toLocaleLowerCase("tr-TR");
  return [
    `${etiketler.map((e) => `${e} ${jeton(e)}`).join(", ")} olarak tespit edilmiştir.`,
    etiketler.map((e) => `${e}: ${jeton(e)}`).join("\n"),
    etiketler.map((e) => `• ${e}: ${jeton(e)}`).join("\n"),
    etiketler.slice(0, 4).map(jeton).join(" / "),
    `Taşınmaza ilişkin ${kucukBaslik} bilgileri incelenmiş olup ${etiketler
      .map((e) => `${e.toLocaleLowerCase("tr-TR")} ${jeton(e)}`)
      .join("; ")} olarak belirlenmiştir.`,
    "",
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
