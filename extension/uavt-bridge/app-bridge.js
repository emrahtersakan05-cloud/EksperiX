/* global chrome */

(() => {
  // The popup may inject this script into an already-open app tab, so guard
  // against registering the listeners twice.
  if (window.__eksperixBridgeLoaded) return;
  window.__eksperixBridgeLoaded = true;

  const EVENT_NAMES = {
    EKSPERIX_UAVT_IMPORT: "eksperix:uavt-import",
    EKSPERIX_IMAR_IMPORT: "eksperix:imar-import",
    EKSPERIX_EMSAL_IMPORT: "eksperix:emsal-import",
  };
  // The page answers with this event (detail = the import event name) when the
  // matching form section is open and took the data.
  const ACK_EVENT = "eksperix:bridge-ack";
  const ACK_TIMEOUT_MS = 400;

  // Page ↔ extension handshake: the page asks "is the extension here?" with a
  // ping; we announce ourselves on load and on every ping.
  const PING_EVENT = "eksperix:bridge-ping";
  const READY_EVENT = "eksperix:bridge-ready";
  // The page asks the extension to read an open listing tab…
  const REQUEST_EVENT = "eksperix:bridge-request";
  // …and hears back here (ok / error), after the data itself arrived as an import event.
  const RESPONSE_EVENT = "eksperix:bridge-response";

  const version = chrome.runtime.getManifest().version;
  // Chrome hides object `detail`s created in a content script from the page
  // (they arrive as null), so every detail is shipped as JSON.
  const emit = (name, detail) => window.dispatchEvent(new CustomEvent(name, { detail: JSON.stringify(detail) }));
  const announce = () => emit(READY_EVENT, { version });

  window.addEventListener(PING_EVENT, announce);
  announce();

  window.addEventListener(REQUEST_EVENT, (event) => {
    let request = {};
    try {
      request = typeof event.detail === "string" ? JSON.parse(event.detail) : (event.detail ?? {});
    } catch {
      // Malformed request: answered as an error below.
    }
    const requestId = request.requestId ?? null;
    chrome.runtime
      .sendMessage({ type: "EKSPERIX_FETCH_REQUEST", kind: request.kind })
      .then((response) => emit(RESPONSE_EVENT, { requestId, ...(response ?? { ok: false }) }))
      .catch(() =>
        emit(RESPONSE_EVENT, {
          requestId,
          ok: false,
          error: "Eklentiye ulaşılamadı. Eklentiyi yeniden yükleyip sayfayı yenileyin.",
        }),
      );
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    const eventName = message?.type ? EVENT_NAMES[message.type] : undefined;
    if (!eventName || !message.payload?.text) {
      return false;
    }

    let answered = false;
    const finish = (handled) => {
      if (answered) return;
      answered = true;
      window.removeEventListener(ACK_EVENT, onAck);
      clearTimeout(timer);
      sendResponse({ ok: true, handled });
    };
    const onAck = (event) => {
      if (event.detail === eventName) finish(true);
    };
    const timer = setTimeout(() => finish(false), ACK_TIMEOUT_MS);
    window.addEventListener(ACK_EVENT, onAck);

    emit(eventName, message.payload);

    // Keep the message channel open for the asynchronous response.
    return true;
  });
})();
