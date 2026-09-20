// The Eksperix Bridge extension dispatches its CustomEvents from a content
// script (isolated world). Chrome does not expose non-primitive `detail`
// objects created there to the page's own scripts (they arrive as `null`), so
// the extension sends `detail` as a JSON string. Plain objects are still
// accepted so the events can also be dispatched by hand (tests, other tools).
export function readBridgeDetail<T extends object>(event: Event): T | null {
  const detail = (event as CustomEvent<unknown>).detail;
  if (typeof detail === "string") {
    try {
      const parsed: unknown = JSON.parse(detail);
      return parsed && typeof parsed === "object" ? (parsed as T) : null;
    } catch {
      return null;
    }
  }
  return detail && typeof detail === "object" ? (detail as T) : null;
}

// Tells the extension's content script that this section is open and took the
// imported data, so the popup can report "delivered" honestly instead of
// claiming success when no matching form section is on screen.
export function acknowledgeBridge(eventName: string): void {
  window.dispatchEvent(new CustomEvent("eksperix:bridge-ack", { detail: eventName }));
}
