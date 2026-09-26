import type {
  BinaTuru,
  DegerlemeDurum,
  EvetHayir,
  FinalDegerKaynak,
  GenelDurum,
  IsitmaTipi,
  IskanDurumu,
  KullanimSekli,
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

// Proje İncelemeleri: the approved project against what was found on site.
// Each uyum answer "Hayır" opens a note explaining the difference.
export interface ProjeIncelemeData {
  incelenenKurum: string;
  tarihSayiVarMi: EvetHayirSecimi;
  projeTarihi: string;
  projeSayisi: string;
  blokKonumUyumu: EvetHayirSecimi;
  blokKonumAciklama: string;
  blokAlanUyumu: EvetHayirSecimi;
  blokAlanAciklama: string;
  bbKonumUyumu: EvetHayirSecimi;
  bbKonumAciklama: string;
  bbAlanUyumu: EvetHayirSecimi;
  bbAlanAciklama: string;
  // Mimari projesine göre aykırılık (moved here from the konut form)
  aykirilik: EvetHayirSecimi;
  aykirilikAciklama: string;
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
  // Does the fonksiyon match the plan paftası?
  fonksiyonPaftaUyumu: "Uyumludur" | "Uyumsuzdur" | "";
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
  // Plan Not Bilgileri: the plan hükümleri, one per item
  planNotlari: PlanNotu[];
}

export interface PlanNotu {
  id: string;
  metin: string;
}

// The single-value İmar Durumu fields (everything but the plan notları list).
export type ImarMetinAlani = Exclude<keyof ImarDurumuData, "planNotlari">;

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
export type MahallindekiNitelik = "bina-var" | "bina-yok";

export interface DigerCephe {
  id: string;
  yon: string;
  bilgi: string;
}

export interface AraziOzellikleriData {
  // Mahallindeki niteliği: with a building the building form is shown,
  // without one the land form below.
  mahallindekiNitelik: MahallindekiNitelik | "";
  araziSekli: string;
  araziSekliDiger: string;
  // Shown as "Arazi Eğimi" (kept under its original name for saved data).
  araziYapisi: string;
  araziYapisiDiger: string;
  sulamaImkani: string;
  sulamaImkaniDiger: string;
  // Directions with frontage on a cadastral road (multi-select).
  yolCepheleri: string[];
  digerCepheler: DigerCephe[];
  ekiliUrun: "Evet" | "Hayır" | "";
  ekiliUrunBilgi: string;
  // İsteğe bağlı özellik girişleri
  parselGenisligi: string;
  parselDerinligi: string;
  toprakYapisi: string;
  digerAciklama: string;
}

// KONUT taşınmaz niteliğinde Ana Gayrimenkul sekmesi.
export type KonutMahallindekiNitelik = "bloklu" | "bloksuz" | "mustakil";
export type EvetHayirSecimi = "Evet" | "Hayır" | "";

// One İnşaat Nizamı decision for one or more blocks (by index into blokAdlari).
export interface NizamAtamasi {
  id: string;
  bloklar: number[];
  nizam: string;
  nizamDiger: string;
}

// One building entrance: the facade it is on, the road it opens to, its kind.
export interface BinaGirisi {
  id: string;
  yon: string;
  yol: string;
  tur: string;
  // Floor the entrance opens on, e.g. "Zemin Kat".
  kat?: string;
  // Door description from the admin list, e.g. "camlı demir doğramadır."
  kapi?: string;
}

// One floor of the kat dağılımı: its floor, the rooms/spaces on it and, for
// kısımlı buildings, the kısım it belongs to.
export interface KatDagilimi {
  id: string;
  kisim: string;
  kat: string;
  icHacimler: string[];
}

export type KatDagilimTuru = "tekDuzen" | "kisimli" | "manuel";

export interface ProjeKati {
  id: string;
  kat: string;
  aciklama: string;
}

export interface KonutOzellikleriData {
  mahallindekiNitelik: KonutMahallindekiNitelik | "";
  // Konum Tespiti
  blokTespiti: EvetHayirSecimi;
  // Block the bağımsız bölüm is in, and where that block sits on the parcel
  // (a direction or "Orta").
  konuBlok: string;
  blokKonumu: string;
  binaGirisTespiti: EvetHayirSecimi;
  binaGirisleri: BinaGirisi[];
  // Earlier compass-only answers; read once into the fields above.
  blokYonleri: string[];
  binaGirisYonleri: string[];
  yapiSinifi: string;
  blokSayisi: string;
  blokAdlari: string[];
  nizamAtamalari: NizamAtamasi[];
  // Bloksuz / müstakil: one nizam for the building
  insaatNizami: string;
  insaatNizamiDiger: string;
  // Kat Dağılım Bilgisi
  katDagilimTuru: KatDagilimTuru | "";
  katDagilimlari: KatDagilimi[];
  manuelKatDagilimi: string;
  // Earlier OCR rows; read once into manuelKatDagilimi.
  projeKatlari: ProjeKati[];
  // Bina Özellikleri
  binaGirisiTespit: string;
  binaGirisKapisi: string;
  katHoluSahanlik: string;
  merdivenBasamaklari: string;
  merdivenKorkuluklari: string;
  binaIciDuvarlar: string;
  binaDisCephesi: string;
  binaCatisi: string;
  cevreDuzenlemesi: string;
  asansor: string;
  ilaveAnlatim: EvetHayirSecimi;
  ilaveAnlatimMetni: string;
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

// A titled free-text note kept in the Değerleme tab (Satış Kabiliyeti / Değerleme Açıklaması).
export interface NotKaydi {
  id: string;
  baslik: string;
  detay: string;
}

export interface NormalDegerlemeData {
  alanM2: string;
  birimDeger: string;
}

// Farkı olan (fiili − resmi) alan, `farkKatsayisi` % oranında değerlenir (boşsa %100).
export interface AlanFarkiDegerlemeData {
  resmiAlanM2: string;
  fiiliAlanM2: string;
  birimDeger: string;
  farkKatsayisi: string;
}

// Bitmesi halindeki değer (alan × birim fiyat) eksi kalan maliyet (alan × maliyet birim fiyat × (1 − seviye oranı)).
export interface SeviyeliDegerlemeData {
  alanM2: string;
  birimFiyat: string;
  maliyetBirimFiyat: string;
  // Yüzde olarak girilir (örn. 60).
  seviyeOrani: string;
}

export interface HisseSatiri {
  id: string;
  malik: string;
  pay: string;
  payda: string;
}

export interface HisseliDegerlemeData {
  alanM2: string;
  birimFiyat: string;
  satirlar: HisseSatiri[];
}

export type HesapYontemi = "normal" | "alanFarki" | "seviyeli" | "hisseli";

export interface DegerHesaplamalari {
  // The method whose result the report puts forward when several are filled.
  esasYontem: HesapYontemi | "";
  normal: NormalDegerlemeData;
  alanFarki: AlanFarkiDegerlemeData;
  seviyeli: SeviyeliDegerlemeData;
  hisseli: HisseliDegerlemeData;
}

export interface DegerlemeData {
  satisKabiliyetiNotlari: NotKaydi[];
  degerlemeAciklamaNotlari: NotKaydi[];
  hesaplamalar: DegerHesaplamalari;
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
  projeIncelemeleri: ProjeIncelemeData;
  imarDurumu: ImarDurumuData;
  anaGayrimenkul: AnaGayrimenkulData;
  araziOzellikleri: AraziOzellikleriData;
  konutOzellikleri: KonutOzellikleriData;
  bagimsizBolum: BagimsizBolumData;
  degerleme: DegerlemeData;
  emsaller: EmsallerData;
  raporSonucu: RaporSonucuData;
  // Akıcı metin written from a form's template, keyed by the form's title.
  akiciMetinler: Record<string, string>;
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
  | "satisKabiliyeti"
  | "degerlemeAciklamasi"
  | "degerHesaplamasi"
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

export function createEmptyEmsalKaydi(): EmsalKaydi {
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
    projeIncelemeleri: {
      incelenenKurum: "",
      tarihSayiVarMi: "",
      projeTarihi: "",
      projeSayisi: "",
      blokKonumUyumu: "",
      blokKonumAciklama: "",
      blokAlanUyumu: "",
      blokAlanAciklama: "",
      bbKonumUyumu: "",
      bbKonumAciklama: "",
      bbAlanUyumu: "",
      bbAlanAciklama: "",
      aykirilik: "",
      aykirilikAciklama: "",
    },
    imarDurumu: {
      meriImarPlani: "",
      fonksiyon: "",
      fonksiyonPaftaUyumu: "",
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
      planNotlari: [],
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
      mahallindekiNitelik: "",
      araziSekli: "",
      araziSekliDiger: "",
      araziYapisi: "",
      araziYapisiDiger: "",
      sulamaImkani: "",
      sulamaImkaniDiger: "",
      yolCepheleri: [],
      digerCepheler: [],
      ekiliUrun: "",
      ekiliUrunBilgi: "",
      parselGenisligi: "",
      parselDerinligi: "",
      toprakYapisi: "",
      digerAciklama: "",
    },
    konutOzellikleri: {
      mahallindekiNitelik: "",
      blokTespiti: "",
      konuBlok: "",
      blokKonumu: "",
      binaGirisTespiti: "",
      binaGirisleri: [],
      blokYonleri: [],
      binaGirisYonleri: [],
      yapiSinifi: "",
      blokSayisi: "",
      blokAdlari: [],
      nizamAtamalari: [],
      insaatNizami: "",
      insaatNizamiDiger: "",
      katDagilimTuru: "",
      katDagilimlari: [],
      manuelKatDagilimi: "",
      projeKatlari: [],
      binaGirisiTespit: "",
      binaGirisKapisi: "",
      katHoluSahanlik: "",
      merdivenBasamaklari: "",
      merdivenKorkuluklari: "",
      binaIciDuvarlar: "",
      binaDisCephesi: "",
      binaCatisi: "",
      cevreDuzenlemesi: "",
      asansor: "",
      ilaveAnlatim: "",
      ilaveAnlatimMetni: "",
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
      satisKabiliyetiNotlari: [],
      degerlemeAciklamaNotlari: [],
      hesaplamalar: {
        esasYontem: "",
        normal: { alanM2: "", birimDeger: "" },
        alanFarki: { resmiAlanM2: "", fiiliAlanM2: "", birimDeger: "", farkKatsayisi: "" },
        seviyeli: { alanM2: "", birimFiyat: "", maliyetBirimFiyat: "", seviyeOrani: "" },
        hisseli: { alanM2: "", birimFiyat: "", satirlar: [] },
      },
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
    akiciMetinler: {},
  };
}

export function newRowId(): string {
  return newId();
}
