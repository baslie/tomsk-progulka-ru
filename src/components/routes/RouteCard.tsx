import * as React from "react";
import { Badge } from "@/components/ui/Badge";
import {
  DIFFICULTY_LABELS,
  DIFFICULTY_BADGE_VARIANT,
  SEASON_LABELS,
  formatDistance,
  formatDuration,
} from "@/lib/constants";

export interface RouteCardData {
  slug: string;
  title: string;
  description: string;
  difficulty: keyof typeof DIFFICULTY_LABELS;
  season: keyof typeof SEASON_LABELS;
  distanceKm: number;
  durationMin: number;
  region: string;
  coverImage: string;
  authorName?: string;
  authorAvatar?: string;
  isOrganizer?: boolean;
}

export function RouteCard({ route }: { route: RouteCardData }) {
  return (
    <a
      href={`/trails/${route.slug}/`}
      className="group flex flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm transition-all hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-[var(--muted)]">
        <img
          src={route.coverImage}
          alt={route.title}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute top-3 left-3 flex gap-1.5">
          <Badge variant={DIFFICULTY_BADGE_VARIANT[route.difficulty]}>
            {DIFFICULTY_LABELS[route.difficulty]}
          </Badge>
          <Badge variant="outline" className="bg-white/90 backdrop-blur">
            {SEASON_LABELS[route.season]}
          </Badge>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <h3 className="line-clamp-2 text-lg font-semibold leading-tight">
          {route.title}
        </h3>
        <p className="line-clamp-2 text-sm text-[var(--muted-foreground)]">
          {route.description}
        </p>

        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[var(--muted-foreground)]">
          <span className="inline-flex items-center gap-1">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
            {formatDistance(route.distanceKm)}
          </span>
          <span className="inline-flex items-center gap-1">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            {formatDuration(route.durationMin)}
          </span>
          <span className="inline-flex items-center gap-1 truncate">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            {route.region}
          </span>
        </div>

        {route.authorName && (
          <div className="flex items-center gap-2 border-t border-[var(--border)] pt-3 text-xs text-[var(--muted-foreground)]">
            {route.authorAvatar && (
              <img
                src={route.authorAvatar}
                alt={route.authorName}
                loading="lazy"
                decoding="async"
                className="size-6 shrink-0 rounded-full object-cover"
              />
            )}
            <span className="leading-none">{route.authorName}</span>
            {route.isOrganizer && (
              <span className="inline-flex items-center gap-0.5 leading-none text-[var(--primary)]">
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="shrink-0"
                  aria-hidden
                >
                  <path
                    d="M9 12l2 2 4-4"
                    stroke="white"
                    strokeWidth="3"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="12" cy="12" r="10" />
                </svg>
                Организатор
              </span>
            )}
          </div>
        )}
      </div>
    </a>
  );
}
