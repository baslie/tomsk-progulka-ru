import * as React from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  calculateBoundsFromGeoJson,
  geoJsonToLeafletLatLngs,
  type GeoJsonLineString,
} from "@/lib/gpx";
import {
  getTrackColor,
  formatDistance,
  MARKER_FINISH_COLOR,
} from "@/lib/constants";
import { addOsmTileLayer, createDotIcon, MAP_FIT_PADDING } from "@/lib/leaflet";

export interface RouteTrack {
  name: string;
  gpx: GeoJsonLineString;
  color?: string;
  distanceKm?: number;
}

interface Props {
  /** Одиночный трек (обратная совместимость). */
  gpx?: GeoJsonLineString;
  color?: string;
  /** Несколько именованных вариантов маршрута. Имеет приоритет над gpx. */
  tracks?: RouteTrack[];
}

function mergeBounds(tracks: RouteTrack[]): L.LatLngBoundsExpression {
  const all: GeoJsonLineString = {
    type: "LineString",
    coordinates: tracks.flatMap((t) => t.gpx.coordinates),
  };
  return calculateBoundsFromGeoJson(all) as L.LatLngBoundsExpression;
}

export function RouteMap({ gpx, color = "#3B82F6", tracks }: Props) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const mapRef = React.useRef<L.Map | null>(null);
  const groupsRef = React.useRef<L.FeatureGroup[]>([]);

  const list = React.useMemo<RouteTrack[]>(
    () =>
      tracks && tracks.length
        ? tracks
        : gpx
          ? [{ name: "Маршрут", gpx, color }]
          : [],
    [tracks, gpx, color],
  );

  const [visible, setVisible] = React.useState<boolean[]>(() =>
    list.map(() => true),
  );

  React.useEffect(() => {
    if (!containerRef.current || mapRef.current || list.length === 0) return;

    const map = L.map(containerRef.current, { scrollWheelZoom: true });
    mapRef.current = map;

    addOsmTileLayer(map);

    const groups: L.FeatureGroup[] = list.map((track, i) => {
      const trackColor = track.color ?? getTrackColor(i);
      const latlngs = geoJsonToLeafletLatLngs(track.gpx);
      const group = L.featureGroup();
      L.polyline(latlngs, { color: trackColor, weight: 5, opacity: 0.9 }).addTo(
        group,
      );
      if (latlngs.length > 0) {
        L.marker(latlngs[0], {
          icon: createDotIcon(trackColor, 16),
          title: `Старт: ${track.name}`,
        }).addTo(group);
        L.marker(latlngs[latlngs.length - 1], {
          icon: createDotIcon(MARKER_FINISH_COLOR, 18),
          title: "Финиш",
        }).addTo(group);
      }
      group.addTo(map);
      return group;
    });
    groupsRef.current = groups;

    map.fitBounds(mergeBounds(list), { padding: MAP_FIT_PADDING });

    return () => {
      map.remove();
      mapRef.current = null;
      groupsRef.current = [];
    };
  }, [list]);

  // Переключение видимости треков по легенде.
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    groupsRef.current.forEach((group, i) => {
      if (visible[i]) {
        if (!map.hasLayer(group)) group.addTo(map);
      } else if (map.hasLayer(group)) {
        map.removeLayer(group);
      }
    });
  }, [visible]);

  const toggle = (i: number) =>
    setVisible((prev) => prev.map((v, idx) => (idx === i ? !v : v)));

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      {list.length > 1 && (
        <div className="absolute right-3 top-3 z-[400] max-w-[75%] rounded-lg border border-[var(--border)] bg-[var(--card)]/95 p-2 text-sm shadow-md backdrop-blur">
          <div className="mb-1 px-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
            Варианты
          </div>
          <ul className="space-y-0.5">
            {list.map((track, i) => (
              <li key={track.name}>
                <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-[var(--muted)]">
                  <input
                    type="checkbox"
                    checked={visible[i] ?? true}
                    onChange={() => toggle(i)}
                    className="accent-[var(--primary)]"
                  />
                  <span
                    className="size-3 shrink-0 rounded-full"
                    style={{ background: track.color ?? getTrackColor(i) }}
                    aria-hidden="true"
                  />
                  <span className="leading-tight">
                    {track.name}
                    {track.distanceKm != null && (
                      <span className="text-[var(--muted-foreground)]">
                        {" "}
                        · {formatDistance(track.distanceKm)}
                      </span>
                    )}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
