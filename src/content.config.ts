import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const author = z.object({
  name: z.string(),
  vkUrl: z.string().url().optional(),
  avatar: z.string().optional(),
  isOrganizer: z.boolean().default(false),
  bio: z.string().optional(),
});

const trackGeom = z.object({
  type: z.literal("LineString"),
  coordinates: z.array(z.tuple([z.number(), z.number()])),
});

const routes = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/routes" }),
  schema: ({ image }) =>
    z.object({
      title: z.string().max(100),
      description: z.string(),
      difficulty: z.enum(["easy", "medium", "hard"]),
      season: z.enum(["spring", "summer", "autumn", "winter", "all_year"]),
      distanceKm: z.number().positive(),
      durationMin: z.number().int().positive(),
      region: z.string(),
      // Публичный путь (/images/...) — оставлен для совместимости со старыми маршрутами.
      coverImage: z.string(),
      // Оптимизируемая через astro:assets обложка (новые маршруты). Имеет приоритет над coverImage.
      coverImageAsset: image().optional(),
      author: author,
      // Основной трек — используется в каталоге, общей карте и кнопке скачивания по умолчанию.
      gpx: trackGeom,
      // Несколько именованных вариантов одного маршрута (показываются на карте детальной страницы).
      tracks: z
        .array(
          z.object({
            name: z.string(),
            color: z.string().optional(),
            distanceKm: z.number().positive().optional(),
            gpx: trackGeom,
            // Публичный путь к оригинальному .gpx (с высотами) для скачивания.
            gpxFile: z.string().optional(),
          }),
        )
        .optional(),
      // Оптимизируемая через astro:assets галерея с лайтбоксом.
      gallery: z
        .array(
          z.object({
            image: image(),
            alt: z.string(),
            caption: z.string().optional(),
          }),
        )
        .optional(),
      howToGetCustomText: z.string().optional(),
      whatToTakeCustomText: z.string().optional(),
      publishedAt: z.coerce.date(),
    }),
});

const articles = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/articles" }),
  schema: z.object({
    title: z.string().max(200),
    description: z.string().max(300).optional(),
    category: z.enum(["how_to_get", "what_to_take", "general"]),
    author: author.optional(),
    coverImage: z.string().optional(),
    gallery: z
      .array(
        z.object({
          src: z.string(),
          alt: z.string().optional(),
          caption: z.string().optional(),
        }),
      )
      .default([]),
    publishedAt: z.coerce.date(),
  }),
});

const pages = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/pages" }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
  }),
});

export const collections = { routes, articles, pages };
