import { describe, it, expect } from "vitest";
import {
  calculateBoundsFromGeoJson,
  geoJsonToLeafletLatLngs,
  geoJsonToGpx,
  type GeoJsonLineString,
} from "@/lib/gpx";

const line = (coords: [number, number][]): GeoJsonLineString => ({
  type: "LineString",
  coordinates: coords,
});

describe("calculateBoundsFromGeoJson", () => {
  it("возвращает дефолтные границы Томска для пустого трека", () => {
    expect(calculateBoundsFromGeoJson(line([]))).toEqual([
      [56.4, 84.9],
      [56.6, 85.1],
    ]);
  });

  it("вычисляет границы с паддингом 10%", () => {
    // lng/lat пары; диапазон lat 56.0..56.2 (0.2), lng 84.0..84.4 (0.4)
    const bounds = calculateBoundsFromGeoJson(
      line([
        [84.0, 56.0],
        [84.4, 56.2],
      ]),
    );
    expect(bounds[0][0]).toBeCloseTo(56.0 - 0.02, 6); // minLat - 10%
    expect(bounds[0][1]).toBeCloseTo(84.0 - 0.04, 6); // minLng - 10%
    expect(bounds[1][0]).toBeCloseTo(56.2 + 0.02, 6); // maxLat + 10%
    expect(bounds[1][1]).toBeCloseTo(84.4 + 0.04, 6); // maxLng + 10%
  });

  it("использует минимальный паддинг для одной точки", () => {
    const bounds = calculateBoundsFromGeoJson(line([[84.95, 56.5]]));
    expect(bounds[0][0]).toBeCloseTo(56.5 - 0.01, 6);
    expect(bounds[1][1]).toBeCloseTo(84.95 + 0.01, 6);
  });
});

describe("geoJsonToLeafletLatLngs", () => {
  it("меняет местами lng/lat в lat/lng", () => {
    expect(
      geoJsonToLeafletLatLngs(
        line([
          [84.9, 56.4],
          [85.0, 56.5],
        ]),
      ),
    ).toEqual([
      [56.4, 84.9],
      [56.5, 85.0],
    ]);
  });
});

describe("geoJsonToGpx", () => {
  it("округляет координаты до 6 знаков и подставляет имя", () => {
    const gpx = geoJsonToGpx(
      line([[84.123456789, 56.987654321]]),
      "Тестовый маршрут",
    );
    expect(gpx).toContain('lat="56.987654"');
    expect(gpx).toContain('lon="84.123457"');
    expect(gpx).toContain("<name>Тестовый маршрут</name>");
  });

  it("экранирует спецсимволы в имени", () => {
    const gpx = geoJsonToGpx(line([]), `A & B <"'>`);
    expect(gpx).toContain("A &amp; B &lt;&quot;&apos;&gt;");
  });
});
