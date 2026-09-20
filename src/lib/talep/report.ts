import type { KurumIncelemesi, RuhsatIncelemeData, Talep, Tapu } from "./types";

export interface ValuationReportSection {
  title: string;
  paragraphs: string[];
}

export interface GeneratedValuationReport {
  title: string;
  fileName: string;
  executiveSummary: string;
  valuationConclusion: string;
  fullReport: string;
  sections: ValuationReportSection[];
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

function parseNumeric(value: string): number | null {
  const normalized = value.trim();
  if (!normalized) return null;

  const noSpaces = normalized.replace(/\s/g, "");
  const commaCount = (noSpaces.match(/,/g) ?? []).length;
  const dotCount = (noSpaces.match(/\./g) ?? []).length;

  let candidate = noSpaces;
  if (commaCount > 0 && dotCount > 0) {
    candidate = candidate.replace(/\./g, "").replace(",", ".");
  } else if (commaCount > 0) {
    candidate = candidate.replace(/\./g, "").replace(",", ".");
  } else {
    candidate = candidate.replace(/,/g, "");
  }

  const parsed = Number(candidate);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatArea(value: string): string {
  return value ? `${value} m2` : "";
}

function formatCurrency(value: string): string {
  const parsed = parseNumeric(value);
  if (parsed === null) return value;
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(parsed);
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

function buildValuationParagraph(tapu: Tapu): string {
  return joinSentence([
    tapu.degerleme.emsalYaklasimiDegeri
      ? `Emsal yaklaşımı değeri ${formatCurrency(tapu.degerleme.emsalYaklasimiDegeri)} olarak hesaplanmıştır.`
      : "",
    tapu.degerleme.gelirYaklasimiDegeri
      ? `Gelir yaklaşımı değeri ${formatCurrency(tapu.degerleme.gelirYaklasimiDegeri)} seviyesindedir.`
      : "",
    tapu.degerleme.maliyetYaklasimiDegeri
      ? `Maliyet yaklaşımı değeri ${formatCurrency(tapu.degerleme.maliyetYaklasimiDegeri)} olarak görülmektedir.`
      : "",
    tapu.degerleme.nihaiDeger ? `Nihai değer ${formatCurrency(tapu.degerleme.nihaiDeger)} olarak takdir edilmiştir.` : "",
    tapu.degerleme.finalDegerKaynagi ? `Nihai değer kaynağı ${tapu.degerleme.finalDegerKaynagi}.` : "",
    tapu.degerleme.varyansYuzdesi ? `Varyans oranı %${tapu.degerleme.varyansYuzdesi} düzeyindedir.` : "",
    tapu.degerleme.mutabakatNotu ? `Mutabakat notu: ${tapu.degerleme.mutabakatNotu}.` : "",
  ]);
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

  const sections: ValuationReportSection[] = [
    {
      title: "1. Talep ve Taşınmaz Özeti",
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
      title: "2. Konum ve Çevre Özellikleri",
      paragraphs: [isArsaNiteligi(talep, tapu) ? buildArsaLocationParagraph(tapu) : buildLocationParagraph(tapu)].filter(Boolean),
    },
    {
      title: "3. Tapu ve Hukuki İnceleme",
      paragraphs: buildOwnershipParagraphs(tapu).filter(Boolean),
    },
    {
      title: "4. Ruhsat ve Proje İncelemeleri",
      paragraphs: [buildRuhsatParagraph(sharedRuhsat ?? tapu.kurumIncelemeleri), buildProjectParagraph(tapu.projeIncelemeleri)].filter(
        Boolean,
      ),
    },
    {
      title: "5. İmar, Yapı ve Bağımsız Bölüm Özellikleri",
      paragraphs: [buildPlanningParagraph(tapu), buildBuildingParagraph(tapu), buildIndependentSectionParagraph(tapu)].filter(Boolean),
    },
    {
      title: "6. Değerleme Analizi",
      paragraphs: [buildValuationParagraph(tapu)].filter(Boolean),
    },
    {
      title: "7. Genel Sonuç ve Kanaat",
      paragraphs: [
        joinSentence([
          tapu.raporSonucu.yoneticiOzeti ||
            "Yapılan incelemeler, mevcut belge akışı, fiziksel nitelikler ve çevresel veriler birlikte değerlendirilmiştir.",
        ]),
        joinSentence([
          tapu.raporSonucu.degerTakdirSonucu ||
            (tapu.degerleme.nihaiDeger
              ? `Taşınmaz için takdir edilen nihai değer ${formatCurrency(tapu.degerleme.nihaiDeger)} seviyesindedir.`
              : "Nihai değer takdir sonucu henüz girilmemiştir."),
          tapu.raporSonucu.teslimTarihi ? `Teslim tarihi ${formatDate(tapu.raporSonucu.teslimTarihi)} olarak planlanmıştır.` : "",
        ]),
      ].filter(Boolean),
    },
  ].filter((section) => section.paragraphs.length > 0);

  const executiveSummary = joinSentence([
    buildLocationParagraph(tapu),
    buildBuildingParagraph(tapu),
    tapu.degerleme.nihaiDeger ? `Rapor kapsamında nihai değer ${formatCurrency(tapu.degerleme.nihaiDeger)} olarak öne çıkmaktadır.` : "",
  ]);

  const valuationConclusion = joinSentence([
    tapu.degerleme.nihaiDeger
      ? `Mevcut veriler ışığında taşınmazın nihai değeri ${formatCurrency(tapu.degerleme.nihaiDeger)} olarak değerlendirilmektedir.`
      : "Mevcut veriler ışığında değerleme kanaati oluşturulmuş, ancak nihai değer alanı henüz doldurulmamıştır.",
    tapu.degerleme.durum ? `Değerleme durumu ${tapu.degerleme.durum.toLocaleLowerCase("tr-TR")} aşamasındadır.` : "",
    tapu.degerleme.mutabakatNotu ? `Uzman notu: ${tapu.degerleme.mutabakatNotu}.` : "",
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
  };
}
