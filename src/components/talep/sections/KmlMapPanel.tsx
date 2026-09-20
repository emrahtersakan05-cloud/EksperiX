"use client";

import "leaflet/dist/leaflet.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Car, ExternalLink, LocateFixed, Loader2, MapPin, UploadCloud, X } from "lucide-react";
import { SectionCard, helperTextClass, sectionBodyClass } from "@/components/talep/form-fields";
import type { AdresKonumData, KmlKonumu } from "@/lib/talep/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type KmlProperty = KmlKonumu;

interface RouteSummary {
  distanceText: string;
  durationText: string;
  directionsText: string;
}

type LeafletModule = typeof import("leaflet");

// ---------------------------------------------------------------------------
// Pure helpers — kept framework-free so this can move into a shared
// valuation/location module once KML properties feed the Tapu data model.
// ---------------------------------------------------------------------------

function stripHtml(raw: string): string {
  if (!raw) return "";
  const doc = new DOMParser().parseFromString(raw, "text/html");
  return (doc.body.textContent ?? "").trim();
}

function parseDescriptionFields(raw: string): { label: string; value: string }[] {
  const plain = stripHtml(raw);
  if (!plain) return [];
  const fields: { label: string; value: string }[] = [];
  for (const line of plain.split(/\r?\n/)) {
    const trimmed = line.trim();
    const match = /^([^:]{1,40}):\s*(.+)$/.exec(trimmed);
    if (match) fields.push({ label: match[1].trim(), value: match[2].trim() });
  }
  return fields;
}

// KML coordinate blocks are whitespace-separated "lon,lat[,alt]" tuples.
function parseCoordinateTuples(raw: string): [number, number][] {
  return raw
    .trim()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => {
      const [lonRaw, latRaw] = token.split(",");
      const lon = Number(lonRaw);
      const lat = Number(latRaw);
      return Number.isFinite(lat) && Number.isFinite(lon) ? ([lat, lon] as [number, number]) : null;
    })
    .filter((point): point is [number, number] => point !== null);
}

function centroidOf(points: [number, number][]): [number, number] | null {
  if (points.length === 0) return null;
  const sum = points.reduce((acc, [lat, lon]) => [acc[0] + lat, acc[1] + lon] as [number, number], [0, 0] as [
    number,
    number,
  ]);
  return [sum[0] / points.length, sum[1] / points.length];
}

let placemarkCounter = 0;
function nextId(): string {
  placemarkCounter += 1;
  return `kml-${Date.now()}-${placemarkCounter}`;
}

function collectGeometry(placemark: Element): { points: [number, number][]; rings: [number, number][][] } {
  const points: [number, number][] = [];
  const rings: [number, number][][] = [];

  Array.from(placemark.getElementsByTagName("Point")).forEach((point) => {
    const coordsNode = point.getElementsByTagName("coordinates")[0];
    const tuple = parseCoordinateTuples(coordsNode?.textContent ?? "")[0];
    if (tuple) points.push(tuple);
  });

  Array.from(placemark.getElementsByTagName("Polygon")).forEach((polygon) => {
    const outer = polygon.getElementsByTagName("outerBoundaryIs")[0];
    const linearRing = outer?.getElementsByTagName("LinearRing")[0];
    const coordsNode = linearRing?.getElementsByTagName("coordinates")[0];
    const ring = parseCoordinateTuples(coordsNode?.textContent ?? "");
    if (ring.length >= 3) rings.push(ring);
  });

  return { points, rings };
}

// Handles Point, Polygon and MultiGeometry placemarks per the KML spec.
function parseKmlDocument(kmlText: string): KmlProperty[] {
  const xml = new DOMParser().parseFromString(kmlText, "application/xml");
  if (xml.querySelector("parsererror")) {
    throw new Error("KML dosyası okunamadı veya geçersiz formatta.");
  }

  const properties: KmlProperty[] = [];
  Array.from(xml.getElementsByTagName("Placemark")).forEach((placemark, index) => {
    const { points, rings } = collectGeometry(placemark);
    const representative = points[0] ?? centroidOf(rings[0] ?? []);
    if (!representative) return;

    const descriptionRaw = placemark.getElementsByTagName("description")[0]?.textContent ?? "";
    properties.push({
      id: nextId(),
      name: placemark.getElementsByTagName("name")[0]?.textContent?.trim() || `Taşınmaz ${index + 1}`,
      descriptionFields: parseDescriptionFields(descriptionRaw),
      descriptionText: stripHtml(descriptionRaw),
      latitude: representative[0],
      longitude: representative[1],
      hasPolygon: rings.length > 0,
      polygonRings: rings,
    });
  });

  if (properties.length === 0) {
    throw new Error("KML dosyasında kullanılabilir koordinat bulunamadı.");
  }
  return properties;
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} km`;
}

function formatDuration(seconds: number): string {
  const totalMinutes = Math.round(seconds / 60);
  if (totalMinutes < 60) return `${totalMinutes} dk`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours} sa ${minutes} dk` : `${hours} sa`;
}

function googleMapsUrl(lat: number, lon: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;
}

function getUserLocation(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Mevcut konumunuz alınamadı."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          reject(new Error("Yol tarifi oluşturmak için konum izni vermeniz gerekmektedir."));
        } else {
          reject(new Error("Mevcut konumunuz alınamadı."));
        }
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  });
}

interface OsrmStep {
  distance: number;
  name: string;
  maneuver: { type: string; modifier?: string };
}

interface OsrmRoute {
  coordinates: [number, number][]; // [lon, lat]
  distance: number;
  duration: number;
  steps: OsrmStep[];
}

async function calculateRoute(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
): Promise<OsrmRoute> {
  const url = `https://router.project-osrm.org/route/v1/driving/${from.longitude},${from.latitude};${to.longitude},${to.latitude}?overview=full&geometries=geojson&steps=true`;

  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    throw new Error("Rota oluşturulamadı. Lütfen tekrar deneyiniz.");
  }
  if (!response.ok) {
    throw new Error("Rota oluşturulamadı. Lütfen tekrar deneyiniz.");
  }

  const json = (await response.json()) as {
    code?: string;
    routes?: {
      geometry: { coordinates: [number, number][] };
      distance: number;
      duration: number;
      legs: { steps: OsrmStep[] }[];
    }[];
  };

  const route = json.routes?.[0];
  if (json.code !== "Ok" || !route) {
    throw new Error("Seçilen taşınmaza ulaşılabilir bir araç rotası bulunamadı.");
  }

  return {
    coordinates: route.geometry.coordinates,
    distance: route.distance,
    duration: route.duration,
    steps: route.legs.flatMap((leg) => leg.steps),
  };
}

// Turns OSRM's per-step maneuvers into one flowing Turkish paragraph instead
// of a bare instruction list.
function modifierPhrase(modifier?: string): string {
  switch (modifier) {
    case "left":
      return "sola dönün";
    case "right":
      return "sağa dönün";
    case "slight left":
      return "hafifçe sola dönün";
    case "slight right":
      return "hafifçe sağa dönün";
    case "sharp left":
      return "keskin bir dönüşle sola dönün";
    case "sharp right":
      return "keskin bir dönüşle sağa dönün";
    case "uturn":
      return "U dönüşü yapın";
    default:
      return "düz devam edin";
  }
}

function stepSentence(step: OsrmStep, isFirst: boolean, isLast: boolean): string {
  const roadPhrase = step.name ? `${step.name} üzerinde` : "yol üzerinde";
  const distancePhrase = step.distance >= 20 ? ` yaklaşık ${formatDistance(step.distance)} ilerleyin` : "";

  if (isFirst || step.maneuver.type === "depart") {
    return `Başlangıç noktanızdan hareketle ${roadPhrase} yola çıkın${distancePhrase}.`;
  }
  if (isLast || step.maneuver.type === "arrive") {
    return "Ardından hedef taşınmaza ulaşmış olacaksınız.";
  }
  if (step.maneuver.type === "roundabout" || step.maneuver.type === "rotary") {
    return `Kavşağa girip ${roadPhrase} çıkış yapın${distancePhrase}.`;
  }
  if (step.maneuver.type === "new name" || step.maneuver.type === "continue") {
    return `Yol adı değişse de ${roadPhrase} düz devam edin${distancePhrase}.`;
  }
  return `Ardından ${modifierPhrase(step.maneuver.modifier)}, ${roadPhrase}${distancePhrase}.`;
}

function buildDirectionsText(steps: OsrmStep[]): string {
  if (steps.length === 0) return "Bu rota için adım adım tarif bilgisi alınamadı.";
  return steps.map((step, index) => stepSentence(step, index === 0, index === steps.length - 1)).join(" ");
}

// Small DOM builder so untrusted KML text (name/description) is always
// inserted via textContent — never innerHTML — inside Leaflet popups, which
// live outside React's own escaping.
function el<K extends keyof HTMLElementTagNameMap>(tag: K, style?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (style) node.style.cssText = style;
  if (text !== undefined) node.textContent = text;
  return node;
}

function buildPopupContent(property: KmlProperty, onRoute: () => void): HTMLElement {
  const wrapper = el("div", "min-width:220px;max-width:260px;font-family:inherit;");

  wrapper.appendChild(
    el(
      "p",
      "font-size:10px;font-weight:700;letter-spacing:0.08em;color:#64748b;margin:0 0 4px;",
      "DEĞERLEME KONUSU TAŞINMAZ",
    ),
  );
  wrapper.appendChild(el("p", "font-size:14px;font-weight:700;color:#0f172a;margin:0 0 8px;", property.name));

  const coordsGrid = el("div", "display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px;");
  const latBlock = el("div");
  latBlock.appendChild(el("p", "font-size:10px;color:#94a3b8;margin:0;", "Enlem"));
  latBlock.appendChild(el("p", "font-size:12px;font-weight:600;color:#1e293b;margin:0;", property.latitude.toFixed(6)));
  const lonBlock = el("div");
  lonBlock.appendChild(el("p", "font-size:10px;color:#94a3b8;margin:0;", "Boylam"));
  lonBlock.appendChild(
    el("p", "font-size:12px;font-weight:600;color:#1e293b;margin:0;", property.longitude.toFixed(6)),
  );
  coordsGrid.append(latBlock, lonBlock);
  wrapper.appendChild(coordsGrid);

  if (property.descriptionFields.length > 0) {
    const descBox = el("div", "background:#f8fafc;border-radius:8px;padding:6px 8px;margin-bottom:8px;");
    property.descriptionFields.forEach((field) => {
      const line = el("p", "font-size:11px;color:#475569;margin:0;");
      line.appendChild(el("strong", "color:#1e293b;", `${field.label}: `));
      line.appendChild(document.createTextNode(field.value));
      descBox.appendChild(line);
    });
    wrapper.appendChild(descBox);
  } else if (property.descriptionText) {
    wrapper.appendChild(
      el("p", "font-size:11px;color:#475569;margin:0 0 8px;white-space:pre-wrap;", property.descriptionText),
    );
  }

  const actions = el("div", "display:flex;flex-direction:column;gap:6px;");
  const routeBtn = el(
    "button",
    "background:#0f172a;color:#fff;border:none;border-radius:8px;padding:9px 10px;font-size:12px;font-weight:600;cursor:pointer;",
    "🚗 Yol Tarifi Al",
  );
  routeBtn.type = "button";
  routeBtn.addEventListener("click", onRoute);
  actions.appendChild(routeBtn);

  const gmapsLink = el(
    "a",
    "display:block;text-align:center;background:#f1f5f9;color:#0f172a;border-radius:8px;padding:9px 10px;font-size:12px;font-weight:600;text-decoration:none;",
    "↗ Google Maps'te Aç",
  );
  gmapsLink.href = googleMapsUrl(property.latitude, property.longitude);
  gmapsLink.target = "_blank";
  gmapsLink.rel = "noopener noreferrer";
  actions.appendChild(gmapsLink);

  wrapper.appendChild(actions);
  return wrapper;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function KmlMapPanel({
  properties,
  fileName,
  onChange,
}: {
  properties: KmlProperty[];
  fileName: string;
  onChange: (patch: Partial<AdresKonumData>) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const leafletRef = useRef<LeafletModule | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markersRef = useRef<Map<string, import("leaflet").Marker>>(new Map());
  const polygonsRef = useRef<import("leaflet").Polygon[]>([]);
  const routeLayerRef = useRef<import("leaflet").Polyline | null>(null);
  const startMarkerRef = useRef<import("leaflet").Marker | null>(null);
  const routeLoadingRef = useRef(false);
  const pickingStartRef = useRef(false);
  const startPointRef = useRef<{ latitude: number; longitude: number } | null>(null);

  const [mapReady, setMapReady] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [routeSummary, setRouteSummary] = useState<RouteSummary | null>(null);
  const [startPoint, setStartPoint] = useState<{ latitude: number; longitude: number } | null>(null);
  const [pickingStart, setPickingStart] = useState(false);
  const [startLocating, setStartLocating] = useState(false);
  const [startLocationError, setStartLocationError] = useState<string | null>(null);

  useEffect(() => {
    routeLoadingRef.current = routeLoading;
  }, [routeLoading]);

  useEffect(() => {
    pickingStartRef.current = pickingStart;
    const map = mapRef.current;
    if (map) map.getContainer().style.cursor = pickingStart ? "crosshair" : "";
  }, [pickingStart]);

  useEffect(() => {
    startPointRef.current = startPoint;
  }, [startPoint]);

  // Map is created once, client-side only (Leaflet needs `window`/`document`).
  useEffect(() => {
    let cancelled = false;
    import("leaflet").then((L) => {
      if (cancelled || !containerRef.current || mapRef.current) return;
      leafletRef.current = L;
      const map = L.map(containerRef.current, { center: [39, 35], zoom: 5 });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap katkıda bulunanlar",
        maxZoom: 19,
      }).addTo(map);
      map.on("click", (e: import("leaflet").LeafletMouseEvent) => {
        if (!pickingStartRef.current) return;
        setStartPoint({ latitude: e.latlng.lat, longitude: e.latlng.lng });
        setPickingStart(false);
      });
      mapRef.current = map;
      setMapReady(true);
    });
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  const clearRoute = useCallback(() => {
    routeLayerRef.current?.remove();
    routeLayerRef.current = null;
    setRouteSummary(null);
    setRouteError(null);
  }, []);

  const showRoute = useCallback((route: OsrmRoute) => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    routeLayerRef.current?.remove();

    const latlngs = route.coordinates.map(([lon, lat]) => [lat, lon] as [number, number]);
    routeLayerRef.current = L.polyline(latlngs, { color: "#0f172a", weight: 5, opacity: 0.85 }).addTo(map);
    map.fitBounds(L.latLngBounds(latlngs), { padding: [40, 40] });
  }, []);

  const handleRouteRequest = useCallback(
    (property: KmlProperty) => {
      if (routeLoadingRef.current) return;
      const start = startPointRef.current;
      if (!start) {
        setRouteError("Lütfen önce haritada bir başlangıç noktası seçin.");
        setRouteSummary(null);
        return;
      }
      setRouteLoading(true);
      setRouteError(null);
      setRouteSummary(null);
      calculateRoute(start, { latitude: property.latitude, longitude: property.longitude })
        .then((route) => {
          showRoute(route);
          setRouteSummary({
            distanceText: formatDistance(route.distance),
            durationText: formatDuration(route.duration),
            directionsText: buildDirectionsText(route.steps),
          });
        })
        .catch((err: unknown) => {
          setRouteError(err instanceof Error ? err.message : "Rota oluşturulamadı. Lütfen tekrar deneyiniz.");
        })
        .finally(() => setRouteLoading(false));
    },
    [showRoute],
  );

  const buildStartIcon = useCallback(() => {
    const L = leafletRef.current;
    if (!L) return undefined;
    return L.divIcon({
      className: "",
      html: `<span style="display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:50%;background:#059669;border:3px solid white;box-shadow:0 2px 8px rgba(5,150,105,0.5);"><span style="width:8px;height:8px;border-radius:9999px;background:white;"></span></span>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });
  }, []);

  const buildIcon = useCallback((selected: boolean) => {
    const L = leafletRef.current;
    if (!L) return undefined;
    const color = selected ? "#0f172a" : "#1e3a8a";
    return L.divIcon({
      className: "",
      html: `<span style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:9999px 9999px 9999px 0;transform:rotate(-45deg);background:${color};border:2px solid white;box-shadow:0 2px 6px rgba(15,23,42,0.4);"><span style="transform:rotate(45deg);width:7px;height:7px;border-radius:9999px;background:white;"></span></span>`,
      iconSize: [28, 28],
      iconAnchor: [14, 28],
      popupAnchor: [0, -26],
    });
  }, []);

  // (Re)draw markers and polygons whenever a new KML is parsed.
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map || !mapReady) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();
    polygonsRef.current.forEach((polygon) => polygon.remove());
    polygonsRef.current = [];

    if (properties.length === 0) return;

    const bounds = L.latLngBounds([]);

    properties.forEach((property) => {
      if (property.hasPolygon) {
        property.polygonRings.forEach((ring) => {
          const polygon = L.polygon(ring, {
            color: "#1e3a8a",
            weight: 2,
            fillColor: "#1e3a8a",
            fillOpacity: 0.15,
          }).addTo(map);
          polygon.on("click", () => setSelectedId(property.id));
          polygon.bindPopup(buildPopupContent(property, () => handleRouteRequest(property)));
          polygonsRef.current.push(polygon);
          ring.forEach((point) => bounds.extend(point));
        });
      }

      const marker = L.marker([property.latitude, property.longitude], { icon: buildIcon(false) }).addTo(map);
      marker.on("click", () => setSelectedId(property.id));
      marker.bindPopup(buildPopupContent(property, () => handleRouteRequest(property)));
      markersRef.current.set(property.id, marker);
      bounds.extend([property.latitude, property.longitude]);
    });

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [32, 32], maxZoom: 16 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [properties, mapReady, buildIcon]);

  // Keep marker colors in sync with the selected property without rebuilding
  // every marker (which would also close any open popup).
  useEffect(() => {
    markersRef.current.forEach((marker, id) => {
      const icon = buildIcon(id === selectedId);
      if (icon) marker.setIcon(icon);
    });
  }, [selectedId, buildIcon]);

  // Places (or moves) the draggable start-point marker whenever the user
  // picks a point on the map or updates it via geolocation/dragging.
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map || !mapReady) return;

    if (!startPoint) {
      startMarkerRef.current?.remove();
      startMarkerRef.current = null;
      return;
    }

    if (startMarkerRef.current) {
      startMarkerRef.current.setLatLng([startPoint.latitude, startPoint.longitude]);
      return;
    }

    const marker = L.marker([startPoint.latitude, startPoint.longitude], {
      icon: buildStartIcon(),
      draggable: true,
      zIndexOffset: 1000,
    }).addTo(map);
    marker.bindTooltip("Başlangıç Noktası", { direction: "top", offset: [0, -8] });
    marker.on("dragend", () => {
      const pos = marker.getLatLng();
      setStartPoint({ latitude: pos.lat, longitude: pos.lng });
    });
    startMarkerRef.current = marker;
  }, [startPoint, mapReady, buildStartIcon]);

  async function handleUseCurrentLocation() {
    setStartLocating(true);
    setStartLocationError(null);
    try {
      const position = await getUserLocation();
      setStartPoint(position);
      mapRef.current?.flyTo([position.latitude, position.longitude], 15);
    } catch (err) {
      setStartLocationError(err instanceof Error ? err.message : "Mevcut konumunuz alınamadı.");
    } finally {
      setStartLocating(false);
    }
  }

  function focusProperty(id: string) {
    const property = properties.find((p) => p.id === id);
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!property || !map || !L) return;
    setSelectedId(id);

    if (property.hasPolygon && property.polygonRings.flat().length > 0) {
      map.fitBounds(L.latLngBounds(property.polygonRings.flat()), { padding: [40, 40], maxZoom: 17 });
    } else {
      map.flyTo([property.latitude, property.longitude], 17);
    }
    markersRef.current.get(id)?.openPopup();
  }

  async function handleFile(file: File | undefined | null) {
    if (!file) {
      setParseError("Lütfen bir KML dosyası seçiniz.");
      return;
    }
    setParseError(null);
    clearRoute();
    try {
      const text = await file.text();
      const parsed = parseKmlDocument(text);
      onChange({ kmlKonumlari: parsed, kmlDosyaAdi: file.name });
      setSelectedId(null);
    } catch (err) {
      onChange({ kmlKonumlari: [], kmlDosyaAdi: "" });
      setParseError(err instanceof Error ? err.message : "KML dosyası okunamadı veya geçersiz formatta.");
    }
  }

  const polygonCount = properties.filter((p) => p.hasPolygon).length;

  return (
    <SectionCard title="Taşınmaz Konum Haritası (KML)">
      <div className={`${sectionBodyClass} space-y-4`}>
        <div>
          <p className="mb-2 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
            Taşınmaz Konum Dosyası
          </p>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              void handleFile(e.dataTransfer.files?.[0]);
            }}
            className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors ${
              dragOver ? "border-slate-500 bg-slate-50" : "border-slate-300 bg-slate-50/60"
            }`}
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 text-white">
              <UploadCloud className="h-5 w-5" />
            </span>
            <p className="text-sm font-semibold text-slate-800">KML Dosyasını Yükleyin</p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-1 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
            >
              KML Dosyası Seç
            </button>
            <p className="text-xs text-slate-400">veya dosyayı buraya sürükleyin</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".kml,application/vnd.google-earth.kml+xml,application/xml,text/xml"
              className="hidden"
              onChange={(e) => void handleFile(e.target.files?.[0])}
            />
          </div>
          <p className={helperTextClass}>Dosya tamamen tarayıcınızda işlenir; sunucuya yüklenmez.</p>
        </div>

        {parseError && (
          <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {parseError}
          </div>
        )}

        {properties.length > 0 && (
          <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 sm:grid-cols-4">
            <div>
              <p className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">Dosya</p>
              <p className="truncate text-sm font-semibold text-slate-800" title={fileName ?? undefined}>
                {fileName}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">Bulunan Taşınmaz</p>
              <p className="text-sm font-semibold text-slate-800">{properties.length}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">Koordinat</p>
              <p className="text-sm font-semibold text-slate-800">{properties.length}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">Polygon</p>
              <p className="text-sm font-semibold text-slate-800">{polygonCount}</p>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3">
          <p className="mr-auto text-xs font-semibold tracking-wide text-slate-500 uppercase">Başlangıç Noktası</p>
          {startPoint ? (
            <span className="text-xs font-medium text-emerald-700">
              {startPoint.latitude.toFixed(6)}, {startPoint.longitude.toFixed(6)}
            </span>
          ) : (
            <span className="text-xs text-slate-400">Seçilmedi</span>
          )}
          {startPoint && (
            <button
              type="button"
              onClick={() => setStartPoint(null)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50"
            >
              <X className="h-3.5 w-3.5" />
              Kaldır
            </button>
          )}
          <button
            type="button"
            onClick={() => setPickingStart((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              pickingStart ? "bg-slate-900 text-white" : "border border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            <MapPin className="h-3.5 w-3.5" />
            {pickingStart ? "Haritada bir yere tıklayın..." : "Haritadan Seç"}
          </button>
          <button
            type="button"
            onClick={() => void handleUseCurrentLocation()}
            disabled={startLocating}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {startLocating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LocateFixed className="h-3.5 w-3.5" />}
            {startLocating ? "Konum Alınıyor..." : "Mevcut Konumumu Kullan"}
          </button>
        </div>

        {startLocationError && (
          <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {startLocationError}
          </div>
        )}

        {/* The map container must always be mounted — Leaflet is initialized
            once on mount, so it can't wait for KML data to exist first. */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div ref={containerRef} className="h-[380px] w-full rounded-xl border border-slate-200 sm:h-[440px]" />

          {properties.length > 0 ? (
            <div className="max-h-[380px] space-y-2 overflow-y-auto sm:max-h-[440px]">
              {properties.map((property, index) => (
                <button
                  key={property.id}
                  type="button"
                  onClick={() => focusProperty(property.id)}
                  className={`block w-full rounded-lg border px-3 py-2.5 text-left transition-colors ${
                    selectedId === property.id
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                        selectedId === property.id ? "bg-white text-slate-900" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="truncate text-sm font-medium">{property.name}</span>
                  </div>
                  <p
                    className={`mt-1 pl-7 text-xs ${selectedId === property.id ? "text-slate-300" : "text-slate-400"}`}
                  >
                    {property.latitude.toFixed(6)}, {property.longitude.toFixed(6)}
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex min-h-[160px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 text-center text-slate-500 lg:min-h-full">
              <MapPin className="h-5 w-5" />
              <p className="text-xs text-slate-500">Taşınmaz listesi, KML yüklendiğinde burada görünecek.</p>
            </div>
          )}
        </div>

        {properties.length > 0 && (
          <>
            {(routeLoading || routeError || routeSummary) && (
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3.5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Yol Tarifi</p>
                  {routeSummary && (
                    <button
                      type="button"
                      onClick={clearRoute}
                      className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-slate-700"
                    >
                      <X className="h-3.5 w-3.5" />
                      Rotayı Kaldır
                    </button>
                  )}
                </div>
                {routeLoading && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Rota hesaplanıyor...
                  </div>
                )}
                {routeError && (
                  <p className="mt-2 flex items-start gap-2 text-sm text-rose-600">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    {routeError}
                  </p>
                )}
                {routeSummary && !routeLoading && (
                  <div className="mt-3 space-y-3">
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <Car className="h-4 w-4 text-slate-400" />
                        <div>
                          <p className="text-[10px] text-slate-400">Mesafe</p>
                          <p className="text-sm font-semibold text-slate-800">{routeSummary.distanceText}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400">Tahmini Süre</p>
                        <p className="text-sm font-semibold text-slate-800">{routeSummary.durationText}</p>
                      </div>
                    </div>
                    <div className="rounded-lg bg-slate-50 px-3.5 py-3">
                      <p className="mb-1.5 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                        Yol Tarifi Anlatımı
                      </p>
                      <p className="text-sm leading-relaxed text-slate-700">{routeSummary.directionsText}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-2 font-medium">#</th>
                    <th className="px-3 py-2 font-medium">Taşınmaz</th>
                    <th className="px-3 py-2 font-medium">Enlem</th>
                    <th className="px-3 py-2 font-medium">Boylam</th>
                    <th className="px-3 py-2 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {properties.map((property, index) => (
                    <tr key={property.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-3 py-2 text-slate-500">{index + 1}</td>
                      <td className="max-w-[180px] truncate px-3 py-2 font-medium text-slate-800" title={property.name}>
                        {property.name}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-slate-600">{property.latitude.toFixed(6)}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-slate-600">{property.longitude.toFixed(6)}</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => focusProperty(property.id)}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                        >
                          <MapPin className="h-3.5 w-3.5" />
                          Görüntüle
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <a
              href={
                properties.length > 0
                  ? googleMapsUrl(
                      properties[selectedId ? properties.findIndex((p) => p.id === selectedId) : 0]?.latitude ??
                        properties[0].latitude,
                      properties[selectedId ? properties.findIndex((p) => p.id === selectedId) : 0]?.longitude ??
                        properties[0].longitude,
                    )
                  : "#"
              }
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Seçili taşınmazı Google Maps&apos;te aç
            </a>
          </>
        )}
      </div>
    </SectionCard>
  );
}
