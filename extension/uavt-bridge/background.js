/* global chrome, importScripts, EksperixBridge */

// Handles "fetch the listing for me" requests made from the Eksperix page
// itself (the "İlan sekmesinden getir" button on Yeni Emsal Ekle), so the user
// doesn't have to open the popup. The listing is read and delivered back to
// the requesting tab only.

importScripts("shared.js");

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "EKSPERIX_FETCH_REQUEST") return false;

  (async () => {
    const tabId = sender.tab?.id;
    // Only an Eksperix tab (where app-bridge.js runs) may ask; and only for
    // listings — UAVT / e-imar still go through the popup.
    if (typeof tabId !== "number" || !sender.tab?.url || !EksperixBridge.isAppUrl(sender.tab.url)) {
      return { ok: false, error: "İstek bir Eksperix sekmesinden gelmedi." };
    }
    if (message.kind !== "emsal") {
      return { ok: false, error: "Bu sayfadan yalnızca emsal ilanı getirilebilir." };
    }

    const source = await EksperixBridge.getBestSourceTab("emsal", false);
    if (!source?.tab?.id) {
      return {
        ok: false,
        error:
          "Açık bir ilan sekmesi bulunamadı (sahibinden, hepsiemlak, emlakjet, zingat, remax, turyap). " +
          "İlanı başka bir sekmede açın ya da ilan sayfasındayken eklenti simgesinden 'Bilgileri Getir'e basın.",
      };
    }

    const payload = await EksperixBridge.readTabData(source.tab.id, false);
    if (!payload?.text || payload.text.trim().length < 20) {
      return { ok: false, error: "İlan sayfasının metni okunamadı. Sayfa tamamen yüklendikten sonra tekrar deneyin." };
    }

    const response = await EksperixBridge.sendToAppTab(tabId, EksperixBridge.MESSAGE_TYPES.emsal, {
      ...payload,
      capturedAt: Date.now(),
    });
    if (!response?.handled) {
      return { ok: false, error: "Sayfa veriyi almadı. Emsal formunun açık olduğundan emin olun." };
    }
    return { ok: true, kaynak: { url: payload.url, title: payload.title } };
  })()
    .then(sendResponse)
    .catch((error) => sendResponse({ ok: false, error: error instanceof Error ? error.message : "İşlem tamamlanamadı." }));

  // Keep the channel open for the asynchronous answer.
  return true;
});
