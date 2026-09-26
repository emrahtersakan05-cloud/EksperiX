/* global chrome, importScripts, EksperixBridge */

// Handles "fetch it for me" requests made from the Eksperix page itself, so
// the user doesn't have to open the popup: "İlan sekmesinden getir" on Yeni
// Emsal Ekle, "E-imar sekmesinden getir" on İmar Durumu and "UAVT sekmesinden
// getir" on Adres / Konum. The source tab is
// read and the data delivered back to the requesting tab only.

importScripts("shared.js");

const KAYNAKLAR = {
  emsal: {
    // Listing pages: the structured record is read from the top frame.
    tumCerceveler: false,
    bulunamadi:
      "Açık bir ilan sekmesi bulunamadı (sahibinden, hepsiemlak, emlakjet, zingat, remax, turyap). " +
      "İlanı başka bir sekmede açın ya da ilan sayfasındayken eklenti simgesinden 'Bilgileri Getir'e basın.",
    okunamadi: "İlan sayfasının metni okunamadı. Sayfa tamamen yüklendikten sonra tekrar deneyin.",
    almadi: "Sayfa veriyi almadı. Emsal formunun açık olduğundan emin olun.",
  },
  imar: {
    // E-imar results are often inside an iframe.
    tumCerceveler: true,
    bulunamadi:
      "Açık bir e-imar sekmesi bulunamadı. Belediyenin e-imar sorgusunu (ör. keos.<il>.bel.tr/imardurumu) başka bir sekmede açıp " +
      "parseli sorgulayın. Adresi farklı bir portalsa, sonuç sayfasındayken eklenti simgesinden 'Bilgileri Getir'e basın.",
    okunamadi: "E-imar sayfasının metni okunamadı. Sorgu sonucu ekranda görünürken tekrar deneyin.",
    almadi: "Sayfa veriyi almadı. İmar Durumu bölümünün açık olduğundan emin olun.",
  },
  uavt: {
    // UAVT results can sit inside an iframe too.
    tumCerceveler: true,
    bulunamadi:
      "Açık bir UAVT sekmesi bulunamadı. adres.nvi.gov.tr adres sorgusunu başka bir sekmede açıp adresi sorgulayın, " +
      "sonuç ekranındayken tekrar deneyin.",
    okunamadi: "UAVT sayfasının metni okunamadı. Sorgu sonucu ekranda görünürken tekrar deneyin.",
    almadi: "Sayfa veriyi almadı. Adres / Konum bölümünün Adres sekmesinin açık olduğundan emin olun.",
  },
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "EKSPERIX_FETCH_REQUEST") return false;

  (async () => {
    const tabId = sender.tab?.id;
    // Only an Eksperix tab (where app-bridge.js runs) may ask.
    if (typeof tabId !== "number" || !sender.tab?.url || !EksperixBridge.isAppUrl(sender.tab.url)) {
      return { ok: false, error: "İstek bir Eksperix sekmesinden gelmedi." };
    }
    const kaynak = KAYNAKLAR[message.kind];
    if (!kaynak) {
      return { ok: false, error: "Bu sayfadan yalnızca emsal ilanı, e-imar ya da UAVT sonucu getirilebilir." };
    }

    const source = await EksperixBridge.getBestSourceTab(message.kind, false);
    if (!source?.tab?.id) {
      return { ok: false, error: kaynak.bulunamadi };
    }

    const payload = await EksperixBridge.readTabData(source.tab.id, kaynak.tumCerceveler);
    if (!payload?.text || payload.text.trim().length < 20) {
      return { ok: false, error: kaynak.okunamadi };
    }

    const response = await EksperixBridge.sendToAppTab(tabId, EksperixBridge.MESSAGE_TYPES[message.kind], {
      ...payload,
      capturedAt: Date.now(),
    });
    if (!response?.handled) {
      return { ok: false, error: kaynak.almadi };
    }
    return { ok: true, kaynak: { url: payload.url, title: payload.title } };
  })()
    .then(sendResponse)
    .catch((error) => sendResponse({ ok: false, error: error instanceof Error ? error.message : "İşlem tamamlanamadı." }));

  // Keep the channel open for the asynchronous answer.
  return true;
});
