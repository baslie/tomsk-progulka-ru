export type Coord = [number, number];

export interface GeoJsonLineString {
  type: "LineString";
  coordinates: Coord[];
}

export type LeafletBounds = [[number, number], [number, number]];

const TOMSK_DEFAULT_BOUNDS: LeafletBounds = [
  [56.4, 84.9],
  [56.6, 85.1],
];

export function calculateBoundsFromGeoJson(
  geo: GeoJsonLineString
): LeafletBounds {
  if (!geo.coordinates.length) return TOMSK_DEFAULT_BOUNDS;
  let minLat = Infinity,
    maxLat = -Infinity,
    minLng = Infinity,
    maxLng = -Infinity;
  for (const [lng, lat] of geo.coordinates) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  }
  const latPad = (maxLat - minLat) * 0.1 || 0.01;
  const lngPad = (maxLng - minLng) * 0.1 || 0.01;
  return [
    [minLat - latPad, minLng - lngPad],
    [maxLat + latPad, maxLng + lngPad],
  ];
}

export function geoJsonToLeafletLatLngs(
  geo: GeoJsonLineString
): [number, number][] {
  return geo.coordinates.map(([lng, lat]) => [lat, lng]);
}

/** Экранирует &, <, >, ", ' для безопасной вставки в XML/HTML. */
export function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function geoJsonToGpx(geo: GeoJsonLineString, name = "Маршрут"): string {
  const time = new Date().toISOString();
  const points = geo.coordinates
    .map(
      ([lng, lat]) =>
        `      <trkpt lat="${lat.toFixed(6)}" lon="${lng.toFixed(6)}"></trkpt>`
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8" standalone="no" ?>
<gpx xmlns="http://www.topografix.com/GPX/1/1"
     creator="Томская Прогулка"
     version="1.1"
     xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
     xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <time>${time}</time>
    <name>${escapeXml(name)}</name>
  </metadata>
  <trk>
    <name>${escapeXml(name)}</name>
    <trkseg>
${points}
    </trkseg>
  </trk>
</gpx>
`;
}

export function downloadGpx(geo: GeoJsonLineString, slug: string, name: string): void {
  const xml = geoJsonToGpx(geo, name);
  const blob = new Blob([xml], { type: "application/gpx+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slug}.gpx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
