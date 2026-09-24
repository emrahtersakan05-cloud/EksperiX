"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { formatTrNumber, parseTrNumber } from "@/lib/emsal/hesaplama";
import type { EmsalHaritaKaydi } from "@/lib/emsal-haritasi/types";

const DEFAULT_CENTER: [number, number] = [39, 35];
const DEFAULT_ZOOM = 6;
const POINT_ZOOM = 15;

// Inline SVG pins — Leaflet's stock marker resolves its PNGs relative to the
// CSS file, which breaks under bundlers (renders as a broken image).
const SATILIK_COLOR = "#0f172a";
const KIRALIK_COLOR = "#0369a1";
const PICK_COLOR = "#dc2626";

function pinHtml(color: string, fillCenter = "#bef264"): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36" style="filter:drop-shadow(0 2px 3px rgba(15,23,42,.35))">
    <path d="M14 0C6.3 0 0 6.2 0 13.9 0 24 14 36 14 36s14-12 14-22.1C28 6.2 21.7 0 14 0z" fill="${color}"/>
    <circle cx="14" cy="14" r="5.5" fill="${fillCenter}"/>
  </svg>`;
}

const SATILIK_PIN = pinHtml(SATILIK_COLOR);
const KIRALIK_PIN = pinHtml(KIRALIK_COLOR, "#e0f2fe");
const PICK_PIN = pinHtml(PICK_COLOR, "#fff");

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}

function formatPrice(value: string): string {
  const n = parseTrNumber(value);
  return n !== null && n > 0 ? `${formatTrNumber(n)} ₺` : "—";
}

// Only http(s) sources are ever rendered as a link — a stored javascript:/data:
// URI must not become clickable just because it passed through webAdresi.
function safeHref(value: string | undefined): string | null {
  if (!value || !/^https?:\/\//i.test(value)) return null;
  return escapeHtml(value);
}

function popupContent(kaydi: EmsalHaritaKaydi): string {
  const baslik = escapeHtml(`${kaydi.emlakTipi || "Emsal"} · ${kaydi.durum === "kiralik" ? "Kiralık" : "Satılık"}`);
  const konum = escapeHtml([kaydi.mahalle, kaydi.ilce, kaydi.il].filter(Boolean).join(", "));
  // Free-text user input — must be escaped before going into innerHTML below.
  const m2 = escapeHtml(kaydi.m2Net || kaydi.m2Brut || "—");
  const fiyat = formatPrice(kaydi.pazarlikliFiyat || kaydi.istenenFiyat);
  const gorselUrl = safeHref(kaydi.gorselUrl);
  const webAdresi = safeHref(kaydi.webAdresi);
  const gorsel = gorselUrl
    ? `<img src="${gorselUrl}" alt="" style="width:100%;height:96px;object-fit:cover;border-radius:8px;margin-bottom:6px" onerror="this.remove()" />`
    : "";
  const link = webAdresi
    ? `<a href="${webAdresi}" target="_blank" rel="noopener noreferrer" style="display:block;margin-top:6px;font-size:12px;color:#4d7c0f;font-weight:600">İlana git →</a>`
    : "";
  return `<div style="min-width:180px;font-family:inherit">
    ${gorsel}
    <p style="margin:0 0 2px;font-weight:600;color:#0f172a">${baslik}</p>
    <p style="margin:0 0 6px;font-size:12px;color:#64748b">${konum || "Konum bilgisi yok"}</p>
    <p style="margin:0;font-size:13px;color:#334155">${m2} m² · <strong>${fiyat}</strong></p>
    ${link}
  </div>`;
}

export default function EmsalHaritaMap({
  records,
  picking = false,
  pickedPoint,
  onPick,
  focusId,
}: {
  records: EmsalHaritaKaydi[];
  picking?: boolean;
  pickedPoint?: { lat: number; lng: number } | null;
  onPick?: (lat: number, lng: number) => void;
  focusId?: string | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markersLayerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const markerByIdRef = useRef<Map<string, import("leaflet").Marker>>(new Map());
  const pickMarkerRef = useRef<import("leaflet").Marker | null>(null);
  const onPickRef = useRef(onPick);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    onPickRef.current = onPick;
  }, [onPick]);

  useEffect(() => {
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;

    import("leaflet").then((L) => {
      if (cancelled || !containerRef.current || mapRef.current) return;
      leafletRef.current = L;
      const map = L.map(containerRef.current, {
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        attributionControl: false,
      });
      L.control.attribution({ prefix: false }).addAttribution("© OpenStreetMap").addTo(map);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);
      markersLayerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;

      resizeObserver = new ResizeObserver(() => map.invalidateSize());
      resizeObserver.observe(containerRef.current);
      setMapReady(true);
    });

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
      markerByIdRef.current = new Map();
      pickMarkerRef.current = null;
      setMapReady(false);
    };
  }, []);

  // Click-to-pick a coordinate for the "new record" form.
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;
    function handleClick(e: import("leaflet").LeafletMouseEvent) {
      onPickRef.current?.(Number(e.latlng.lat.toFixed(6)), Number(e.latlng.lng.toFixed(6)));
    }
    if (picking) map.on("click", handleClick);
    return () => {
      map.off("click", handleClick);
    };
  }, [picking, mapReady]);

  // Existing records as static pins, colour-coded by durum.
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    const layer = markersLayerRef.current;
    if (!mapReady || !L || !map || !layer) return;

    layer.clearLayers();
    markerByIdRef.current = new Map();
    const bounds = L.latLngBounds([]);

    records.forEach((kaydi) => {
      if (!Number.isFinite(kaydi.lat) || !Number.isFinite(kaydi.lng)) return;
      const marker = L.marker([kaydi.lat, kaydi.lng], {
        icon: L.divIcon({
          className: "",
          html: kaydi.durum === "kiralik" ? KIRALIK_PIN : SATILIK_PIN,
          iconSize: [28, 36],
          iconAnchor: [14, 36],
        }),
      }).bindPopup(popupContent(kaydi));
      marker.addTo(layer);
      markerByIdRef.current.set(kaydi.id, marker);
      bounds.extend([kaydi.lat, kaydi.lng]);
    });

    if (bounds.isValid() && !picking) {
      map.fitBounds(bounds, { padding: [32, 32], maxZoom: 15 });
    }
  }, [records, mapReady, picking]);

  // The point being picked for a new record — a distinct red pin.
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!mapReady || !L || !map) return;

    pickMarkerRef.current?.remove();
    pickMarkerRef.current = null;
    if (!pickedPoint) return;

    const marker = L.marker([pickedPoint.lat, pickedPoint.lng], {
      icon: L.divIcon({ className: "", html: PICK_PIN, iconSize: [28, 36], iconAnchor: [14, 36] }),
      zIndexOffset: 1000,
    }).addTo(map);
    pickMarkerRef.current = marker;
    map.setView([pickedPoint.lat, pickedPoint.lng], Math.max(map.getZoom(), POINT_ZOOM));
  }, [pickedPoint, mapReady]);

  // Focusing a record from the side list opens its popup and centers on it.
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map || !focusId) return;
    const marker = markerByIdRef.current.get(focusId);
    if (!marker) return;
    map.setView(marker.getLatLng(), Math.max(map.getZoom(), POINT_ZOOM));
    marker.openPopup();
  }, [focusId, mapReady]);

  return (
    <div
      ref={containerRef}
      className={`h-full w-full ${picking ? "cursor-crosshair" : ""}`}
    />
  );
}
