import * as React from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  calculateBoundsFromGeoJson,
  geoJsonToLeafletLatLngs,
  type GeoJsonLineString,
} from "@/lib/gpx";
import { getTrackColor, formatDistance } from "@/lib/constants";

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

function startIcon(color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="background:${color};width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 1px 3px rgba(0,0,0,.4)"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

function finishIcon() {
  return L.divIcon({
    className: "",
    html: `<div style="background:#ef4444;width:18px;height:18px;border-radius:50%;border:3px solid white;box-shadow:0 1px 3px rgba(0,0,0,.4)"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
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
    [tracks, gpx, color]
  );

  const [visible, setVisible] = React.useState<boolean[]>(() =>
    list.map(() => true)
  );

  React.useEffect(() => {
    if (!containerRef.current || mapRef.current || list.length === 0) return;

    const map = L.map(containerRef.current, { scrollWheelZoom: true });
    mapRef.current = map;

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    const groups: L.FeatureGroup[] = list.map((track, i) => {
      const trackColor = track.color ?? getTrackColor(i);
      const latlngs = geoJsonToLeafletLatLngs(track.gpx);
      const group = L.featureGroup();
      L.polyline(latlngs, { color: trackColor, weight: 5, opacity: 0.9 }).addTo(
        group
      );
      if (latlngs.length > 0) {
        L.marker(latlngs[0], {
          icon: startIcon(trackColor),
          title: `Старт: ${track.name}`,
        }).addTo(group);
        L.marker(latlngs[latlngs.length - 1], {
          icon: finishIcon(),
          title: "Финиш",
        }).addTo(group);
      }
      group.addTo(map);
      return group;
    });
    groupsRef.current = groups;

    map.fitBounds(mergeBounds(list), { padding: [24, 24] });

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
