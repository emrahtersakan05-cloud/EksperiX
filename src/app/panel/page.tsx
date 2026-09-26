import { getCurrentUser } from "@/lib/auth/dal";
import { birimFiyat, istatistik } from "@/lib/emsal-haritasi/analiz";
import { listEmsalKayitlari, teshisEt } from "@/lib/emsal-haritasi/store";
import PanelEmsalKarti, { type PanelEmsalOzeti } from "@/components/panel/PanelEmsalKarti";
import PanelIcerik from "@/components/panel/PanelIcerik";

const GUN = 86_400_000;

// Emsal Haritası records live on the server, so their summary is built here;
// talep figures are computed in the browser, where the talepler are stored.
async function emsalOzeti(kullaniciId: string | undefined): Promise<PanelEmsalOzeti> {
  try {
    const kayitlar = await listEmsalKayitlari();
    const sinir = Date.now() - 30 * GUN;
    return {
      toplam: kayitlar.length,
      son30Gun: kayitlar.filter((k) => Date.parse(k.olusturmaTarihi) >= sinir).length,
      benim: kayitlar.filter((k) => k.ekleyenKullaniciId === kullaniciId).length,
      satilikMedyan: istatistik(kayitlar.filter((k) => k.durum !== "kiralik")).medyan,
      kiralikMedyan: istatistik(kayitlar.filter((k) => k.durum === "kiralik")).medyan,
      // listEmsalKayitlari is newest first.
      sonEklenenler: kayitlar.slice(0, 3).map((k) => ({
        id: k.id,
        baslik: `${k.emlakTipi || "Emsal"} · ${k.durum === "kiralik" ? "Kiralık" : "Satılık"}`,
        konum: [k.mahalle, k.ilce].filter(Boolean).join(", ") || k.il,
        birim: birimFiyat(k),
        kiralik: k.durum === "kiralik",
      })),
    };
  } catch (err) {
    return {
      toplam: 0,
      son30Gun: 0,
      benim: 0,
      satilikMedyan: null,
      kiralikMedyan: null,
      sonEklenenler: [],
      hata: `Emsal verileri yüklenemedi. Teşhis: ${teshisEt(err)}.`,
    };
  }
}

export default async function Home() {
  const user = await getCurrentUser();
  const ozet = await emsalOzeti(user?.id);
  return <PanelIcerik ad={user?.fullName.split(" ")[0] ?? ""} emsalKarti={<PanelEmsalKarti ozet={ozet} />} />;
}
