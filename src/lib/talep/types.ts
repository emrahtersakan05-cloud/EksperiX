import type {
  BinaTuru,
  DegerlemeDurum,
  EvetHayir,
  FinalDegerKaynak,
  GenelDurum,
  IsitmaTipi,
  IskanDurumu,
  KullanimSekli,
  KurumIncelemeDurum,
  Oncelik,
  RaporDurum,
  TalepTuru,
} from "./options";

export interface TalepDetayiData {
  musteriUnvani: string;
  degerlemeFirmasi: string;
  degerlemeKurumBanka: string;
  tasinmazNiteligi: string;
  talepTuru: TalepTuru | "";
  ilgiliKurum: string;
  dosyaNo: string;
  oncelik: Oncelik | "";
  talepTarihi: string;
  hedefTeslimTarihi: string;
  atananEksper: string;
  notlar: string;
}

// A placemark parsed from the KML uploaded in Adres / Konum → Konum. Persisted
// on the tapu so other sections (e.g. the Emsal map) can show the subject property.
export interface KmlKonumu {
  id: string;
  name: string;
  descriptionFields: { label: string; value: string }[];
  descriptionText: string;
  latitude: number;
  longitude: number;
  hasPolygon: boolean;
  polygonRings: [number, number][][];
}

export interface AdresKonumData {
  uavtGorselUrl: string;
  kmlDosyaAdi: string;
  kmlKonumlari: KmlKonumu[];
  enlem: string;
  boylam: string;
  konumAnalizi: string;
  // Adres Bilgileri Formu
  il: string;
  ilce: string;
  mahalle: string;
  koy: string;
  semtMevki: string;
  caddeBulvar: string;
  sokak: string;
  // Numaraj Bilgileri Formu
  numarajKimlikNo: string;
  ada: string;
  parsel: string;
  pafta: string;
  postaKodu: string;
  numarajTipi: string;
  siteAdi: string;
  apartmanBlokAdi: string;
  disKapi: string;
  // Bağımsız Bölüm Bilgileri Formu
  bagimsizBolumKimlikNo: string;
  icKapi: string;
  kullanimAmaci: string;
  tip: string;
  durum: string;
  tapuNo: string;
}

export interface MulkiyetKaydi {
  id: string;
  malik: string;
  hissePay: string;
  hissePayda: string;
  metrekare: string;
  toplamMetrekare: string;
  tarih: string;
  yevmiyeNo: string;
}

export interface SerhBeyanIrtifak {
  id: string;
  turu: string;
  aciklama: string;
  tarih: string;
  yevmiyeNo: string;
}

export interface RehinKaydi {
  id: string;
  alacakli: string;
  borc: string;
  faiz: string;
  dereceSira: string;
  borcluMalik: string;
  tarih: string;
  yevmiyeNo: string;
}

export interface TapuKaydiData {
  tapuBelgesiUrl: string;
  // Tapu Kayıt Bilgileri Formu
  tarih: string;
  saat: string;
  zeminTipi: string;
  tasinmazKimlikNo: string;
  il: string;
  ilce: string;
  kurumAdi: string;
  mahalleKoyAdi: string;
  mevkii: string;
  cilt: string;
  sayfaNo: string;
  ada: string;
  parsel: string;
  atYuzolcum: string;
  bagimsizBolumNitelik: string;
  bagimsizBolumBrutYuzolcum: string;
  bagimsizBolumNetYuzolcum: string;
  blok: string;
  kat: string;
  giris: string;
  bbNo: string;
  arsaPay: string;
  arsaPayda: string;
  anaTasinmazNitelik: string;
  // Tapu Mülkiyet Bilgileri Formu
  mulkiyetKayitlari: MulkiyetKaydi[];
  // Taşınmaza Ait Şerh/Beyan/İrtifak Bilgileri Formu
  serhBeyanIrtifaklar: SerhBeyanIrtifak[];
  // Taşınmaza Ait Rehin Bilgileri Formu
  rehinler: RehinKaydi[];
}

export interface KurumIncelemesi {
  id: string;
  kurum: string;
  incelemeTuru: string;
  durum: KurumIncelemeDurum | "";
  tarih: string;
  notlar: string;
}

export interface RuhsatBelgeKaydi {
  id: string;
  belgeCinsi: string;
  belgeTarihi: string;
  belgeNo: string;
}

export interface RuhsatIncelemeData {
  ruhsatResmiEvrakVarMi: EvetHayir | "";
  incelenenKurumAdi: string;
  belgeler: RuhsatBelgeKaydi[];
}

export interface ImarDurumuData {
  // Meri İmar Planı
  meriImarPlani: string;
  fonksiyon: string;
  tasdikTarihi: string;
  pafta: string;
  olcek: string;
  ada: string;
  parsel: string;
  ilce: string;
  mahalle: string;
  hesapAlani: string;
  katAdedi: string;
  binaYuksekligi: string;
  onBahce: string;
  yanBahce: string;
  arkaBahce: string;
  insaatNizami: string;
  taks: string;
  kaks: string;
  kotAlinacakNokta: string;
  // Kadastro Parsel Konum Bilgisi
  projeksiyon: string;
  kartezyenKoordinat: string;
  cografiKoordinat: string;
}

export interface AnaGayrimenkulData {
  binaTuru: BinaTuru | "";
  yapimYili: string;
  katSayisi: string;
  toplamInsaatAlaniM2: string;
  yapiSinifi: string;
  asansor: boolean;
  otopark: boolean;
  disCepheDurumu: string;
  genelDurum: GenelDurum | "";
  yapiRuhsatiTarihi: string;
  iskanDurumu: IskanDurumu | "";
}

// TARLA, BAĞ, BAHÇE VB. taşınmaz niteliğinde Ana Gayrimenkul sekmesinde
// AnaGayrimenkulData yerine gösterilir; Tapu Bilgileri kısmı tapuKaydi'ndan okunur.
export interface AraziOzellikleriData {
  araziSekli: string;
  araziSekliDiger: string;
  araziYapisi: string;
  araziYapisiDiger: string;
  sulamaImkani: string;
  sulamaImkaniDiger: string;
}

export interface BagimsizBolumData {
  bagimsizBolumNo: string;
  bulunduguKat: string;
  brutAlanM2: string;
  netAlanM2: string;
  odaSayisi: string;
  kullanimSekli: KullanimSekli | "";
  cepheYonu: string;
  isitmaTipi: IsitmaTipi | "";
  banyoTuvaletSayisi: string;
  balkon: boolean;
  manzara: string;
  tapuNiteligi: string;
}

export interface DegerlemeData {
  alanM2: string;
  emsalYaklasimiDegeri: string;
  yillikNetGelir: string;
  kapitalizasyonOrani: string;
  gelirYaklasimiDegeri: string;
  m2BirimMaliyet: string;
  yipranmaOrani: string;
  maliyetYaklasimiDegeri: string;
  nihaiDeger: string;
  finalDegerKaynagi: FinalDegerKaynak | "";
  varyansYuzdesi: string;
  durum: DegerlemeDurum | "";
  mutabakatNotu: string;
}

export interface RaporSonucuData {
  raporNo: string;
  versiyon: string;
  durum: RaporDurum | "";
  yoneticiOzeti: string;
  degerTakdirSonucu: string;
  raporMetni: string;
  teslimTarihi: string;
}

export interface EmsalKaydi {
  gorselUrl: string;
  webAdresi: string;
  // Emsal Bilgileri
  ilanTarihi: string;
  emlakTipi: string;
  kimden: string;
  telefonNo: string;
  m2Brut: string;
  m2Net: string;
  gercekAlan: string;
  odaSayisi: string;
  binaYasi: string;
  bulunduguKat: string;
  // Emsal Konum Bilgileri
  il: string;
  ilce: string;
  koyMahalle: string;
  semt: string;
  adaNo: string;
  parselNo: string;
  enlem: string;
  boylam: string;
  // Emsal Değer Bilgiler
  istenenFiyat: string;
  pazarlikliFiyat: string;
  birimFiyat: string;
  konumSerefiyesi: string;
  yapiSerefiyesi: string;
  katSerefiyesi: string;
  netBirimFiyat: string;
  // Emsal Akıcı Metin Açıklaması
  tanim1: string;
  tanim2: string;
  akiciMetinAciklama: string;
}

export interface EmsallerData {
  satilik1: EmsalKaydi;
  satilik2: EmsalKaydi;
  satilik3: EmsalKaydi;
  satilik4: EmsalKaydi;
  satilik5: EmsalKaydi;
  kiralik1: EmsalKaydi;
  kiralik2: EmsalKaydi;
  digerAciklamalar: string;
}

export interface Tapu {
  id: string;
  ad: string;
  talepDetayi: TalepDetayiData;
  adresKonum: AdresKonumData;
  tapuKaydi: TapuKaydiData;
  kurumIncelemeleri: RuhsatIncelemeData;
  projeIncelemeleri: KurumIncelemesi[];
  imarDurumu: ImarDurumuData;
  anaGayrimenkul: AnaGayrimenkulData;
  araziOzellikleri: AraziOzellikleriData;
  bagimsizBolum: BagimsizBolumData;
  degerleme: DegerlemeData;
  emsaller: EmsallerData;
  raporSonucu: RaporSonucuData;
}

export type TapuSectionKey =
  | "talepDetayi"
  | "adresKonum"
  | "tapuKaydi"
  | "kurumIncelemeleri"
  | "projeIncelemeleri"
  | "imarDurumu"
  | "anaGayrimenkul"
  | "bagimsizBolum"
  | "degerleme"
  | "emsaller"
  | "yakinRaporlarAdaParsel"
  | "yakinRaporlarHarita"
  | "emlakSitesiIlanlari"
  | "raporSonucu";

export interface Talep {
  id: string;
  talepNo: string;
  musteriUnvani: string;
  degerlemeFirmasi: string;
  degerlemeKurumBanka: string;
  tasinmazNiteligi: string;
  olusturmaTarihi: string;
  tapular: Tapu[];
}

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export interface TalepDetayiDefaults {
  musteriUnvani: string;
  degerlemeFirmasi: string;
  degerlemeKurumBanka: string;
  tasinmazNiteligi: string;
}

function createEmptyEmsalKaydi(): EmsalKaydi {
  return {
    gorselUrl: "",
    webAdresi: "",
    ilanTarihi: "",
    emlakTipi: "",
    kimden: "",
    telefonNo: "",
    m2Brut: "",
    m2Net: "",
    gercekAlan: "",
    odaSayisi: "",
    binaYasi: "",
    bulunduguKat: "",
    il: "",
    ilce: "",
    koyMahalle: "",
    semt: "",
    adaNo: "",
    parselNo: "",
    enlem: "",
    boylam: "",
    istenenFiyat: "",
    pazarlikliFiyat: "",
    birimFiyat: "",
    konumSerefiyesi: "",
    yapiSerefiyesi: "",
    katSerefiyesi: "",
    netBirimFiyat: "",
    tanim1: "",
    tanim2: "",
    akiciMetinAciklama: "",
  };
}

export function createEmptyTapu(index: number, defaults?: TalepDetayiDefaults): Tapu {
  return {
    id: newId(),
    ad: `Tapu ${index}`,
    talepDetayi: {
      musteriUnvani: defaults?.musteriUnvani ?? "",
      degerlemeFirmasi: defaults?.degerlemeFirmasi ?? "",
      degerlemeKurumBanka: defaults?.degerlemeKurumBanka ?? "",
      tasinmazNiteligi: defaults?.tasinmazNiteligi ?? "",
      talepTuru: "",
      ilgiliKurum: "",
      dosyaNo: "",
      oncelik: "",
      talepTarihi: "",
      hedefTeslimTarihi: "",
      atananEksper: "",
      notlar: "",
    },
    adresKonum: {
      uavtGorselUrl: "",
      kmlDosyaAdi: "",
      kmlKonumlari: [],
      enlem: "",
      boylam: "",
      konumAnalizi: "",
      il: "",
      ilce: "",
      mahalle: "",
      koy: "",
      semtMevki: "",
      caddeBulvar: "",
      sokak: "",
      numarajKimlikNo: "",
      ada: "",
      parsel: "",
      pafta: "",
      postaKodu: "",
      numarajTipi: "",
      siteAdi: "",
      apartmanBlokAdi: "",
      disKapi: "",
      bagimsizBolumKimlikNo: "",
      icKapi: "",
      kullanimAmaci: "",
      tip: "",
      durum: "",
      tapuNo: "",
    },
    tapuKaydi: {
      tapuBelgesiUrl: "",
      tarih: "",
      saat: "",
      zeminTipi: "",
      tasinmazKimlikNo: "",
      il: "",
      ilce: "",
      kurumAdi: "",
      mahalleKoyAdi: "",
      mevkii: "",
      cilt: "",
      sayfaNo: "",
      ada: "",
      parsel: "",
      atYuzolcum: "",
      bagimsizBolumNitelik: "",
      bagimsizBolumBrutYuzolcum: "",
      bagimsizBolumNetYuzolcum: "",
      blok: "",
      kat: "",
      giris: "",
      bbNo: "",
      arsaPay: "",
      arsaPayda: "",
      anaTasinmazNitelik: "",
      mulkiyetKayitlari: [],
      serhBeyanIrtifaklar: [],
      rehinler: [],
    },
    kurumIncelemeleri: {
      ruhsatResmiEvrakVarMi: "",
      incelenenKurumAdi: "",
      belgeler: [],
    },
    projeIncelemeleri: [],
    imarDurumu: {
      meriImarPlani: "",
      fonksiyon: "",
      tasdikTarihi: "",
      pafta: "",
      olcek: "",
      ada: "",
      parsel: "",
      ilce: "",
      mahalle: "",
      hesapAlani: "",
      katAdedi: "",
      binaYuksekligi: "",
      onBahce: "",
      yanBahce: "",
      arkaBahce: "",
      insaatNizami: "",
      taks: "",
      kaks: "",
      kotAlinacakNokta: "",
      projeksiyon: "",
      kartezyenKoordinat: "",
      cografiKoordinat: "",
    },
    anaGayrimenkul: {
      binaTuru: "",
      yapimYili: "",
      katSayisi: "",
      toplamInsaatAlaniM2: "",
      yapiSinifi: "",
      asansor: false,
      otopark: false,
      disCepheDurumu: "",
      genelDurum: "",
      yapiRuhsatiTarihi: "",
      iskanDurumu: "",
    },
    araziOzellikleri: {
      araziSekli: "",
      araziSekliDiger: "",
      araziYapisi: "",
      araziYapisiDiger: "",
      sulamaImkani: "",
      sulamaImkaniDiger: "",
    },
    bagimsizBolum: {
      bagimsizBolumNo: "",
      bulunduguKat: "",
      brutAlanM2: "",
      netAlanM2: "",
      odaSayisi: "",
      kullanimSekli: "",
      cepheYonu: "",
      isitmaTipi: "",
      banyoTuvaletSayisi: "",
      balkon: false,
      manzara: "",
      tapuNiteligi: "",
    },
    degerleme: {
      alanM2: "",
      emsalYaklasimiDegeri: "",
      yillikNetGelir: "",
      kapitalizasyonOrani: "",
      gelirYaklasimiDegeri: "",
      m2BirimMaliyet: "",
      yipranmaOrani: "",
      maliyetYaklasimiDegeri: "",
      nihaiDeger: "",
      finalDegerKaynagi: "",
      varyansYuzdesi: "",
      durum: "",
      mutabakatNotu: "",
    },
    emsaller: {
      satilik1: createEmptyEmsalKaydi(),
      satilik2: createEmptyEmsalKaydi(),
      satilik3: createEmptyEmsalKaydi(),
      satilik4: createEmptyEmsalKaydi(),
      satilik5: createEmptyEmsalKaydi(),
      kiralik1: createEmptyEmsalKaydi(),
      kiralik2: createEmptyEmsalKaydi(),
      digerAciklamalar: "",
    },
    raporSonucu: {
      raporNo: "",
      versiyon: "1",
      durum: "",
      yoneticiOzeti: "",
      degerTakdirSonucu: "",
      raporMetni: "",
      teslimTarihi: "",
    },
  };
}

export function newRowId(): string {
  return newId();
}
