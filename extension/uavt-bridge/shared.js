/* global chrome */
/* exported EksperixBridge */

// Shared by the popup (loaded with <script>) and the background service worker
// (loaded with importScripts): locating the source tab, reading it, and
// delivering the payload to Eksperix tabs.

const EksperixBridge = (() => {
  const UAVT_HOST = "adres.nvi.gov.tr";
  const IMAR_HOST_SUFFIX = ".bel.tr";
  // Hosts where Eksperix itself runs: local dev on any port, and the live site.
  const APP_HOSTS = ["localhost", "127.0.0.1", "eksperi-x.vercel.app"];
  // Match patterns without a port match every port, so the app also works when
  // `next dev` falls back to 3001, 3002, ...
  const APP_PATTERNS = ["http://localhost/*", "http://127.0.0.1/*", "https://eksperi-x.vercel.app/*"];
  const LISTING_URL_PATTERNS = [
    "*://*.sahibinden.com/*",
    "*://*.hepsiemlak.com/*",
    "*://*.emlakjet.com/*",
    "*://*.zingat.com/*",
    "*://*.remax.com.tr/*",
    "*://*.turyap.com.tr/*",
  ];
  const LISTING_PATH_HINTS = ["/ilan", "/detay", "/emlak"];
  const MESSAGE_TYPES = {
    imar: "EKSPERIX_IMAR_IMPORT",
    emsal: "EKSPERIX_EMSAL_IMPORT",
    uavt: "EKSPERIX_UAVT_IMPORT",
  };

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

  function isAppUrl(urlStr) {
    try {
      const { protocol, hostname } = new URL(urlStr);
      return ["http:", "https:"].includes(protocol) && APP_HOSTS.includes(hostname);
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
      const path = new URL(urlStr).pathname.toLowerCase();
      // hepsiemlak detail pages carry no path hint, only the listing id at the
      // end: /ankara-cankaya-bahcelievler-satilik/daire/171189-3
      return LISTING_PATH_HINTS.some((hint) => path.includes(hint)) || /\/\d{3,}-\d+\/?$/.test(path);
    } catch {
      return false;
    }
  }

  function isHepsiemlakUrl(urlStr) {
    try {
      return /(^|\.)hepsiemlak\.com$/.test(new URL(urlStr).hostname);
    } catch {
      return false;
    }
  }

  // Runs in the hepsiemlak page's MAIN world (it needs the page's own
  // window.__NUXT__, invisible to content scripts), so it must be fully
  // self-contained. The listing's structured record there is far more reliable
  // than the rendered text: exact coordinates (the text/script scan otherwise
  // picks up the nearest bus stop), listing date, phone, and every attribute.
  // Returns values under the Eksperix form's own field labels.
  function readHepsiemlakData() {
    const data = window.__NUXT__?.data;
    const d = Array.isArray(data) ? data.find((x) => x?.detailData)?.detailData : null;
    if (!d) return null;

    const ad = (x) => (x && typeof x === "object" ? (x.name ?? x.typeName ?? "") : "");
    const sayi = (n) => (typeof n === "number" && n > 0 ? String(n) : "");
    const telefon = (p) => {
      const n = String(p?.phoneNumber ?? "").replace(/\D/g, "");
      if (!p?.areaCode || n.length !== 7) return "";
      return `0${p.areaCode} ${n.slice(0, 3)} ${n.slice(3, 5)} ${n.slice(5)}`;
    };
    const firmUser = d.firmUser ?? d.firm?.firmUser;
    const tel = [d.whatsAppNumber, ...(firmUser?.phones ?? []), ...(d.contact?.phones ?? [])].map(telefon).find(Boolean) ?? "";

    const ozellikler = Object.values(d.attributes ?? {})
      .filter(Array.isArray)
      .flat()
      .map((a) => String(a?.name ?? ""));
    const varMi = (pattern) => (ozellikler.some((n) => pattern.test(n)) ? "Var" : "");
    const otopark = ozellikler.find((n) => /otopark/i.test(n)) ?? "";

    const isitma = ad(d.heating);
    const yakit = ad(d.fuel);
    const sqm = d.sqm ?? {};
    const alt = ad(d.subCategory);
    const ana = ad(d.mainCategory);
    // "İmarlı - Konut": the /i flag does not fold Turkish İ to i, so spell it out.
    const imarli = /^[İIi]marl/.test(alt);

    const alanlar = {
      Kategori: ana,
      "Emlak Tipi": imarli ? "Arsa" : alt || ad(d.residence),
      Durumu: ad(d.category),
      "İlan No": d.listingId ?? "",
      "İlan Tarihi": String(d.startDate || d.createdDate || "").slice(0, 10),
      "İlan Tel No": tel,
      Fiyat: sayi(d.price),
      İl: ad(d.city),
      İlçe: ad(d.county),
      Mahalle: ad(d.district),
      Kimden: d.firm || d.authorizedRealtor ? "Emlak Ofisinden" : "Sahibinden",
      "m² (Brüt)": sayi(Array.isArray(sqm.grossSqm) ? sqm.grossSqm[0] : sqm.grossSqm),
      "m² (Net)": sayi(sqm.netSqm),
      "Açık Alan (m²)": sayi(sqm.openAreaSqm),
      "Kapalı Alan (m²)": sayi(sqm.closedAreaSqm),
      // Only meaningful for housing; land listings carry filler values here.
      "Oda Sayısı":
        ana === "Konut" && Array.isArray(d.roomAndLivingRoom) ? String(d.roomAndLivingRoom[0] ?? "") : "",
      "Banyo Sayısı": sayi(d.bathRoom),
      "Bina Yaşı": typeof d.age === "number" ? String(d.age) : "",
      "Kat Sayısı": sayi(d.floor?.count),
      "Bulunduğu Kat": d.floor?.name ?? "",
      Isıtma: isitma && yakit && isitma !== yakit ? `${isitma} (${yakit})` : isitma || yakit,
      "Krediye Uygunluk": ad(d.credit),
      "Tapu Durumu": d.registerState || d.landRegisterName || "",
      Eşyalı: typeof d.furnished === "boolean" ? (d.furnished ? "Evet" : "Hayır") : "",
      "Kullanım Durumu": ad(d.usage),
      "Yapının Durumu": ad(d.buildState),
      "Site Adı": d.housingEstate?.name ?? ad(d.housingComplex),
      "Aidat (TL)": sayi(d.fee?.amount),
      "Bir Kattaki Daire": sayi(d.apartmentsOnFloor),
      "Bina Adedi": sayi(d.numberOfBuilding),
      "Giriş Yüksekliği (m)": sayi(d.entranceHeight),
      "İmar Durumu": imarli ? alt.replace(/^[İIi]marl[ıi]\s*-\s*/, "") : "",
      "Ada No": d.land?.island ?? "",
      "Parsel No": d.land?.parcel ?? "",
      "Kaks (Emsal)": sayi(d.floorAreaRatio),
      Gabari: d.gabarite ? String(d.gabarite) : "",
      "Zemin Etüdü": ad(d.groundStudies),
      Balkon: d.balcony ? "Var" : varMi(/balkon/i),
      Asansör: varMi(/asans[öo]r/i),
      Otopark: /kapal/i.test(otopark) && /a[çc][ıi]k/i.test(otopark)
        ? "Açık & Kapalı Otopark"
        : /kapal/i.test(otopark)
          ? "Kapalı Otopark"
          : otopark
            ? "Açık Otopark"
            : "",
    };
    for (const key of Object.keys(alanlar)) {
      if (!alanlar[key]) delete alanlar[key];
    }

    const loc = d.mapLocation;
    const konumVar = !d.isMapHidden && typeof loc?.lat === "number" && typeof loc?.lon === "number";
    return {
      alanlar,
      lat: konumVar ? String(Number(loc.lat.toFixed(6))) : "",
      lng: konumVar ? String(Number(loc.lon.toFixed(6))) : "",
    };
  }

  // Site-specific structured data, merged over the generic text read.
  async function readStructuredData(tabId, url) {
    if (!isHepsiemlakUrl(url)) return null;
    try {
      const [injection] = await chrome.scripting.executeScript({
        target: { tabId },
        world: "MAIN",
        func: readHepsiemlakData,
      });
      return injection?.result ?? null;
    } catch {
      // Page not ready or blocked: the generic text read still applies.
      return null;
    }
  }

  async function getActiveTab() {
    const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    return tabs[0];
  }

  // `preferredKind` is "auto" or a kind chosen by hand. `useActiveTab` is false
  // when the request comes from the Eksperix page itself (its own tab is the
  // active one then, so only background tabs are candidates).
  async function getBestSourceTab(preferredKind = "auto", useActiveTab = true) {
    const activeTab = useActiveTab ? await getActiveTab() : undefined;
    if (activeTab?.url) {
      if (preferredKind !== "auto") {
        if (isEmsalUrl(activeTab.url)) return { kind: preferredKind, tab: activeTab };
      } else {
        if (isUavtUrl(activeTab.url)) return { kind: "uavt", tab: activeTab };
        if (isImarUrl(activeTab.url)) return { kind: "imar", tab: activeTab };
        if (isEmsalUrl(activeTab.url)) return { kind: "emsal", tab: activeTab };
      }
    }

    // Fall back to the most recently used source tab of the wanted kind.
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
  async function readTabData(tabId, includeFrames) {
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
    if (!includeFrames || results.length <= 1) {
      // Listing pages: prefer the site's own structured record where we know it.
      const structured = main.url ? await readStructuredData(tabId, main.url) : null;
      if (!structured) return main;
      return {
        ...main,
        alanlar: structured.alanlar,
        lat: structured.lat || main.lat,
        lng: structured.lng || main.lng,
      };
    }

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

  // Sends to one Eksperix tab; injects the content script first if the tab was
  // opened before the extension was (re)loaded. Resolves to the tab's answer.
  async function sendToAppTab(tabId, messageType, payload) {
    const send = () => chrome.tabs.sendMessage(tabId, { type: messageType, payload });
    try {
      return await send();
    } catch {
      await chrome.scripting.executeScript({ target: { tabId }, files: ["app-bridge.js"] });
      return await send();
    }
  }

  async function sendPayloadToAppTabs(messageType, payload) {
    const appTabs = await getEksperixTabs();
    if (appTabs.length === 0) {
      throw new Error("Eksperix sekmesi bulunamadı. Önce uygulamayı açın.");
    }

    let deliveredCount = 0;
    let handledCount = 0;
    await Promise.all(
      appTabs.map(async (tab) => {
        try {
          const response = await sendToAppTab(tab.id, messageType, payload);
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

  return {
    APP_PATTERNS,
    MESSAGE_TYPES,
    detectKindFromText,
    getBestSourceTab,
    isAppUrl,
    readTabData,
    sendPayloadToAppTabs,
    sendToAppTab,
  };
})();
