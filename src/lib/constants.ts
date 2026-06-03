/**
 * Видимость раздела «Статьи».
 *
 * false — раздел временно СКРЫТ от посетителей: нет пункта «Статьи» в меню,
 * страница /articles редиректит на главную, отдельные страницы статей не
 * генерируются. Контент (src/content/articles/*) и весь код раздела сохранены.
 *
 * Чтобы вернуть раздел — поставить true. Подробности и список затрагиваемых
 * файлов см. в CLAUDE.md, раздел «Скрытый раздел „Статьи“».
 */
export const ARTICLES_VISIBLE = false;

export const APP_NAME = "Томская Прогулка";
export const APP_DESCRIPTION =
  "Каталог пешеходных маршрутов по Томску и Томской области";
export const SITE_URL = "https://tomsk-progulka.ru";

export const DEFAULT_MAP_CENTER = { lat: 56.4884, lng: 84.948 } as const;
export const DEFAULT_MAP_ZOOM = 12;

export const DIFFICULTY_LABELS = {
  easy: "Лёгкий",
  medium: "Средний",
  hard: "Сложный",
} as const;

export const DIFFICULTY_COLORS = {
  easy: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  hard: "bg-red-100 text-red-800",
} as const;

/** Вариант бейджа для каждой сложности (единый источник для карточки и страницы маршрута). */
export const DIFFICULTY_BADGE_VARIANT = {
  easy: "success",
  medium: "warning",
  hard: "danger",
} as const satisfies Record<keyof typeof DIFFICULTY_LABELS, string>;

export const SEASON_LABELS = {
  spring: "Весна",
  summer: "Лето",
  autumn: "Осень",
  winter: "Зима",
  all_year: "Круглый год",
} as const;

export const ARTICLE_CATEGORY_LABELS = {
  how_to_get: "Как добраться",
  what_to_take: "Что взять",
  general: "Общее",
} as const;

export const TRACK_COLORS = [
  "#3B82F6",
  "#EF4444",
  "#22C55E",
  "#F59E0B",
  "#8B5CF6",
  "#EC4899",
  "#06B6D4",
  "#F97316",
] as const;

export function getTrackColor(index: number): string {
  return TRACK_COLORS[index % TRACK_COLORS.length];
}

/** Цвета маркеров старта/финиша на картах. */
export const MARKER_START_COLOR = "#22c55e";
export const MARKER_FINISH_COLOR = "#ef4444";

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} мин`;
  if (mins === 0) return `${hours} ч`;
  return `${hours} ч ${mins} мин`;
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} м`;
  const value = km >= 10 ? Math.round(km) : Math.round(km * 10) / 10;
  return `${value} км`;
}

export function formatDateRu(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}
