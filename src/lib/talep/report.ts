import { ortalamaEmsalBirimFiyatlari } from "@/lib/emsal/hesaplama";
import {
  alanFarkiMetni,
  formatTL,
  hesaplaAlanFarki,
  hesaplaHisseli,
  hesaplaNormal,
  hesaplaSeviyeli,
  hisseliMetni,
  normalMetni,
  seviyeliMetni,
  yontemSonuclari,
} from "./deger-hesaplama";
import type { KurumIncelemesi, NotKaydi, RuhsatIncelemeData, Talep, Tapu } from "./types";

export interface ValuationReportSection {
  // Stable key used to attach akıcı metin texts to the right section.
  id?: string;
  title: string;
  // The tab (menu path) the text is built from; shown in the on-screen report view only.
  source?: string;
  paragraphs: string[];
}

export interface GeneratedValuationReport {
  title: string;
  fileName: string;
  executiveSummary: string;
  valuationConclusion: string;
  fullReport: string;
  // Sections that have text — used for the exported Word / PDF report.
  sections: ValuationReportSection[];
  // Every tab in menu order, including those without data yet — used for the on-screen view.
  tumSekmeler: ValuationReportSection[];
}

function compact(parts: Array<string | null | undefined | false>): string[] {
  return parts.map((part) => (typeof part === "string" ? part.trim() : "")).filter(Boolean);
}

function joinSentence(parts: Array<string | null | undefined | false>): string {
  return compact(parts).join(" ");
}

function joinWithComma(parts: Array<string | null | undefined | false>): string {
  return compact(parts).join(", ");
}

function formatBool(value: boolean, positive: string, negative = "bulunmamaktadır"): string {
  return value ? positive : negative;
}

function formatDate(value: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatArea(value: string): string {
  return value ? `${value} m2` : "";
}

function makeFileName(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function buildAddressLine(tapu: Tapu): string {
  return joinWithComma([
    tapu.adresKonum.mahalle,
    tapu.adresKonum.koy,
    tapu.adresKonum.semtMevki,
    tapu.adresKonum.caddeBulvar,
    tapu.adresKonum.sokak,
    tapu.adresKonum.disKapi ? `Dış Kapı: ${tapu.adresKonum.disKapi}` : "",
    tapu.adresKonum.icKapi ? `İç Kapı: ${tapu.adresKonum.icKapi}` : "",
    tapu.adresKonum.ilce,
    tapu.adresKonum.il,
  ]);
}

function isArsaNiteligi(talep: Talep, tapu: Tapu): boolean {
  return [tapu.talepDetayi.tasinmazNiteligi, talep.tasinmazNiteligi].some(
    (value) => value.trim().toLocaleUpperCase("tr-TR") === "ARSA",
  );
}

function buildArsaLocationParagraph(tapu: Tapu): string {
  const mevkiiPart = tapu.tapuKaydi.mevkii ? `${tapu.tapuKaydi.mevkii} Mevkii,` : "";
  const mainParts = compact([
    tapu.tapuKaydi.il ? `${tapu.tapuKaydi.il} İli,` : "",
    tapu.tapuKaydi.ilce ? `${tapu.tapuKaydi.ilce} İlçesi,` : "",
    tapu.tapuKaydi.mahalleKoyAdi ? `${tapu.tapuKaydi.mahalleKoyAdi},` : "",
    mevkiiPart,
    tapu.tapuKaydi.ada ? `${tapu.tapuKaydi.ada} Ada` : "",
    tapu.tapuKaydi.parsel ? `${tapu.tapuKaydi.parsel} parsel numaralı,` : "",
    tapu.tapuKaydi.atYuzolcum ? `${tapu.tapuKaydi.atYuzolcum} m2 yüzölçümlü` : "",
    tapu.tapuKaydi.anaTasinmazNitelik ? `"${tapu.tapuKaydi.anaTasinmazNitelik}" nitelikli` : "",
  ]);

  if (mainParts.length === 0) {
    return "Değerleme konusu taşınmaza ait tapu kayıt bilgileri henüz rapor metnine aktarılacak düzeyde doldurulmamıştır.";
  }

  return `Değerleme konusu taşınmaz tapu kayıtlarında; ${mainParts.join(" ")} taşınmazdır.`
    .replace(/\s+,/g, ",")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function buildLocationParagraph(tapu: Tapu): string {
  const address = buildAddressLine(tapu);
  if (tapu.adresKonum.konumAnalizi.trim()) {
    return joinSentence([
      address ? `Taşınmaz ${address} adresinde konumlanmaktadır.` : "",
      tapu.adresKonum.konumAnalizi,
    ]);
  }

  return joinSentence([
    address ? `Taşınmaz ${address} adresinde yer almaktadır.` : "Taşınmazın açık adres bilgileri kısmen girilmiştir.",
    tapu.adresKonum.enlem && tapu.adresKonum.boylam
      ? `Konum koordinatları ${tapu.adresKonum.enlem} / ${tapu.adresKonum.boylam} olarak kaydedilmiştir.`
      : "",
    tapu.adresKonum.postaKodu ? `Posta kodu ${tapu.adresKonum.postaKodu} olarak görünmektedir.` : "",
  ]);
}

function hasSerhRecord(tapu: Tapu): boolean {
  return tapu.tapuKaydi.serhBeyanIrtifaklar.some((item) =>
    [item.turu, item.aciklama, item.tarih, item.yevmiyeNo].some((value) => value.trim()),
  );
}

function hasRehinRecord(tapu: Tapu): boolean {
  return tapu.tapuKaydi.rehinler.some((item) =>
    [item.alacakli, item.borc, item.faiz, item.dereceSira, item.borcluMalik, item.tarih, item.yevmiyeNo].some((value) =>
      value.trim(),
    ),
  );
}

function buildTapuTakbisIntro(tapu: Tapu, hasAnyTakyidat: boolean): string {
  return joinSentence([
    "TAKBİS (Tapu ve Kadastro Bilgi Sistemi) ekranından elektronik ortamda",
    tapu.tapuKaydi.tarih ? `${formatDate(tapu.tapuKaydi.tarih)} tarih` : "",
    tapu.tapuKaydi.saat ? `ve ${tapu.tapuKaydi.saat} saat` : "",
    "itibariyle alınan ve rapor ekinde yer alan Tapu Kayıt Belgesine göre",
    tapu.tapuKaydi.ada ? `${tapu.tapuKaydi.ada} Ada` : "",
    tapu.tapuKaydi.parsel ? `${tapu.tapuKaydi.parsel} Parsel` : "",
    hasAnyTakyidat
      ? "üzerinde aşağıdaki takyidat bulunmaktadır."
      : "üzerinde herhangi bir takyidat bulunmamaktadır.",
  ]);
}

function pluralizeSerhType(value: string): string {
  const normalized = value.trim();
  if (!normalized) return "Ş/B/İler";

  const lower = normalized.toLocaleLowerCase("tr-TR");
  if (lower === "beyan") return "Beyanlar";
  if (lower === "şerh" || lower === "serh") return "Şerhler";
  if (lower === "irtifak") return "İrtifaklar";

  if (/[aeıioöuü]$/i.test(normalized)) {
    return `${normalized}lar`;
  }

  return `${normalized}ler`;
}

function buildOwnershipParagraphs(tapu: Tapu): string[] {
  const hasSerh = hasSerhRecord(tapu);
  const hasRehin = hasRehinRecord(tapu);
  const hasAnyTakyidat = hasSerh || hasRehin;

  const paragraphs: string[] = [buildTapuTakbisIntro(tapu, hasAnyTakyidat)];

  if (hasSerh) {
    const firstTuru = tapu.tapuKaydi.serhBeyanIrtifaklar.find((item) => item.turu.trim())?.turu.trim() || "Ş/B/İ";
    paragraphs.push(`${pluralizeSerhType(firstTuru)} Hanesinde`);

    paragraphs.push(
      ...tapu.tapuKaydi.serhBeyanIrtifaklar
        .filter((item) => [item.turu, item.aciklama, item.tarih, item.yevmiyeNo].some((value) => value.trim()))
        .map((item) =>
          joinSentence([
            `${item.turu || "Ş/B/İ"} :`,
            item.aciklama || "",
            item.tarih || item.yevmiyeNo
              ? `(${compact([
                  item.tarih ? `${formatDate(item.tarih)} tarih` : "",
                  item.yevmiyeNo ? `${item.yevmiyeNo} yevmiye no` : "",
                ]).join(" ve ")})`
              : "",
          ]),
        ),
    );
  }

  if (hasRehin) {
    paragraphs.push("Rehinler Hanesinde:");
    paragraphs.push(
      ...tapu.tapuKaydi.rehinler
        .filter((item) =>
          [item.alacakli, item.borc, item.faiz, item.dereceSira, item.borcluMalik, item.tarih, item.yevmiyeNo].some(
            (value) => value.trim(),
          ),
        )
        .map((item) =>
          joinSentence([
            "Rehin:",
            item.alacakli ? `${item.alacakli} lehine` : "",
            item.borc ? `${item.borc} TL bedel` : "",
            item.dereceSira ? `${item.dereceSira} dereceden` : "",
            item.borcluMalik ? `${item.borcluMalik} adına` : "",
            "ipotek kaydı mevcuttur.",
            item.tarih || item.yevmiyeNo
              ? `(${compact([
                  item.tarih ? `${formatDate(item.tarih)} tarih` : "",
                  item.yevmiyeNo ? `${item.yevmiyeNo} yevmiye no` : "",
                ]).join(" ve ")})`
              : "",
          ]),
        ),
    );
  }

  return paragraphs;
}

function buildRuhsatParagraph(ruhsat: RuhsatIncelemeData): string {
  if (ruhsat.ruhsatResmiEvrakVarMi === "Hayır") {
    return "Ruhsat ve resmi evrak incelemesinde herhangi bir belge ibraz edilmediği işaretlenmiştir.";
  }

  if (ruhsat.ruhsatResmiEvrakVarMi !== "Evet") {
    return "Ruhsat ve resmi evrak inceleme bilgileri henüz tamamlanmamıştır.";
  }

  const belgeSummary =
    ruhsat.belgeler.length > 0
      ? ruhsat.belgeler
          .map((item) =>
            joinWithComma([
              item.belgeCinsi,
              item.belgeTarihi ? `tarih: ${formatDate(item.belgeTarihi)}` : "",
              item.belgeNo ? `no: ${item.belgeNo}` : "",
            ]),
          )
          .filter(Boolean)
          .join("; ")
      : "";

  return joinSentence([
    ruhsat.incelenenKurumAdi ? `İnceleme ${ruhsat.incelenenKurumAdi} nezdinde gerçekleştirilmiştir.` : "",
    belgeSummary ? `İbraz edilen belgeler: ${belgeSummary}.` : "Belge satırları henüz detaylandırılmamıştır.",
  ]);
}

function buildProjectParagraph(items: KurumIncelemesi[]): string {
  if (items.length === 0) {
    return "Proje incelemeleri bölümünde kayıtlı veri bulunmamaktadır.";
  }

  const lines = items
    .map((item) =>
      joinSentence([
        item.kurum ? `${item.kurum} nezdinde` : "",
        item.incelemeTuru ? `${item.incelemeTuru} incelemesi` : "inceleme kaydı",
        item.durum ? `${item.durum.toLocaleLowerCase("tr-TR")} durumundadır.` : "oluşturulmuştur.",
        item.tarih ? `Tarih ${formatDate(item.tarih)}.` : "",
        item.notlar ? `Not: ${item.notlar}.` : "",
      ]),
    )
    .filter(Boolean);

  return lines.join(" ");
}

function buildPlanningParagraph(tapu: Tapu): string {
  return joinSentence([
    tapu.imarDurumu.meriImarPlani ? `Taşınmaz ${tapu.imarDurumu.meriImarPlani} kapsamında kalmaktadır.` : "",
    tapu.imarDurumu.fonksiyon ? `Fonksiyon ${tapu.imarDurumu.fonksiyon} olarak belirtilmiştir.` : "",
    tapu.imarDurumu.tasdikTarihi ? `Tasdik tarihi ${formatDate(tapu.imarDurumu.tasdikTarihi)}.` : "",
    tapu.imarDurumu.pafta || tapu.imarDurumu.ada || tapu.imarDurumu.parsel
      ? joinSentence([
          tapu.imarDurumu.pafta ? `Pafta ${tapu.imarDurumu.pafta}` : "",
          tapu.imarDurumu.ada ? `ada ${tapu.imarDurumu.ada}` : "",
          tapu.imarDurumu.parsel ? `parsel ${tapu.imarDurumu.parsel}` : "",
        ]).replace(/\.$/, "") + " olarak kayıtlıdır."
      : "",
    tapu.imarDurumu.ilce || tapu.imarDurumu.mahalle
      ? `${[tapu.imarDurumu.mahalle, tapu.imarDurumu.ilce].filter(Boolean).join(" mahallesi, ")} sınırları içinde yer almaktadır.`
      : "",
    tapu.imarDurumu.hesapAlani ? `Hesap alanı ${tapu.imarDurumu.hesapAlani} m² olarak belirlenmiştir.` : "",
    tapu.imarDurumu.katAdedi ? `Kat adedi ${tapu.imarDurumu.katAdedi}.` : "",
    tapu.imarDurumu.binaYuksekligi ? `Bina yüksekliği ${tapu.imarDurumu.binaYuksekligi}.` : "",
    tapu.imarDurumu.insaatNizami ? `İnşaat nizamı ${tapu.imarDurumu.insaatNizami} olarak belirtilmiştir.` : "",
    tapu.imarDurumu.taks ? `TAKS ${tapu.imarDurumu.taks}.` : "",
    tapu.imarDurumu.kaks ? `KAKS (Emsal) ${tapu.imarDurumu.kaks}.` : "",
    tapu.imarDurumu.kotAlinacakNokta ? `Kot alınacak nokta: ${tapu.imarDurumu.kotAlinacakNokta}.` : "",
  ]);
}

function buildBuildingParagraph(tapu: Tapu): string {
  return joinSentence([
    tapu.anaGayrimenkul.binaTuru ? `Ana gayrimenkulün bina türü ${tapu.anaGayrimenkul.binaTuru} olarak değerlendirilmiştir.` : "",
    tapu.anaGayrimenkul.yapimYili ? `Yapım yılı ${tapu.anaGayrimenkul.yapimYili}.` : "",
    tapu.anaGayrimenkul.katSayisi ? `Toplam kat sayısı ${tapu.anaGayrimenkul.katSayisi}.` : "",
    tapu.anaGayrimenkul.toplamInsaatAlaniM2 ? `Toplam inşaat alanı ${formatArea(tapu.anaGayrimenkul.toplamInsaatAlaniM2)}.` : "",
    tapu.anaGayrimenkul.yapiSinifi ? `Yapı sınıfı ${tapu.anaGayrimenkul.yapiSinifi}.` : "",
    tapu.anaGayrimenkul.genelDurum ? `Genel fiziki durum ${tapu.anaGayrimenkul.genelDurum.toLocaleLowerCase("tr-TR")} seviyededir.` : "",
    tapu.anaGayrimenkul.yapiRuhsatiTarihi ? `Yapı ruhsatı tarihi ${formatDate(tapu.anaGayrimenkul.yapiRuhsatiTarihi)}.` : "",
    tapu.anaGayrimenkul.iskanDurumu ? `İskan durumu ${tapu.anaGayrimenkul.iskanDurumu.toLocaleLowerCase("tr-TR")} olarak kaydedilmiştir.` : "",
    `Asansör ${formatBool(tapu.anaGayrimenkul.asansor, "bulunmaktadır")}, otopark ${formatBool(tapu.anaGayrimenkul.otopark, "bulunmaktadır")}.`,
  ]);
}

function buildIndependentSectionParagraph(tapu: Tapu): string {
  return joinSentence([
    tapu.bagimsizBolum.bagimsizBolumNo ? `Bağımsız bölüm numarası ${tapu.bagimsizBolum.bagimsizBolumNo} olarak kayıtlıdır.` : "",
    tapu.bagimsizBolum.bulunduguKat ? `Bulunduğu kat ${tapu.bagimsizBolum.bulunduguKat}.` : "",
    tapu.bagimsizBolum.kullanimSekli ? `Kullanım şekli ${tapu.bagimsizBolum.kullanimSekli.toLocaleLowerCase("tr-TR")} olarak belirtilmiştir.` : "",
    tapu.bagimsizBolum.odaSayisi ? `Oda sayısı ${tapu.bagimsizBolum.odaSayisi}.` : "",
    tapu.bagimsizBolum.brutAlanM2 ? `Brüt alan ${formatArea(tapu.bagimsizBolum.brutAlanM2)}.` : "",
    tapu.bagimsizBolum.netAlanM2 ? `Net alan ${formatArea(tapu.bagimsizBolum.netAlanM2)}.` : "",
    tapu.bagimsizBolum.isitmaTipi ? `Isıtma tipi ${tapu.bagimsizBolum.isitmaTipi.toLocaleLowerCase("tr-TR")} niteliğindedir.` : "",
    tapu.bagimsizBolum.cepheYonu ? `Cephe yönü ${tapu.bagimsizBolum.cepheYonu}.` : "",
    tapu.bagimsizBolum.manzara ? `Manzara bilgisi ${tapu.bagimsizBolum.manzara}.` : "",
    `Balkon ${formatBool(tapu.bagimsizBolum.balkon, "mevcuttur")}.`,
  ]);
}

function buildAraziParagraph(tapu: Tapu): string {
  const a = tapu.araziOzellikleri;
  if (a.mahallindekiNitelik === "bina-var") {
    return "Taşınmaz mahallinde tarla, bağ, bahçe vb. niteliğinde olup üzerinde yapı bulunmaktadır.";
  }
  const sekil = a.araziSekli === "Diğer" ? a.araziSekliDiger : a.araziSekli;
  const egim = a.araziYapisi === "Diğer" ? a.araziYapisiDiger : a.araziYapisi;
  const sulama = a.sulamaImkani === "Diğer" ? a.sulamaImkaniDiger : a.sulamaImkani;
  const kucuk = (v: string) => v.toLocaleLowerCase("tr-TR");
  const cepheler = (a.digerCepheler ?? []).filter((c) => c.yon && c.bilgi.trim());
  const olculer = [
    a.parselGenisligi ? `genişliği yaklaşık ${a.parselGenisligi} m` : "",
    a.parselDerinligi ? `derinliği yaklaşık ${a.parselDerinligi} m` : "",
  ].filter(Boolean);
  return joinSentence([
    a.mahallindekiNitelik === "bina-yok" ? "Taşınmaz mahallinde tarla, bağ, bahçe vb. niteliğinde olup üzerinde yapı bulunmamaktadır." : "",
    sekil ? `Arazi şekli ${kucuk(sekil)} olarak tespit edilmiştir.` : "",
    egim ? `Arazi eğimi ${kucuk(egim)} niteliktedir.` : "",
    sulama ? `Sulama imkânı: ${kucuk(sulama)}.` : "",
    a.mahallindekiNitelik === "bina-yok"
      ? (a.yolCepheleri ?? []).length
        ? `Taşınmazın ${(a.yolCepheleri ?? []).map(kucuk).join(", ")} yönünden kadastral yola cephesi bulunmaktadır.`
        : "Taşınmazın kadastral yola cephesi bulunmamaktadır."
      : "",
    cepheler.length ? `Diğer cepheler: ${cepheler.map((c) => `${kucuk(c.yon)} yönünde ${c.bilgi.trim()}`).join("; ")}.` : "",
    a.ekiliUrun === "Evet"
      ? `Taşınmaz üzerinde ekili ürün bulunmaktadır${a.ekiliUrunBilgi.trim() ? ` (${a.ekiliUrunBilgi.trim()})` : ""}.`
      : a.ekiliUrun === "Hayır"
        ? "Taşınmaz üzerinde ekili ürün bulunmamaktadır."
        : "",
    olculer.length ? `Parselin ${olculer.join(", ")} olarak ölçülmüştür.` : "",
    a.toprakYapisi ? `Toprak yapısı ${kucuk(a.toprakYapisi)}.` : "",
    a.digerAciklama?.trim() ?? "",
  ]);
}

const isArazi = (tapu: Tapu) => tapu.talepDetayi.tasinmazNiteligi === "TARLA, BAĞ, BAHÇE VB.";

const EMSAL_ANAHTARLARI = {
  satilik: ["satilik1", "satilik2", "satilik3", "satilik4", "satilik5"],
  kiralik: ["kiralik1", "kiralik2"],
} as const;

function buildEmsalParagraphs(tapu: Tapu): string[] {
  const paragraphs: string[] = [];

  for (const tur of ["satilik", "kiralik"] as const) {
    const kayitlar = EMSAL_ANAHTARLARI[tur].map((key) => tapu.emsaller[key]);
    paragraphs.push(...kayitlar.map((k) => k.akiciMetinAciklama.trim()).filter(Boolean));

    const ort = ortalamaEmsalBirimFiyatlari(kayitlar);
    if (ort.birim !== null && ort.net !== null) {
      paragraphs.push(
        `${tur === "satilik" ? "Satılık" : "Kiralık"} emsallerin ortalama birim fiyatı ${formatTL(ort.birim)}/m2, ` +
          `şerefiye düzeltmeleri sonrası ortalama net birim fiyatı ${formatTL(ort.net)}/m2 olarak hesaplanmıştır (${ort.adet} emsal).`,
      );
    }
  }

  if (tapu.emsaller.digerAciklamalar.trim()) paragraphs.push(tapu.emsaller.digerAciklamalar.trim());
  return paragraphs;
}

function buildNotParagraphs(notlar: NotKaydi[]): string[] {
  return notlar
    .filter((n) => n.baslik.trim() || n.detay.trim())
    .map((n) => `${n.baslik.trim()}: ${n.detay.trim().replace(/\s*\n+\s*/g, " ")}`);
}

function metinSatirlari(metin: string): string[] {
  return metin.split("\n").filter(Boolean);
}

// Every value the Değer Hesaplaması cards have produced so far.
function degerSonuclari(tapu: Tapu): { ad: string; deger: number }[] {
  const h = tapu.degerleme.hesaplamalar;
  const sonuclar: { ad: string; deger: number | null }[] = [
    { ad: "Normal değerleme", deger: hesaplaNormal(h.normal) },
    { ad: "Alan farkı değerleme", deger: hesaplaAlanFarki(h.alanFarki)?.toplam ?? null },
    { ad: "Seviyeli değerleme (güncel satış değeri)", deger: hesaplaSeviyeli(h.seviyeli).guncel },
    { ad: "Hisseli değerleme (yasal ve mevcut durum değeri)", deger: hesaplaHisseli(h.hisseli).durum?.yuvarlanmis ?? null },
  ];
  return sonuclar.filter((s): s is { ad: string; deger: number } => s.deger !== null);
}

function buildDegerHesaplamaParagraphs(tapu: Tapu): string[] {
  const h = tapu.degerleme.hesaplamalar;
  return [
    normalMetni(h.normal),
    alanFarkiMetni(h.alanFarki),
    ...metinSatirlari(seviyeliMetni(hesaplaSeviyeli(h.seviyeli))),
    ...metinSatirlari(hisseliMetni(h.hisseli, hesaplaHisseli(h.hisseli))),
  ].filter(Boolean);
}

// The single figure the report can put forward: the method chosen as esas in
// Değer Hesaplaması, otherwise the result of the only calculation filled in.
function oneCikanDeger(tapu: Tapu): string | null {
  const h = tapu.degerleme.hesaplamalar;
  const esas = h.esasYontem ? yontemSonuclari(h)[h.esasYontem] : null;
  if (esas !== null) return formatTL(esas);
  const sonuclar = degerSonuclari(tapu);
  return sonuclar.length === 1 ? formatTL(sonuclar[0].deger) : null;
}

function buildCokluDegerCumlesi(tapu: Tapu): string {
  const sonuclar = degerSonuclari(tapu);
  if (sonuclar.length < 2) return "";
  return `Değer hesaplamaları: ${sonuclar.map((s) => `${s.ad} ${formatTL(s.deger)}`).join("; ")}.`;
}

// Which report section a form's akıcı metin belongs to, by the form's key
// (its title, or "<Emsal> · <title>" for emsal slots). Unmatched forms go to
// "Diğer Akıcı Metinler".
const AKICI_METIN_BOLUMLERI: [RegExp, string][] = [
  [/^(Talep Oluşturma Bilgileri|Talep Detayı)$/, "ozet"],
  [/^(Adres Bilgileri|Bölge Özellikleri)/, "konum"],
  [/^Tapu Kayıt Bilgileri/, "tapu"],
  [/(Ruhsat|Proje İnceleme|Kurum İnceleme)/, "ruhsat"],
  [/(Meri İmar Planı|Kadastro Parsel)/, "imar"],
  [/(Ana Gayrimenkul|Üzerindeki Yapı|Bağımsız Bölüm Özellikleri|Taşınmaz Özellikleri|İsteğe Bağlı Özellik|^Tapu Bilgileri Formu)/, "yapi"],
  [/Satış Kabiliyeti/, "satis"],
  [/Değerleme Açıklama/, "aciklama"],
  [/Değerleme$/, "deger"],
  [/Emsal/, "emsal"],
];

export function akiciMetinBolumu(anahtar: string): string {
  return AKICI_METIN_BOLUMLERI.find(([re]) => re.test(anahtar))?.[1] ?? "diger";
}

// A saved akıcı metin as report paragraphs (one per non-empty line).
function akiciParagraflar(metin: string): string[] {
  return metin
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function generateValuationReport(params: {
  talep: Talep;
  tapu: Tapu;
  sharedRuhsat?: RuhsatIncelemeData;
}): GeneratedValuationReport {
  const { talep, tapu, sharedRuhsat } = params;
  const title = joinWithComma([
    "Eksperix Değerleme Raporu",
    tapu.raporSonucu.raporNo || talep.talepNo,
    tapu.ad,
  ]);

  const deger = oneCikanDeger(tapu);
  const cokluDeger = buildCokluDegerCumlesi(tapu);

  // One entry per tab of the talep, in menu order; `source` names the tab(s) the text comes from.
  const hamSekmeler: ValuationReportSection[] = [
    {
      id: "ozet",
      title: "Talep ve Taşınmaz Özeti",
      source: "Genel Bilgiler → Talep Detayı",
      paragraphs: [
        joinSentence([
          talep.musteriUnvani ? `${talep.musteriUnvani} için hazırlanan bu çalışma` : "Bu çalışma",
          talep.degerlemeFirmasi ? `${talep.degerlemeFirmasi} tarafından yürütülen` : "",
          talep.tasinmazNiteligi ? `${talep.tasinmazNiteligi} nitelikli taşınmaza` : "taşınmaza",
          "ilişkin değerleme tespitlerini içermektedir.",
        ]),
        joinSentence([
          talep.degerlemeKurumBanka ? `Talep sahibi kurum ${talep.degerlemeKurumBanka} olarak görünmektedir.` : "",
          tapu.talepDetayi.talepTuru ? `Talep türü ${tapu.talepDetayi.talepTuru.toLocaleLowerCase("tr-TR")} olarak kaydedilmiştir.` : "",
          tapu.talepDetayi.dosyaNo ? `Dosya no ${tapu.talepDetayi.dosyaNo}.` : "",
          tapu.talepDetayi.oncelik ? `Öncelik seviyesi ${tapu.talepDetayi.oncelik.toLocaleLowerCase("tr-TR")} düzeydedir.` : "",
        ]),
      ].filter(Boolean),
    },
    {
      id: "konum",
      title: "Konum ve Çevre Özellikleri",
      source: "Genel Bilgiler → Adres / Konum",
      paragraphs: [isArsaNiteligi(talep, tapu) ? buildArsaLocationParagraph(tapu) : buildLocationParagraph(tapu)].filter(Boolean),
    },
    {
      id: "tapu",
      title: "Tapu ve Hukuki İnceleme",
      source: "Genel Bilgiler → Tapu Kaydı",
      paragraphs: buildOwnershipParagraphs(tapu).filter(Boolean),
    },
    {
      id: "ruhsat",
      title: "Ruhsat ve Proje İncelemeleri",
      source: "Kurum İncelemeleri → Ruhsat / Proje İncelemeleri",
      paragraphs: [buildRuhsatParagraph(sharedRuhsat ?? tapu.kurumIncelemeleri), buildProjectParagraph(tapu.projeIncelemeleri)].filter(
        Boolean,
      ),
    },
    {
      id: "imar",
      title: "İmar Durumu",
      source: "Kurum İncelemeleri → İmar Durumu",
      paragraphs: [buildPlanningParagraph(tapu)].filter(Boolean),
    },
    {
      id: "yapi",
      title: isArazi(tapu) ? "Arazi Özellikleri" : "Yapı ve Bağımsız Bölüm Özellikleri",
      source: isArazi(tapu) ? "Özellikler → Ana Gayrimenkul (Arazi)" : "Özellikler → Ana Gayrimenkul / Bağımsız Bölüm",
      paragraphs: (isArazi(tapu)
        ? [buildAraziParagraph(tapu), buildIndependentSectionParagraph(tapu)]
        : [buildBuildingParagraph(tapu), buildIndependentSectionParagraph(tapu)]
      ).filter(Boolean),
    },
    {
      id: "satis",
      title: "Satış Kabiliyeti",
      source: "Değerleme → Satış Kabiliyeti Açıklaması",
      paragraphs: buildNotParagraphs(tapu.degerleme.satisKabiliyetiNotlari),
    },
    {
      id: "aciklama",
      title: "Değerleme Açıklamaları",
      source: "Değerleme → Değerleme Açıklaması",
      paragraphs: buildNotParagraphs(tapu.degerleme.degerlemeAciklamaNotlari),
    },
    {
      id: "deger",
      title: "Değerleme Analizi",
      source: "Değerleme → Değer Hesaplaması",
      paragraphs: buildDegerHesaplamaParagraphs(tapu),
    },
    {
      id: "emsal",
      title: "Emsal Analizi",
      source: "Araştırma → Emsal Girişleri",
      paragraphs: buildEmsalParagraphs(tapu),
    },
    {
      id: "sonuc",
      title: "Genel Sonuç ve Kanaat",
      source: "Rapor Sonucu",
      paragraphs: [
        joinSentence([
          tapu.raporSonucu.yoneticiOzeti ||
            "Yapılan incelemeler, mevcut belge akışı, fiziksel nitelikler ve çevresel veriler birlikte değerlendirilmiştir.",
        ]),
        joinSentence([
          tapu.raporSonucu.degerTakdirSonucu ||
            (deger
              ? `Taşınmaz için değer hesaplaması sonucunda ${deger} değerine ulaşılmıştır.`
              : cokluDeger || "Değer takdir sonucu henüz girilmemiştir."),
          tapu.raporSonucu.teslimTarihi ? `Teslim tarihi ${formatDate(tapu.raporSonucu.teslimTarihi)} olarak planlanmıştır.` : "",
        ]),
      ].filter(Boolean),
    },
  ];

  // Texts chosen from Akıcı Metin Şablonları take the place of the automatic
  // wording of their section (the user picked how it should read); forms
  // without a matching section get their own section before the conclusion.
  const akiciGruplar = new Map<string, string[]>();
  for (const [anahtar, metin] of Object.entries(tapu.akiciMetinler ?? {})) {
    const paragraflar = akiciParagraflar(metin);
    if (!paragraflar.length) continue;
    const bolum = akiciMetinBolumu(anahtar);
    akiciGruplar.set(bolum, [...(akiciGruplar.get(bolum) ?? []), ...paragraflar]);
  }
  for (const sekme of hamSekmeler) {
    const metinler = sekme.id ? akiciGruplar.get(sekme.id) : undefined;
    if (!metinler) continue;
    sekme.paragraphs = metinler;
    sekme.source = `${sekme.source ?? ""} · Akıcı Metin Şablonu`;
  }
  const digerAkici = akiciGruplar.get("diger");
  if (digerAkici) {
    hamSekmeler.splice(hamSekmeler.length - 1, 0, {
      id: "diger",
      title: "Diğer Tespitler",
      source: "Akıcı Metin Şablonları",
      paragraphs: digerAkici,
    });
  }

  const numarala = (list: ValuationReportSection[]) =>
    list.map((section, index) => ({ ...section, title: `${index + 1}. ${section.title}` }));
  const tumSekmeler = numarala(hamSekmeler);
  // The exported report skips empty tabs and numbers the remaining sections consecutively.
  const sections = numarala(hamSekmeler.filter((section) => section.paragraphs.length > 0));

  const executiveSummary = joinSentence([
    buildLocationParagraph(tapu),
    isArazi(tapu) ? buildAraziParagraph(tapu) : buildBuildingParagraph(tapu),
    deger ? `Rapor kapsamında ${deger} değer öne çıkmaktadır.` : cokluDeger,
  ]);

  const valuationConclusion = joinSentence([
    deger
      ? `Mevcut veriler ışığında taşınmazın değeri ${deger} olarak değerlendirilmektedir.`
      : cokluDeger || "Mevcut veriler ışığında değerleme kanaati oluşturulmuş, ancak değer hesaplaması henüz yapılmamıştır.",
  ]);

  const fullReport = [
    title,
    ...sections.flatMap((section) => [section.title, ...section.paragraphs, ""]),
  ]
    .join("\n")
    .trim();

  return {
    title,
    fileName: makeFileName(`${tapu.raporSonucu.raporNo || talep.talepNo}-${tapu.ad}`) || "eksperix-degerleme-raporu",
    executiveSummary,
    valuationConclusion,
    fullReport,
    sections,
    tumSekmeler,
  };
}
