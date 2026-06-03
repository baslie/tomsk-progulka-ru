import L from "leaflet";
import type { LeafletBounds } from "@/lib/gpx";

export const OSM_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
export const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="nofollow noopener noreferrer">OpenStreetMap</a>';

/** Паддинг при автоподгонке карты под границы трека(ов). */
export const MAP_FIT_PADDING: [number, number] = [24, 24];

/** Подложка OpenStreetMap с едиными настройками. */
export function addOsmTileLayer(map: L.Map): void {
  // Убираем саморекламный префикс Leaflet («🇺🇦 Leaflet»), оставляя только
  // обязательную по лицензии атрибуцию данных «© OpenStreetMap».
  map.attributionControl.setPrefix(false);
  L.tileLayer(OSM_TILE_URL, {
    attribution: OSM_ATTRIBUTION,
    maxZoom: 19,
  }).addTo(map);
}

/**
 * Круглый div-маркер заданного цвета. Заменяет дублировавшиеся фабрики
 * start/finish/end-иконок в RouteMap и RoutesMap.
 */
export function createDotIcon(color: string, size = 16): L.DivIcon {
  const half = size / 2;
  return L.divIcon({
    className: "",
    html: `<div style="background:${color};width:${size}px;height:${size}px;border-radius:50%;border:3px solid white;box-shadow:0 1px 3px rgba(0,0,0,.4)"></div>`,
    iconSize: [size, size],
    iconAnchor: [half, half],
  });
}

/** Объединяет список прямоугольных границ в один охватывающий bounds. */
export function mergeBoundsList(boundsList: LeafletBounds[]): L.LatLngBounds {
  return L.latLngBounds(boundsList.flatMap((b) => [b[0], b[1]]));
}
