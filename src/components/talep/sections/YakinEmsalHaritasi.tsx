"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { formatTrNumber } from "@/lib/emsal/hesaplama";
import { birimFiyat, formatMesafe } from "@/lib/emsal-haritasi/analiz";
import type { EmsalHaritaKaydi } from "@/lib/emsal-haritasi/types";
import type { KmlKonumu } from "@/lib/talep/types";

// Inline SVG pins — Leaflet's stock marker PNGs break under bundlers.
function pin(fill: string, center: string, size = 28, check = false): string {
  const h = Math.round(size * (36 / 28));
  const icerik = check
    ? `<path d="M9.5 14.2l3 3 6-6.4" fill="none" stroke="${center}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`
    : `<circle cx="14" cy="14" r="5.5" fill="${center}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${h}" viewBox="0 0 28 36" style="filter:drop-shadow(0 2px 3px rgba(15,23,42,.35))">
    <path d="M14 0C6.3 0 0 6.2 0 13.9 0 24 14 36 14 36s14-12 14-22.1C28 6.2 21.7 0 14 0z" fill="${fill}" stroke="#fff" stroke-width="1.2"/>
    ${icerik}
  </svg>`;
}

const KONU_RENK = "#dc2626";
const SATILIK_PIN = pin("#0f172a", "#bef264");
const KIRALIK_PIN = pin("#0369a1", "#e0f2fe");
const SECILI_PIN = pin("#65a30d", "#ffffff", 32, true);
const KONU_PIN = pin(KONU_RENK, "#ffffff", 34);

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}

function ipucu(kaydi: EmsalHaritaKaydi, mesafe: number | null, secili: boolean): string {
  const birim = birimFiyat(kaydi);
  const satirlar = [
    `<strong>${escapeHtml(kaydi.emlakTipi || "Emsal")}</strong> · ${kaydi.durum === "kiralik" ? "Kiralık" : "Satılık"}`,
    escapeHtml([kaydi.mahalle, kaydi.ilce].filter(Boolean).join(", ")),
    `${escapeHtml(kaydi.m2Net || kaydi.m2Brut || "—")} m²${birim !== null ? ` · ${formatTrNumber(birim)} ₺/m²` : ""}`,
    mesafe !== null ? `Konuya ${formatMesafe(mesafe)}` : "",
    `<span style="color:#65a30d">${secili ? "Seçili — kaldırmak için tıklayın" : "Seçmek için tıklayın"}</span>`,
  ].filter(Boolean);
  return `<div style="font-size:12px;line-height:1.45">${satirlar.join("<br/>")}</div>`;
}

export default function YakinEmsalHaritasi({
  konular,
  records,
  mesafeler,
  yaricap,
  seciliIds,
  onToggle,
  odakId,
}: {
  konular: KmlKonumu[];
  records: EmsalHaritaKaydi[];
  mesafeler: Map<string, number | null>;
  // Metres; null draws no circle (no radius limit).
  yaricap: number | null;
  seciliIds: Set<string>;
  onToggle: (id: string) => void;
  odakId: string | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const konuLayerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const emsalLayerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const markerByIdRef = useRef<Map<string, import("leaflet").Marker>>(new Map());
  const onToggleRef = useRef(onToggle);
  const [hazir, setHazir] = useState(false);

  useEffect(() => {
    onToggleRef.current = onToggle;
  }, [onToggle]);

  useEffect(() => {
    let iptal = false;
    let resizeObserver: ResizeObserver | null = null;
    import("leaflet").then((L) => {
      if (iptal || !containerRef.current || mapRef.current) return;
      leafletRef.current = L;
      const map = L.map(containerRef.current, { center: [39, 35], zoom: 6, attributionControl: false });
      L.control.attribution({ prefix: false }).addAttribution("© OpenStreetMap").addTo(map);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);
      konuLayerRef.current = L.layerGroup().addTo(map);
      emsalLayerRef.current = L.layerGroup().addTo(map);
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
      konuLayerRef.current = null;
      emsalLayerRef.current = null;
      markerByIdRef.current = new Map();
      setHazir(false);
    };
  }, []);

  // Subject property (KML) + the search radius; the view follows the radius.
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    const layer = konuLayerRef.current;
    if (!hazir || !L || !map || !layer) return;
    layer.clearLayers();
    if (konular.length === 0) return;

    const sinir = L.latLngBounds([]);
    for (const konu of konular) {
      konu.polygonRings.forEach((ring) => {
        // Rings are stored as [lat, lng] pairs (see KmlMapPanel / MiniLocationMap).
        if (ring.length < 3) return;
        L.polygon(ring, {
          color: KONU_RENK,
          weight: 2,
          fillColor: KONU_RENK,
          fillOpacity: 0.15,
          interactive: false,
        }).addTo(layer);
      });
      L.marker([konu.latitude, konu.longitude], {
        icon: L.divIcon({ className: "", html: KONU_PIN, iconSize: [34, 44], iconAnchor: [17, 44] }),
        zIndexOffset: 1000,
      })
        .bindTooltip(`<strong>Konu taşınmaz</strong><br/>${escapeHtml(konu.name || "KML konumu")}`, { direction: "top", offset: [0, -40] })
        .addTo(layer);
      if (yaricap !== null) {
        const daire = L.circle([konu.latitude, konu.longitude], {
          radius: yaricap,
          color: KONU_RENK,
          weight: 1.5,
          dashArray: "6 6",
          fillOpacity: 0.04,
          interactive: false,
        }).addTo(layer);
        sinir.extend(daire.getBounds());
      } else {
        sinir.extend([konu.latitude, konu.longitude]);
      }
    }
    if (sinir.isValid()) map.fitBounds(sinir, { padding: [24, 24], maxZoom: 16 });
  }, [konular, yaricap, hazir]);

  // Emsal pins: click toggles selection; selected ones turn green with a check.
  useEffect(() => {
    const L = leafletRef.current;
    const layer = emsalLayerRef.current;
    if (!hazir || !L || !layer) return;
    layer.clearLayers();
    markerByIdRef.current = new Map();
    for (const kaydi of records) {
      if (!Number.isFinite(kaydi.lat) || !Number.isFinite(kaydi.lng)) continue;
      const secili = seciliIds.has(kaydi.id);
      const html = secili ? SECILI_PIN : kaydi.durum === "kiralik" ? KIRALIK_PIN : SATILIK_PIN;
      const boyut: [number, number] = secili ? [32, 41] : [28, 36];
      const marker = L.marker([kaydi.lat, kaydi.lng], {
        icon: L.divIcon({ className: "", html, iconSize: boyut, iconAnchor: [boyut[0] / 2, boyut[1]] }),
        zIndexOffset: secili ? 500 : 0,
        keyboard: true,
        title: kaydi.emlakTipi || "Emsal",
      })
        .bindTooltip(ipucu(kaydi, mesafeler.get(kaydi.id) ?? null, secili), { direction: "top", offset: [0, -34] })
        .on("click", () => onToggleRef.current(kaydi.id));
      marker.addTo(layer);
      markerByIdRef.current.set(kaydi.id, marker);
    }
  }, [records, seciliIds, mesafeler, hazir]);

  // Hovering / clicking a list row brings its pin into view.
  useEffect(() => {
    const map = mapRef.current;
    if (!hazir || !map || !odakId) return;
    const marker = markerByIdRef.current.get(odakId);
    if (!marker) return;
    if (!map.getBounds().contains(marker.getLatLng())) map.panTo(marker.getLatLng());
    marker.openTooltip();
  }, [odakId, hazir]);

  return <div ref={containerRef} className="h-full w-full" />;
}
