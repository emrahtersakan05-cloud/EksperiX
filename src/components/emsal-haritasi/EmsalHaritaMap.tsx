"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { formatTrNumber, parseTrNumber } from "@/lib/emsal/hesaplama";
import {
  birimFiyat,
  durumMedyanlari,
  eskiIlanMi,
  fiyatSeviyesi,
  istatistik,
  kisaFiyat,
  type CevreAnalizi,
  type FiyatSeviye,
  type HaritaSinirlari,
} from "@/lib/emsal-haritasi/analiz";
import type { EmsalHaritaKaydi } from "@/lib/emsal-haritasi/types";

const DEFAULT_CENTER: [number, number] = [39, 35];
const DEFAULT_ZOOM = 6;
const POINT_ZOOM = 15;
// From this zoom level on, clustering is off and every record gets its own pin.
const KUMELEME_BITIS = 16;
const KUMELEME_HUCRE = 64;

export type PinModu = "durum" | "fiyat";
export type HaritaKatmani = "sokak" | "uydu";

// A place to jump to (address search result); `key` makes repeat jumps to the
// same spot still fire.
export interface HaritaHedefi {
  lat: number;
  lng: number;
  zoom: number;
  key: number;
}

const KATMANLAR: Record<HaritaKatmani, { url: string; attribution: string; maxZoom: number }> = {
  sokak: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "© OpenStreetMap",
    maxZoom: 19,
  },
  uydu: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Görüntü © Esri, Maxar, Earthstar Geographics",
    maxZoom: 19,
  },
};

// Inline SVG pins — Leaflet's stock marker resolves its PNGs relative to the
// CSS file, which breaks under bundlers (renders as a broken image).
const SATILIK_COLOR = "#0f172a";
const KIRALIK_COLOR = "#0369a1";
const PICK_COLOR = "#7c3aed";

export const SEVIYE_RENK: Record<FiyatSeviye, string> = {
  dusuk: "#16a34a",
  normal: "#d97706",
  yuksek: "#dc2626",
  bilinmiyor: "#94a3b8",
};

function pinHtml(color: string, fillCenter = "#bef264"): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36" style="filter:drop-shadow(0 2px 3px rgba(15,23,42,.35))">
    <path d="M14 0C6.3 0 0 6.2 0 13.9 0 24 14 36 14 36s14-12 14-22.1C28 6.2 21.7 0 14 0z" fill="${color}"/>
    <circle cx="14" cy="14" r="5.5" fill="${fillCenter}"/>
  </svg>`;
}

const SATILIK_PIN = pinHtml(SATILIK_COLOR);
const KIRALIK_PIN = pinHtml(KIRALIK_COLOR, "#e0f2fe");
const PICK_PIN = pinHtml(PICK_COLOR, "#fff");

// A price bubble whose tip sits on the coordinate; the label is generated from
// numbers only, so it needs no escaping.
function fiyatEtiketiHtml(label: string, color: string, kiralik: boolean): string {
  return `<div style="position:absolute;left:0;top:0;transform:translate(-50%,calc(-100% - 6px));white-space:nowrap;
      background:${color};color:#fff;font:600 11px/1 system-ui,sans-serif;padding:5px 7px;border-radius:999px;
      box-shadow:0 2px 4px rgba(15,23,42,.3);border:1.5px solid ${kiralik ? "#e0f2fe" : "#fff"}">${label}${kiralik ? " ·K" : ""}
    <span style="position:absolute;left:50%;bottom:-6px;transform:translateX(-50%);width:0;height:0;
      border-left:5px solid transparent;border-right:5px solid transparent;border-top:6px solid ${color}"></span>
  </div>`;
}

function kumeHtml(adet: number): string {
  const boyut = adet < 10 ? 34 : adet < 50 ? 40 : 48;
  return `<div style="position:absolute;left:0;top:0;transform:translate(-50%,-50%);width:${boyut}px;height:${boyut}px;
      border-radius:999px;background:rgba(15,23,42,.88);color:#bef264;display:flex;align-items:center;justify-content:center;
      font:700 12px/1 system-ui,sans-serif;box-shadow:0 0 0 4px rgba(15,23,42,.18),0 2px 6px rgba(15,23,42,.35)">${adet}</div>`;
}

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
  const detay = escapeHtml(
    [kaydi.odaSayisi, kaydi.kat && `${kaydi.kat}. kat`, kaydi.binaYasi && `${kaydi.binaYasi} yaş`].filter(Boolean).join(" · "),
  );
  const ekleyen = escapeHtml(kaydi.ekleyenAdSoyad || "");
  const fiyat = formatPrice(kaydi.pazarlikliFiyat || kaydi.istenenFiyat);
  const birim = birimFiyat(kaydi);
  const gorselUrl = safeHref(kaydi.gorselUrl);
  const webAdresi = safeHref(kaydi.webAdresi);
  const gorsel = gorselUrl
    ? `<img src="${gorselUrl}" alt="" style="width:100%;height:96px;object-fit:cover;border-radius:8px;margin-bottom:6px" onerror="this.remove()" />`
    : "";
  const link = webAdresi
    ? `<a href="${webAdresi}" target="_blank" rel="noopener noreferrer" style="display:block;margin-top:6px;font-size:12px;color:#4d7c0f;font-weight:600">İlana git →</a>`
    : "";
  return `<div style="min-width:190px;font-family:inherit">
    ${gorsel}
    <p style="margin:0 0 2px;font-weight:600;color:#0f172a">${baslik}</p>
    <p style="margin:0 0 6px;font-size:12px;color:#64748b">${konum || "Konum bilgisi yok"}</p>
    <p style="margin:0;font-size:13px;color:#334155">${m2} m² · <strong>${fiyat}</strong></p>
    ${birim !== null ? `<p style="margin:2px 0 0;font-size:12px;color:#334155">${formatTrNumber(birim)} ₺/m²</p>` : ""}
    ${detay ? `<p style="margin:4px 0 0;font-size:11px;color:#64748b">${detay}</p>` : ""}
    ${ekleyen ? `<p style="margin:4px 0 0;font-size:11px;color:#94a3b8">Ekleyen: ${ekleyen}</p>` : ""}
    ${link}
  </div>`;
}

export default function EmsalHaritaMap({
  records,
  pinModu = "durum",
  picking = false,
  pickedPoint,
  onPick,
  focusId,
  cevre,
  fitSignal = 0,
  onBoundsChange,
  katman = "sokak",
  kumele = false,
  hedef,
}: {
  records: EmsalHaritaKaydi[];
  pinModu?: PinModu;
  picking?: boolean;
  pickedPoint?: { lat: number; lng: number } | null;
  onPick?: (lat: number, lng: number) => void;
  focusId?: string | null;
  cevre?: CevreAnalizi | null;
  // Bumping this number re-fits the view to the current records.
  fitSignal?: number;
  onBoundsChange?: (bounds: HaritaSinirlari) => void;
  katman?: HaritaKatmani;
  kumele?: boolean;
  hedef?: HaritaHedefi | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markersLayerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const markerByIdRef = useRef<Map<string, import("leaflet").Marker>>(new Map());
  const pickMarkerRef = useRef<import("leaflet").Marker | null>(null);
  const cevreLayerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const initialFitDoneRef = useRef(false);
  const lastFitSignalRef = useRef(fitSignal);
  const recordsRef = useRef(records);
  const onPickRef = useRef(onPick);
  const pickingRef = useRef(picking);
  const onBoundsChangeRef = useRef(onBoundsChange);
  const tileLayerRef = useRef<import("leaflet").TileLayer | null>(null);
  const pendingFocusRef = useRef<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);

  const medyanlar = useMemo(() => durumMedyanlari(records), [records]);

  useEffect(() => {
    onPickRef.current = onPick;
    onBoundsChangeRef.current = onBoundsChange;
    recordsRef.current = records;
    pickingRef.current = picking;
  }, [onPick, onBoundsChange, records, picking]);

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
        zoomControl: false,
      });
      // Bottom-right keeps the top corners free for the page's own toolbar.
      L.control.zoom({ position: "bottomright" }).addTo(map);
      L.control.attribution({ prefix: false }).addTo(map);
      cevreLayerRef.current = L.layerGroup().addTo(map);
      markersLayerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;

      const reportBounds = () => {
        const b = map.getBounds();
        onBoundsChangeRef.current?.({ south: b.getSouth(), west: b.getWest(), north: b.getNorth(), east: b.getEast() });
      };
      map.on("moveend", reportBounds);
      map.on("zoomend", () => setZoom(map.getZoom()));
      reportBounds();

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
      cevreLayerRef.current = null;
      tileLayerRef.current = null;
      markerByIdRef.current = new Map();
      pickMarkerRef.current = null;
      initialFitDoneRef.current = false;
      setMapReady(false);
    };
  }, []);

  // Base map: street (OSM) or satellite (Esri World Imagery).
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!mapReady || !L || !map) return;
    const ayar = KATMANLAR[katman];
    tileLayerRef.current?.remove();
    tileLayerRef.current = L.tileLayer(ayar.url, { maxZoom: ayar.maxZoom, attribution: ayar.attribution }).addTo(map);
    tileLayerRef.current.bringToBack();
  }, [katman, mapReady]);

  // Jump to an address search result.
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map || !hedef) return;
    map.setView([hedef.lat, hedef.lng], hedef.zoom);
  }, [hedef, mapReady]);

  // Click-to-pick a coordinate (new/edited record's location, or the centre of
  // a çevre analizi — the parent decides what the point is for).
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

  // Records as pins (coloured by durum) or as ₺/m² bubbles (coloured by how
  // the unit price compares with the median of the visible records).
  useEffect(() => {
    const L = leafletRef.current;
    const layer = markersLayerRef.current;
    if (!mapReady || !L || !layer) return;

    layer.clearLayers();
    markerByIdRef.current = new Map();
    const map = mapRef.current!;

    const gecerli = records.filter((k) => Number.isFinite(k.lat) && Number.isFinite(k.lng));
    let tekil = gecerli;
    // Grid clustering in screen space: records whose pins would land in the
    // same 64 px cell at the current zoom collapse into one counted bubble.
    if (kumele && zoom < KUMELEME_BITIS) {
      const hucreler = new Map<string, EmsalHaritaKaydi[]>();
      gecerli.forEach((k) => {
        const p = map.project([k.lat, k.lng], zoom);
        const anahtar = `${Math.floor(p.x / KUMELEME_HUCRE)}:${Math.floor(p.y / KUMELEME_HUCRE)}`;
        hucreler.set(anahtar, [...(hucreler.get(anahtar) ?? []), k]);
      });
      tekil = [];
      hucreler.forEach((grup) => {
        if (grup.length === 1) {
          tekil.push(grup[0]);
          return;
        }
        const lat = grup.reduce((t, k) => t + k.lat, 0) / grup.length;
        const lng = grup.reduce((t, k) => t + k.lng, 0) / grup.length;
        const satilikMedyan = istatistik(grup.filter((k) => k.durum !== "kiralik")).medyan;
        const kiralikMedyan = istatistik(grup.filter((k) => k.durum === "kiralik")).medyan;
        const ozet = [
          `${grup.length} emsal`,
          satilikMedyan !== null ? `satılık medyan ${kisaFiyat(satilikMedyan)} ₺/m²` : "",
          kiralikMedyan !== null ? `kiralık medyan ${kisaFiyat(kiralikMedyan)} ₺/m²` : "",
        ]
          .filter(Boolean)
          .join(" · ");
        const kume = L.marker([lat, lng], {
          icon: L.divIcon({ className: "", html: kumeHtml(grup.length), iconSize: [0, 0] }),
          zIndexOffset: 500,
        }).bindTooltip(ozet, { direction: "top", offset: [0, -20] });
        kume.on("click", () => {
          const b = L.latLngBounds(grup.map((k) => [k.lat, k.lng] as [number, number]));
          map.fitBounds(b, { padding: [48, 48], maxZoom: KUMELEME_BITIS });
        });
        kume.addTo(layer);
      });
    }

    tekil.forEach((kaydi) => {
      const kiralik = kaydi.durum === "kiralik";
      let icon: import("leaflet").DivIcon;
      const birim = pinModu === "fiyat" ? birimFiyat(kaydi) : null;
      if (pinModu === "fiyat" && birim !== null) {
        const renk = SEVIYE_RENK[fiyatSeviyesi(kaydi, medyanlar)];
        icon = L.divIcon({ className: "", html: fiyatEtiketiHtml(kisaFiyat(birim), renk, kiralik), iconSize: [0, 0] });
      } else if (pinModu === "fiyat") {
        icon = L.divIcon({
          className: "",
          html: pinHtml(SEVIYE_RENK.bilinmiyor, "#fff"),
          iconSize: [28, 36],
          iconAnchor: [14, 36],
        });
      } else {
        icon = L.divIcon({ className: "", html: kiralik ? KIRALIK_PIN : SATILIK_PIN, iconSize: [28, 36], iconAnchor: [14, 36] });
      }
      // Listings over a year old are faded: still shown, but visibly dated.
      const marker = L.marker([kaydi.lat, kaydi.lng], { icon, opacity: eskiIlanMi(kaydi) ? 0.5 : 1 }).bindPopup(popupContent(kaydi), {
        offset: pinModu === "fiyat" && birim !== null ? [0, -26] : [0, -30],
      });
      // While picking, a click on an existing pin picks that pin's spot (e.g. a
      // second listing in the same building) instead of opening its popup.
      marker.on("click", (e) => {
        if (!pickingRef.current) return;
        marker.closePopup();
        onPickRef.current?.(Number(e.latlng.lat.toFixed(6)), Number(e.latlng.lng.toFixed(6)));
      });
      marker.addTo(layer);
      markerByIdRef.current.set(kaydi.id, marker);
    });

    const bekleyen = pendingFocusRef.current && markerByIdRef.current.get(pendingFocusRef.current);
    if (bekleyen) {
      pendingFocusRef.current = null;
      bekleyen.openPopup();
    }
  }, [records, mapReady, pinModu, medyanlar, kumele, zoom]);

  // Fit to the records once on first load and again whenever the parent asks
  // (fitSignal) — not on every filter change, which would keep yanking the view.
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!mapReady || !L || !map) return;
    if (initialFitDoneRef.current && fitSignal === lastFitSignalRef.current) return;
    const list = recordsRef.current.filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lng));
    if (list.length === 0) return;
    const bounds = L.latLngBounds(list.map((r) => [r.lat, r.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    initialFitDoneRef.current = true;
    lastFitSignalRef.current = fitSignal;
    // records.length: the first fit waits until records are actually present.
  }, [fitSignal, mapReady, records.length]);

  // The point being picked for a new/edited record — a distinct violet pin.
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

  // Çevre analizi: dashed radius circle around the chosen centre.
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    const layer = cevreLayerRef.current;
    if (!mapReady || !L || !map || !layer) return;
    layer.clearLayers();
    if (!cevre) return;
    const circle = L.circle([cevre.lat, cevre.lng], {
      radius: cevre.yaricap,
      color: PICK_COLOR,
      weight: 2,
      dashArray: "6 6",
      fillColor: PICK_COLOR,
      fillOpacity: 0.06,
      interactive: false,
    }).addTo(layer);
    L.circleMarker([cevre.lat, cevre.lng], {
      radius: 5,
      color: "#fff",
      weight: 2,
      fillColor: PICK_COLOR,
      fillOpacity: 1,
      interactive: false,
    }).addTo(layer);
    map.fitBounds(circle.getBounds(), { padding: [32, 32] });
  }, [cevre, mapReady]);

  // Focusing a record from the side list opens its popup and centers on it.
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map || !focusId) return;
    const marker = markerByIdRef.current.get(focusId);
    if (marker) {
      map.setView(marker.getLatLng(), Math.max(map.getZoom(), POINT_ZOOM));
      marker.openPopup();
      return;
    }
    // Hidden inside a cluster: zoom past the clustering threshold and open the
    // popup once the markers have been rebuilt at that zoom.
    const kaydi = recordsRef.current.find((r) => r.id === focusId);
    if (!kaydi) return;
    pendingFocusRef.current = focusId;
    map.setView([kaydi.lat, kaydi.lng], Math.max(map.getZoom(), KUMELEME_BITIS));
  }, [focusId, mapReady]);

  // Leaflet adds its own classes (leaflet-container, leaflet-grab…) to the
  // element it mounts on, so that element's className must never change after
  // mount — React would wipe them. The picking cursor lives on a wrapper.
  return (
    <div className={`h-full w-full ${picking ? "[&_.leaflet-grab]:cursor-crosshair!" : ""}`}>
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
