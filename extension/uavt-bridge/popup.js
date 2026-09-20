/* global chrome */

const UAVT_HOST = "adres.nvi.gov.tr";
const IMAR_HOST_SUFFIX = ".bel.tr";
const KIND_STORAGE_KEY = "eksperix-bridge-kind";
const KIND_LABELS = {
  uavt: "Adres / Konum",
  imar: "İmar Durumu",
  emsal: "Emsal (Satılık / Kiralık)",
};
// Match patterns without a port match every port, so the app also works when
// `next dev` falls back to 3001, 3002, ...
const APP_PATTERNS = ["http://localhost/*", "http://127.0.0.1/*"];
const APP_URL = "http://localhost:3000";
const LISTING_URL_PATTERNS = [
  "*://*.sahibinden.com/*",
  "*://*.hepsiemlak.com/*",
  "*://*.emlakjet.com/*",
  "*://*.zingat.com/*",
  "*://*.remax.com.tr/*",
  "*://*.turyap.com.tr/*",
];
const LISTING_PATH_HINTS = ["/ilan", "/detay", "/emlak"];

const fetchButton = document.getElementById("fetch-button");
const openAppButton = document.getElementById("open-app-button");
const statusEl = document.getElementById("status");
const kindSelect = document.getElementById("kind-select");

function isUavtUrl(urlStr) {
  try {
    return new URL(urlStr).host === UAVT_HOST;
  } catch {
    return false;
  }
}

// Municipal e-imar portals do not share one URL scheme (keos.<il>.bel.tr/imardurumu/...,
// imar.<il>.gov.tr, e-imar..., ...), so anything that says "imar" in its host or path
// counts. Pages this misses are covered by the content check and the manual selector.
function isImarUrl(urlStr) {
  try {
    const url = new URL(urlStr);
    const host = url.host.toLowerCase();
    const path = url.pathname.toLowerCase();
    return (
      (host.endsWith(IMAR_HOST_SUFFIX) && path.includes("imar")) || host.includes("imar") || path.includes("imardurumu")
    );
  } catch {
    return false;
  }
}

// Last-resort classification by what the page actually says, used when the URL
// alone could not tell an e-imar / UAVT result from a plain listing page.
function detectKindFromText(text) {
  const t = text.toLocaleLowerCase("tr-TR");
  const count = (patterns) => patterns.filter((pattern) => pattern.test(t)).length;
  const imarHits = count([
    /meri imar plan/,
    /in[sş]aat nizam/,
    /\btaks\b/,
    /\bkaks\b/,
    /hesap alan/,
    /kot al[ıi]nacak/,
  ]);
  const uavtHits = count([/numaraj/, /ba[gğ][ıi]ms[ıi]z b[oö]l[uü]m/, /\buavt\b/, /kimlik no/]);
  if (imarHits >= 2 && imarHits >= uavtHits) return "imar";
  if (uavtHits >= 2) return "uavt";
  return null;
}

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

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  return tabs[0];
}

function isAppUrl(urlStr) {
  try {
    const { protocol, hostname } = new URL(urlStr);
    return protocol === "http:" && (hostname === "localhost" || hostname === "127.0.0.1");
  } catch {
    return false;
  }
}

// Any other regular web page the user is looking at is treated as an emsal
// (comparable listing) source — real estate portals (sahibinden, hepsiemlak,
// emlakjet, zingat, ...) all follow the same "open the ad, press the button" flow.
function isEmsalUrl(urlStr) {
  try {
    return ["http:", "https:"].includes(new URL(urlStr).protocol) && !isAppUrl(urlStr);
  } catch {
    return false;
  }
}

function looksLikeListing(urlStr) {
  try {
    return LISTING_PATH_HINTS.some((hint) => new URL(urlStr).pathname.toLowerCase().includes(hint));
  } catch {
    return false;
  }
}

// `preferredKind` is "auto" or a kind chosen by hand in the popup.
async function getBestSourceTab(preferredKind = "auto") {
  const activeTab = await getActiveTab();
  if (activeTab?.url) {
    if (preferredKind !== "auto") {
      if (isEmsalUrl(activeTab.url)) return { kind: preferredKind, tab: activeTab };
    } else {
      if (isUavtUrl(activeTab.url)) return { kind: "uavt", tab: activeTab };
      if (isImarUrl(activeTab.url)) return { kind: "imar", tab: activeTab };
      if (isEmsalUrl(activeTab.url)) return { kind: "emsal", tab: activeTab };
    }
  }

  // The popup is usually opened while the Eksperix tab is active, so fall back
  // to the most recently used source tab of any kind.
  const [uavtTabs, imarTabs, listingTabs] = await Promise.all([
    chrome.tabs.query({ url: "https://adres.nvi.gov.tr/*" }),
    chrome.tabs.query({ url: "*://*.bel.tr/*" }),
    chrome.tabs.query({ url: LISTING_URL_PATTERNS }),
  ]);

  const candidates = [
    ...uavtTabs.map((tab) => ({ kind: "uavt", tab })),
    ...imarTabs.filter((tab) => tab.url && isImarUrl(tab.url)).map((tab) => ({ kind: "imar", tab })),
    ...listingTabs.filter((tab) => tab.url && looksLikeListing(tab.url)).map((tab) => ({ kind: "emsal", tab })),
  ].filter((candidate) => preferredKind === "auto" || candidate.kind === preferredKind);
  if (candidates.length === 0) return null;

  return candidates.sort((a, b) => (b.tab.lastAccessed ?? 0) - (a.tab.lastAccessed ?? 0))[0];
}

// Runs inside the source page (chrome.scripting serializes it), so it must be
// fully self-contained.
function readPageData() {
  const meta = (property) =>
    document.querySelector(`meta[property="${property}"], meta[name="${property}"]`)?.getAttribute("content") ?? "";

  // Turkey's bounding box — rejects swapped or unrelated number pairs.
  const toCoords = (lat, lng) => {
    const la = Number.parseFloat(String(lat).replace(",", "."));
    const lo = Number.parseFloat(String(lng).replace(",", "."));
    if (la >= 35 && la <= 43 && lo >= 25 && lo <= 45) {
      return { lat: String(Number(la.toFixed(6))), lng: String(Number(lo.toFixed(6))) };
    }
    return null;
  };

  const NUM = String.raw`(-?\d{1,3}(?:[.,]\d+)?)`;

  function findCoordinates() {
    // 1. Standard geo meta tags.
    const geoPosition = (meta("geo.position") || meta("ICBM")).split(/[;,]/);
    const fromGeo = geoPosition.length >= 2 ? toCoords(geoPosition[0], geoPosition[1]) : null;
    if (fromGeo) return fromGeo;
    const fromPlace = toCoords(meta("place:location:latitude"), meta("place:location:longitude"));
    if (fromPlace) return fromPlace;
    const fromOg = toCoords(meta("og:latitude"), meta("og:longitude"));
    if (fromOg) return fromOg;

    // 2. data-* attributes used by map widgets (sahibinden, emlakjet, ...).
    const attrPairs = [
      ["data-lat", "data-lng"],
      ["data-lat", "data-lon"],
      ["data-lat", "data-long"],
      ["data-latitude", "data-longitude"],
    ];
    for (const [latAttr, lngAttr] of attrPairs) {
      for (const el of document.querySelectorAll(`[${latAttr}][${lngAttr}]`)) {
        const found = toCoords(el.getAttribute(latAttr), el.getAttribute(lngAttr));
        if (found) return found;
      }
    }

    // 3. Google Maps links / embeds: @lat,lng  q=lat,lng  ll=lat,lng  !3dlat!4dlng
    const mapPatterns = [
      new RegExp(`@${NUM},${NUM}`),
      new RegExp(`[?&](?:q|ll|center|destination|query)=${NUM}(?:,|%2C)${NUM}`, "i"),
      new RegExp(`!3d${NUM}!4d${NUM}`),
    ];
    for (const el of document.querySelectorAll("a[href], iframe[src]")) {
      const url = el.getAttribute("href") || el.getAttribute("src") || "";
      if (!/map|goo\.gl|yandex|openstreetmap/i.test(url)) continue;
      for (const pattern of mapPatterns) {
        const match = url.match(pattern);
        const found = match && toCoords(match[1], match[2]);
        if (found) return found;
      }
    }

    // 4. JSON-LD and inline scripts: "latitude": 41.01, "longitude": 28.97 (or lat/lng/lon).
    const pairPattern = new RegExp(
      String.raw`["']?(?:latitude|lat)["']?\s*[:=]\s*["']?${NUM}["']?[\s\S]{0,80}?["']?(?:longitude|lng|lon|long)["']?\s*[:=]\s*["']?${NUM}`,
      "i",
    );
    for (const script of document.scripts) {
      const code = script.textContent;
      if (!code || code.length > 3_000_000) continue;
      const match = code.match(pairPattern);
      const found = match && toCoords(match[1], match[2]);
      if (found) return found;
    }
    return null;
  }

  const coords = findCoordinates();
  return {
    text: document.body?.innerText ?? "",
    title: document.title,
    url: window.location.href,
    image: meta("og:image"),
    description: meta("og:description") || meta("description"),
    lat: coords?.lat ?? "",
    lng: coords?.lng ?? "",
  };
}

// E-imar / UAVT result tables are often rendered inside an <iframe>; reading only the
// top frame would then return the page chrome and none of the fields. For those kinds
// the text of every reachable frame is concatenated (the top frame supplies the rest).
async function readActiveTabText(tabId, includeFrames) {
  let injection;
  try {
    try {
      injection = await chrome.scripting.executeScript({
        target: { tabId, allFrames: includeFrames },
        func: readPageData,
      });
    } catch {
      // A frame we have no permission for can fail the whole call — retry on the top frame.
      injection = await chrome.scripting.executeScript({ target: { tabId }, func: readPageData });
    }
  } catch {
    throw new Error(
      "Bu sayfanın içeriği okunamadı. Sayfayı yenileyip tekrar deneyin (tarayıcı iç sayfaları okunamaz).",
    );
  }

  const results = (injection ?? []).filter((entry) => entry?.result);
  const main = results.find((entry) => entry.frameId === 0)?.result ?? results[0]?.result ?? { text: "" };
  if (!includeFrames || results.length <= 1) return main;

  const text = results
    .map((entry) => entry.result.text ?? "")
    .filter((part) => part.trim())
    .join("\n");
  return { ...main, text };
}

async function getEksperixTabs() {
  const groupedResults = await Promise.all(APP_PATTERNS.map((url) => chrome.tabs.query({ url })));
  return groupedResults.flat().filter((tab) => typeof tab.id === "number");
}

async function sendPayloadToAppTabs(messageType, payload) {
  const appTabs = await getEksperixTabs();
  if (appTabs.length === 0) {
    throw new Error("Eksperix sekmesi bulunamadı. Önce uygulamayı açın.");
  }

  let deliveredCount = 0;
  let handledCount = 0;

  const send = (tabId) => chrome.tabs.sendMessage(tabId, { type: messageType, payload });

  await Promise.all(
    appTabs.map(async (tab) => {
      if (typeof tab.id !== "number") return;
      try {
        let response;
        try {
          response = await send(tab.id);
        } catch {
          // Tabs opened before the extension was (re)loaded have no content
          // script yet — inject it on demand instead of asking for a refresh.
          await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["app-bridge.js"] });
          response = await send(tab.id);
        }
        if (response?.ok) {
          deliveredCount += 1;
          if (response.handled) handledCount += 1;
        }
      } catch {
        // App tab is not reachable (e.g. a discarded tab).
      }
    }),
  );

  if (deliveredCount === 0) {
    throw new Error("Eksperix sekmesine ulaşılamadı. Eksperix sekmesini yenileyip (F5) tekrar deneyin.");
  }

  return { deliveredCount, handledCount };
}

async function handleFetch() {
  clearStatus();
  fetchButton.disabled = true;
  setStatus("info", "Sayfa okunuyor...");

  try {
    const preferredKind = kindSelect?.value ?? "auto";
    const source = await getBestSourceTab(preferredKind);
    if (!source?.tab?.id) {
      throw new Error(
        preferredKind === "auto"
          ? "UAVT, e-imar ya da emsal ilan sekmesi bulunamadı. Önce sayfayı açın."
          : `${KIND_LABELS[preferredKind]} için kaynak sayfa bulunamadı. Önce sayfayı açın.`,
      );
    }

    let kind = source.kind;
    let payload = await readActiveTabText(source.tab.id, kind !== "emsal");
    if (preferredKind === "auto" && kind === "emsal" && payload?.text) {
      // Unknown site: let the content decide (e-imar pages on portals we don't list).
      const detected = detectKindFromText(payload.text);
      if (detected) {
        kind = detected;
        payload = await readActiveTabText(source.tab.id, true);
      }
    }
    if (!payload?.text || payload.text.trim().length < 20) {
      throw new Error("Sayfadaki metin okunamadı. Sonuç ekranı açıkken tekrar deneyin.");
    }

    const messageType = {
      imar: "EKSPERIX_IMAR_IMPORT",
      emsal: "EKSPERIX_EMSAL_IMPORT",
      uavt: "EKSPERIX_UAVT_IMPORT",
    }[kind];
    const { deliveredCount, handledCount } = await sendPayloadToAppTabs(messageType, {
      ...payload,
      capturedAt: Date.now(),
    });

    if (handledCount === 0) {
      throw new Error(
        `Eksperix açık ancak "${KIND_LABELS[kind]}" bölümü açık değil. Talepte bu bölümü açıp tekrar deneyin.`,
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
