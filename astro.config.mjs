// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import mdx from "@astrojs/mdx";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://tomsk-progulka.ru",
  redirects: {
    "/trails": "/",
  },
  integrations: [
    react(),
    mdx(),
    // Раздел «Статьи» временно скрыт: исключаем /articles (и возможные
    // страницы статей) из карты сайта. См. CLAUDE.md, «Скрытый раздел „Статьи“».
    sitemap({ filter: (page) => !page.includes("/articles") }),
  ],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        "@": new URL("./src", import.meta.url).pathname,
      },
      // Единственная копия React в dev-оптимизаторе и в SSR-графе.
      dedupe: ["react", "react-dom"],
    },
    // Заставляем Vite корректно пребандлить react-dom/client (иначе после
    // пере-оптимизации новых зависимостей ломается экспорт createRoot в dev).
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-dom/client",
        "photoswipe",
        "photoswipe/lightbox",
      ],
    },
  },
});
