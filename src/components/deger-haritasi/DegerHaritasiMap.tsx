"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { formatTrNumber } from "@/lib/emsal/hesaplama";
import { birimFiyat, kisaFiyat } from "@/lib/emsal-haritasi/analiz";
import type { EmsalHaritaKaydi } from "@/lib/emsal-haritasi/types";
import { birimSeviyesi, SEVIYE_RENK, type DegerNoktasi } from "@/lib/deger-haritasi/noktalar";

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}

// A price bubble: the unit value in short form, coloured by its level.
function etiket(metin: string, renk: string, secili: boolean): string {
  return `<div style="transform:translate(-50%,-100%);display:inline-flex;flex-direction:column;align-items:center">
    <span style="white-space:nowrap;border-radius:9999px;padding:2px 8px;font:600 11px/1.5 system-ui,sans-serif;color:#fff;background:${renk};border:2px solid ${secili ? "#0f172a" : "#fff"};box-shadow:0 2px 6px rgba(15,23,42,.35)">${escapeHtml(metin)}</span>
    <span style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:6px solid ${secili ? "#0f172a" : renk}"></span>
  </div>`;
}

function ipucu(n: DegerNoktasi): string {
  const satirlar = [
    `<strong>${escapeHtml(n.talep.talepNo)}</strong> · ${escapeHtml(n.tapu.ad)}`,
    escapeHtml(n.talep.musteriUnvani),
    escapeHtml([n.mahalle, n.ilce, n.il].filter(Boolean).join(", ")),
    escapeHtml(n.nitelik),
    n.deger !== null ? `<strong>${formatTrNumber(n.deger)} ₺</strong>` : `<span style="color:#94a3b8">Değer hesaplanmadı</span>`,
    n.birim !== null ? `${formatTrNumber(n.birim)} ₺/m²` : "",
    `<span style="color:#65a30d">Talebi açmak için tıklayın</span>`,
  ].filter(Boolean);
  return `<div style="font-size:12px;line-height:1.45;max-width:240px">${satirlar.join("<br/>")}</div>`;
}

export default function DegerHaritasiMap({
  noktalar,
  esikler,
  emsaller,
  odakId,
  onSec,
}: {
  noktalar: DegerNoktasi[];
  esikler: [number, number] | null;
  // Emsal Haritası records shown as small dots for context; empty hides them.
  emsaller: EmsalHaritaKaydi[];
  odakId: string | null;
  onSec: (n: DegerNoktasi) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const noktaLayerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const emsalLayerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const markerByIdRef = useRef<Map<string, import("leaflet").Marker>>(new Map());
  const onSecRef = useRef(onSec);
  const ilkSinirRef = useRef(false);
  const [hazir, setHazir] = useState(false);

  useEffect(() => {
    onSecRef.current = onSec;
  }, [onSec]);

  useEffect(() => {
    let iptal = false;
    let resizeObserver: ResizeObserver | null = null;
    import("leaflet").then((L) => {
      if (iptal || !containerRef.current || mapRef.current) return;
      leafletRef.current = L;
      const map = L.map(containerRef.current, { center: [39, 35], zoom: 6, attributionControl: false });
      L.control.attribution({ prefix: false }).addAttribution("© OpenStreetMap").addTo(map);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);
      emsalLayerRef.current = L.layerGroup().addTo(map);
      noktaLayerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      resizeObserver = new ResizeObserver(() => map.invalidateSize());
      resizeObserver.observe(containerRef.current);
      setHazir(true);
    });
    return () => {
      iptal = true;
      resizeObserver?.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
      noktaLayerRef.current = null;
      emsalLayerRef.current = null;
      markerByIdRef.current = new Map();
      ilkSinirRef.current = false;
      setHazir(false);
    };
  }, []);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    const layer = noktaLayerRef.current;
    if (!hazir || !L || !map || !layer) return;
    layer.clearLayers();
    markerByIdRef.current = new Map();
    const sinir = L.latLngBounds([]);
    for (const n of noktalar) {
      const renk = SEVIYE_RENK[birimSeviyesi(n.birim, esikler)];
      const metin = n.birim !== null ? `${kisaFiyat(n.birim)} ₺/m²` : n.deger !== null ? `${kisaFiyat(n.deger)} ₺` : "—";
      const marker = L.marker([n.lat, n.lng], {
        icon: L.divIcon({ className: "", html: etiket(metin, renk, n.tapu.id === odakId), iconSize: [0, 0] }),
        zIndexOffset: n.tapu.id === odakId ? 1000 : 0,
        keyboard: true,
        title: n.talep.talepNo,
      })
        .bindTooltip(ipucu(n), { direction: "top", offset: [0, -30] })
        .on("click", () => onSecRef.current(n));
      marker.addTo(layer);
      markerByIdRef.current.set(n.tapu.id, marker);
      sinir.extend([n.lat, n.lng]);
    }
    // Fit once to the data; later filter changes keep the user's view unless
    // everything visible has gone off screen.
    if (sinir.isValid() && (!ilkSinirRef.current || !map.getBounds().intersects(sinir))) {
      map.fitBounds(sinir, { padding: [40, 40], maxZoom: 15 });
      ilkSinirRef.current = true;
    }
  }, [noktalar, esikler, odakId, hazir]);

  useEffect(() => {
    const L = leafletRef.current;
    const layer = emsalLayerRef.current;
    if (!hazir || !L || !layer) return;
    layer.clearLayers();
    for (const e of emsaller) {
      if (!Number.isFinite(e.lat) || !Number.isFinite(e.lng)) continue;
      const b = birimFiyat(e);
      L.circleMarker([e.lat, e.lng], {
        radius: 5,
        color: "#fff",
        weight: 1.5,
        fillColor: e.durum === "kiralik" ? "#0369a1" : "#0f172a",
        fillOpacity: 0.75,
      })
        .bindTooltip(
          `<div style="font-size:12px;line-height:1.45"><strong>Emsal</strong> · ${e.durum === "kiralik" ? "Kiralık" : "Satılık"}<br/>${escapeHtml(e.emlakTipi || "")}${
            b !== null ? `<br/>${formatTrNumber(b)} ₺/m²` : ""
          }</div>`,
          { direction: "top" },
        )
        .addTo(layer);
    }
  }, [emsaller, hazir]);

  useEffect(() => {
    const map = mapRef.current;
    if (!hazir || !map || !odakId) return;
    const marker = markerByIdRef.current.get(odakId);
    if (!marker) return;
    if (!map.getBounds().contains(marker.getLatLng())) map.panTo(marker.getLatLng());
  }, [odakId, hazir]);

  return <div ref={containerRef} className="h-full w-full" />;
}
