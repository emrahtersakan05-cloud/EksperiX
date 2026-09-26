import type { MulkiyetKaydi, RehinKaydi, SerhBeyanIrtifak } from "./types";

// Akıcı metin fields for the Tapu Kaydı record tables (mülkiyet, şerh / beyan /
// irtifak, rehin). The tables have no single-value inputs, so each form gets
// summary fields built from its rows instead. An empty field is left out of
// the written text along with its words (see lib/akici-metin/sablonlar).

export interface AkiciAlanDegeri {
  etiket: string;
  deger: string;
}

const tarihYaz = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : iso;
};

const tescil = (tarih: string, yevmiye: string) =>
  [tarih && `${tarihYaz(tarih)} tarih`, yevmiye && `${yevmiye} yevmiye`].filter(Boolean).join(", ");

const liste = (parcalar: string[]) => parcalar.filter(Boolean).join("; ");

// ---- Mülkiyet -------------------------------------------------------------------

const hisse = (m: MulkiyetKaydi) => (m.hissePay && m.hissePayda ? `${m.hissePay}/${m.hissePayda}` : "");

export function mulkiyetAlanlari(kayitlar: MulkiyetKaydi[]): AkiciAlanDegeri[] {
  const dolu = kayitlar.filter((m) => m.malik.trim());
  const tamMalik = dolu.length === 1 && (!hisse(dolu[0]) || hisse(dolu[0]) === "1/1");
  return [
    { etiket: "Malik Sayısı", deger: dolu.length ? String(dolu.length) : "" },
    { etiket: "Malikler", deger: dolu.map((m) => m.malik.trim()).join(", ") },
    {
      etiket: "Malik ve Hisseler",
      deger: dolu.map((m) => (hisse(m) ? `${m.malik.trim()} (${hisse(m)} hisse)` : m.malik.trim())).join(", "),
    },
    {
      etiket: "Mülkiyet Durumu",
      deger: !dolu.length
        ? ""
        : tamMalik
          ? `Taşınmaz ${dolu[0].malik.trim()} adına tam hisseli olarak kayıtlıdır.`
          : `Taşınmaz ${dolu.length} malik adına hisseli olarak kayıtlıdır.`,
    },
    {
      etiket: "Mülkiyet Kayıtları",
      deger: liste(
        dolu.map((m) =>
          [
            m.malik.trim(),
            hisse(m) && `${hisse(m)} hisse`,
            m.metrekare && `${m.metrekare} m²`,
            tescil(m.tarih, m.yevmiyeNo),
          ]
            .filter(Boolean)
            .join(", "),
        ),
      ),
    },
  ];
}

// ---- Şerh / beyan / irtifak ------------------------------------------------------

const turuMu = (s: SerhBeyanIrtifak, tur: RegExp) => tur.test(s.turu.toLocaleLowerCase("tr-TR"));

export function serhAlanlari(kayitlar: SerhBeyanIrtifak[]): AkiciAlanDegeri[] {
  const dolu = kayitlar.filter((s) => s.turu.trim() || s.aciklama.trim());
  const aciklamalar = (tur: RegExp) =>
    liste(dolu.filter((s) => turuMu(s, tur)).map((s) => s.aciklama.trim() || s.turu.trim()));
  return [
    { etiket: "Şerh / Beyan / İrtifak Sayısı", deger: dolu.length ? String(dolu.length) : "" },
    {
      etiket: "Şerh / Beyan / İrtifak Durumu",
      deger: dolu.length
        ? `Taşınmazın tapu kaydı üzerinde ${dolu.length} adet şerh / beyan / irtifak kaydı bulunmaktadır.`
        : "Taşınmazın tapu kaydı üzerinde herhangi bir şerh, beyan veya irtifak kaydı bulunmamaktadır.",
    },
    { etiket: "Şerhler", deger: aciklamalar(/şerh/) },
    { etiket: "Beyanlar", deger: aciklamalar(/beyan/) },
    { etiket: "İrtifaklar", deger: aciklamalar(/irtifak/) },
    {
      etiket: "Şerh / Beyan / İrtifak Kayıtları",
      deger: liste(
        dolu.map((s) => {
          const tescilBilgisi = tescil(s.tarih, s.yevmiyeNo);
          return `${[s.turu.trim(), s.aciklama.trim()].filter(Boolean).join(": ")}${tescilBilgisi ? ` (${tescilBilgisi})` : ""}`;
        }),
      ),
    },
  ];
}

// ---- Rehin -----------------------------------------------------------------------

const tutarOku = (s: string) => {
  const n = Number(s.replace(/\s|TL|₺/gi, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
const tlYaz = (n: number) =>
  `${n.toLocaleString("tr-TR", n % 1 ? { minimumFractionDigits: 2, maximumFractionDigits: 2 } : { maximumFractionDigits: 0 })} TL`;

export function rehinAlanlari(kayitlar: RehinKaydi[]): AkiciAlanDegeri[] {
  const dolu = kayitlar.filter((r) => r.alacakli.trim() || r.borc.trim());
  const toplam = dolu.reduce((t, r) => t + tutarOku(r.borc), 0);
  return [
    { etiket: "Rehin Sayısı", deger: dolu.length ? String(dolu.length) : "" },
    {
      etiket: "Rehin Durumu",
      deger: dolu.length
        ? `Taşınmaz üzerinde ${dolu.length} adet ipotek (rehin) kaydı bulunmaktadır.`
        : "Taşınmaz üzerinde herhangi bir ipotek (rehin) kaydı bulunmamaktadır.",
    },
    { etiket: "Alacaklılar", deger: [...new Set(dolu.map((r) => r.alacakli.trim()).filter(Boolean))].join(", ") },
    { etiket: "Toplam Rehin Tutarı", deger: toplam > 0 ? tlYaz(toplam) : "" },
    {
      etiket: "Rehin Kayıtları",
      deger: liste(
        dolu.map((r) =>
          [
            r.alacakli.trim() && `${r.alacakli.trim()} lehine`,
            r.dereceSira && `${r.dereceSira} derece/sıra`,
            r.borc && tlYaz(tutarOku(r.borc)),
            r.faiz && `faiz ${r.faiz}`,
            r.borcluMalik && `borçlu ${r.borcluMalik.trim()}`,
            tescil(r.tarih, r.yevmiyeNo),
          ]
            .filter(Boolean)
            .join(", "),
        ),
      ),
    },
  ];
}
