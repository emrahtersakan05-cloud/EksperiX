/* global chrome */

(() => {
  // The popup may inject this script into an already-open app tab, so guard
  // against registering the listener twice.
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

    // Chrome hides object `detail`s created in a content script from the page
    // (they arrive as null), so ship it as JSON; the app parses it back.
    window.dispatchEvent(
      new CustomEvent(eventName, {
        detail: JSON.stringify(message.payload),
      }),
    );

    // Keep the message channel open for the asynchronous response.
    return true;
  });
})();
