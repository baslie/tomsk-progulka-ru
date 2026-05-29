import * as React from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  DIFFICULTY_LABELS,
  SEASON_LABELS,
  formatDistance,
  formatDuration,
  getTrackColor,
} from "@/lib/constants";
import {
  calculateBoundsFromGeoJson,
  geoJsonToLeafletLatLngs,
  type Coord,
} from "@/lib/gpx";

interface MapRoute {
  slug: string;
  title: string;
  difficulty: keyof typeof DIFFICULTY_LABELS;
  season: keyof typeof SEASON_LABELS;
  distanceKm: number;
  durationMin: number;
  region: string;
  gpx: { type: "LineString"; coordinates: Coord[] };
}

function startIcon() {
  return L.divIcon({
    className: "",
    html: `<div style="background:#22c55e;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 1px 3px rgba(0,0,0,.3)"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

function endIcon() {
  return L.divIcon({
    className: "",
    html: `<div style="background:#ef4444;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 1px 3px rgba(0,0,0,.3)"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

export function RoutesMap({ routes }: { routes: MapRoute[] }) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const mapRef = React.useRef<L.Map | null>(null);
  const layersRef = React.useRef<L.LayerGroup | null>(null);

  React.useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [DEFAULT_MAP_CENTER.lat, DEFAULT_MAP_CENTER.lng],
      zoom: DEFAULT_MAP_ZOOM,
      scrollWheelZoom: true,
    });

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    layersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      layersRef.current = null;
    };
  }, []);

  React.useEffect(() => {
    const map = mapRef.current;
    const group = layersRef.current;
    if (!map || !group) return;

    group.clearLayers();

    if (!routes.length) return;

    const allBounds: L.LatLngBoundsExpression[] = [];

    routes.forEach((route, i) => {
      const color = getTrackColor(i);
      const latlngs = geoJsonToLeafletLatLngs(route.gpx);
      const polyline = L.polyline(latlngs, {
        color,
        weight: 4,
        opacity: 0.85,
      }).addTo(group);

      const popupHtml = `
        <div class="route-popup">
          <strong>${escapeHtml(route.title)}</strong>
          <div style="margin-top:4px;font-size:0.8125rem;color:#525252">
            ${DIFFICULTY_LABELS[route.difficulty]} · ${SEASON_LABELS[route.season]}<br/>
            ${formatDistance(route.distanceKm)} · ${formatDuration(route.durationMin)}<br/>
            ${escapeHtml(route.region)}
          </div>
          <a class="popup-link" href="/routes/${route.slug}/">Смотреть маршрут</a>
        </div>`;
      polyline.bindPopup(popupHtml);

      if (latlngs.length > 0) {
        L.marker(latlngs[0], { icon: startIcon() }).addTo(group);
        L.marker(latlngs[latlngs.length - 1], { icon: endIcon() }).addTo(group);
      }

      const b = calculateBoundsFromGeoJson(route.gpx);
      allBounds.push(b);
    });

    if (allBounds.length > 0) {
      const merged = L.latLngBounds(
        allBounds.flatMap((b) => [
          (b as [[number, number], [number, number]])[0],
          (b as [[number, number], [number, number]])[1],
        ])
      );
      map.fitBounds(merged, { padding: [24, 24] });
    }
  }, [routes]);

  return <div ref={containerRef} className="h-full w-full" />;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
