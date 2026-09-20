"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import type { KmlKonumu } from "@/lib/talep/types";

const DEFAULT_CENTER: [number, number] = [39, 35];
const DEFAULT_ZOOM = 5;
const POINT_ZOOM = 15;

// Inline SVG pin. Leaflet's stock marker resolves its PNGs relative to the CSS
// file, which breaks under bundlers (the marker renders as a broken image).
const PIN_HTML = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
  <path d="M14 0C6.3 0 0 6.2 0 13.9 0 24 14 36 14 36s14-12 14-22.1C28 6.2 21.7 0 14 0z" fill="#0f172a"/>
  <circle cx="14" cy="14" r="5.5" fill="#bef264"/>
</svg>`;

// Subject property (from the uploaded KML) — red so it never gets confused with
// the dark emsal pin.
const KONU_COLOR = "#dc2626";
const KONU_PIN_HTML = `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="44" viewBox="0 0 28 36" style="filter:drop-shadow(0 2px 3px rgba(15,23,42,.45))">
  <path d="M14 0C6.3 0 0 6.2 0 13.9 0 24 14 36 14 36s14-12 14-22.1C28 6.2 21.7 0 14 0z" fill="${KONU_COLOR}" stroke="#fff" stroke-width="1.5"/>
  <circle cx="14" cy="14" r="5.5" fill="#fff"/>
</svg>`;

function parseCoordinate(value: string, limit: number): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed.replace(",", "."));
  return Number.isFinite(parsed) && Math.abs(parsed) <= limit ? parsed : null;
}

const round6 = (value: number) => Number(value.toFixed(6));

export default function MiniLocationMap({
  lat,
  lng,
  konuKonumlari = [],
  onPick,
}: {
  lat: string;
  lng: string;
  konuKonumlari?: KmlKonumu[];
  onPick?: (lat: number, lng: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markerRef = useRef<import("leaflet").Marker | null>(null);
  const konuLayerRef = useRef<import("leaflet").FeatureGroup | null>(null);
  const onPickRef = useRef(onPick);
  // Set when the coordinate change came from the map itself (click / drag), so
  // the map keeps its current view instead of re-centering under the cursor.
  const pickedOnMapRef = useRef(false);
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
      // OpenStreetMap's tile policy requires visible attribution.
      L.control.attribution({ prefix: false }).addAttribution("© OpenStreetMap").addTo(map);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map);
      map.on("click", (e: import("leaflet").LeafletMouseEvent) => {
        pickedOnMapRef.current = true;
        onPickRef.current?.(round6(e.latlng.lat), round6(e.latlng.lng));
      });
      mapRef.current = map;

      // The map is often created while its tab/section is still laying out;
      // without this Leaflet keeps a stale size and renders gray tiles.
      resizeObserver = new ResizeObserver(() => map.invalidateSize());
      resizeObserver.observe(containerRef.current);
      setMapReady(true);
    });

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
      // The marker belonged to the map just removed; a stale ref would make a
      // remount (React Strict Mode) update a dead marker instead of creating one.
      markerRef.current = null;
      konuLayerRef.current = null;
      setMapReady(false);
    };
  }, []);

  // Subject property from the uploaded KML: parcel outline + a labelled red pin.
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!mapReady || !L || !map) return;

    konuLayerRef.current?.remove();
    konuLayerRef.current = null;
    if (konuKonumlari.length === 0) return;

    const layer = L.featureGroup();
    konuKonumlari.forEach((konu) => {
      konu.polygonRings.forEach((ring) => {
        L.polygon(ring, { color: KONU_COLOR, weight: 3, fillColor: KONU_COLOR, fillOpacity: 0.25 }).addTo(layer);
      });
      L.marker([konu.latitude, konu.longitude], {
        icon: L.divIcon({ className: "", html: KONU_PIN_HTML, iconSize: [34, 44], iconAnchor: [17, 44] }),
        zIndexOffset: 500,
        keyboard: false,
      })
        .bindTooltip(konu.name || "Konu Taşınmaz", { permanent: true, direction: "right", offset: [14, -22] })
        .addTo(layer);
    });
    layer.addTo(map);
    konuLayerRef.current = layer;
  }, [konuKonumlari, mapReady]);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!mapReady || !L || !map) return;

    const latNum = parseCoordinate(lat, 90);
    const lngNum = parseCoordinate(lng, 180);
    const fromMap = pickedOnMapRef.current;
    pickedOnMapRef.current = false;
    const rawBounds = konuLayerRef.current?.getBounds();
    const konuBounds = rawBounds?.isValid() ? rawBounds : null;

    if (latNum === null || lngNum === null) {
      markerRef.current?.remove();
      markerRef.current = null;
      // Don't fly away while the user is still typing a coordinate.
      if (!lat.trim() && !lng.trim()) {
        if (konuBounds) map.fitBounds(konuBounds, { padding: [40, 40], maxZoom: 16 });
        else map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
      }
      return;
    }

    if (markerRef.current) {
      markerRef.current.setLatLng([latNum, lngNum]);
    } else {
      const marker = L.marker([latNum, lngNum], {
        draggable: true,
        icon: L.divIcon({ className: "", html: PIN_HTML, iconSize: [28, 36], iconAnchor: [14, 36] }),
      }).addTo(map);
      marker.on("dragend", () => {
        const { lat: dragLat, lng: dragLng } = marker.getLatLng();
        pickedOnMapRef.current = true;
        onPickRef.current?.(round6(dragLat), round6(dragLng));
      });
      markerRef.current = marker;
    }

    if (fromMap) return;
    if (konuBounds) {
      // Show the emsal together with the subject property so their distance is visible.
      map.fitBounds(konuBounds.extend([latNum, lngNum]), { padding: [40, 40], maxZoom: 16 });
    } else {
      map.setView([latNum, lngNum], Math.max(map.getZoom(), POINT_ZOOM));
    }
  }, [lat, lng, konuKonumlari, mapReady]);

  return (
    <div className="space-y-1.5">
      <div
        ref={containerRef}
        className={`h-56 w-full overflow-hidden rounded-xl border border-slate-200 ${onPick ? "cursor-crosshair" : ""}`}
      />
      {onPick && (
        <p className="text-xs text-slate-400">
          Haritada bir noktaya tıklayarak Enlem/Boylam seçebilir, işaretçiyi sürükleyerek konumu ince
          ayarlayabilirsiniz.
        </p>
      )}
    </div>
  );
}
