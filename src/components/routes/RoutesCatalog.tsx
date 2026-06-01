import * as React from "react";
import { RouteCard, type RouteCardData } from "./RouteCard";
import {
  DIFFICULTY_OPTIONS,
  DISTANCE_RANGES,
  SEASON_OPTIONS,
  applyFilters,
  hasActiveFilters,
  readFiltersFromSearch,
  readView,
  writeFiltersToSearch,
  type FilterState,
  type RouteLike,
  DEFAULT_FILTERS,
  getDifficultyLabel,
  getSeasonLabel,
  getDistanceLabel,
} from "@/lib/filters";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { replaceSearch } from "@/lib/url";

const RoutesMap = React.lazy(() =>
  import("@/components/maps/RoutesMap").then((m) => ({ default: m.RoutesMap }))
);

export interface RoutesCatalogProps {
  routes: (RouteCardData & RouteLike["data"] & { gpx: { type: "LineString"; coordinates: [number, number][] } })[];
}

function pluralizeRoutes(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 14) return "маршрутов";
  if (mod10 === 1) return "маршрут";
  if (mod10 >= 2 && mod10 <= 4) return "маршрута";
  return "маршрутов";
}

function syncUrl(filters: FilterState, view: "list" | "map"): void {
  const sp = new URLSearchParams(writeFiltersToSearch(filters));
  if (view === "map") sp.set("view", "map");
  replaceSearch(sp);
}

export function RoutesCatalog({ routes }: RoutesCatalogProps) {
  const [hydrated, setHydrated] = React.useState(false);
  const [filters, setFilters] = React.useState<FilterState>(DEFAULT_FILTERS);
  const [view, setView] = React.useState<"list" | "map">("list");

  React.useEffect(() => {
    setFilters(readFiltersFromSearch(window.location.search));
    setView(readView(window.location.search));
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;
    syncUrl(filters, view);
  }, [filters, view, hydrated]);

  const filtered = React.useMemo(
    () =>
      applyFilters(
        routes.map((r) => ({ data: r, original: r })),
        filters
      ).map((x) => x.original),
    [routes, filters]
  );

  const updateFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  const toggleDifficulty = (value: FilterState["difficulty"][number]) =>
    setFilters((prev) => ({
      ...prev,
      difficulty: prev.difficulty.includes(value)
        ? prev.difficulty.filter((v) => v !== value)
        : [...prev.difficulty, value],
    }));

  const reset = () => setFilters(DEFAULT_FILTERS);
  const active = hasActiveFilters(filters);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:gap-4">
        <div className="relative lg:flex-1">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="search"
            value={filters.q}
            onChange={(e) => updateFilter("q", e.target.value)}
            placeholder="Поиск по названию или описанию"
            className="h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] pl-9 pr-3 text-sm placeholder:text-[var(--muted-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 lg:contents">
          <select
            value={filters.distance ?? ""}
            onChange={(e) =>
              updateFilter(
                "distance",
                (e.target.value || null) as FilterState["distance"]
              )
            }
            className="h-10 min-w-0 flex-1 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] sm:min-w-[170px] lg:flex-none"
          >
            <option value="">Любое расстояние</option>
            {DISTANCE_RANGES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>

          <select
            value={filters.season ?? ""}
            onChange={(e) =>
              updateFilter(
                "season",
                (e.target.value || null) as FilterState["season"]
              )
            }
            className="h-10 min-w-0 flex-1 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] sm:min-w-[160px] lg:flex-none"
          >
            <option value="">Любой сезон</option>
            {SEASON_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>

          <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:flex-1 lg:flex-none">
            {DIFFICULTY_OPTIONS.map((d) => {
              const checked = filters.difficulty.includes(d.value);
              return (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => toggleDifficulty(d.value)}
                  aria-pressed={checked}
                  className={
                    "inline-flex h-10 flex-1 items-center justify-center rounded-md border px-3 text-sm transition-colors lg:flex-none " +
                    (checked
                      ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
                      : "border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] hover:bg-[var(--muted)]")
                  }
                >
                  {d.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-[var(--muted-foreground)]">
            Найдено: <strong className="text-[var(--foreground)]">{filtered.length}</strong>{" "}
            {pluralizeRoutes(filtered.length)}
          </span>
          {active && (
            <>
              {filters.q && (
                <Badge variant="outline">
                  Поиск: «{filters.q}»
                  <button
                    type="button"
                    onClick={() => updateFilter("q", "")}
                    aria-label="Очистить поиск"
                    className="ml-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {filters.distance && (
                <Badge variant="outline">
                  {getDistanceLabel(filters.distance)}
                  <button
                    type="button"
                    onClick={() => updateFilter("distance", null)}
                    aria-label="Сбросить расстояние"
                    className="ml-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {filters.season && (
                <Badge variant="outline">
                  {getSeasonLabel(filters.season)}
                  <button
                    type="button"
                    onClick={() => updateFilter("season", null)}
                    aria-label="Сбросить сезон"
                    className="ml-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {filters.difficulty.map((d) => (
                <Badge key={d} variant="outline">
                  {getDifficultyLabel(d)}
                  <button
                    type="button"
                    onClick={() => toggleDifficulty(d)}
                    aria-label={`Сбросить ${d}`}
                    className="ml-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  >
                    ×
                  </button>
                </Badge>
              ))}
              <Button variant="ghost" size="sm" onClick={reset}>
                Сбросить всё
              </Button>
            </>
          )}
        </div>

        <div className="inline-flex h-9 rounded-md border border-[var(--border)] bg-[var(--background)] p-0.5 text-sm">
          <button
            type="button"
            onClick={() => setView("list")}
            className={
              "inline-flex h-8 items-center gap-1.5 rounded-sm px-3 transition-colors " +
              (view === "list"
                ? "bg-[var(--muted)] text-[var(--foreground)]"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]")
            }
            aria-pressed={view === "list"}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <line x1="8" x2="21" y1="6" y2="6" />
              <line x1="8" x2="21" y1="12" y2="12" />
              <line x1="8" x2="21" y1="18" y2="18" />
              <line x1="3" x2="3.01" y1="6" y2="6" />
              <line x1="3" x2="3.01" y1="12" y2="12" />
              <line x1="3" x2="3.01" y1="18" y2="18" />
            </svg>
            Список
          </button>
          <button
            type="button"
            onClick={() => setView("map")}
            className={
              "inline-flex h-8 items-center gap-1.5 rounded-sm px-3 transition-colors " +
              (view === "map"
                ? "bg-[var(--muted)] text-[var(--foreground)]"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]")
            }
            aria-pressed={view === "map"}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619V16.5a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 18.382V6.5a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z" />
              <path d="M15 5.764v15" />
              <path d="M9 3.236v15" />
            </svg>
            Карта
          </button>
        </div>
      </div>

      {view === "list" ? (
        filtered.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((route) => (
              <RouteCard key={route.slug} route={route} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-[var(--border)] py-16 text-center">
            <p className="text-base text-[var(--muted-foreground)]">
              Маршруты не найдены. Попробуйте изменить фильтры.
            </p>
            {active && (
              <Button variant="outline" className="mt-4" onClick={reset}>
                Сбросить фильтры
              </Button>
            )}
          </div>
        )
      ) : (
        <div className="h-[600px] overflow-hidden rounded-xl border border-[var(--border)]">
          <React.Suspense
            fallback={
              <div className="flex h-full items-center justify-center text-sm text-[var(--muted-foreground)]">
                Загрузка карты…
              </div>
            }
          >
            <RoutesMap routes={filtered} />
          </React.Suspense>
        </div>
      )}
    </div>
  );
}
