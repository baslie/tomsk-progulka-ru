import { describe, it, expect } from "vitest";
import {
  applyFilters,
  hasActiveFilters,
  getDistanceLabel,
  getDifficultyLabel,
  getSeasonLabel,
  readFiltersFromSearch,
  writeFiltersToSearch,
  DEFAULT_FILTERS,
  type FilterState,
  type RouteLike,
} from "@/lib/filters";

function route(data: Partial<RouteLike["data"]>): RouteLike {
  return {
    data: {
      title: "Маршрут",
      description: "Описание",
      difficulty: "easy",
      season: "summer",
      distanceKm: 7,
      region: "Томск",
      ...data,
    },
  };
}

describe("applyFilters", () => {
  it("без фильтров возвращает все маршруты", () => {
    const routes = [route({}), route({})];
    expect(applyFilters(routes, DEFAULT_FILTERS)).toHaveLength(2);
  });

  it("ищет по title, description и region (регистронезависимо)", () => {
    const routes = [
      route({ title: "Геокупол" }),
      route({ description: "красивый ВИД" }),
      route({ region: "Северск" }),
      route({ title: "Прочее" }),
    ];
    expect(applyFilters(routes, { ...DEFAULT_FILTERS, q: "геокупол" })).toHaveLength(1);
    expect(applyFilters(routes, { ...DEFAULT_FILTERS, q: "вид" })).toHaveLength(1);
    expect(applyFilters(routes, { ...DEFAULT_FILTERS, q: "северск" })).toHaveLength(1);
  });

  it("фильтрует по диапазону расстояния (min<=x<max)", () => {
    const routes = [
      route({ distanceKm: 3 }),
      route({ distanceKm: 5 }),
      route({ distanceKm: 9.9 }),
    ];
    const r = applyFilters(routes, { ...DEFAULT_FILTERS, distance: "5-10" });
    expect(r.map((x) => x.data.distanceKm)).toEqual([5, 9.9]);
  });

  it("диапазон 20+ включает всё от 20 км", () => {
    const routes = [route({ distanceKm: 19 }), route({ distanceKm: 20 }), route({ distanceKm: 100 })];
    const r = applyFilters(routes, { ...DEFAULT_FILTERS, distance: "20+" });
    expect(r.map((x) => x.data.distanceKm)).toEqual([20, 100]);
  });

  it("мультивыбор сложности", () => {
    const routes = [route({ difficulty: "easy" }), route({ difficulty: "medium" }), route({ difficulty: "hard" })];
    const r = applyFilters(routes, { ...DEFAULT_FILTERS, difficulty: ["easy", "hard"] });
    expect(r.map((x) => x.data.difficulty)).toEqual(["easy", "hard"]);
  });

  it("фильтрует по сезону", () => {
    const routes = [route({ season: "summer" }), route({ season: "winter" })];
    expect(applyFilters(routes, { ...DEFAULT_FILTERS, season: "winter" })).toHaveLength(1);
  });
});

describe("hasActiveFilters", () => {
  it("false для дефолтных фильтров", () => {
    expect(hasActiveFilters(DEFAULT_FILTERS)).toBe(false);
  });

  it("true при любом активном фильтре", () => {
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, q: "x" })).toBe(true);
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, distance: "0-5" })).toBe(true);
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, difficulty: ["easy"] })).toBe(true);
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, season: "summer" })).toBe(true);
  });

  it("пустой запрос с пробелами не считается активным", () => {
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, q: "   " })).toBe(false);
  });
});

describe("get*Label", () => {
  it("getDistanceLabel", () => {
    expect(getDistanceLabel("5-10")).toBe("5–10 км");
    expect(getDistanceLabel(null)).toBeNull();
    expect(getDistanceLabel("несуществ")).toBeNull();
  });

  it("getDifficultyLabel возвращает label или исходное значение", () => {
    expect(getDifficultyLabel("easy")).toBe("Лёгкий");
    expect(getDifficultyLabel("unknown")).toBe("unknown");
  });

  it("getSeasonLabel", () => {
    expect(getSeasonLabel("winter")).toBe("Зима");
    expect(getSeasonLabel("all_year")).toBe("Круглый год");
  });
});

describe("readFiltersFromSearch / writeFiltersToSearch round-trip", () => {

  it("читает валидные параметры и игнорирует мусор", () => {
    const f = readFiltersFromSearch("?q=лес&distance=5-10&season=winter&difficulty=easy&difficulty=hard&difficulty=bad");
    expect(f).toEqual<FilterState>({
      q: "лес",
      distance: "5-10",
      season: "winter",
      difficulty: ["easy", "hard"],
    });
  });

  it("сбрасывает невалидные значения в дефолт", () => {
    const f = readFiltersFromSearch("?distance=999&season=monsoon");
    expect(f.distance).toBeNull();
    expect(f.season).toBeNull();
  });

  it("round-trip сохраняет состояние", () => {
    const original: FilterState = {
      q: "тропа",
      distance: "10-20",
      season: "autumn",
      difficulty: ["medium"],
    };
    const search = writeFiltersToSearch(original);
    expect(readFiltersFromSearch(search)).toEqual(original);
  });

  it("пустые фильтры дают пустую строку", () => {
    expect(writeFiltersToSearch(DEFAULT_FILTERS)).toBe("");
  });
});
