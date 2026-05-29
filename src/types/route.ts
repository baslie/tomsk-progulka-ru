import type { CollectionEntry } from "astro:content";

export type RouteEntry = CollectionEntry<"routes">;
export type ArticleEntry = CollectionEntry<"articles">;
export type PageEntry = CollectionEntry<"pages">;

export type Difficulty = "easy" | "medium" | "hard";
export type Season = "spring" | "summer" | "autumn" | "winter" | "all_year";
export type ArticleCategory = "how_to_get" | "what_to_take" | "general";

export interface RouteFilters {
  q?: string;
  difficulty?: Difficulty[];
  season?: Season[];
  distanceMax?: number;
  region?: string;
}
