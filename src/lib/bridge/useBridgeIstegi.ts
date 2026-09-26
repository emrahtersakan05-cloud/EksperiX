"use client";

import { useEffect, useRef, useState } from "react";
import { readBridgeDetail } from "@/lib/bridge/event-detail";

// Event names shared with extension/uavt-bridge/app-bridge.js.
const PING_EVENT = "eksperix:bridge-ping";
const READY_EVENT = "eksperix:bridge-ready";
const REQUEST_EVENT = "eksperix:bridge-request";
const RESPONSE_EVENT = "eksperix:bridge-response";

// Extensions before 0.6.0 don't answer the ping but can still push data from
// their popup, so "not detected" is a hint, not a hard block.
const PING_TIMEOUT_MS = 1500;
const REQUEST_TIMEOUT_MS = 20000;

export type EklentiDurumu = "kontrol" | "hazir" | "yok";

// "0.6.1" >= "0.6.0"
export function surumEnAz(surum: string | null, enAz: string): boolean {
  if (!surum) return false;
  const a = surum.split(".").map(Number);
  const b = enAz.split(".").map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const fark = (a[i] ?? 0) - (b[i] ?? 0);
    if (fark !== 0) return fark > 0;
  }
  return true;
}

// Detects the Eksperix Bridge extension and asks it to read an open source tab
// (an ad for "emsal", a municipal e-imar result for "imar", an address query
// result for "uavt"). The data itself arrives through the section's own import
// event; `onHata` hears failures.
export function useBridgeIstegi(tur: "emsal" | "imar" | "uavt", onHata: (metin: string) => void) {
  const [durum, setDurum] = useState<EklentiDurumu>("kontrol");
  const [surum, setSurum] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const onHataRef = useRef(onHata);
  const bekleyenRef = useRef<{ id: string; timer: ReturnType<typeof setTimeout> } | null>(null);

  useEffect(() => {
    onHataRef.current = onHata;
  }, [onHata]);

  useEffect(() => {
    let bulundu = false;
    function hazir(event: Event) {
      bulundu = true;
      setDurum("hazir");
      setSurum(readBridgeDetail<{ version?: string }>(event)?.version ?? null);
    }

    function yanitGeldi(event: Event) {
      const yanit = readBridgeDetail<{ requestId?: string; ok?: boolean; error?: string }>(event);
      const bekleyen = bekleyenRef.current;
      if (!yanit || !bekleyen || yanit.requestId !== bekleyen.id) return;
      clearTimeout(bekleyen.timer);
      bekleyenRef.current = null;
      setYukleniyor(false);
      // Success is reported by the import event, which already ran.
      if (!yanit.ok) onHataRef.current(yanit.error ?? "Veri getirilemedi.");
    }

    window.addEventListener(READY_EVENT, hazir);
    window.addEventListener(RESPONSE_EVENT, yanitGeldi);
    window.dispatchEvent(new CustomEvent(PING_EVENT));
    const timer = setTimeout(() => {
      if (!bulundu) setDurum("yok");
    }, PING_TIMEOUT_MS);

    return () => {
      clearTimeout(timer);
      window.removeEventListener(READY_EVENT, hazir);
      window.removeEventListener(RESPONSE_EVENT, yanitGeldi);
      if (bekleyenRef.current) clearTimeout(bekleyenRef.current.timer);
    };
  }, []);

  function getir() {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const timer = setTimeout(() => {
      bekleyenRef.current = null;
      setYukleniyor(false);
      onHataRef.current("Eklentiden yanıt gelmedi. Eklentiyi yeniden yükleyip bu sayfayı yenileyin.");
    }, REQUEST_TIMEOUT_MS);
    bekleyenRef.current = { id, timer };
    setYukleniyor(true);
    window.dispatchEvent(new CustomEvent(REQUEST_EVENT, { detail: JSON.stringify({ requestId: id, kind: tur }) }));
  }

  return { durum, surum, yukleniyor, getir };
}
