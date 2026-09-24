# Eksperix Bridge

Bu klasor, emsal ilan bilgilerini `Emsal Girisleri` sekmelerine, UAVT sonucunu `Adres / Konum` formuna, belediye e-imar durumu sonucunu ise `İmar Durumu` formuna otomatik aktaran Chrome uyumlu tarayici eklentisini icerir.

## Kurulum

1. Chrome veya Edge'de `Uzantilar` sayfasini acin.
2. `Gelistirici modu`nu aktif edin.
3. `Paketlenmemis oge yukle` secenegine basin.
4. Bu klasoru secin:

```text
extension/uavt-bridge
```

## Kullanim

### UAVT (Adres / Konum)

1. Eksperix uygulamasinda ilgili talebin `Adres / Konum` bolumunu acin.
2. `UAVT Adres Sorgula` ile `https://adres.nvi.gov.tr/VatandasIslemleri/AdresSorgu` sayfasini acin.
3. UAVT sorgusunu tamamlayin ve sonuc ekraninda kalin.
4. Tarayici toolbar'indaki `Eksperix Bridge` eklentisini acin.
5. `Bilgileri Getir` butonuna basin.
6. Sonuc, acik olan Eksperix `Adres / Konum` formuna otomatik aktarilir.

### Belediye E-İmar (İmar Durumu)

1. Eksperix uygulamasinda ilgili tapunun `İmar Durumu` bolumunu acin.
2. Belediyenin e-imar durumu sorgu sistemini (ornegin `keos.<il>.bel.tr/imardurumu/...` adresindeki Netcad tabanli e-imar portallari) acip parsel sorgusunu tamamlayin.
3. Tarayici toolbar'indaki `Eksperix Bridge` eklentisini acin.
4. `Bilgileri Getir` butonuna basin.
5. Sonuc, acik olan Eksperix `İmar Durumu` formuna otomatik aktarilir. Fonksiyon, Ada, Parsel, Pafta, Ölçek, İlçe, Mahalle, Hesap Alani, Kat Adedi, Bina Yuksekligi, bahce mesafeleri, İnsaat Nizami, TAKS, KAKS (Emsal), Kot Alinacak Nokta, Projeksiyon ve koordinat alanlari doldurulur — kaynak sayfada `-` gorunen (bos) alanlara dokunulmaz.
6. Eklenti kurulu degilse, `İmar Durumu` bolumundeki `E-imar Sonucu Yapistir` butonuyla sonuc sayfasinin metnini (Ctrl+A ile kopyalayip) elle de yapistirabilirsiniz.

### Emsal Ilani (Satilik-1..5 / Kiralik-1..2)

1. Eksperix uygulamasinda `Arastirma > Emsal Girisleri` altinda doldurmak istediginiz sekmeyi acin (ornegin `Satilik-2`).
2. Baska bir sekmede emsal ilan sayfasini acin (sahibinden, hepsiemlak, emlakjet, zingat vb. — herhangi bir ilan sayfasi calisir).
3. Tarayici toolbar'indaki `Eksperix Bridge` eklentisini acin ve `Bilgileri Getir` butonuna basin.
4. Ilan Tarihi, Emlak Tipi, Kimden, m² (Brut/Net), Oda Sayisi, Bina Yasi, Bulundugu Kat, Fiyat, Il/Ilce/Mahalle, Enlem/Boylam (sayfadaki harita verisinden), Web Adresi ve ilan gorseli **yalnizca o an acik olan** emsal sekmesine aktarilir. Bulunamayan alanlara dokunulmaz.

### Yeni Emsal Ekle sayfasi (v0.6.0)

1. Eksperix'te `Deger Haritasi > Emsal Haritasi > Yeni Emsal Ekle` sayfasini acin. Ustteki `Eksperix Bridge` panelinde `Bagli` yazmalidir.
2. Ilani baska bir sekmede acin (sahibinden, hepsiemlak, emlakjet, zingat, remax, turyap).
3. Paneldeki `Ilan sekmesinden getir` dugmesine basin — popup'i acmaya gerek yoktur. Diger sitelerde ilan sayfasindayken popup'taki `Bilgileri Getir` ayni sekilde calisir.
4. Kategori (Konut, Isyeri, Bina, Ciftlik, Fabrika, Arsa/Tarla), satilik/kiralik, ilan no/tel/tarih, fiyat, konum ve kategoriye ozel tum ozellikler (Isitma, Tapu Durumu, Ada/Parsel, KAKS...) forma yazilir.

Teknik: `app-bridge.js` sayfaya `eksperix:bridge-ready` ile kendini bildirir (`eksperix:bridge-ping`e de cevap verir). Sayfa `eksperix:bridge-request` gonderdiginde istek `background.js`e iletilir; o, en son kullanilan ilan sekmesini okuyup veriyi yalnizca isteyen Eksperix sekmesine `eksperix:emsal-import` olarak gonderir ve sonucu `eksperix:bridge-response` ile bildirir. Popup ve arka plan ayni `shared.js` kodunu kullanir.

Eklenti canli sitede (`https://eksperi-x.vercel.app`) ve yerelde (`localhost` / `127.0.0.1`, her port) calisir. Canli sitedeki `Araclarim > Uygulama Eklentileri` sayfasindan zip olarak indirilebilir; zip her kurulumda `scripts/zip-bridge-extension.mjs` ile bu klasorden uretilir.

### hepsiemlak (v0.6.1)

- hepsiemlak ilan adresleri (`.../daire/171189-3`) artik ilan sekmesi olarak taninir; `Ilan sekmesinden getir` bu sekmeleri de bulur.
- hepsiemlak'ta veri sayfanin kendi kaydindan (`window.__NUXT__` icindeki `detailData`, sayfanin ana dunyasinda okunur) alinir: ilanin gercek koordinati (metin taramasi en yakin otobus duragini buluyordu), ilan tarihi, danisman telefonu, isinma + yakit, balkon/otopark, ada/parsel, imar durumu vb. Bu okuma basarisiz olursa sayfa metninden okuma devreye girer.

### Aktarim turu secici (v0.5.0)

Popup'taki `Aktarim turu` listesi varsayilan olarak `Otomatik`tir: sayfa adresine (UAVT, adresinde `imar` gecen e-imar portallari, emsal ilan siteleri) ve gerekirse sayfa icerigine bakarak turu kendisi belirler. Bilinmeyen bir belediye portali yanlis taninirsa listeden `Imar Durumu` (ya da ilgili turu) secin; secim hatirlanir.

- E-imar / UAVT sonucu bir `iframe` icindeyse tum cerceveler okunur.
- Tablo satirlari (`Ada  27403  Parsel  1`) ve `Etiket : Deger` biciminde yazilmis alanlar okunur; `Tasdik Tarihi` (12.03.2015 / 12 Mart 2015) forma `gg.aa.yyyy` tarih alani icin donusturulur.
- Eksperix tarafinda ilgili bolum (Adres / Konum, Imar Durumu ya da Emsal sekmesi) acik degilse popup artik "gonderildi" demek yerine hangi bolumun acilmasi gerektigini soyler.

## Notlar

- Eksperix `https://eksperi-x.vercel.app` ile `localhost` / `127.0.0.1` uzerinde herhangi bir portta (3000, 3001, ...) calisir. Eklenti yenilendikten sonra zaten acik olan Eksperix sekmeleri icin betik otomatik yuklenir.
- Eklenti sayfa verisini Chrome content-script izolasyonu nedeniyle JSON metni olarak iletir; uygulama tarafinda `src/lib/bridge/event-detail.ts` bunu cozer.
- Eklenti, aktif sekmenin UAVT mi yoksa `*.bel.tr/imardurumu/*` adresine uyan bir e-imar sayfasi mi oldugunu otomatik ayirt eder; hicbiri acik degilse en son erisilen uygun sekmeyi kullanir.
- Eksperix sekmesi acik degilse veya ilgili bolum (Adres/Konum ya da İmar Durumu) yuklu degilse aktarim yapilamaz.
- e-imar sayfasi `*.bel.tr` disinda farkli bir adreste ise, `manifest.json` icindeki `host_permissions` listesine ilgili adresi eklemek gerekir.
- Gerekirse `Yapistirma Yedegi` / `E-imar Sonucu Yapistir` akislari manuel alternatif olarak kullanilabilir.
