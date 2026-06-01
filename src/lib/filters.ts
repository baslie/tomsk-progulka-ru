import { DIFFICULTY_LABELS, SEASON_LABELS } from "@/lib/constants";

export const DISTANCE_RANGES = [
  { value: "0-5", label: "До 5 км", min: 0, max: 5 },
  { value: "5-10", label: "5–10 км", min: 5, max: 10 },
  { value: "10-20", label: "10–20 км", min: 10, max: 20 },
  { value: "20+", label: "Более 20 км", min: 20, max: Infinity },
] as const;

// Порядок элементов в UI-селекторах фиксируется здесь; подписи берутся из
// единого источника в constants.ts (без дублирования строк).
const DIFFICULTY_ORDER = ["easy", "medium", "hard"] as const;
const SEASON_ORDER = ["all_year", "spring", "summer", "autumn", "winter"] as const;

export const DIFFICULTY_OPTIONS = DIFFICULTY_ORDER.map((value) => ({
  value,
  label: DIFFICULTY_LABELS[value],
}));

export const SEASON_OPTIONS = SEASON_ORDER.map((value) => ({
  value,
  label: SEASON_LABELS[value],
}));

export type DistanceRange = (typeof DISTANCE_RANGES)[number]["value"];
export type DifficultyValue = (typeof DIFFICULTY_ORDER)[number];
export type SeasonValue = (typeof SEASON_ORDER)[number];

export type FilterState = {
  q: string;
  distance: DistanceRange | null;
  difficulty: DifficultyValue[];
  season: SeasonValue | null;
};

export const DEFAULT_FILTERS: FilterState = {
  q: "",
  distance: null,
  difficulty: [],
  season: null,
};

export function hasActiveFilters(f: FilterState): boolean {
  return (
    f.q.trim().length > 0 ||
    f.distance !== null ||
    f.difficulty.length > 0 ||
    f.season !== null
  );
}

export function getDistanceLabel(value: string | null): string | null {
  if (!value) return null;
  return DISTANCE_RANGES.find((r) => r.value === value)?.label ?? null;
}

export function getDifficultyLabel(value: string): string {
  return DIFFICULTY_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export function getSeasonLabel(value: string): string {
  return SEASON_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export function readFiltersFromSearch(search: string): FilterState {
  const sp = new URLSearchParams(search);
  const distanceRaw = sp.get("distance");
  const distance =
    distanceRaw && DISTANCE_RANGES.some((r) => r.value === distanceRaw)
      ? (distanceRaw as DistanceRange)
      : null;

  const seasonRaw = sp.get("season");
  const season =
    seasonRaw && SEASON_OPTIONS.some((s) => s.value === seasonRaw)
      ? (seasonRaw as SeasonValue)
      : null;

  const difficultyRaw = sp.getAll("difficulty");
  const difficulty = difficultyRaw.filter((v) =>
    DIFFICULTY_OPTIONS.some((d) => d.value === v)
  ) as DifficultyValue[];

  return {
    q: sp.get("q")?.trim() ?? "",
    distance,
    difficulty,
    season,
  };
}

// Сериализует ТОЛЬКО фильтры (без view) — чистая функция, не читает window.
// Параметр view добавляет вызывающий код (см. RoutesCatalog.syncUrl).
export function writeFiltersToSearch(f: FilterState): string {
  const sp = new URLSearchParams();
  if (f.q.trim()) sp.set("q", f.q.trim());
  if (f.distance) sp.set("distance", f.distance);
  if (f.season) sp.set("season", f.season);
  for (const d of f.difficulty) sp.append("difficulty", d);
  return sp.toString();
}

export function readView(search: string): "list" | "map" {
  const v = new URLSearchParams(search).get("view");
  return v === "map" ? "map" : "list";
}

export interface RouteLike {
  data: {
    title: string;
    description: string;
    difficulty: DifficultyValue;
    season: SeasonValue;
    distanceKm: number;
    region: string;
  };
}

export function applyFilters<T extends RouteLike>(routes: T[], f: FilterState): T[] {
  return routes.filter((r) => {
    const d = r.data;
    if (f.q.trim()) {
      const q = f.q.trim().toLowerCase();
      const haystack = `${d.title} ${d.description} ${d.region}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (f.distance) {
      const range = DISTANCE_RANGES.find((r) => r.value === f.distance);
      if (range && (d.distanceKm < range.min || d.distanceKm >= range.max)) return false;
    }
    if (f.difficulty.length > 0 && !f.difficulty.includes(d.difficulty)) return false;
    if (f.season && d.season !== f.season) return false;
    return true;
  });
}
