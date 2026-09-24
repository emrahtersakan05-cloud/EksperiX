/* global chrome, EksperixBridge */

// Source-tab lookup, page reading and delivery live in shared.js (also used by
// the background worker for requests made from the Eksperix page itself).

const KIND_STORAGE_KEY = "eksperix-bridge-kind";
const KIND_LABELS = {
  uavt: "Adres / Konum",
  imar: "İmar Durumu",
  emsal: "Emsal (Satılık / Kiralık)",
};
const APP_URL = "https://eksperi-x.vercel.app";

const fetchButton = document.getElementById("fetch-button");
const openAppButton = document.getElementById("open-app-button");
const statusEl = document.getElementById("status");
const kindSelect = document.getElementById("kind-select");

function setStatus(tone, text) {
  statusEl.textContent = text;
  statusEl.className = `status ${tone}`;
  statusEl.dataset.visible = "true";
}

function clearStatus() {
  statusEl.textContent = "";
  statusEl.className = "status info";
  statusEl.dataset.visible = "false";
}

async function handleFetch() {
  clearStatus();
  fetchButton.disabled = true;
  setStatus("info", "Sayfa okunuyor...");

  try {
    const preferredKind = kindSelect?.value ?? "auto";
    const source = await EksperixBridge.getBestSourceTab(preferredKind);
    if (!source?.tab?.id) {
      throw new Error(
        preferredKind === "auto"
          ? "UAVT, e-imar ya da emsal ilan sekmesi bulunamadı. Önce sayfayı açın."
          : `${KIND_LABELS[preferredKind]} için kaynak sayfa bulunamadı. Önce sayfayı açın.`,
      );
    }

    let kind = source.kind;
    let payload = await EksperixBridge.readTabData(source.tab.id, kind !== "emsal");
    if (preferredKind === "auto" && kind === "emsal" && payload?.text) {
      // Unknown site: let the content decide (e-imar pages on portals we don't list).
      const detected = EksperixBridge.detectKindFromText(payload.text);
      if (detected) {
        kind = detected;
        payload = await EksperixBridge.readTabData(source.tab.id, true);
      }
    }
    if (!payload?.text || payload.text.trim().length < 20) {
      throw new Error("Sayfadaki metin okunamadı. Sonuç ekranı açıkken tekrar deneyin.");
    }

    const { deliveredCount, handledCount } = await EksperixBridge.sendPayloadToAppTabs(
      EksperixBridge.MESSAGE_TYPES[kind],
      { ...payload, capturedAt: Date.now() },
    );

    if (handledCount === 0) {
      throw new Error(
        kind === "emsal"
          ? `Eksperix açık ancak emsal girişi yapılan bir bölüm açık değil. "Yeni Emsal Ekle" sayfasını ya da talepteki emsal sekmesini açıp tekrar deneyin.`
          : `Eksperix açık ancak "${KIND_LABELS[kind]}" bölümü açık değil. Talepte bu bölümü açıp tekrar deneyin.`,
      );
    }
    setStatus("success", `${KIND_LABELS[kind]} bilgileri ${deliveredCount} Eksperix sekmesine gönderildi.`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "İşlem tamamlanamadı.";
    setStatus("error", message);
  } finally {
    fetchButton.disabled = false;
  }
}

function openEksperix() {
  chrome.tabs.create({ url: APP_URL });
}

try {
  const savedKind = localStorage.getItem(KIND_STORAGE_KEY);
  if (savedKind && [...kindSelect.options].some((option) => option.value === savedKind)) kindSelect.value = savedKind;
} catch {
  // Storage unavailable: the selector just starts on "Otomatik".
}
kindSelect.addEventListener("change", () => {
  try {
    localStorage.setItem(KIND_STORAGE_KEY, kindSelect.value);
  } catch {
    // ignore
  }
});

fetchButton.addEventListener("click", handleFetch);
openAppButton.addEventListener("click", openEksperix);
