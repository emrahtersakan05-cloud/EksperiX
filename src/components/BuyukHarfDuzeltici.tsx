"use client";

import { useEffect } from "react";
import { normalYazim } from "@/lib/text/buyuk-harf";

// App-wide: when the user leaves a text field typed in ALL CAPS, the value is
// rewritten in normal case ("KIZILAY MAHALLESİ" → "Kızılay Mahallesi"). Done on
// blur, not per keystroke, so typing with caps lock isn't turned into "AnKARA".
// The new value goes through the field's own onChange (native setter + input
// event), so React state stays the source of truth. A field or area marked
// data-buyuk-harf-serbest is left alone.
export default function BuyukHarfDuzeltici() {
  useEffect(() => {
    function ayrildi(event: FocusEvent) {
      const el = event.target;
      const input = el instanceof HTMLInputElement ? el : null;
      if (!input && !(el instanceof HTMLTextAreaElement)) return;
      if (input && !["text", "search"].includes(input.type)) return;
      const alan = el as HTMLInputElement | HTMLTextAreaElement;
      if (alan.readOnly || alan.disabled || alan.closest("[data-buyuk-harf-serbest]")) return;
      if (/username|email|password|one-time-code/.test(alan.autocomplete)) return;

      const yeni = normalYazim(alan.value);
      if (yeni === alan.value) return;
      const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(alan), "value")?.set;
      setter?.call(alan, yeni);
      alan.dispatchEvent(new Event("input", { bubbles: true }));
    }

    document.addEventListener("focusout", ayrildi, true);
    return () => document.removeEventListener("focusout", ayrildi, true);
  }, []);

  return null;
}
