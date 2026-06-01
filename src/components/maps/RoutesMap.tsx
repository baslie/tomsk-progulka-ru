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
  MARKER_START_COLOR,
  MARKER_FINISH_COLOR,
} from "@/lib/constants";
import {
  calculateBoundsFromGeoJson,
  geoJsonToLeafletLatLngs,
  escapeXml,
  type Coord,
  type LeafletBounds,
} from "@/lib/gpx";
import {
  addOsmTileLayer,
  createDotIcon,
  mergeBoundsList,
  MAP_FIT_PADDING,
} from "@/lib/leaflet";

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

    addOsmTileLayer(map);

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

    const allBounds: LeafletBounds[] = [];

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
          <strong>${escapeXml(route.title)}</strong>
          <div style="margin-top:4px;font-size:0.8125rem;color:#525252">
            ${DIFFICULTY_LABELS[route.difficulty]} · ${SEASON_LABELS[route.season]}<br/>
            ${formatDistance(route.distanceKm)} · ${formatDuration(route.durationMin)}<br/>
            ${escapeXml(route.region)}
          </div>
          <a class="popup-link" href="/trails/${route.slug}/">Смотреть маршрут</a>
        </div>`;
      polyline.bindPopup(popupHtml);

      if (latlngs.length > 0) {
        L.marker(latlngs[0], { icon: createDotIcon(MARKER_START_COLOR) }).addTo(
          group,
        );
        L.marker(latlngs[latlngs.length - 1], {
          icon: createDotIcon(MARKER_FINISH_COLOR),
        }).addTo(group);
      }

      allBounds.push(calculateBoundsFromGeoJson(route.gpx));
    });

    if (allBounds.length > 0) {
      map.fitBounds(mergeBoundsList(allBounds), { padding: MAP_FIT_PADDING });
    }
  }, [routes]);

  return <div ref={containerRef} className="h-full w-full" />;
}
